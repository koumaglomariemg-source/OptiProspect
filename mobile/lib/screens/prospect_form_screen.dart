import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/app_theme.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/constants.dart';
import '../utils/formatters.dart';

class ProspectFormScreen extends StatefulWidget {
  final Prospect? prospect;

  const ProspectFormScreen({super.key, this.prospect});

  @override
  State<ProspectFormScreen> createState() => _ProspectFormScreenState();
}

class _ProspectFormScreenState extends State<ProspectFormScreen> {
  late bool _isEdit;
  late final _firstName = TextEditingController(text: widget.prospect?.firstName ?? '');
  late final _lastName = TextEditingController(text: widget.prospect?.lastName ?? '');
  late final _company = TextEditingController(text: widget.prospect?.company ?? '');
  late final _email = TextEditingController(text: widget.prospect?.email ?? '');
  late final _phone = TextEditingController(text: widget.prospect?.phone ?? '');
  late final _linkedin = TextEditingController(text: widget.prospect?.linkedin ?? '');
  late final _secteur = TextEditingController(text: widget.prospect?.secteur ?? '');
  late final _product = TextEditingController(text: widget.prospect?.product ?? '');
  late final _adresse = TextEditingController(text: widget.prospect?.adresse ?? '');
  late final _quartier = TextEditingController(text: widget.prospect?.quartier ?? '');
  late final _nextAction = TextEditingController(text: widget.prospect?.nextAction ?? '');
  late final _note = TextEditingController(text: widget.prospect?.note ?? '');
  late final _value = TextEditingController(
      text: (widget.prospect?.value ?? 0) > 0 ? (widget.prospect!.value).toStringAsFixed(0) : '');
  late final _effectif = TextEditingController(
      text: widget.prospect?.effectif != null ? '${widget.prospect!.effectif}' : '');

  String? _source;
  String? _stage;
  String? _temperature;
  int? _templateId;
  int? _assignedTo;
  bool _optionFraisScolaire = false;
  DateTime? _nextActionDate;
  bool _saving = false;
  String? _error;

  ApiClient get _api => context.read<AuthProvider>().api;

  @override
  void initState() {
    super.initState();
    _isEdit = widget.prospect != null;
    final p = widget.prospect;
    _source = p?.source?.isNotEmpty == true ? p!.source : 'site';
    _stage = p?.stage;
    _temperature = p?.temperature ?? 'tiede';
    _templateId = p?.templateId;
    _assignedTo = p?.assignedTo;
    _optionFraisScolaire = p?.optionFraisScolaire ?? false;
    _nextActionDate = p?.nextActionDate;
  }

