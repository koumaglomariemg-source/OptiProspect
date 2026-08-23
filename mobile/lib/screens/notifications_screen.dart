import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/formatters.dart';
import '../widgets/common.dart';
import '../widgets/skeleton.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<AppNotification>? _notifications;
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
      final items = await _api.notifications();
      if (mounted) setState(() => _notifications = items);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _toggleRead(AppNotification n) async {
    if (n.read) return;
    try {
      await _api.markNotificationRead(n.id);
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _markAll() async {
    try {
      await _api.readAllNotifications();
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final notifications = _notifications;
    final hasUnread = (notifications ?? []).any((n) => !n.read);

    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: _error != null
          ? ErrorRetry(message: _error!, onRetry: _load)
          : notifications == null
              ? const SkeletonScreen(showStats: false)
              : notifications.isEmpty
                  ? const EmptyState(message: 'Aucune notification')
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(12),
                        itemCount: notifications.length,
                        itemBuilder: (context, i) {
                          final n = notifications[i];
                          return Dismissible(
                            key: ValueKey(n.id),
                            direction: DismissDirection.endToStart,
                            background: Container(
                              color: Colors.red,
                              alignment: Alignment.centerRight,
                              padding: const EdgeInsets.only(right: 16),
                              child: const Icon(Icons.done_all, color: Colors.white),
                            ),
                            onDismissed: (_) => _toggleRead(n),
                            child: _notificationCard(n),
                          );
                        },
                      ),
                    ),
      floatingActionButton: hasUnread
          ? FloatingActionButton.extended(
              onPressed: _markAll,
              icon: const Icon(Icons.done_all),
              label: const Text('Tout marquer lu'),
            )
          : null,
    );
  }

  Widget _notificationCard(AppNotification n) {
    final icon = switch (n.type) {
      'succes' => Icons.check_circle_outline,
      'warning' => Icons.warning_amber_outlined,
      'meeting' => Icons.event,
      'report' => Icons.description_outlined,
      'devis' => Icons.request_quote_outlined,
      _ => Icons.notifications_outlined,
    };
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: n.read
          ? null
          : Theme.of(context).colorScheme.primary.withValues(alpha: 0.08),
      child: ListTile(
        onTap: () => _toggleRead(n),
        leading: CircleAvatar(
          backgroundColor: n.read
              ? Colors.grey.withValues(alpha: 0.2)
              : Theme.of(context).colorScheme.primary.withValues(alpha: 0.15),
          child: Icon(icon, size: 18),
        ),
        title: Text(
          n.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontWeight: n.read ? FontWeight.normal : FontWeight.bold,
          ),
        ),
        subtitle: Text(
          [n.message, formatIsoDateTime(n.createdAt)]
              .where((s) => s.isNotEmpty && s != '—')
              .join(' • '),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 12),
        ),
        trailing: !n.read
            ? Icon(Icons.circle, size: 10, color: Theme.of(context).colorScheme.primary)
            : null,
      ),
    );
  }
}