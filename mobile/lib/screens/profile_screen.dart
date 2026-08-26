import 'dart:convert';
import 'package:flutter/material.dart' hide Badge;
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';

import '../config/app_theme.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/constants.dart';
import '../utils/formatters.dart';
import '../widgets/charts.dart';
import '../widgets/common.dart';
import 'notifications_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  StatsOverview? _stats;
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
      final stats = await _api.statsOverview();
      if (mounted) setState(() => _stats = stats);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _changePassword() async {
    final current = TextEditingController();
    final next = TextEditingController();
    final confirm = TextEditingController();
    final submitted = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Changer le mot de passe'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: current,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Mot de passe actuel',
              ),
            ),
            TextField(
              controller: next,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Nouveau mot de passe',
              ),
            ),
            TextField(
              controller: confirm,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Confirmer'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () async {
              if (next.text.length < 6) return;
              if (next.text != confirm.text) return;
              try {
                await _api.updateProfile({
                  'password': next.text,
                  'current_password': current.text,
                });
                if (ctx.mounted) Navigator.pop(ctx, true);
              } catch (_) {
                if (ctx.mounted) Navigator.pop(ctx, false);
              }
            },
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
    if (submitted == true && mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Mot de passe mis à jour')));
    }
  }

  Future<void> _editName() async {
    final auth = context.read<AuthProvider>();
    final user = auth.user;
    if (user == null) return;
    final firstC = TextEditingController(text: user.first_name ?? '');
    final lastC = TextEditingController(text: user.last_name ?? '');
    final emailC = TextEditingController(text: user.email);
    final messenger = ScaffoldMessenger.of(context);
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Modifier mon profil'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: firstC,
                decoration: const InputDecoration(
                  labelText: 'Prénom',
                  isDense: true,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: lastC,
                decoration: const InputDecoration(
                  labelText: 'Nom',
                  isDense: true,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: emailC,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  isDense: true,
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
    if (saved != true) return;
    final first = firstC.text.trim();
    final last = lastC.text.trim();
    final email = emailC.text.trim();
    final fullName = [first, last].where((s) => s.isNotEmpty).join(' ').trim();
    try {
      await _api.updateProfile({
        'first_name': first,
        'last_name': last,
        if (fullName.isNotEmpty) 'name': fullName,
        if (email.isNotEmpty) 'email': email,
      });
      await auth.refreshUser();
      messenger.showSnackBar(
        const SnackBar(content: Text('Profil mis à jour')),
      );
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _pickAvatar() async {
    final auth = context.read<AuthProvider>();
    final picker = ImagePicker();
    final XFile? image = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 512,
      maxHeight: 512,
      imageQuality: 75,
    );
    if (image == null) return;
    final bytes = await image.readAsBytes();
    if (bytes.length > 6 * 1024 * 1024) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Image trop grande (max ~6 Mo)')),
        );
      }
      return;
    }
    final base64 = base64Encode(bytes);
    final mime = image.mimeType ?? 'image/jpeg';
    final dataUrl = 'data:$mime;base64,$base64';
    try {
      await _api.updateProfile({'avatar': dataUrl});
      await auth.refreshUser();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Photo de profil mise à jour')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    if (user == null) return const SizedBox.shrink();

    final stats = _stats;
    return Scaffold(
      appBar: AppBar(title: const Text('Profil')),
      body: _error != null && stats == null
          ? ErrorRetry(message: _error!, onRetry: _load)
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  Center(
                    child: Column(
                      children: [
                        Avatar(name: user.name, image: user.avatar, radius: 36),
                        const SizedBox(height: 10),
                        Text(
                          user.name,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Badge(
                          label: kRoleLabels[user.role] ?? user.role,
                          color: kPrimary,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          user.email,
                          style: TextStyle(
                            color: Theme.of(
                              context,
                            ).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (stats != null)
                    Column(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: KpiCard(
                                icon: Icons.people_outline,
                                value: '${stats.total}',
                                label: 'Prospects',
                                color: kPrimary,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: KpiCard(
                                icon: Icons.groups_outlined,
                                value: '${stats.converted}',
                                label: 'Convertis',
                                color: Colors.green,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: KpiCard(
                                icon: Icons.pause_circle_outline,
                                value: '${stats.active}',
                                label: 'Actifs',
                                color: Colors.orange,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: KpiCard(
                                icon: Icons.cancel_outlined,
                                value: '${stats.lost}',
                                label: 'Perdus',
                                color: Colors.red,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  const SizedBox(height: 16),
                  SectionCard(
                    title: 'Compte',
                    child: Column(
                      children: [
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(
                            Icons.image_outlined,
                            color: kPrimary,
                          ),
                          title: const Text('Changer la photo'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: _pickAvatar,
                        ),
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(
                            Icons.edit_outlined,
                            color: kPrimary,
                          ),
                          title: const Text('Modifier le nom'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: _editName,
                        ),
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(
                            Icons.lock_outline,
                            color: kPrimary,
                          ),
                          title: const Text('Changer le mot de passe'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: _changePassword,
                        ),
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(
                            Icons.notifications_outlined,
                            color: kPrimary,
                          ),
                          title: const Text('Notifications'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const NotificationsScreen(),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  SectionCard(
                    title: 'Informations',
                    child: Column(
                      children: [
                        InfoRow(
                          icon: Icons.badge_outlined,
                          label: 'Rôle',
                          value: kRoleLabels[user.role] ?? user.role,
                        ),
                        InfoRow(
                          icon: Icons.person_outline,
                          label: 'Manager',
                          value: user.manager_name,
                        ),
                        InfoRow(
                          icon: Icons.calendar_today,
                          label: 'Date de création',
                          value: formatIsoDate(user.created_at),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  OutlinedButton.icon(
                    onPressed: () async {
                      final ok = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('Déconnexion'),
                          content: const Text(
                            'Voulez-vous vraiment vous déconnecter ?',
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(ctx, false),
                              child: const Text('Annuler'),
                            ),
                            FilledButton(
                              onPressed: () => Navigator.pop(ctx, true),
                              style: FilledButton.styleFrom(
                                backgroundColor: Colors.red,
                              ),
                              child: const Text('Déconnexion'),
                            ),
                          ],
                        ),
                      );
                      if (ok == true) await auth.logout();
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                      side: const BorderSide(color: Colors.red),
                    ),
                    icon: const Icon(Icons.logout),
                    label: const Text('Se déconnecter'),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }
}
