import 'package:flutter/material.dart' hide Badge;
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../config/app_theme.dart';
import '../models/settings.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../widgets/common.dart';
import '../widgets/skeleton.dart';

class AuditLogScreen extends StatefulWidget {
  const AuditLogScreen({super.key});

  @override
  State<AuditLogScreen> createState() => _AuditLogScreenState();
}

class _AuditLogScreenState extends State<AuditLogScreen> {
  List<AuditLogEntry>? _entries;
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
      final entries = await _api.auditLog();
      if (mounted) {
        setState(() => _entries = entries);
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Journal d\'audit')),
      body: _error != null
          ? ErrorRetry(message: _error!, onRetry: _load)
          : _entries == null
              ? const SkeletonScreen(showStats: false)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _entries!.isEmpty
                      ? const EmptyState(message: 'Aucune entrée d\'audit')
                      : ListView.separated(
                          padding: const EdgeInsets.all(12),
                          itemCount: _entries!.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (context, i) => _entryTile(_entries![i]),
                        ),
                ),
    );
  }

  Widget _entryTile(AuditLogEntry e) {
    final date = e.createdAt != null
        ? DateFormat('dd/MM/yyyy HH:mm').format(DateTime.parse(e.createdAt!).toLocal())
        : '';
    return Card(
      color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                if (e.userName != null) ...[
                  Avatar(name: e.userName!, radius: 14),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(e.userName!,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  ),
                ],
                Text(date,
                    style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant)),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                Badge(label: e.action, color: kPrimary),
                if (e.details != null && e.details!.isNotEmpty)
                  Badge(label: e.details!, color: Colors.grey),
              ],
            ),
          ],
        ),
      ),
    );
  }
}