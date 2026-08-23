import 'package:flutter/material.dart' hide Badge;
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/app_theme.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/constants.dart';
import '../utils/formatters.dart';
import '../widgets/common.dart';
import 'devis_detail_screen.dart';
import 'devis_form_screen.dart';
import 'prospect_form_screen.dart';
import 'step_form_screen.dart';

class ProspectDetailScreen extends StatefulWidget {
  final Prospect prospect;

  const ProspectDetailScreen({super.key, required this.prospect});

  @override
  State<ProspectDetailScreen> createState() => _ProspectDetailScreenState();
}

class _ProspectDetailScreenState extends State<ProspectDetailScreen> {
  late Prospect _prospect;
  bool _canWrite = true;

  ApiClient get _api => context.read<AuthProvider>().api;

  @override
  void initState() {
    super.initState();
    _prospect = widget.prospect;
    final user = context.read<AuthProvider>().user;
    _canWrite = user?.role != 'manager';
  }

  Future<void> _reload() async {
    try {
      final p = await _api.prospect(_prospect.id);
      if (mounted) setState(() => _prospect = p);
    } catch (_) {}
  }

  Future<void> _edit() async {
    final edited = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => ProspectFormScreen(prospect: _prospect)),
    );
    if (edited == true) _reload();
  }

  Future<void> _delete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer ce prospect ?'),
        content: const Text('Cette action est irréversible.'),
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
      await _api.deleteProspect(_prospect.id);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = _prospect;
    return DefaultTabController(
      length: 6,
      child: Scaffold(
        appBar: AppBar(
          title: Text(p.name),
          bottom: const TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              Tab(text: 'Fiche'),
              Tab(text: 'Pipeline'),
              Tab(text: 'Interactions'),
              Tab(text: 'Historique'),
              Tab(text: 'Devis'),
              Tab(text: 'Messages'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _FicheTab(prospect: p, canWrite: _canWrite, onReload: _reload, onEdit: _edit, onDelete: _delete),
            _PipelineTab(prospect: p, canWrite: _canWrite, onChanged: _reload),
            _InteractionsTab(prospect: p, canWrite: _canWrite),
            _HistoryTab(prospect: p),
            _DevisTab(prospect: p),
            _MessagesTab(prospect: p, canWrite: _canWrite),
          ],
        ),
      ),
    );
  }
}

class _FicheTab extends StatelessWidget {
  final Prospect prospect;
  final bool canWrite;
  final VoidCallback onReload;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _FicheTab({
    required this.prospect,
    required this.canWrite,
    required this.onReload,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final p = prospect;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (canWrite)
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onEdit,
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text('Modifier'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onDelete,
                  style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Supprimer'),
                ),
              ),
            ],
          ),
        const SizedBox(height: 12),
        SectionCard(
          child: Column(
            children: [
              InfoRow(icon: Icons.business, label: 'Entreprise', value: p.company),
              InfoRow(icon: Icons.mail_outline, label: 'Email', value: p.email),
              InfoRow(icon: Icons.phone, label: 'Téléphone', value: p.phone),
              InfoRow(icon: Icons.link, label: 'LinkedIn', value: p.linkedin),
              InfoRow(
                icon: Icons.location_on_outlined,
                label: 'Quartier / Adresse',
                value: [p.quartier, p.adresse].where((s) => s != null && s.isNotEmpty).join(', '),
              ),
              InfoRow(icon: Icons.category_outlined, label: 'Produit', value: p.product),
              InfoRow(icon: Icons.source, label: 'Source', value: kSourceLabels[p.source] ?? p.source),
              InfoRow(icon: Icons.payments_outlined, label: 'Valeur', value: p.value > 0 ? money(p.value) : null),
              InfoRow(icon: Icons.tag, label: 'Numéro', value: p.numero),
              InfoRow(
                icon: Icons.thermostat,
                label: 'Température',
                value: kTemperatureLabels[p.temperature] ?? p.temperature,
              ),
              InfoRow(icon: Icons.groups_outlined, label: 'Effectif', value: p.effectif?.toString()),
              InfoRow(icon: Icons.school_outlined, label: 'Option frais scolaire', value: p.optionFraisScolaire ? 'Oui' : 'Non'),
              InfoRow(icon: Icons.verified_outlined, label: 'Contrat déposé', value: p.contratDepose ? 'Oui' : 'Non'),
              InfoRow(icon: Icons.verified_user_outlined, label: 'Contrat signé', value: p.contratSigne ? 'Oui' : 'Non'),
              InfoRow(icon: Icons.person_outline, label: 'Assigné à', value: p.assigneeName),
            ],
          ),
        ),
        const SizedBox(height: 12),
        const Text('Prochaine action',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        SectionCard(
          child: Column(
            children: [
              InfoRow(icon: Icons.task_alt, label: 'Action', value: p.nextAction),
              InfoRow(icon: Icons.event, label: 'Date', value: formatDateTime(p.nextActionDate)),
            ],
          ),
        ),
        if (canWrite)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: FilledButton.icon(
              onPressed: () async {
                try {
                  await context.read<AuthProvider>().api.markRelanceDone(p.id);
                  onReload();
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                  }
                }
              },
              icon: const Icon(Icons.check_circle_outline),
              label: const Text('Relance effectuée'),
            ),
          ),
        const SizedBox(height: 12),
        const Text('Score de potentiel',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        SectionCard(child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: LinearScoreBar(score: p.score),
        )),
        if (p.note != null && p.note!.isNotEmpty) ...[
          const SizedBox(height: 12),
          const Text('Note', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          SectionCard(child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(p.note!),
          )),
        ],
        const SizedBox(height: 24),
      ],
    );
  }
}

