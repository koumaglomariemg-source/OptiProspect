import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/app_theme.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../services/export_service.dart';
import '../utils/constants.dart';
import '../widgets/common.dart';

class _StageDraft {
  String key;
  final TextEditingController labelC;
  String color;

  _StageDraft({required this.key, required String label, required this.color})
    : labelC = TextEditingController(text: label);

  void dispose() => labelC.dispose();
}

class ReferentielsScreen extends StatefulWidget {
  const ReferentielsScreen({super.key});

  @override
  State<ReferentielsScreen> createState() => _ReferentielsScreenState();
}

class _ReferentielsScreenState extends State<ReferentielsScreen> {
  Settings? _settings;
  String? _error;
  bool _savingStages = false;
  bool _savingAutomation = false;
  bool _backingUp = false;

  final List<_StageDraft> _stages = [];
  final List<String> _products = [];
  final List<String> _zones = [];
  final List<String> _refusal = [];

  bool _automationsEnabled = true;
  final _relanceDaysC = TextEditingController();
  final _inactiveDaysC = TextEditingController();

  ApiClient get _api => context.read<AuthProvider>().api;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final s in _stages) {
      s.dispose();
    }
    _relanceDaysC.dispose();
    _inactiveDaysC.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final settings = await _api.settings();
      if (!mounted) return;
      setState(() {
        _settings = settings;
        for (final s in _stages) {
          s.dispose();
        }
        _stages
          ..clear()
          ..addAll(
            settings.stages.map(
              (s) => _StageDraft(key: s.key, label: s.label, color: s.color),
            ),
          );
        _products
          ..clear()
          ..addAll(settings.products);
        _zones
          ..clear()
          ..addAll(settings.zones);
        _refusal
          ..clear()
          ..addAll(settings.refusalReasons);
        _automationsEnabled = settings.automationsEnabled;
        _relanceDaysC.text = settings.automationRelanceDays.join(', ');
        _inactiveDaysC.text = settings.automationInactiveDays.toString();
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  String _slug(String s) => s
      .trim()
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '_')
      .replaceAll(RegExp(r'^_+|_+$'), '');

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  // --- Étapes ---
  Future<void> _saveStages() async {
    setState(() => _savingStages = true);
    try {
      final used = <String>{};
      final payload = <Map<String, dynamic>>[];
      for (var i = 0; i < _stages.length; i++) {
        final st = _stages[i];
        final label = st.labelC.text.trim();
        if (label.isEmpty) continue;
        var key = st.key.isNotEmpty ? st.key : _slug(label);
        if (key.isEmpty) key = 'etape_${i + 1}';
        while (used.contains(key)) {
          key = '${key}_${i + 1}';
        }
        used.add(key);
        payload.add({'key': key, 'label': label, 'color': st.color});
      }
      if (payload.isEmpty) {
        _snack('Ajoutez au moins une étape');
        return;
      }
      await _api.updateSetting('stages', payload);
      _snack('Étapes enregistrées');
      await _load();
    } catch (e) {
      _snack(e.toString());
    } finally {
      if (mounted) setState(() => _savingStages = false);
    }
  }

  void _addStage() {
    setState(() {
      _stages.add(
        _StageDraft(
          key: 'etape_${_stages.length + 1}',
          label: '',
          color: kStageColors[_stages.length % kStageColors.length],
        ),
      );
    });
  }

  Future<void> _pickColor(_StageDraft st) async {
    final picked = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              for (final c in kStageColors)
                InkWell(
                  onTap: () => Navigator.pop(ctx, c),
                  borderRadius: BorderRadius.circular(24),
                  child: CircleAvatar(
                    radius: 20,
                    backgroundColor: colorFromName(c),
                    child: st.color == c
                        ? const Icon(Icons.check, color: Colors.white, size: 18)
                        : null,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
    if (picked != null) setState(() => st.color = picked);
  }

  // --- Listes ---
  Future<void> _saveList(String key, List<String> items) async {
    try {
      await _api.updateSetting(key, items);
    } catch (e) {
      _snack(e.toString());
      await _load();
    }
  }

  Future<void> _addListItem(String key, List<String> items) async {
    final controller = TextEditingController();
    final value = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Ajouter une valeur'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'Nouvelle valeur'),
          onSubmitted: (v) => Navigator.pop(ctx, v.trim()),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Ajouter'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (value == null || value.isEmpty || items.contains(value)) return;
    setState(() => items.add(value));
    await _saveList(key, items);
  }

  Future<void> _removeListItem(
    String key,
    List<String> items,
    String item,
  ) async {
    setState(() => items.remove(item));
    await _saveList(key, items);
  }

  // --- Relances auto ---
  Future<void> _saveAutomation() async {
    setState(() => _savingAutomation = true);
    try {
      final days = _relanceDaysC.text
          .split(RegExp(r'[,\s]+'))
          .map((e) => int.tryParse(e.trim()) ?? 0)
          .where((e) => e > 0)
          .toList();
      final inactive = int.tryParse(_inactiveDaysC.text.trim()) ?? 21;
      await _api.updateSetting(
        'automations_enabled',
        _automationsEnabled ? '1' : '0',
      );
      await _api.updateSetting(
        'automation_relance_days',
        days.isEmpty ? [3, 7, 14] : days,
      );
      await _api.updateSetting('automation_inactive_days', inactive.toString());
      _snack('Automatisations enregistrées');
      await _load();
    } catch (e) {
      _snack(e.toString());
    } finally {
      if (mounted) setState(() => _savingAutomation = false);
    }
  }

  // --- Sauvegarde ---
  Future<void> _backup() async {
    setState(() => _backingUp = true);
    try {
      final data = await _api.backup();
      await exportAndShareBackup(data);
    } catch (e) {
      _snack('Sauvegarde impossible : $e');
    } finally {
      if (mounted) setState(() => _backingUp = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Référentiels'),
          actions: [
            IconButton(
              tooltip: 'Exporter une sauvegarde',
              onPressed: _backingUp ? null : _backup,
              icon: _backingUp
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.backup_outlined),
            ),
          ],
          bottom: const TabBar(
            isScrollable: true,
            tabs: [
              Tab(text: 'Étapes de vente'),
              Tab(text: 'Listes'),
              Tab(text: 'Relances auto'),
            ],
          ),
        ),
        body: _error != null
            ? ErrorRetry(message: _error!, onRetry: _load)
            : _settings == null
            ? const Center(child: CircularProgressIndicator())
            : TabBarView(
                children: [_stagesTab(), _listsTab(), _automationTab()],
              ),
      ),
    );
  }

  Widget _stagesTab() {
    return Column(
      children: [
        Expanded(
          child: ReorderableListView.builder(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
            itemCount: _stages.length,
            onReorder: (oldIndex, newIndex) {
              setState(() {
                if (newIndex > oldIndex) newIndex -= 1;
                final item = _stages.removeAt(oldIndex);
                _stages.insert(newIndex, item);
              });
            },
            itemBuilder: (context, i) {
              final st = _stages[i];
              return Card(
                key: ValueKey('stage_${st.key}_$i'),
                margin: const EdgeInsets.only(bottom: 8),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 4,
                  ),
                  child: Row(
                    children: [
                      InkWell(
                        onTap: () => _pickColor(st),
                        borderRadius: BorderRadius.circular(20),
                        child: CircleAvatar(
                          radius: 12,
                          backgroundColor: colorFromName(st.color),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: st.labelC,
                          decoration: const InputDecoration(
                            labelText: 'Libellé de l\'étape',
                            isDense: true,
                            border: InputBorder.none,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(
                          Icons.delete_outline,
                          size: 20,
                          color: Colors.red,
                        ),
                        tooltip: 'Supprimer',
                        onPressed: () =>
                            setState(() => _stages.removeAt(i).dispose()),
                      ),
                      ReorderableDragStartListener(
                        index: i,
                        child: const Icon(
                          Icons.drag_handle,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _addStage,
                  icon: const Icon(Icons.add),
                  label: const Text('Ajouter'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton.icon(
                  onPressed: _savingStages ? null : _saveStages,
                  style: FilledButton.styleFrom(backgroundColor: kPrimary),
                  icon: const Icon(Icons.save_outlined),
                  label: Text(
                    _savingStages ? 'Enregistrement…' : 'Enregistrer',
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _listsTab() {
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        _listCard(
          'Produits / services',
          'products',
          _products,
          Icons.inventory_2_outlined,
        ),
        const SizedBox(height: 12),
        _listCard('Zones / secteurs', 'zones', _zones, Icons.map_outlined),
        const SizedBox(height: 12),
        _listCard(
          'Motifs de refus',
          'refusal_reasons',
          _refusal,
          Icons.close_outlined,
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _listCard(
    String title,
    String key,
    List<String> items,
    IconData icon,
  ) {
    return SectionCard(
      title: title,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: () => _addListItem(key, items),
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Ajouter'),
            ),
          ),
          const SizedBox(height: 4),
          if (items.isEmpty)
            Text(
              'Aucune valeur',
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            )
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final item in items)
                  Chip(
                    avatar: Icon(
                      icon,
                      size: 16,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    label: Text(item),
                    onDeleted: () => _removeListItem(key, items, item),
                  ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _automationTab() {
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        SectionCard(
          title: 'Relances automatiques',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text(
                  'Activer les relances automatiques',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
                subtitle: const Text(
                  'Génère automatiquement des relances et alertes d\'inactivité',
                  style: TextStyle(fontSize: 12),
                ),
                value: _automationsEnabled,
                activeThumbColor: kPrimary,
                onChanged: (v) => setState(() => _automationsEnabled = v),
              ),
              const Divider(),
              const SizedBox(height: 8),
              TextField(
                controller: _relanceDaysC,
                enabled: _automationsEnabled,
                keyboardType: TextInputType.text,
                decoration: const InputDecoration(
                  labelText: 'Jours de relance',
                  helperText: 'Ex : 3, 7, 14 (jours après le dernier contact)',
                  isDense: true,
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _inactiveDaysC,
                enabled: _automationsEnabled,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Seuil d\'inactivité (jours)',
                  helperText:
                      'Un prospect sans activité au-delà est signalé à risque',
                  isDense: true,
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _savingAutomation ? null : _saveAutomation,
                  style: FilledButton.styleFrom(backgroundColor: kPrimary),
                  icon: const Icon(Icons.save_outlined),
                  label: Text(
                    _savingAutomation ? 'Enregistrement…' : 'Enregistrer',
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
