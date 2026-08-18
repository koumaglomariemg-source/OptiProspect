import 'package:flutter/material.dart' hide Badge;
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/constants.dart';
import '../utils/formatters.dart';
import '../widgets/common.dart';
import 'devis_form_screen.dart';

class DevisDetailScreen extends StatefulWidget {
  final Devis devis;

  const DevisDetailScreen({super.key, required this.devis});

  @override
  State<DevisDetailScreen> createState() => _DevisDetailScreenState();
}

class _DevisDetailScreenState extends State<DevisDetailScreen> {
  late Devis _devis;

  ApiClient get _api => context.read<AuthProvider>().api;

  @override
  void initState() {
    super.initState();
    _devis = widget.devis;
  }

  Future<void> _edit() async {
    final edited = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => DevisFormScreen(devis: _devis)),
    );
    if (edited == true) _reload();
  }

  Future<void> _reload() async {
    try {
      final items = await _api.devis(search: _devis.reference);
      if (items.isNotEmpty && mounted) setState(() => _devis = items.first);
    } catch (_) {}
  }

  Future<void> _submit() async {
    try {
      await _api.submitDevis(_devis.id);
      _reload();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _validate() async {
    final comment = await _askComment('Valider le devis', required: false);
    if (comment == null) return;
    try {
      await _api.validateDevis(_devis.id, comment: comment);
      _reload();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _refuse() async {
    final comment = await _askComment('Refuser le devis', required: true);
    if (comment == null) return;
    try {
      await _api.refuseDevis(_devis.id, comment: comment);
      _reload();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<String?> _askComment(String title, {required bool required}) async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
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
  }

  Future<void> _delete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer ce devis ?'),
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
      await _api.deleteDevis(_devis.id);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = _devis;
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final color = devisStatusColor(d.statut);
    final isOwner = user?.id == d.createdBy;
    final canEdit = isOwner && d.statut == 'brouillon';
    final isManagerOrAdmin = user?.isManager == true || user?.isAdmin == true;
    final canReview = isManagerOrAdmin && d.statut == 'attente_validation';

    return Scaffold(
      appBar: AppBar(
        title: Text(d.reference),
        actions: [
          if (canEdit)
            IconButton(icon: const Icon(Icons.edit_outlined), onPressed: _edit),
          if (canEdit)
            IconButton(
              icon: const Icon(Icons.delete_outline, color: Colors.red),
              onPressed: _delete,
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Badge(label: kDevisStatusLabels[d.statut] ?? d.statut, color: color),
              const Spacer(),
              if (d.prospectName != null)
                Text([d.prospectName, d.prospectCompany].where((s) => s != null && s.isNotEmpty).join(' — '),
                    style: const TextStyle(fontSize: 12)),
            ],
          ),
          const SizedBox(height: 12),
          Text(d.titre, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
          if (d.description != null && d.description!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(d.description!),
          ],
          const SizedBox(height: 16),
          SectionCard(
            title: 'Lignes',
            child: Column(
              children: [
                for (final item in d.items)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${item.qty} × ${item.name}'
                            '${item.period != null && item.period != 'ponctuel' ? ' (${kPeriodLabels[item.period]})' : ''}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text(money(item.total), style: const TextStyle(fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                const Divider(height: 16),
                Row(
                  children: [
                    const Expanded(child: Text('Total HT', style: TextStyle(fontWeight: FontWeight.bold))),
                    Text(money(d.montant),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ],
                ),
                if (d.arr > 0)
                  Row(
                    children: [
                      const Expanded(child: Text('ARR / an')),
                      Text(money(d.arr),
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.teal)),
                    ],
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          SectionCard(
            child: Column(
              children: [
                InfoRow(icon: Icons.event_repeat, label: 'Renouvellement', value: formatIsoDate(d.renewalDate)),
                InfoRow(icon: Icons.person_outline, label: 'Créé par', value: d.createdByName),
                InfoRow(icon: Icons.schedule, label: 'Créé le', value: formatIsoDateTime(d.createdAt)),
                if (d.validatedByName != null)
                  InfoRow(icon: Icons.how_to_reg_outlined, label: 'Décidé par', value: d.validatedByName),
                if (d.validationComment != null && d.validationComment!.isNotEmpty)
                  InfoRow(icon: Icons.comment_outlined, label: 'Avis', value: d.validationComment),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (canEdit)
            FilledButton.icon(
              onPressed: _submit,
              icon: const Icon(Icons.send),
              label: const Text('Soumettre pour validation'),
            ),
          if (canReview) ...[
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _validate,
                    style: FilledButton.styleFrom(backgroundColor: Colors.green),
                    icon: const Icon(Icons.check_circle_outline),
                    label: const Text('Valider'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _refuse,
                    style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                    icon: const Icon(Icons.cancel_outlined),
                    label: const Text('Refuser'),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}