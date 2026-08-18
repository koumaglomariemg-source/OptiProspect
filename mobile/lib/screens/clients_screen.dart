import 'package:flutter/material.dart' hide Badge;
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/formatters.dart';
import '../widgets/common.dart';

class ClientsScreen extends StatefulWidget {
  const ClientsScreen({super.key});

  @override
  State<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends State<ClientsScreen> {
  List<ClientInfo>? _clients;
  String? _error;
  String _search = '';
  int? _expanded;

  ApiClient get _api => context.read<AuthProvider>().api;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final items = await _api.clients();
      if (mounted) setState(() => _clients = items);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  double get _totalValide =>
      (_clients ?? []).fold(0.0, (s, c) => s + c.totalValide);

  @override
  Widget build(BuildContext context) {
    final filtered = (_clients ?? [])
        .where((c) {
          if (_search.isEmpty) return true;
          final q = _search.toLowerCase();
          return c.name.toLowerCase().contains(q) ||
              (c.company?.toLowerCase().contains(q) ?? false) ||
              (c.email?.toLowerCase().contains(q) ?? false);
        })
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Clients'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(76),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
            child: Column(
              children: [
                TextField(
                  decoration: const InputDecoration(
                    hintText: 'Nom, société, email…',
                    prefixIcon: Icon(Icons.search),
                    isDense: true,
                  ),
                  onChanged: (v) => setState(() => _search = v.trim()),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Text('${filtered.length} client(s)',
                        style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    const Spacer(),
                    if (_totalValide > 0)
                      Badge(label: '${money(_totalValide)} de devis validés', color: Colors.green),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
      body: _error != null
          ? ErrorRetry(message: _error!, onRetry: _load)
          : _clients == null
              ? const Center(child: CircularProgressIndicator())
              : filtered.isEmpty
                  ? const EmptyState(message: 'Aucun client')
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(12),
                        itemCount: filtered.length,
                        itemBuilder: (context, i) => _clientCard(filtered[i], i),
                      ),
                    ),
    );
  }

  Widget _clientCard(ClientInfo c, int index) {
    final expanded = _expanded == index;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => setState(() => _expanded = expanded ? null : index),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: Colors.green.withValues(alpha: 0.15),
                    child: Text(initials(c.name),
                        style: const TextStyle(color: Colors.green, fontSize: 13, fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(c.name,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                        Text(
                          [c.company ?? '', 'client depuis le ${formatIsoDate(c.convertedAt)}']
                              .where((s) => s.isNotEmpty && s != '—')
                              .join(' • '),
                          style: const TextStyle(fontSize: 12, color: Colors.grey),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  if (c.value > 0)
                    Text(money(c.value),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _stat(Icons.request_quote, '${c.validDevis}', 'devis validés'),
                  _stat(Icons.chat_outlined, '${c.interactions}', 'interactions'),
                  _stat(Icons.schedule, formatIsoDate(c.lastInteraction), 'dernier contact'),
                ],
              ),
              if (expanded) ...[
                const Divider(height: 16),
                InfoRow(icon: Icons.mail_outline, label: 'Email', value: c.email),
                InfoRow(icon: Icons.phone, label: 'Téléphone', value: c.phone),
                InfoRow(icon: Icons.person_outline, label: 'Commercial', value: c.assigneeName),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _stat(IconData icon, String value, String label) {
    return Expanded(
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              '$value $label',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}