class _PipelineTab extends StatefulWidget {
  final Prospect prospect;
  final bool canWrite;
  final VoidCallback onChanged;

  const _PipelineTab({required this.prospect, required this.canWrite, required this.onChanged});

  @override
  State<_PipelineTab> createState() => _PipelineTabState();
}

class _PipelineTabState extends State<_PipelineTab> {
  List<StepProgress>? _steps;
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
      final steps = await _api.steps(widget.prospect.id);
      if (mounted) setState(() => _steps = steps);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _openStep(StepProgress step) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => StepFormScreen(step: step, prospect: widget.prospect),
      ),
    );
    if (changed == true) {
      _load();
      widget.onChanged();
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.prospect;
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          if (_error != null)
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          SectionCard(
            child: Column(
              children: [
                InfoRow(icon: Icons.donut_small, label: 'Étape courante', value: p.currentStep?.name),
                InfoRow(icon: Icons.check_circle_outline, label: 'Étapes validées', value: '${p.stepsDone} / ${p.stepsTotal}'),
                if (p.stepsTotal > 0)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: (p.stepsDone / p.stepsTotal).clamp(0.0, 1.0),
                        minHeight: 10,
                        backgroundColor: Colors.grey.withValues(alpha: 0.2),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Text('Étapes du pipeline',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          if (_steps == null)
            const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
          else
            for (final s in _steps!) _stepCard(s),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _stepCard(StepProgress s) {
    final color = colorFromName(s.color);
    final validated = s.isValidated;
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
      child: ListTile(
        leading: Icon(
          validated ? Icons.check_circle : Icons.radio_button_unchecked,
          color: validated ? Colors.green : color,
        ),
        title: Text('${s.position + 1}. ${s.stepName}',
            maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: Text(
          validated
              ? 'Validée ${formatIsoDateTime(s.validatedAt)}'
              : s.data.isEmpty
                  ? 'Non renseignée'
                  : 'Brouillon enregistré',
          style: const TextStyle(fontSize: 12),
        ),
        onTap: widget.canWrite ? () => _openStep(s) : null,
      ),
    );
  }
}

class _InteractionsTab extends StatefulWidget {
  final Prospect prospect;
  final bool canWrite;

  const _InteractionsTab({required this.prospect, required this.canWrite});

  @override
  State<_InteractionsTab> createState() => _InteractionsTabState();
}

class _InteractionsTabState extends State<_InteractionsTab> {
  List<Interaction>? _items;
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
      final items = await _api.interactions(widget.prospect.id);
      if (mounted) setState(() => _items = items);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _add() async {
    final type = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Type d\'interaction', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
            for (final e in kInteractionTypes.entries)
              ListTile(
                leading: const Icon(Icons.circle_outlined, size: 18),
                title: Text(e.value),
                onTap: () => Navigator.pop(ctx, e.key),
              ),
          ],
        ),
      ),
    );
    if (type == null || !mounted) return;
    final controller = TextEditingController();
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2023, 1),
      lastDate: DateTime(2035, 12),
    );
    if (!mounted) return;
    final content = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(kInteractionTypes[type] ?? type),
        content: TextField(
          controller: controller,
          maxLines: 4,
          decoration: const InputDecoration(hintText: 'Détail de l\'interaction…'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Ajouter'),
          ),
        ],
      ),
    );
    if (content == null || content.isEmpty || !mounted) return;
    try {
      await _api.addInteraction(widget.prospect.id, {
        'type': type,
        'content': content,
        if (date != null) 'date': toApiDate(date),
      });
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _delete(Interaction it) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer cette interaction ?'),
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
      await _api.deleteInteraction(it.id);
      _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _error != null
          ? ErrorRetry(message: _error!, onRetry: _load)
          : _items == null
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _items!.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 120),
                          Center(child: Text('Aucune interaction')),
                        ])
                  : ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.only(bottom: 16),
                      itemCount: _items!.length,
                      itemBuilder: (context, i) {
                        final it = _items![i];
                        return Card(
                          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: kPrimary.withValues(alpha: 0.15),
                              child: const Icon(Icons.chat_outlined, size: 18, color: kPrimary),
                            ),
                            title: Text(kInteractionTypes[it.type] ?? it.type,
                                style: const TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(it.content, maxLines: 3, overflow: TextOverflow.ellipsis),
                                Text(
                                  [formatIsoDateTime(it.interactionDate), it.userName ?? '']
                                      .where((s) => s.isNotEmpty && s != '—')
                                      .join(' • '),
                                  style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
                                ),
                              ],
                            ),
                            trailing: widget.canWrite
                                ? IconButton(
                                    icon: const Icon(Icons.delete_outline, size: 20),
                                    onPressed: () => _delete(it),
                                  )
                                : null,
                          ),
                        );
                      },
                    ),
            ),
      floatingActionButton: widget.canWrite
          ? FloatingActionButton.small(
              heroTag: 'interactionFAB_${widget.prospect.id}',
              onPressed: _add,
              tooltip: 'Ajouter une interaction',
              child: const Icon(Icons.add),
            )
          : null,
    );
  }
}

