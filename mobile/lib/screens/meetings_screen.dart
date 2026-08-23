import 'package:flutter/material.dart' hide Badge;
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/formatters.dart';
import '../widgets/common.dart';
import 'meeting_form_screen.dart';

class MeetingsScreen extends StatefulWidget {
  const MeetingsScreen({super.key});

  @override
  State<MeetingsScreen> createState() => _MeetingsScreenState();
}

class _MeetingsScreenState extends State<MeetingsScreen> {
  List<Meeting>? _meetings;
  String? _error;
  String? _type;

  ApiClient get _api => context.read<AuthProvider>().api;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final items = await _api.meetings(type: _type);
      if (mounted) setState(() => _meetings = items);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _delete(Meeting m) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer cette réunion ?'),
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
      await _api.deleteMeeting(m.id);
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
    final isManager = auth.user?.isManager == true || auth.user?.isAdmin == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Réunions'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                _chip(null, 'Toutes'),
                _chip('en_ligne', 'En ligne'),
                _chip('presentiel', 'Présentiel'),
              ],
            ),
          ),
        ),
      ),
      body: _error != null
          ? ErrorRetry(message: _error!, onRetry: _load)
          : _meetings == null
              ? const Center(child: CircularProgressIndicator())
              : _meetings!.isEmpty
                  ? const EmptyState(message: 'Aucune réunion')
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(12),
                        itemCount: _meetings!.length,
                        itemBuilder: (context, i) => _meetingCard(_meetings![i], isManager),
                      ),
                    ),
      floatingActionButton: isManager
          ? FloatingActionButton(
              onPressed: () async {
                final created = await Navigator.of(context).push<bool>(
                  MaterialPageRoute(builder: (_) => const MeetingFormScreen()),
                );
                if (created == true) _load();
              },
              tooltip: 'Nouvelle réunion',
              child: const Icon(Icons.add),
            )
          : null,
    );
  }

  Widget _chip(String? key, String label) {
    final selected = _type == key;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) {
          _type = key;
          _load();
        },
      ),
    );
  }

  Widget _meetingCard(Meeting m, bool isManager) {
    final start = parseIso(m.startsAt);
    final isOnline = m.type == 'en_ligne';
    final color = isOnline ? Colors.indigo : Colors.teal;
    final dayStr = start == null ? '—' : '${start.day.toString().padLeft(2, '0')}/${start.month.toString().padLeft(2, '0')}';
    final timeStr = start == null
        ? 'Date à définir'
        : '${start.hour.toString().padLeft(2, '0')}:${start.minute.toString().padLeft(2, '0')}';

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
                Column(
                  children: [
                    Text(dayStr,
                      style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                    Text('${start?.day ?? ''}',
                        style: const TextStyle(
                            fontSize: 20, fontWeight: FontWeight.bold, color: Colors.indigo)),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(m.title,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis),
                      Text(
                        [timeStr, m.location ?? ''].where((s) => s.isNotEmpty).join(' • '),
                        style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
                Badge(label: isOnline ? 'En ligne' : 'Présentiel', color: color),
                if (isManager) ...[
                  const SizedBox(width: 4),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, size: 20, color: Colors.red),
                    onPressed: () => _delete(m),
                  ),
                ],
              ],
            ),
            if (m.meetingLink != null && m.meetingLink!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.videocam_outlined, size: 16, color: Theme.of(context).colorScheme.onSurfaceVariant),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(m.meetingLink!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, color: Colors.blue)),
                  ),
                ],
              ),
            ],
            if (m.notes != null && m.notes!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(m.notes!, maxLines: 3, overflow: TextOverflow.ellipsis),
            ],
            if (m.participants.isNotEmpty) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.group_outlined, size: 16, color: Theme.of(context).colorScheme.onSurfaceVariant),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      m.participants.map((p) => p.name).join(', '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                  ),
                ],
              ),
            ],
            if (m.createdByName != null) ...[
              const SizedBox(height: 4),
              Text('Créée par : ${m.createdByName}',
                  style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant)),
            ],
          ],
        ),
      ),
    );
  }
}