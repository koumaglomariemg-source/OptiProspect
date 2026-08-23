import 'package:flutter/material.dart' hide Badge;
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/constants.dart';
import '../utils/formatters.dart';
import '../widgets/common.dart';
import 'report_form_screen.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  List<Report>? _reports;
  String? _error;
  String? _status;

  ApiClient get _api => context.read<AuthProvider>().api;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final items = await _api.reports(status: _status);
      if (mounted) setState(() => _reports = items);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _review(Report r, String decision) async {
    final controller = TextEditingController();
    final required = decision == 'refuse';
    final comment = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(decision == 'valide' ? 'Valider le rapport' : 'Refuser le rapport'),
        content: TextField(
          controller: controller,
          maxLines: 3,
          decoration: InputDecoration(
            labelText: required ? 'Motif *' : 'Commentaire (optionnel)',
            alignLabelWithHint: true,
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          FilledButton(
            onPressed: () {
              final v = controller.text.trim();
              if (required && v.isEmpty) return;
              Navigator.pop(ctx, v);
            },
            child: const Text('Confirmer'),
          ),
        ],
      ),
    );
    if (comment == null) return;
    try {
      await _api.reviewReport(r.id, decision, comment: comment);
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
    final user = auth.user;
    final isManager = user?.isManager == true || user?.isAdmin == true;
    final isCommercial = user?.role == 'commercial';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rapports'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                _chip(null, 'Tous'),
                for (final e in kReportStatusLabels.entries) _chip(e.key, e.value),
              ],
            ),
          ),
        ),
      ),
      body: _error != null
          ? ErrorRetry(message: _error!, onRetry: _load)
          : _reports == null
              ? const Center(child: CircularProgressIndicator())
              : _reports!.isEmpty
                  ? const EmptyState(message: 'Aucun rapport')
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(12),
                        itemCount: _reports!.length,
                        itemBuilder: (context, i) => _reportCard(_reports![i], isManager),
                      ),
                    ),
      floatingActionButton: isCommercial
          ? FloatingActionButton(
              onPressed: () async {
                final created = await Navigator.of(context).push<bool>(
                  MaterialPageRoute(builder: (_) => const ReportFormScreen()),
                );
                if (created == true) _load();
              },
              tooltip: 'Soumettre un rapport',
              child: const Icon(Icons.add),
            )
          : null,
    );
  }

  Widget _chip(String? key, String label) {
    final selected = _status == key;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) {
          _status = key;
          _load();
        },
      ),
    );
  }

  Widget _reportCard(Report r, bool isManager) {
    final color = reportStatusColor(r.status);
    final needsReview = isManager && r.status == 'en_attente';
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
                CircleAvatar(
                  radius: 16,
                  backgroundColor: Colors.indigo.withValues(alpha: 0.15),
                  child: Text(initials(r.userName ?? ''),
                      style: const TextStyle(fontSize: 11, color: Colors.indigo)),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(r.userName ?? '—',
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
                Badge(label: kReportStatusLabels[r.status] ?? r.status, color: color),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              [formatIsoDate(r.periodStart), formatIsoDate(r.periodEnd)]
                  .where((s) => s != '—')
                  .join(' → '),
              style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _counter(Icons.call_outlined, '${r.calls} appels'),
                _counter(Icons.email_outlined, '${r.emails} emails'),
                _counter(Icons.folder_open_outlined, '${r.visits} visites'),
              ],
            ),
            const SizedBox(height: 8),
            Text(r.content, maxLines: 5, overflow: TextOverflow.ellipsis),
            if (r.reviewComment != null && r.reviewComment!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text('Avis : ${r.reviewComment}',
                  style: const TextStyle(fontStyle: FontStyle.italic, fontSize: 12)),
            ],
            if (r.reviewedByName != null) ...[
              const SizedBox(height: 4),
              Text('Décision prise par : ${r.reviewedByName}',
                  style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant)),
            ],
            if (needsReview) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () => _review(r, 'valide'),
                      style: FilledButton.styleFrom(backgroundColor: Colors.green),
                      icon: const Icon(Icons.check_circle_outline, size: 18),
                      label: const Text('Valider'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _review(r, 'refuse'),
                      style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                      icon: const Icon(Icons.cancel_outlined, size: 18),
                      label: const Text('Refuser'),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _counter(IconData icon, String text) {
    return Expanded(
      child: Row(
        children: [
          Icon(icon, size: 16, color: Theme.of(context).colorScheme.onSurfaceVariant),
          const SizedBox(width: 4),
          Flexible(
            child: Text(text,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)),
          ),
        ],
      ),
    );
  }
}