class _HistoryTab extends StatefulWidget {
  final Prospect prospect;

  const _HistoryTab({required this.prospect});

  @override
  State<_HistoryTab> createState() => _HistoryTabState();
}

class _HistoryTabState extends State<_HistoryTab> {
  List<ProspectEvent>? _events;
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
      final events = await _api.events(widget.prospect.id);
      if (mounted) setState(() => _events = events);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return _error != null
        ? ErrorRetry(message: _error!, onRetry: _load)
        : _events == null
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: _events!.isEmpty
                    ? ListView(children: const [
                        SizedBox(height: 120),
                        Center(child: Text('Aucun événement')),
                      ])
                : ListView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.only(bottom: 16),
                    itemCount: _events!.length,
                    itemBuilder: (context, i) {
                      final e = _events![i];
                      return ListTile(
                        leading: const Icon(Icons.history, size: 20, color: kPrimary),
                        title: Text(_eventLabel(e), maxLines: 2, overflow: TextOverflow.ellipsis),
                        subtitle: Text(
                          [formatIsoDateTime(e.createdAt), e.userName ?? '']
                              .where((s) => s.isNotEmpty && s != '—')
                              .join(' • '),
                          style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
                        ),
                      );
                    },
                  ),
          );
  }

  String _eventLabel(ProspectEvent e) {
    final field = e.field ?? '';
    final from = e.oldValue ?? '';
    final to = e.newValue ?? '';
    switch (e.type) {
      case 'creation':
        return 'Création du prospect';
      case 'temperature':
        return 'Température : ${kTemperatureLabels[from] ?? from} → ${kTemperatureLabels[to] ?? to}';
      case 'etape':
        return 'Étape : ${kStageLabels[from] ?? from} → ${kStageLabels[to] ?? to}';
      case 'assignation':
        return 'Assignation → $to';
      case 'valeur':
        return 'Valeur → ${money(double.tryParse(to) ?? 0)}';
      case 'action':
        return 'Prochaine action : $from → $to';
      case 'interaction':
        return 'Interaction ajoutée : ${kInteractionTypes[to] ?? to}';
      default:
        return '$field : $from → $to';
    }
  }
}

