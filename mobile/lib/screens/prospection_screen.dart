import 'package:flutter/material.dart' hide Badge;
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:file_picker_platform_interface/file_picker_platform_interface.dart';

import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/constants.dart';
import '../utils/formatters.dart';
import '../widgets/common.dart';
import 'prospect_detail_screen.dart';
import 'prospect_form_screen.dart';
import 'step_form_screen.dart';

class ProspectionScreen extends StatefulWidget {
  const ProspectionScreen({super.key});

  @override
  State<ProspectionScreen> createState() => _ProspectionScreenState();
}

class _ProspectionScreenState extends State<ProspectionScreen> {
  List<StageSetting> _stages = [];
  List<Prospect>? _prospects;
  String? _error;
  String _search = '';
  String? _selectedStage;

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
      final (rows, _) = await _api.prospects(search: _search, stage: _selectedStage);
      if (mounted) {
        setState(() {
          _stages = stages;
          _prospects = rows;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _openStep(Prospect p) async {
    try {
      final steps = await _api.steps(p.id);
      if (steps.isEmpty) return;
      final active = steps.where((s) => !s.isValidated).firstOrNull ?? steps.first;
      if (!mounted) return;
      final changed = await Navigator.of(context).push<bool>(
        MaterialPageRoute(builder: (_) => StepFormScreen(step: active, prospect: p)),
      );
      if (changed == true) _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _importCsv() async {
    try {
      final files = await FilePickerPlatform.instance.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['csv'],
      );
      if (files.isEmpty) return;
      final file = files.first;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Import en cours…')));
      final bytes = await file.readAsBytes();
      final res = await _api.importProspects(bytes);
      _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Importé : ${res['created']} prospect(s)${(res['errors'] as List).isNotEmpty ? ', ${res['errors'].length} erreur(s)' : ''}'),
          duration: const Duration(seconds: 4),
          action: (res['errors'] as List).isNotEmpty
              ? SnackBarAction(
                  label: 'Voir erreurs',
                  onPressed: () {
                    final errors = res['errors'] as List;
                    showDialog(
                      context: context,
                      builder: (_) => AlertDialog(
                        title: const Text('Erreurs d\'import'),
                        content: SizedBox(
                          width: double.maxFinite,
                          child: ListView.separated(
                            shrinkWrap: true,
                            itemCount: errors.length,
                            separatorBuilder: (_, __) => const Divider(),
                            itemBuilder: (_, i) => ListTile(
                              dense: true,
                              title: Text('Ligne ${errors[i]['row']}'),
                              subtitle: Text(errors[i]['error']),
                            ),
                          ),
                        ),
                        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))],
                      ),
                    );
                  },
                )
              : null,
        ),
      );
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur import : $e')));
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
                  child: CustomScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    slivers: [
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                          child: TextField(
                            decoration: InputDecoration(
                              hintText: 'Rechercher…',
                              prefixIcon: const Icon(Icons.search),
                              suffixIcon: canWrite
                                  ? IconButton(
                                      icon: const Icon(Icons.upload_file),
                                      tooltip: 'Importer CSV',
                                      onPressed: _importCsv,
                                    )
                                  : null,
                              isDense: true,
                            ),
                            onChanged: (v) {
                              _search = v.trim();
                              _load();
                            },
                          ),
                        ),
                      ),
                      if (_stages.isNotEmpty)
                        SliverToBoxAdapter(
                          child: SizedBox(
                            height: 44,
                            child: ListView(
                              scrollDirection: Axis.horizontal,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              children: [
                                _pill(null, 'Toutes les étapes'),
                                for (final s in _stages) _pill(s.key, s.label),
                              ],
                            ),
                          ),
                        ),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          child: Text(
                            _prospects == null
                                ? ''
                                : '${_prospects!.length} prospect(s)',
                            style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
                          ),
                        ),
                      ),
                      if (_prospects!.isEmpty)
                        const SliverFillRemaining(
                          hasScrollBody: false,
                          child: EmptyState(message: 'Aucun prospect'),
                        )
                      else
                        SliverPadding(
                          padding: const EdgeInsets.all(12),
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (context, i) => _prospectTile(_prospects![i], canWrite),
                              childCount: _prospects!.length,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
      floatingActionButton: canWrite
          ? FloatingActionButton(
              onPressed: () async {
                final created = await Navigator.of(context).push<bool>(
                  MaterialPageRoute(builder: (_) => const ProspectFormScreen()),
                );
                if (created == true) _load();
              },
              tooltip: 'Nouveau prospect',
              child: const Icon(Icons.add),
            )
          : null,
    );
  }

  Widget _pill(String? key, String label) {
    final selected = _selectedStage == key;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) {
          _selectedStage = key;
          _load();
        },
      ),
    );
  }

  Widget _prospectTile(Prospect p, bool canWrite) {
    final color = p.currentStep != null ? colorFromName(p.currentStep!.color) : Colors.indigo;
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () async {
          final fresh = await _api.prospect(p.id);
          if (!mounted) return;
          await Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => ProspectDetailScreen(prospect: fresh)),
          );
          _load();
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                backgroundColor: color.withValues(alpha: 0.15),
                child: Text(
                  initials(p.name),
                  style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                    if (p.company != null && p.company!.isNotEmpty)
                      Text(p.company!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                    const SizedBox(height: 6),
                    if (p.stepsTotal > 0)
                      Row(
                        children: [
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: (p.stepsDone / p.stepsTotal).clamp(0.0, 1.0),
                                minHeight: 6,
                                color: color,
                                backgroundColor: Colors.grey.withValues(alpha: 0.2),
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text('${p.stepsDone}/${p.stepsTotal}',
                              style: const TextStyle(fontSize: 11)),
                        ],
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Badge(
                    label: p.currentStep?.name ?? (p.stage ?? ''),
                    color: color,
                  ),
                  if (canWrite) ...[
                    const SizedBox(height: 6),
                    TextButton.icon(
                      onPressed: () => _openStep(p),
                      style: TextButton.styleFrom(
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                      ),
                      icon: const Icon(Icons.edit_note, size: 16),
                      label: const Text('Renseigner', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}