import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/formatters.dart';
import '../widgets/common.dart';
import 'prospect_detail_screen.dart';

class PortefeuillesScreen extends StatefulWidget {
  const PortefeuillesScreen({super.key});

  @override
  State<PortefeuillesScreen> createState() => _PortefeuillesScreenState();
}

class _PortefeuillesScreenState extends State<PortefeuillesScreen> {
  List<Prospect>? _prospects;
  List<User>? _users;
  String? _error;
  String _search = '';
  String? _selectedUserId; // 'none' = non assignés
  bool _loadingAssign = false;

  ApiClient get _api => context.read<AuthProvider>().api;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final (rows, _) = await _api.prospects();
      final users = await _api.users();
      if (mounted) {
        setState(() {
          _prospects = rows;
          _users = users;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  List<User> get _commerciaux => (_users ?? []).where((u) => u.role == 'commercial').toList();

  int _countFor(String? userId) {
    final list = _prospects ?? [];
    if (userId == null) return list.length;
    if (userId == 'none') return list.where((p) => p.assignedTo == null).length;
    final id = int.tryParse(userId);
    return list.where((p) => p.assignedTo == id).length;
  }

  @override
  Widget build(BuildContext context) {
    final filtered = (_prospects ?? []).where((p) {
      if (_selectedUserId == null) return true;
      if (_selectedUserId == 'none') return p.assignedTo == null;
      return p.assignedTo == int.tryParse(_selectedUserId!);
    }).where((p) {
      if (_search.isEmpty) return true;
      final q = _search.toLowerCase();
      return p.name.toLowerCase().contains(q) ||
          (p.company?.toLowerCase().contains(q) ?? false) ||
          (p.email?.toLowerCase().contains(q) ?? false);
    }).toList()
      ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Portefeuilles'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(110),
          child: Column(
            children: [
              SizedBox(
                height: 44,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  children: [
                    _chip(null, 'Tous (${_countFor(null)})'),
                    for (final u in _commerciaux)
                      _chip(u.id.toString(), '${u.name} (${_countFor(u.id.toString())})'),
                    _chip('none', 'Non assignés (${_countFor('none')})'),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
                child: TextField(
                  decoration: const InputDecoration(
                    hintText: 'Nom, société, email…',
                    prefixIcon: Icon(Icons.search),
                    isDense: true,
                  ),
                  onChanged: (v) => setState(() => _search = v.trim()),
                ),
              ),
            ],
          ),
        ),
      ),
      body: _error != null
          ? ErrorRetry(message: _error!, onRetry: _load)
          : _prospects == null
              ? const Center(child: CircularProgressIndicator())
              : filtered.isEmpty
                  ? const EmptyState(message: 'Aucun prospect')
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(12),
                        itemCount: filtered.length,
                        itemBuilder: (context, i) => _row(filtered[i]),
                      ),
                    ),
    );
  }

  Widget _chip(String? key, String label) {
    final selected = _selectedUserId == key;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => setState(() => _selectedUserId = key),
      ),
    );
  }

  Widget _row(Prospect p) {
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
                Expanded(
                  child: InkWell(
                    onTap: () async {
                      final fresh = await _api.prospect(p.id);
                      if (!mounted) return;
                      await Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => ProspectDetailScreen(prospect: fresh)),
                      );
                      _load();
                    },
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                        Text(
                          [p.company ?? '', 'créé le ${formatIsoDate(p.createdAt)}']
                              .where((s) => s.isNotEmpty && s != '—')
                              .join(' • '),
                          style: const TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                ),
                if (p.stage != null) StageBadge(stage: p.stage),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Text('Assigné à : ',
                    style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                Expanded(
                  child: DropdownButtonFormField<int?>(
                    initialValue: p.assignedTo,
                    isDense: true,
                    decoration: const InputDecoration(border: InputBorder.none),
                    items: [
                      const DropdownMenuItem(value: null, child: Text('Non assigné')),
                      for (final u in _commerciaux)
                        DropdownMenuItem(value: u.id, child: Text(u.name, overflow: TextOverflow.ellipsis)),
                    ],
                    onChanged: _loadingAssign
                        ? null
                        : (v) async {
                            setState(() => _loadingAssign = true);
                            try {
                              await _api.updateProspect(p.id, {
                                if (v != null) 'assigned_to': v,
                              });
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Prospect réaffecté')),
                                );
                              }
                            } catch (e) {
                              if (mounted) {
                                ScaffoldMessenger.of(context)
                                    .showSnackBar(SnackBar(content: Text(e.toString())));
                              }
                            } finally {
                              if (mounted) setState(() => _loadingAssign = false);
                              _load();
                            }
                          },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}