class _DevisTab extends StatefulWidget {
  final Prospect prospect;

  const _DevisTab({required this.prospect});

  @override
  State<_DevisTab> createState() => _DevisTabState();
}

class _DevisTabState extends State<_DevisTab> {
  List<Devis>? _items;
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
      final items = await _api.devis(prospectId: widget.prospect.id);
      if (mounted) setState(() => _items = items);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _create() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => DevisFormScreen(prospectId: widget.prospect.id),
      ),
    );
    if (created == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _error != null
          ? ErrorRetry(message: _error!, onRetry: _load)
          : _items == null
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _items!.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 120),
                          Center(child: Text('Aucun devis pour ce prospect')),
                        ])
                  : ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.only(bottom: 16),
                      itemCount: _items!.length,
                      itemBuilder: (context, i) {
                        final d = _items![i];
                        final color = devisStatusColor(d.statut);
                        return Card(
                          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          child: ListTile(
                            onTap: () async {
                              await Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => DevisDetailScreen(devis: d)),
                              );
                              _load();
                            },
                            leading: CircleAvatar(
                              backgroundColor: color.withValues(alpha: 0.15),
                              child: Icon(Icons.request_quote, color: color, size: 18),
                            ),
                            title: Text(d.titre, maxLines: 1, overflow: TextOverflow.ellipsis),
                            subtitle: Text(
                              [d.reference, money(d.montant)].where((s) => s.isNotEmpty).join(' • '),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            trailing: Badge(label: kDevisStatusLabels[d.statut] ?? d.statut, color: color),
                          ),
                        );
                      },
                    ),
            ),
      floatingActionButton: FloatingActionButton.small(
        heroTag: 'prospectDevisFAB_${widget.prospect.id}',
        onPressed: _create,
        tooltip: 'Nouveau devis',
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _MessagesTab extends StatefulWidget {
  final Prospect prospect;
  final bool canWrite;

  const _MessagesTab({required this.prospect, required this.canWrite});

  @override
  State<_MessagesTab> createState() => _MessagesTabState();
}

class _MessagesTabState extends State<_MessagesTab> {
  MessageSuggestion? _suggestion;
  String? _error;
  bool _loading = false;
  bool _sending = false;

  ApiClient get _api => context.read<AuthProvider>().api;

  Future<void> _generate() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final suggestion = await _api.suggestMessage(widget.prospect.id);
      if (mounted) setState(() => _suggestion = suggestion);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (!widget.canWrite)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text('Vous êtes en lecture seule.',
                style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
          ),
        FilledButton.icon(
          onPressed: _loading ? null : _generate,
          icon: const Icon(Icons.auto_awesome),
          label: Text(_loading ? 'Génération…' : 'Suggérer un message'),
        ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ),
        if (_suggestion != null) ...[
          const SizedBox(height: 16),
          if (_suggestion!.nextActionSuggestion != null)
            SectionCard(
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.task_alt, color: kPrimary),
                title: const Text('Action recommandée', style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text(_suggestion!.nextActionSuggestion!),
              ),
            ),
          const SizedBox(height: 12),
          _messageCard('Email', 'email', _suggestion!.email),
          _messageCard('WhatsApp', 'whatsapp', _suggestion!.whatsapp),
          _messageCard('LinkedIn', 'linkedin', _suggestion!.linkedin),
        ],
      ],
    );
  }

  Widget _messageCard(String title, String channel, String? content) {
    final canSend = widget.canWrite && content != null && content.isNotEmpty;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
      child: ExpansionTile(
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: const Text('Appuyez pour voir le contenu'),
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Text(content ?? 'Contenu vide', style: const TextStyle(fontSize: 13)),
          ),
          Padding(
            padding: const EdgeInsets.only(left: 12, right: 12, bottom: 12),
            child: Wrap(
              spacing: 8,
              runSpacing: 4,
              alignment: WrapAlignment.end,
              children: [
                TextButton.icon(
                  onPressed: content == null
                      ? null
                      : () async {
                          await Clipboard.setData(ClipboardData(text: content));
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Message copié')),
                            );
                          }
                        },
                  icon: const Icon(Icons.copy_all, size: 16),
                  label: const Text('Copier'),
                ),
                if (canSend && channel == 'email') ...[
                  OutlinedButton.icon(
                    onPressed: () => _launchMailto(content),
                    icon: const Icon(Icons.mail_outline, size: 16),
                    label: const Text('Ouvrir'),
                  ),
                  FilledButton.icon(
                    onPressed: _sending ? null : () => _sendByEmail(content),
                    icon: const Icon(Icons.send, size: 16),
                    label: Text(_sending ? 'Envoi…' : 'Envoyer'),
                  ),
                ],
                if (canSend && channel == 'whatsapp')
                  FilledButton.icon(
                    onPressed: () => _launchWhatsApp(content),
                    icon: const Icon(Icons.chat, size: 16),
                    label: const Text('Envoyer par WhatsApp'),
                  ),
                if (canSend && channel == 'linkedin')
                  OutlinedButton.icon(
                    onPressed: () => _launchLinkedIn(),
                    icon: const Icon(Icons.link, size: 16),
                    label: const Text('Ouvrir'),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _launch(Uri uri, String errorMsg) async {
    try {
      final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!ok && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorMsg)));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$errorMsg : $e')));
      }
    }
  }

  Future<void> _launchMailto(String content) async {
    final email = widget.prospect.email;
    if (email == null || email.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Pas d'email renseigné")));
      }
      return;
    }
    final uri = Uri(
      scheme: 'mailto',
      path: email,
      queryParameters: {
        'subject': _suggestion?.subject ?? 'Contact ${widget.prospect.name}',
        'body': content,
      },
    );
    await _launch(uri, "Impossible d'ouvrir l'application email");
  }

  Future<void> _launchWhatsApp(String content) async {
    final phone = widget.prospect.phone;
    if (phone == null || phone.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Pas de téléphone renseigné')),
        );
      }
      return;
    }
    final digits = phone.replaceAll(RegExp(r'[^\d]'), '');
    final uri = Uri.parse('https://wa.me/$digits?text=${Uri.encodeComponent(content)}');
    await _launch(uri, "WhatsApp n'est pas installé");
  }

  Future<void> _launchLinkedIn() async {
    final linkedin = widget.prospect.linkedin;
    if (linkedin == null || linkedin.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Pas de profil LinkedIn renseigné')),
        );
      }
      return;
    }
    final uri = Uri.parse(
      linkedin.startsWith('http') ? linkedin : 'https://www.linkedin.com/in/$linkedin',
    );
    await _launch(uri, "Impossible d'ouvrir le profil LinkedIn");
  }

  Future<void> _sendByEmail(String content) async {
    setState(() => _sending = true);
    try {
      final result = await _api.sendMessage(widget.prospect.id, {
        'channel': 'email',
        'subject': _suggestion?.subject,
        'content': content,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.delivered
              ? 'Message envoyé par email ✓'
              : result.skipped
                  ? 'Envoi non effectué : ${result.reason ?? 'SMTP non configuré'}'
                  : "Échec de l'envoi"),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur : $e')));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }
}