import 'package:flutter/material.dart' hide Badge;
import 'package:provider/provider.dart';

import '../config/app_theme.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/constants.dart';
import '../widgets/common.dart';

const kTemplateColors = [
  'sky',
  'amber',
  'violet',
  'emerald',
  'rose',
  'indigo',
  'teal',
  'orange',
  'fuchsia',
  'slate',
];

const kTemplateFieldTypes = [
  ('text', 'Texte'),
  ('textarea', 'Zone de texte'),
  ('number', 'Nombre'),
  ('date', 'Date'),
  ('select', 'Liste'),
];

class PipelineTemplatesScreen extends StatefulWidget {
  const PipelineTemplatesScreen({super.key});

  @override
  State<PipelineTemplatesScreen> createState() => _PipelineTemplatesScreenState();
}

class _PipelineTemplatesScreenState extends State<PipelineTemplatesScreen> {
  List<PipelineTemplate>? _templates;
  String? _error;

  ApiClient get _api => context.read<AuthProvider>().api;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final items = await _api.pipelineTemplates();
      if (mounted) setState(() => _templates = items);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _openForm([PipelineTemplate? template]) async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => TemplateFormScreen(template: template)),
    );
    _load();
  }

  Future<void> _setDefault(PipelineTemplate t) async {
    try {
      await _api.setDefaultPipelineTemplate(t.id);
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _delete(PipelineTemplate t) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Supprimer « ${t.name} » ?'),
        content: const Text('Les étapes de ce modèle seront supprimées.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _api.deletePipelineTemplate(t.id);
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Modèles de pipeline')),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: kPrimary,
        foregroundColor: Colors.white,
        onPressed: () => _openForm(),
        icon: const Icon(Icons.add),
        label: const Text('Nouveau modèle'),
      ),
      body: _error != null
          ? ErrorRetry(message: _error!, onRetry: _load)
          : _templates == null
              ? const Center(child: CircularProgressIndicator())
              : _templates!.isEmpty
                  ? const EmptyState(
                      message: 'Aucun modèle. Créez-en un pour structurer votre pipeline.',
                    )
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(12, 12, 12, 88),
                      children: [
                        for (final t in _templates!) _templateCard(t),
                      ],
                    ),
    );
  }

  Widget _templateCard(PipelineTemplate t) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.account_tree_outlined, color: kPrimary),
                const SizedBox(width: 8),
                if (t.isDefault) ...[
                  const Badge(label: 'Par défaut', color: Colors.amber),
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: Text(t.name,
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            if (t.description != null && t.description!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(t.description!,
                    style: const TextStyle(fontSize: 12, color: Colors.grey)),
              ),
            const Divider(height: 20),
            for (var i = 0; i < t.steps.length; i++)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(
                  children: [
                    SizedBox(
                      width: 20,
                      child: Text('${i + 1}',
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 11, color: Colors.grey)),
                    ),
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: colorFromName(t.steps[i].color),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(t.steps[i].name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 13.5)),
                    ),
                    Text('${t.steps[i].formFields.length} champ(s)',
                        style: const TextStyle(fontSize: 10, color: Colors.grey)),
                  ],
                ),
              ),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                IconButton(
                  icon: const Icon(Icons.edit_outlined, size: 18),
                  color: kPrimary,
                  tooltip: 'Modifier',
                  onPressed: () => _openForm(t),
                ),
                IconButton(
                  icon: const Icon(Icons.star_outline, size: 18),
                  color: Colors.amber,
                  tooltip: 'Définir par défaut',
                  onPressed: t.isDefault ? null : () => _setDefault(t),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline, size: 18),
                  color: Colors.red,
                  tooltip: 'Supprimer',
                  onPressed: t.isDefault ? null : () => _delete(t),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _FieldDraft {
  final keyC = TextEditingController();
  final labelC = TextEditingController();
  String type = 'text';
  bool required = false;
  final optionsC = TextEditingController();

  void dispose() {
    keyC.dispose();
    labelC.dispose();
    optionsC.dispose();
  }
}

class _StepDraft {
  final keyC = TextEditingController();
  final nameC = TextEditingController();
  String color = 'indigo';
  final List<_FieldDraft> fields = [];

