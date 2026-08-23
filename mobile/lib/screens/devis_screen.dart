import 'package:flutter/material.dart' hide Badge;
import 'package:provider/provider.dart';

import '../config/app_theme.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/constants.dart';
import '../utils/formatters.dart';
import '../widgets/common.dart';
import '../widgets/skeleton.dart';
import 'devis_detail_screen.dart';
import 'devis_form_screen.dart';

class DevisScreen extends StatefulWidget {
  const DevisScreen({super.key});

  @override
  State<DevisScreen> createState() => _DevisScreenState();
}

class _DevisScreenState extends State<DevisScreen> {
  List<Devis>? _devis;
  String? _error;
  String _search = '';
  String? _statut;
  String _query = '';

  ApiClient get _api => context.read<AuthProvider>().api;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final items = await _api.devis(statut: _statut, search: _query);
      if (mounted) {
        setState(() {
          _devis = items.where((d) {
            if (_search.isEmpty) return true;
            final q = _search.toLowerCase();
            return d.reference.toLowerCase().contains(q) ||
                d.titre.toLowerCase().contains(q) ||
                (d.prospectName?.toLowerCase().contains(q) ?? false) ||
                (d.prospectCompany?.toLowerCase().contains(q) ?? false);
          }).toList();
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _create() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const DevisFormScreen()),
    );
    if (created == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isCommercial = auth.user?.role == 'commercial';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Devis'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(88),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
                child: TextField(
                  decoration: const InputDecoration(
                    hintText: 'Référence, titre, prospect…',
                    prefixIcon: Icon(Icons.search),
                    isDense: true,
                  ),
                  onChanged: (v) {
                    _search = v.trim();
                    _load();
                  },
                ),
              ),
              SizedBox(
                height: 44,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  children: [
                    _chip(null, 'Tous'),
                    for (final e in kDevisStatusLabels.entries) _chip(e.key, e.value),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      body: _error != null
          ? ErrorRetry(message: _error!, onRetry: _load)
          : _devis == null
              ? const SkeletonScreen(showStats: false)
              : _devis!.isEmpty
                  ? const EmptyState(message: 'Aucun devis')
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(12),
                        itemCount: _devis!.length,
                        itemBuilder: (context, i) => _devisCard(_devis![i]),
                      ),
                    ),
      floatingActionButton: isCommercial
          ? FloatingActionButton(
              onPressed: _create,
              tooltip: 'Nouveau devis',
              child: const Icon(Icons.add),
            )
          : null,
    );
  }

  Widget _chip(String? key, String label) {
    final selected = _statut == key;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) {
          _statut = key;
          _load();
        },
      ),
    );
  }

  Widget _devisCard(Devis d) {
    final color = devisStatusColor(d.statut);
    final auth = context.watch<AuthProvider>();
    final isManager = auth.user?.isManager == true;
    final isOwner = auth.user?.id == d.createdBy;
    final needsValidation = isManager && d.statut == 'attente_validation';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () async {
          await Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => DevisDetailScreen(devis: d)),
          );
          _load();
        },
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Badge(label: d.reference, color: kPrimary, icon: Icons.edit_note),
                  const Spacer(),
                  Badge(label: kDevisStatusLabels[d.statut] ?? d.statut, color: color),
                  if (needsValidation) ...[
                    const SizedBox(width: 6),
                    const Badge(label: 'À valider par vous', color: Colors.orange),
                  ],
                ],
              ),
              const SizedBox(height: 8),
              Text(d.titre, style: const TextStyle(fontWeight: FontWeight.bold)),
              if (d.prospectName != null)
                Text(
                  [d.prospectName, d.prospectCompany].where((s) => s != null && s.isNotEmpty).join(' — '),
                  style: const TextStyle(fontSize: 13),
                ),
              const SizedBox(height: 8),
              for (final item in d.items.take(3))
                Text(
                  '${item.qty} × ${item.name} — ${money(item.total)}'
                  '${item.period != null && item.period != 'ponctuel' ? ' (${kPeriodLabels[item.period] ?? item.period})' : ''}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12),
                ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Text('Total : ', style: const TextStyle(fontSize: 13)),
                  Text(money(d.montant),
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  if (d.arr > 0) ...[
                    const SizedBox(width: 8),
                    Badge(label: 'ARR ${money(d.arr)}/an', color: Colors.teal),
                  ],
                  const Spacer(),
                  if (isOwner && d.statut == 'brouillon')
                    TextButton.icon(
                      onPressed: () async {
                        try {
                          await _api.submitDevis(d.id);
                          _load();
                        } catch (e) {
                          if (mounted) {
                            ScaffoldMessenger.of(context)
                                .showSnackBar(SnackBar(content: Text(e.toString())));
                          }
                        }
                      },
                      icon: const Icon(Icons.send, size: 16),
                      label: const Text('Soumettre', style: TextStyle(fontSize: 12)),
                    ),
                ],
              ),
              Text(
                [d.createdByName ?? '', formatIsoDateTime(d.createdAt)]
                    .where((s) => s.isNotEmpty && s != '—')
                    .join(' • '),
                style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
            ],
          ),
        ),
      ),
    );
  }
}