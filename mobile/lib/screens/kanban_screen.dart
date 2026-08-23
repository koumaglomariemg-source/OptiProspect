import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart' hide Badge;
import 'package:provider/provider.dart';
import 'package:drag_and_drop_lists/drag_and_drop_lists.dart';

import '../config/app_theme.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/constants.dart';
import '../utils/formatters.dart';
import '../widgets/common.dart';
import 'prospect_detail_screen.dart';
import 'prospect_form_screen.dart';

class KanbanScreen extends StatefulWidget {
  const KanbanScreen({super.key});

  @override
  State<KanbanScreen> createState() => _KanbanScreenState();
}

class _KanbanScreenState extends State<KanbanScreen> {
  List<StageSetting> _stages = [];
  List<Prospect>? _prospects;
  String? _error;
  String _search = '';
  String? _source;

  ApiClient get _api => context.read<AuthProvider>().api;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final stages = await _api.stages();
      final (rows, _) = await _api.prospects(search: _search, source: _source);
      if (mounted) {
        setState(() {
          _stages = stages.isEmpty ? _defaultStages() : stages;
          _prospects = rows;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  List<StageSetting> _defaultStages() => const [
        StageSetting(key: 'identification', label: 'Identification', color: 'sky'),
        StageSetting(key: 'prospection', label: 'Prospection', color: 'indigo'),
        StageSetting(key: 'suivi', label: 'Suivi', color: 'amber'),
        StageSetting(key: 'depot_contrat', label: 'Dépôt contrat', color: 'violet'),
        StageSetting(key: 'signature_contrat', label: 'Signature contrat', color: 'emerald'),
      ];

  Map<String, List<Prospect>> get _byStage {
    final map = <String, List<Prospect>>{};
    for (final s in _stages) map[s.key] = [];
    for (final p in _prospects ?? []) {
      final key = p.stage ?? 'identification';
      if (!map.containsKey(key)) map[key] = [];
      map[key]!.add(p);
    }
    return map;
  }

  Future<void> _moveProspect(Prospect p, String newStage) async {
    if (p.stage == newStage) return;
    try {
      await _api.updateProspectStage(p.id, newStage);
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final canWrite = auth.user?.role != 'manager';

    return Scaffold(
      body: _error != null
          ? ErrorRetry(message: _error!, onRetry: _load)
          : _prospects == null
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: Column(
                    children: [
                      _buildHeader(canWrite),
                      Expanded(
                        child: kIsWeb ? _buildWebBoard(canWrite) : _buildDragBoard(),
                      ),
                    ],
                  ),
                ),
      floatingActionButton: canWrite
          ? FloatingActionButton.extended(
              onPressed: () async {
                final created = await Navigator.of(context).push<bool>(
                  MaterialPageRoute(builder: (_) => const ProspectFormScreen()),
                );
                if (created == true) _load();
              },
              icon: const Icon(Icons.add),
              label: const Text('Nouveau prospect'),
              tooltip: 'Nouveau prospect',
            )
          : null,
    );
  }

  Future<void> _openDetail(Prospect p) async {
    final fresh = await _api.prospect(p.id);
    if (!mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => ProspectDetailScreen(prospect: fresh)),
    );
    _load();
  }

  Widget _buildDragBoard() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
      child: DragAndDropLists(
        children: _stages.map((stage) {
          final prospects = _byStage[stage.key] ?? [];
          final color = stageColor(stage.key);
          return DragAndDropList(
            key: ValueKey('list_${stage.key}'),
            header: _ColumnHeader(
              stage: stage,
              color: color,
              count: prospects.length,
            ),
            contentsWhenEmpty: _EmptyColumn(color: color),
            decoration: BoxDecoration(
              color: Theme.of(context)
                  .colorScheme
                  .surfaceContainerHighest
                  .withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
              border: Border.all(color: color.withValues(alpha: 0.2)),
            ),
            children: [
              for (final p in prospects)
                DragAndDropItem(
                  key: ValueKey('item_${p.id}'),
                  child: _KanbanCard(
                    p: p,
                    color: color,
                    onTap: () => _openDetail(p),
                  ),
                ),
            ],
          );
        }).toList(),
        onItemReorder:
            (oldItemIndex, oldListIndex, newItemIndex, newListIndex) {
          final fromKey = _stages[oldListIndex].key;
          final fromList = _byStage[fromKey] ?? [];
          if (oldItemIndex < 0 || oldItemIndex >= fromList.length) return;
          _moveProspect(fromList[oldItemIndex], _stages[newListIndex].key);
        },
        onListReorder: (_, __) {},
        axis: Axis.horizontal,
        listWidth: 300,
        itemDivider: const SizedBox(height: 8),
        listDivider: const SizedBox(width: 12),
      ),
    );
  }