  void dispose() {
    keyC.dispose();
    nameC.dispose();
    for (final f in fields) f.dispose();
  }
}

class TemplateFormScreen extends StatefulWidget {
  final PipelineTemplate? template;

  const TemplateFormScreen({super.key, this.template});

  @override
  State<TemplateFormScreen> createState() => _TemplateFormScreenState();
}

class _TemplateFormScreenState extends State<TemplateFormScreen> {
  final _name = TextEditingController();
  final _description = TextEditingController();
  bool _isDefault = false;
  late final List<_StepDraft> _steps;
  bool _saving = false;
  String? _error;

  bool get _isEdit => widget.template != null;

  @override
  void initState() {
    super.initState();
    _steps = [];
    final t = widget.template;
    if (t != null) {
      _name.text = t.name;
      _description.text = t.description ?? '';
      _isDefault = t.isDefault;
      for (final s in t.steps) {
        final sd = _StepDraft()
          ..keyC.text = s.key
          ..nameC.text = s.name
          ..color = s.color;
        for (final f in s.formFields) {
          sd.fields.add(_FieldDraft()
            ..keyC.text = f.key
            ..labelC.text = f.label
            ..type = f.type
            ..required = f.required
            ..optionsC.text = f.options.join(', '));
        }
        _steps.add(sd);
      }
    } else {
      _steps.add(_StepDraft()
        ..keyC.text = 'etape_1'
        ..nameC.text = 'Étape 1'
        ..color = 'sky');
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    for (final s in _steps) s.dispose();
    super.dispose();
  }

  void _addStep() {
    setState(() {
      _steps.add(_StepDraft()
        ..keyC.text = 'etape_${_steps.length + 1}'
        ..nameC.text = 'Étape ${_steps.length + 1}'
        ..color = 'indigo');
    });
  }

  void _removeStep(int i) {
    setState(() => _steps.removeAt(i).dispose());
  }

  void _moveStep(int i, int dir) {
    setState(() {
      final j = i + dir;
      if (j < 0 || j >= _steps.length) return;
      final tmp = _steps[i];
      _steps[i] = _steps[j];
      _steps[j] = tmp;
    });
  }

  void _addField(int si) {
    setState(() {
      _steps[si].fields.add(_FieldDraft()
        ..keyC.text = 'champ_${_steps[si].fields.length + 1}'
        ..labelC.text = ''
        ..type = 'text');
    });
  }

  void _removeField(int si, int fi) {
    setState(() => _steps[si].fields.removeAt(fi).dispose());
  }

  void _moveField(int si, int fi, int dir) {
    setState(() {
      final fields = _steps[si].fields;
      final j = fi + dir;
      if (j < 0 || j >= fields.length) return;
      final tmp = fields[fi];
      fields[fi] = fields[j];
      fields[j] = tmp;
    });
  }

  Map<String, dynamic> _payload() {
    return {
      'name': _name.text.trim(),
      'description': _description.text.trim(),
      'is_default': _isDefault,
      'steps': [
        for (final s in _steps)
          {
            'key': s.keyC.text.trim(),
            'name': s.nameC.text.trim(),
            'color': s.color,
            'form_fields': [
              for (final f in s.fields)
                {
                  'key': f.keyC.text.trim(),
                  'label': f.labelC.text.trim(),
                  'type': f.type,
                  'required': f.required,
                  if (f.type == 'select' && f.optionsC.text.trim().isNotEmpty)
                    'options': f.optionsC.text
                        .split(',')
                        .map((o) => o.trim())
                        .where((o) => o.isNotEmpty)
                        .toList(),
                },
            ],
          },
      ],
    };
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty) {
      setState(() => _error = 'Le nom du modèle est requis');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final api = context.read<AuthProvider>().api;
      if (_isEdit) {
        await api.updatePipelineTemplate(widget.template!.id, _payload());
      } else {
        await api.createPipelineTemplate(_payload());
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
      appBar: AppBar(
        title: Text(_isEdit ? 'Modifier le modèle' : 'Nouveau modèle'),
        actions: [
          TextButton(
            onPressed: _saving ? null : _save,
            child: Text(_saving ? 'Enregistrement…' : 'Enregistrer',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _generalSection(),
          const SizedBox(height: 16),
          _stepsSection(),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),
            ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _generalSection() {
    return SectionCard(
      title: 'Informations',
      child: Column(
        children: [
          TextField(
            controller: _name,
            decoration: const InputDecoration(labelText: 'Nom du modèle *', isDense: true),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _description,
            decoration: const InputDecoration(
                labelText: 'Description (optionnel)', isDense: true),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Modèle par défaut',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            subtitle: const Text('Pilote le tableau Kanban', style: TextStyle(fontSize: 12)),
            value: _isDefault,
            onChanged: (v) => setState(() => _isDefault = v),
          ),
        ],
      ),
    );
  }

  Widget _stepsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text('Étapes du tunnel',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            ),
            TextButton.icon(
              onPressed: _addStep,
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Ajouter une étape'),
            ),
          ],
        ),
        for (var i = 0; i < _steps.length; i++)
          _stepCard(i),
      ],
    );
  }

  Widget _stepCard(int si) {
    final s = _steps[si];
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text('Étape ${si + 1}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.keyboard_arrow_up, size: 18),
                  onPressed: si == 0 ? null : () => _moveStep(si, -1),
                ),
                IconButton(
                  icon: const Icon(Icons.keyboard_arrow_down, size: 18),
                  onPressed: si == _steps.length - 1 ? null : () => _moveStep(si, 1),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
                  onPressed: () => _removeStep(si),
                ),
              ],
            ),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: s.keyC,
                    decoration: const InputDecoration(labelText: 'Clé', isDense: true),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: TextField(
                    controller: s.nameC,
                    decoration: const InputDecoration(labelText: 'Nom', isDense: true),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: s.color,
              decoration: const InputDecoration(labelText: 'Couleur', isDense: true),
              items: [
                for (final c in kTemplateColors)
                  DropdownMenuItem(
                    value: c,
                    child: Row(
                      children: [
                        Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            color: colorFromName(c),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(c),
                      ],
                    ),
                  ),
              ],
              onChanged: (v) => setState(() => s.color = v ?? s.color),
            ),
            const Divider(height: 20),
            Row(
              children: [
                const Expanded(
                  child: Text('Champs du formulaire',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
                TextButton.icon(
                  onPressed: () => _addField(si),
                  icon: const Icon(Icons.add, size: 16),
                  label: const Text('Champ'),
                ),
              ],
            ),
            if (s.fields.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 4),
                child: Text('Aucun champ.',
                    style: TextStyle(fontSize: 12, color: Colors.grey)),
              ),
            for (var fi = 0; fi < s.fields.length; fi++)
              _fieldCard(si, fi),
          ],
        ),
      ),
    );
  }

  Widget _fieldCard(int si, int fi) {
    final s = _steps[si];
    final f = s.fields[fi];
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: f.keyC,
                  decoration: const InputDecoration(labelText: 'Clé', isDense: true),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 2,
                child: TextField(
                  controller: f.labelC,
                  decoration: const InputDecoration(labelText: 'Libellé', isDense: true),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: f.type,
                  decoration: const InputDecoration(labelText: 'Type', isDense: true),
                  items: [
                    for (final (v, l) in kTemplateFieldTypes)
                      DropdownMenuItem(value: v, child: Text(l)),
                  ],
                  onChanged: (v) => setState(() => f.type = v ?? f.type),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.keyboard_arrow_up, size: 18),
                onPressed: fi == 0 ? null : () => _moveField(si, fi, -1),
              ),
              IconButton(
                icon: const Icon(Icons.keyboard_arrow_down, size: 18),
                onPressed: fi == s.fields.length - 1 ? null : () => _moveField(si, fi, 1),
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
                onPressed: () => _removeField(si, fi),
              ),
            ],
          ),
          if (f.type == 'select') ...[
            const SizedBox(height: 8),
            TextField(
              controller: f.optionsC,
              decoration: const InputDecoration(
                labelText: 'Options (séparées par une virgule)',
                isDense: true,
              ),
            ),
          ],
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Requis', style: TextStyle(fontSize: 13)),
            value: f.required,
            onChanged: (v) => setState(() => f.required = v),
          ),
        ],
      ),
    );
  }
}