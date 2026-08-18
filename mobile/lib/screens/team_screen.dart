import 'dart:async';

import 'package:flutter/material.dart' hide Badge;
import 'package:provider/provider.dart';

import '../config/app_theme.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/constants.dart';
import '../utils/formatters.dart';
import '../widgets/common.dart';

class TeamScreen extends StatefulWidget {
  const TeamScreen({super.key});

  @override
  State<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends State<TeamScreen> {
  List<User>? _users;
  List<ByUserStat>? _stats;
  String? _error;
  bool _expanded = false;
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  String _role = 'commercial';
  bool _saving = false;
  Timer? _refreshTimer;

  ApiClient get _api => context.read<AuthProvider>().api;

  @override
  void initState() {
    super.initState();
    _load();
    _refreshTimer = Timer.periodic(const Duration(minutes: 2), (_) => _load());
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final users = await _api.users();
      final stats = await _api.statsByUser();
      if (mounted) {
        setState(() {
          _users = users;
          _stats = stats;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _createUser() async {
    if (_name.text.trim().isEmpty || _email.text.trim().isEmpty || _password.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Renseignez tous les champs')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final res = await _api.createUser({
        'name': _name.text.trim(),
        'email': _email.text.trim(),
        'password': _password.text,
        'role': _role,
      });
      final note = switch (res.emailStatus) {
        'sent' => 'Compte créé. Email de bienvenue envoyé à ${res.user.email}.',
        'error' => 'Compte créé mais l\'email n\'a pas pu être envoyé (erreur SMTP).',
        _ => 'Compte créé. Email non envoyé : SMTP non configuré sur le serveur.',
      };
      _name.clear();
      _email.clear();
      _password.clear();
      setState(() {
        _expanded = false;
        _role = 'commercial';
      });
      _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(note)));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _editUser(User u) async {
    final nameC = TextEditingController(text: u.name);
    final emailC = TextEditingController(text: u.email);
    final passC = TextEditingController();
    String role = u.role;
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => AlertDialog(
          title: Text('Modifier « ${u.name} »'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameC,
                  autofocus: true,
                  decoration: const InputDecoration(labelText: 'Nom', isDense: true),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: emailC,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email', isDense: true),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: passC,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Nouveau mot de passe (optionnel)',
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: role,
                  isDense: true,
                  decoration: const InputDecoration(labelText: 'Rôle'),
                  items: [
                    for (final e in kRoleLabels.entries)
                      DropdownMenuItem(value: e.key, child: Text(e.value)),
                  ],
                  onChanged: (v) => setModalState(() => role = v ?? role),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: FilledButton.styleFrom(backgroundColor: kPrimary),
              child: const Text('Enregistrer'),
            ),
          ],
        ),
      ),
    );
    if (saved != true) return;
    try {
      await _api.updateUser(u.id, {
        'name': nameC.text.trim(),
        'email': emailC.text.trim(),
        'role': role,
        if (passC.text.isNotEmpty) 'password': passC.text,
      });
      _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Utilisateur mis à jour')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _deleteUser(User u) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Supprimer « ${u.name} » ?'),
        content: const Text('Le compte sera archivé et l\'utilisateur ne pourra plus se connecter.'),
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
      await _api.deleteUser(u.id);
      _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Utilisateur supprimé')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Équipe')),
      body: _error != null
          ? ErrorRetry(message: _error!, onRetry: _load)
          : _users == null
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(12),
                    children: [
                      if (_expanded) _createCard(),
                      for (final u in _users!) _userCard(u),
                      const SizedBox(height: 80),
                    ],
                  ),
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => setState(() => _expanded = !_expanded),
        tooltip: 'Ajouter un utilisateur',
        child: Icon(_expanded ? Icons.close : Icons.person_add_alt),
      ),
    );
  }

  Widget _createCard() {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              children: [
                const Icon(Icons.person_add_alt, color: kPrimary),
                const SizedBox(width: 8),
                Text('Nouvel utilisateur',
                    style: Theme.of(context)
                        .textTheme
                        .titleSmall
                        ?.copyWith(fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _name,
              decoration: const InputDecoration(labelText: 'Nom', isDense: true),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Email', isDense: true),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _password,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Mot de passe', isDense: true),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _role,
              isDense: true,
              decoration: const InputDecoration(labelText: 'Rôle'),
              items: [
                for (final e in kRoleLabels.entries)
                  DropdownMenuItem(value: e.key, child: Text(e.value)),
              ],
              onChanged: (v) => setState(() => _role = v ?? 'commercial'),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _saving ? null : _createUser,
                style: FilledButton.styleFrom(backgroundColor: kPrimary),
                icon: const Icon(Icons.add),
                label: Text(_saving ? 'Création…' : 'Créer'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _userCard(User u) {
    final stat = _stats?.where((s) => s.id == u.id).firstOrNull;
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
                Avatar(name: u.name, image: u.avatar, radius: 18),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(u.name,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis),
                      Text(
                        [kRoleLabels[u.role] ?? u.role, u.email]
                            .where((s) => s.isNotEmpty)
                            .join(' • '),
                        style: const TextStyle(fontSize: 11, color: Colors.grey),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                if (u.isAdmin) const Badge(label: 'Admin', color: Colors.deepOrange),
                IconButton(
                  icon: const Icon(Icons.edit_outlined, size: 18),
                  color: kPrimary,
                  tooltip: 'Modifier',
                  onPressed: () => _editUser(u),
                ),
                if (u.id != context.read<AuthProvider>().user?.id)
                  IconButton(
                    icon: const Icon(Icons.delete_outline, size: 18),
                    color: Colors.red,
                    tooltip: 'Supprimer',
                    onPressed: () => _deleteUser(u),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _stat('${stat?.total ?? 0}', 'prospects'),
                _stat('${stat?.converted ?? 0}', 'convertis'),
                _stat('${stat?.lost ?? 0}', 'perdus'),
                _stat(money(stat?.value ?? 0), 'CA'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _stat(String value, String label) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          Text(label,
              style: const TextStyle(fontSize: 11, color: Colors.grey),
              maxLines: 1,
              overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}