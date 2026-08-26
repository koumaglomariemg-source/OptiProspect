import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/app_theme.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/constants.dart';
import '../utils/formatters.dart';
import '../widgets/common.dart';

class DevisFormScreen extends StatefulWidget {
  final int? prospectId;
  final Devis? devis;

  const DevisFormScreen({super.key, this.prospectId, this.devis});

  @override
  State<DevisFormScreen> createState() => _DevisFormScreenState();
}

class _DevisFormScreenState extends State<DevisFormScreen> {
  late bool _isEdit;
  int? _prospectId;
  String? _prospectName;
  late final _titre = TextEditingController(text: widget.devis?.titre ?? '');
  late final _description = TextEditingController(text: widget.devis?.description ?? '');
  final _rows = <_ItemRow>[];
  DateTime? _renewalDate;
  bool _saving = false;
  String? _error;

  ApiClient get _api => context.read<AuthProvider>().api;

  @override
  void initState() {
    super.initState();
    _isEdit = widget.devis != null;
    _prospectId = widget.devis?.prospectId ?? widget.prospectId;
    _renewalDate = parseIso(widget.devis?.renewalDate);
    if (widget.devis != null) {
      for (final item in widget.devis!.items) {
        _rows.add(_ItemRow(
          name: TextEditingController(text: item.name),
          qty: TextEditingController(text: '${item.qty}'),
          price: TextEditingController(text: item.price.toStringAsFixed(0)),
          period: item.period,
        ));
      }
    } else {
      _rows.add(_ItemRow());
    }
  }

  @override
  void dispose() {
    _titre.dispose();
    _description.dispose();
    for (final r in _rows) {
      r.dispose();
    }
    super.dispose();
  }

  double get _total => _rows.fold(0, (s, r) => s + r.total);
  double get _arr => _rows.fold(0, (s, r) => s + r.annual);