  @override
  void dispose() {
    for (final c in [
      _firstName, _lastName, _company, _email, _phone, _linkedin, _secteur,
      _product, _adresse, _quartier, _nextAction, _note, _value, _effectif,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    final user = context.read<AuthProvider>().user;
    final firstName = _firstName.text.trim();
    final lastName = _lastName.text.trim();
    final name = _isEdit
        ? (firstName.isNotEmpty || lastName.isNotEmpty ? '$firstName $lastName'.trim() : widget.prospect!.name)
        : '$firstName $lastName'.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Le nom du prospect est requis');
      return;
    }
    if (!_isEdit && _product.text.trim().isEmpty) {
      setState(() => _error = 'Le produit à proposer est requis');
      return;
    }
    final body = <String, dynamic>{
      'first_name': firstName,
      'last_name': lastName,
      'name': name,
      'company': _company.text.trim(),
      'email': _email.text.trim(),
      'phone': _phone.text.trim(),
      'linkedin': _linkedin.text.trim(),
      'source': _source ?? 'site',
      'value': double.tryParse(_value.text.replaceAll(',', '.')) ?? 0,
      'secteur': _secteur.text.trim(),
      'product': _product.text.trim(),
      'adresse': _adresse.text.trim(),
      'quartier': _quartier.text.trim(),
      'effectif': int.tryParse(_effectif.text),
      'temperature': _temperature ?? 'tiede',
      'next_action': _nextAction.text.trim(),
      'note': _note.text.trim(),
      'option_frais_scolaire': _optionFraisScolaire,
      if (_nextActionDate != null) 'next_action_date': toApiDateTime(_nextActionDate!),
      if (_templateId != null) 'template_id': _templateId,
    };
    if (_isEdit) {
      body['stage'] = _stage;
    }
    if (user?.isManager == true) {
      body['assigned_to'] = _assignedTo;
    }

    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      if (_isEdit) {
        await _api.updateProspect(widget.prospect!.id, body);
      } else {
        await _api.createProspect(body);
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
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final isManager = user?.isManager == true;

    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? 'Modifier le prospect' : 'Nouveau prospect')),
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
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _firstName,
                        decoration: const InputDecoration(labelText: 'Prénom'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _lastName,
                        decoration: const InputDecoration(labelText: 'Nom'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _company,
                  decoration: const InputDecoration(labelText: 'Société'),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _email,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(labelText: 'Email'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _phone,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(labelText: 'Téléphone'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _linkedin,
                  decoration: const InputDecoration(labelText: 'LinkedIn'),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _source,
                        decoration: const InputDecoration(labelText: 'Source'),
                        items: [
                          for (final k in kSourceKeys)
                            DropdownMenuItem(value: k, child: Text(kSourceLabels[k] ?? k)),
                        ],
                        onChanged: (v) => setState(() => _source = v),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _value,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Valeur (FCFA)'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _secteur,
                        decoration: const InputDecoration(labelText: 'Secteur'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _temperature,
                        decoration: const InputDecoration(labelText: 'Température'),
                        items: [
                          for (final e in kTemperatureLabels.entries)
                            DropdownMenuItem(value: e.key, child: Text(e.value)),
                        ],
                        onChanged: (v) => setState(() => _temperature = v),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _product,
                  decoration: InputDecoration(
                    labelText: _isEdit ? 'Produit' : 'Produit à proposer *',
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _adresse,
                  decoration: const InputDecoration(labelText: 'Adresse'),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _quartier,
                        decoration: const InputDecoration(labelText: 'Quartier'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _effectif,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Effectif'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Option frais scolaire'),
                  value: _optionFraisScolaire,
                  onChanged: (v) => setState(() => _optionFraisScolaire = v),
                ),
                const SizedBox(height: 8),
                _templatePicker(),
                if (isManager) ...[
                  const SizedBox(height: 16),
                  _assigneePicker(),
                ],
                const SizedBox(height: 16),
                TextField(
                  controller: _nextAction,
                  decoration: const InputDecoration(
                    labelText: 'Prochaine action',
                    prefixIcon: Icon(Icons.task_alt),
                  ),
                ),
                const SizedBox(height: 16),
                InkWell(
                  onTap: _pickNextActionDate,
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'Date de la prochaine action',
                      prefixIcon: Icon(Icons.event),
                    ),
                    child: Text(
                      _nextActionDate == null
                          ? 'Sélectionner une date'
                          : formatDateTime(_nextActionDate),
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _note,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    labelText: 'Note',
                    alignLabelWithHint: true,
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
                  label: Text(_isEdit ? 'Enregistrer' : 'Créer le prospect'),
                ),
                const SizedBox(height: 24),
              ],
            ),
    );
  }

  Future<void> _pickNextActionDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _nextActionDate ?? now,
      firstDate: now,
      lastDate: DateTime(2035, 12),
    );
    if (picked == null) return;
    if (!mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_nextActionDate ?? now),
    );
    if (!mounted) return;
    setState(() {
      _nextActionDate = DateTime(picked.year, picked.month, picked.day,
          time?.hour ?? now.hour, time?.minute ?? now.minute);
    });
  }

  Widget _templatePicker() {
    return FutureBuilder<List<PipelineTemplate>>(
      future: _api.pipelineTemplates(),
      builder: (context, snap) {
        final templates = snap.data ?? const <PipelineTemplate>[];
        if (templates.isEmpty) return const SizedBox.shrink();
        final current = _templateId ?? templates.where((t) => t.isDefault).firstOrNull?.id;
        return DropdownButtonFormField<int>(
          initialValue: current,
          decoration: const InputDecoration(labelText: 'Modèle de pipeline'),
          items: [
            for (final t in templates)
              DropdownMenuItem(
                value: t.id,
                child: Text(t.name, maxLines: 1, overflow: TextOverflow.ellipsis),
              ),
          ],
          onChanged: (v) => setState(() => _templateId = v),
        );
      },
    );
  }

  Widget _assigneePicker() {
    return FutureBuilder<List<User>>(
      future: _api.users(),
      builder: (context, snap) {
        final users = snap.data ?? const <User>[];
        final commerciaux = users.where((u) => u.role == 'commercial').toList();
        return DropdownButtonFormField<int?>(
          initialValue: _assignedTo,
          decoration: const InputDecoration(labelText: 'Assigner à'),
          items: [
            const DropdownMenuItem(value: null, child: Text('Non assigné')),
            for (final u in commerciaux)
              DropdownMenuItem(value: u.id, child: Text(u.name, maxLines: 1, overflow: TextOverflow.ellipsis)),
          ],
          onChanged: (v) => setState(() => _assignedTo = v),
        );
      },
    );
  }
}