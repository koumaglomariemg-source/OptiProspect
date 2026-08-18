import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/app_theme.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/constants.dart';
import '../widgets/common.dart';

class ReferentielsScreen extends StatefulWidget {
  const ReferentielsScreen({super.key});

  @override
  State<ReferentielsScreen> createState() => _ReferentielsScreenState();
}

class _ReferentielsScreenState extends State<ReferentielsScreen> {
  Settings? _settings;
  String? _error;
  bool _saving = false;

  final _stageLabels = <String, TextEditingController>{};

  ApiClient get _api => context.read<AuthProvider>().api;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final settings = await _api.settings();
      if (mounted) {
        setState(() {
          _settings = settings;
          for (final s in settings.stages) {
            _stageLabels.putIfAbsent(s.key, () => TextEditingController(text: s.label));
          }
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  @override
  void dispose() {
    for (final c in _stageLabels.values) c.dispose();
    super.dispose();
  }

  Future<void> _saveStages() async {
    final s = _settings;
    if (s == null) return;
    setState(() => _saving = true);
    try {
      await _api.updateSetting('stages', [
        for (final st in s.stages)
          {
            'key': st.key,
            'label': _stageLabels[st.key]?.text.trim().isNotEmpty == true
                ? _stageLabels[st.key]!.text.trim()
                : st.label,
            'color': st.color,
          },
      ]);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Étapes enregistrées')));
      }
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Référentiels'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Étapes de vente'),
              Tab(text: 'Listes'),
            ],
          ),
        ),
        body: _error != null
            ? ErrorRetry(message: _error!, onRetry: _load)
            : _settings == null
                ? const Center(child: CircularProgressIndicator())
                : TabBarView(
                    children: [_stagesTab(), _listsTab()],
                  ),
      ),
    );
  }

  Widget _stagesTab() {
    final s = _settings!;
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        Text(
          'Étapes personnalisables du pipeline de vente (appliquées au pipeline entier)',
          style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 12),
        for (final st in s.stages)
          Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: CircleAvatar(
                radius: 8,
                backgroundColor: colorFromName(st.color),
              ),
              title: TextField(
                controller: _stageLabels[st.key],
                decoration: InputDecoration(
                  labelText: kStageLabels[st.key] ?? st.key,
                  isDense: true,
                ),
              ),
            ),
          ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: _saving ? null : _saveStages,
            style: FilledButton.styleFrom(backgroundColor: kPrimary),
            icon: const Icon(Icons.save_outlined),
            label: Text(_saving ? 'Enregistrement…' : 'Enregistrer les étapes'),
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _listsTab() {
    final s = _settings!;
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        _listCard('Produits', s.products, Icons.inventory_2_outlined),
        const SizedBox(height: 12),
        _listCard('Zones', s.zones, Icons.map_outlined),
        const SizedBox(height: 12),
        _listCard('Motifs de refus', s.refusalReasons, Icons.close_outlined),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _listCard(String title, List<String> items, IconData icon) {
    return SectionCard(
      title: '$title (${items.length})',
      child: items.isEmpty
          ? Text('Aucune valeur',
              style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant))
          : Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final item in items)
                  Chip(
                    avatar: Icon(icon, size: 16, color: Colors.grey),
                    label: Text(item),
                  ),
              ],
            ),
    );
  }
}