  Future<void> _ensureProspect() async {
    if (_prospectId != null) return;
    final (rows, _) = await _api.prospects(limit: 100);
    if (!mounted) return;
    final selected = await showModalBottomSheet<Prospect>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: ListView.builder(
          shrinkWrap: true,
          itemCount: rows.length,
          itemBuilder: (context, i) {
            final p = rows[i];
            return ListTile(
              leading: const Icon(Icons.person_outline),
              title: Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis),
              subtitle: Text(
                [p.company ?? '', p.value > 0 ? money(p.value) : '']
                    .where((s) => s.isNotEmpty)
                    .join(' • '),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              onTap: () => Navigator.pop(ctx, p),
            );
          },
        ),
      ),
    );
    if (selected != null) {
      setState(() {
        _prospectId = selected.id;
        _prospectName = selected.name;
        if (_rows.isEmpty) {
          _rows.add(_ItemRow(name: TextEditingController(text: selected.product ?? '')));
        }
      });
    }
  }

  Future<void> _submit() async {
    await _ensureProspect();
    if (_prospectId == null) {
      setState(() => _error = 'Sélectionnez un prospect');
      return;
    }
    if (_titre.text.trim().isEmpty) {
      setState(() => _error = 'Le titre est requis');
      return;
    }
    final items = [
      for (final r in _rows)
        if (r.name.text.trim().isNotEmpty && r.qtyValue > 0)
          {
            'name': r.name.text.trim(),
            'qty': r.qtyValue,
            'price': r.priceValue,
            if (r.period != null && r.period != 'ponctuel') 'period': r.period,
          },
    ];
    final body = <String, dynamic>{
      'titre': _titre.text.trim(),
      'description': _description.text.trim(),
      'items': items,
      if (_renewalDate != null) 'renewal_date': toApiDate(_renewalDate!),
    };
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      if (_isEdit) {
        await _api.updateDevis(widget.devis!.id, body);
      } else {
        await _api.createDevis({'prospect_id': _prospectId, ...body});
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? 'Modifier le devis' : 'Nouveau devis')),
      body: _saving
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(_error!,
                        style: TextStyle(color: Theme.of(context).colorScheme.error)),
                  ),
                if (!_isEdit)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.person_search_outlined, color: kPrimary),
                    title: Text(_prospectName ?? (_prospectId != null ? 'Prospect #$_prospectId' : 'Choisir un prospect')),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () async {
                      final (rows, _) = await _api.prospects(limit: 100);
                      if (!mounted) return;
                      final selected = await showModalBottomSheet<Prospect>(
                        context: context,
                        showDragHandle: true,
                        builder: (ctx) => SafeArea(
                          child: ListView.builder(
                            shrinkWrap: true,
                            itemCount: rows.length,
                            itemBuilder: (context, i) {
                              final p = rows[i];
                              return ListTile(
                                title: Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                                subtitle: Text(
                                  [p.company ?? '', p.value > 0 ? money(p.value) : '']
                                      .where((s) => s.isNotEmpty)
                                      .join(' • '),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                onTap: () => Navigator.pop(ctx, p),
                              );
                            },
                          ),
                        ),
                      );
                      if (selected != null) {
                        setState(() {
                          _prospectId = selected.id;
                          _prospectName = selected.name;
                          if (_rows.length == 1 &&
                              _rows.first.name.text.isEmpty &&
                              selected.product != null) {
                            _rows.first.name.text = selected.product!;
                          }
                        });
                      }
                    },
                  ),
                const SizedBox(height: 16),
                TextField(
                  controller: _titre,
                  decoration: const InputDecoration(labelText: 'Titre *'),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _description,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Description', alignLabelWithHint: true),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: Text('Lignes de devis',
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                    ),
                    IconButton(
                      icon: const Icon(Icons.add_circle_outline, color: kPrimary),
                      tooltip: 'Ajouter une ligne',
                      onPressed: () => setState(() => _rows.add(_ItemRow())),
                    ),
                  ],
                ),
                for (var i = 0; i < _rows.length; i++) _itemCard(_rows[i], i),
                const SizedBox(height: 16),
                _summary(),
                const SizedBox(height: 16),
                InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _renewalDate ?? DateTime.now(),
                      firstDate: DateTime(2020, 1),
                      lastDate: DateTime(2035, 12),
                    );
                    if (picked != null) setState(() => _renewalDate = picked);
                  },
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'Date de renouvellement',
                      prefixIcon: Icon(Icons.event_repeat),
                    ),
                    child: Text(
                      _renewalDate == null ? '—' : toApiDate(_renewalDate!),
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: _submit,
                  style: FilledButton.styleFrom(
                    backgroundColor: kPrimary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  icon: const Icon(Icons.save_outlined),
                  label: Text(_isEdit ? 'Enregistrer' : 'Créer le devis'),
                ),
                const SizedBox(height: 24),
              ],
            ),
    );
  }

  Widget _itemCard(_ItemRow r, int index) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: r.name,
                    decoration: const InputDecoration(labelText: 'Produit', isDense: true),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline, size: 20, color: Colors.red),
                  onPressed: _rows.length > 1
                      ? () => setState(() {
                            r.dispose();
                            _rows.removeAt(index);
                          })
                      : null,
                ),
              ],
            ),
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: TextField(
                    controller: r.qty,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Qté', isDense: true),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 3,
                  child: TextField(
                    controller: r.price,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Prix unitaire (FCFA)', isDense: true),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 3,
                  child: DropdownButtonFormField<String?>(
                    initialValue: r.period,
                    isDense: true,
                    decoration: const InputDecoration(labelText: 'Période'),
                    items: [
                      for (final e in kPeriodLabels.entries)
                        DropdownMenuItem(value: e.key, child: Text(e.value)),
                    ],
                    onChanged: (v) => setState(() => r.period = v),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _summary() {
    return SectionCard(
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total HT'),
              Text(money(_total), style: const TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          if (_arr > 0)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('ARR (récurrent / an)'),
                Text(money(_arr),
                    style: const TextStyle(fontWeight: FontWeight.bold, color: kPrimary)),
              ],
            ),
        ],
      ),
    );
  }
}

class _ItemRow {
  final TextEditingController name;
  final TextEditingController qty;
  final TextEditingController price;
  String? period;

  _ItemRow({
    TextEditingController? name,
    TextEditingController? qty,
    TextEditingController? price,
    this.period,
  })  : name = name ?? TextEditingController(),
        qty = qty ?? TextEditingController(text: '1'),
        price = price ?? TextEditingController();

  int get qtyValue => int.tryParse(qty.text) ?? 0;
  double get priceValue => double.tryParse(price.text.replaceAll(',', '.')) ?? 0;
  double get total => qtyValue * priceValue;
  double get annual => total * switch (period) {
        'mensuel' => 12,
        'trimestriel' => 4,
        'annuel' => 1,
        _ => 0,
      };

  void dispose() {
    name.dispose();
    qty.dispose();
    price.dispose();
  }
}