  Widget _buildWebBoard(bool canWrite) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final stage in _stages) ...[
            SizedBox(
              width: 300,
              child: Card(
                margin: EdgeInsets.zero,
                elevation: 2,
                shadowColor: Colors.black.withValues(alpha: 0.08),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _ColumnHeader(
                      stage: stage,
                      color: stageColor(stage.key),
                      count: (_byStage[stage.key] ?? []).length,
                    ),
                    Expanded(
                      child: (_byStage[stage.key] ?? []).isEmpty
                          ? _EmptyColumn(color: stageColor(stage.key))
                          : ListView(
                              padding: const EdgeInsets.all(10),
                              children: [
                                for (final p in _byStage[stage.key] ?? [])
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 8),
                                    child: _KanbanCard(
                                      p: p,
                                      color: stageColor(stage.key),
                                      onTap: () => _openDetail(p),
                                    ),
                                  ),
                              ],
                            ),
                    ),
                  ],
                ),
              ),
            ),
            if (stage != _stages.last) const SizedBox(width: 12),
          ],
        ],
      ),
    );
  }

  Widget _buildHeader(bool canWrite) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  decoration: const InputDecoration(
                    hintText: 'Rechercher un prospect…',
                    prefixIcon: Icon(Icons.search),
                    isDense: true,
                  ),
                  onChanged: (v) {
                    _search = v.trim();
                    _load();
                  },
                ),
              ),
              if (canWrite) ...[
                const SizedBox(width: 8),
                FilledButton.icon(
                  onPressed: () async {
                    final created = await Navigator.of(context).push<bool>(
                      MaterialPageRoute(builder: (_) => const ProspectFormScreen()),
                    );
                    if (created == true) _load();
                  },
                  icon: const Icon(Icons.add),
                  label: const Text('Nouveau'),
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String?>(
            initialValue: _source,
            isDense: true,
            decoration: const InputDecoration(labelText: 'Filtrer par source'),
            items: [
              const DropdownMenuItem(value: null, child: Text('Toutes les sources')),
              for (final k in kSourceKeys)
                DropdownMenuItem(value: k, child: Text(kSourceLabels[k] ?? k)),
            ],
            onChanged: (v) {
              _source = v;
              _load();
            },
          ),
        ],
      ),
    );
  }
}

class _ColumnHeader extends StatelessWidget {
  final StageSetting stage;
  final Color color;
  final int count;

  const _ColumnHeader({
    required this.stage,
    required this.color,
    required this.count,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppSpacing.radiusLg)),
        border: Border(bottom: BorderSide(color: color.withValues(alpha: 0.2))),
      ),
      child: Row(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              stage.label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: color,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '$count',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyColumn extends StatelessWidget {
  final Color color;

  const _EmptyColumn({required this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.inbox_outlined, size: 32, color: color.withValues(alpha: 0.4)),
            const SizedBox(height: 8),
            Text(
              'Aucun prospect',
              style: TextStyle(
                fontSize: 12,
                color: color.withValues(alpha: 0.6),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _KanbanCard extends StatelessWidget {
  final Prospect p;
  final Color color;
  final VoidCallback onTap;

  const _KanbanCard({
    required this.p,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final due = p.dueInDays;
    final overdue = due != null && due < 0;
    final today = due == 0;
    final scheme = Theme.of(context).colorScheme;

    return Card(
      margin: EdgeInsets.zero,
      elevation: 2,
      shadowColor: Colors.black.withValues(alpha: 0.08),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpacing.radiusMd)),
      color: scheme.surface,
      child: InkWell(
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: color.withValues(alpha: 0.12),
                    child: Text(
                      initials(p.name),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: color,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      p.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                  ),
                  if (p.numero != null && p.numero!.isNotEmpty)
                    Badge(label: p.numero!, color: Colors.grey),
                ],
              ),
              if (p.company != null && p.company!.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 4, left: 36),
                  child: Text(
                    p.company!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
                  ),
                ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  if (p.source != null && kSourceLabels[p.source] != null)
                    Badge(
                      label: kSourceLabels[p.source]!,
                      color: Colors.blueGrey,
                      icon: Icons.source_outlined,
                    ),
                  if (p.value > 0)
                    Badge(
                      label: money(p.value),
                      color: Colors.indigo,
                      icon: Icons.payments_outlined,
                    ),
                  if (p.quartier != null && p.quartier!.isNotEmpty)
                    Badge(
                      label: p.quartier!,
                      color: Colors.teal,
                      icon: Icons.location_on_outlined,
                    ),
                ],
              ),
              const SizedBox(height: 10),
              if (p.stepsTotal > 0) ...[
                Row(
                  children: [
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: (p.stepsDone / p.stepsTotal).clamp(0.0, 1.0),
                          minHeight: 5,
                          backgroundColor: color.withValues(alpha: 0.15),
                          color: color,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${p.stepsDone}/${p.stepsTotal}',
                      style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
              ],
              Row(
                children: [
                  Expanded(
                    child: p.nextActionDate != null
                        ? Row(
                            children: [
                              Icon(
                                overdue ? Icons.error_outline : Icons.event,
                                size: 14,
                                color: overdue ? Colors.red : (today ? Colors.amber.shade700 : scheme.onSurfaceVariant),
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  formatDate(p.nextActionDate),
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: overdue
                                        ? Colors.red
                                        : (today ? Colors.amber.shade700 : scheme.onSurfaceVariant),
                                    fontWeight: FontWeight.w600,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          )
                        : Text(
                            'Aucune action',
                            style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant.withValues(alpha: 0.6)),
                          ),
                  ),
                  Tooltip(
                    message: 'Score ${p.score}/100',
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: scoreColor(p.score).withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          '${p.score}',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: scoreColor(p.score),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}