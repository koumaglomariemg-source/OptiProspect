import 'package:flutter/material.dart' hide Badge;
import 'package:provider/provider.dart';

import '../config/app_theme.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/formatters.dart';
import '../widgets/charts.dart';
import '../widgets/common.dart';
import 'prospect_detail_screen.dart';
import '../widgets/skeleton.dart';

class DayScreen extends StatefulWidget {
  const DayScreen({super.key});

  @override
  State<DayScreen> createState() => _DayScreenState();
}

class _DayScreenState extends State<DayScreen> {
  DayData? _data;
  String? _error;
  int? _busy;

  ApiClient get _api => context.read<AuthProvider>().api;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final data = await _api.day();
      if (mounted) setState(() => _data = data);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _markDone(DayRelance r) async {
    setState(() => _busy = r.id);
    try {
      await _api.markRelanceDone(r.id);
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      setState(() => _busy = null);
    }
  }

  Future<void> _openProspect(int id) async {
    try {
      final p = await _api.prospect(id);
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => ProspectDetailScreen(prospect: p)),
      );
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    if (_error != null) {
      return Scaffold(body: ErrorRetry(message: _error!, onRetry: _load));
    }
    final data = _data;
    if (data == null) {
      return const Scaffold(body: SkeletonScreen());
    }
    final kpis = <(String, String, IconData, Color)>[
      ('Relances du jour', '${data.countRelancesToday}', Icons.alarm, Colors.orange),
      ('RDV (7j)', '${data.countMeetings}', Icons.event, Colors.indigo),
      ('Devis en cours', '${data.countDevisPending}', Icons.request_quote, Colors.blue),
      ('À risque', '${data.countAtRisk}', Icons.warning_amber_rounded, Colors.red),
    ];
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.md, AppSpacing.md, AppSpacing.xl),
          children: [
            LayoutBuilder(
              builder: (context, constraints) {
                final columns = constraints.maxWidth >= 620 ? 4 : 2;
                final gap = AppSpacing.md;
                final cardWidth = (constraints.maxWidth - gap * (columns - 1)) / columns;
                return Wrap(
                  spacing: gap,
                  runSpacing: gap,
                  children: [
                    for (final k in kpis)
                      SizedBox(
                        width: cardWidth,
                        child: KpiCard(label: k.$1, value: k.$2, icon: k.$3, color: k.$4),
                      ),
                  ],
                );
              },
            ),
            const SizedBox(height: AppSpacing.lg),
            _relancesSection(scheme),
            const SizedBox(height: AppSpacing.lg),
            _toTreatSection(scheme),
            const SizedBox(height: AppSpacing.lg),
            _meetingsSection(scheme),
            const SizedBox(height: AppSpacing.lg),
            _atRiskSection(scheme),
            const SizedBox(height: AppSpacing.lg),
            _devisSection(scheme),
            const SizedBox(height: AppSpacing.lg),
            _activitySection(scheme),
            const SizedBox(height: AppSpacing.xxl),
          ],
        ),
      ),
    );
  }

  Widget _empty(String text, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
      child: Row(
        children: [
          Icon(icon, size: 18, color: Theme.of(context).colorScheme.onSurfaceVariant),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 13.5),
            ),
          ),
        ],
      ),
    );
  }

  Widget _relancesSection(ColorScheme scheme) {
    final relances = _data!.relances;
    return SectionCard(
      title: 'Relances à faire',
      child: Column(
        children: [
          if (relances.isEmpty) _empty('Aucune relance à faire.', Icons.check_circle_outline),
          for (final r in relances)
            Card(
              margin: EdgeInsets.only(bottom: AppSpacing.sm),
              elevation: 0,
              color: (r.isToday ? Colors.red : Colors.orange).withValues(alpha: 0.06),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                side: BorderSide(
                  color: (r.isToday ? Colors.red : Colors.orange).withValues(alpha: 0.25),
                ),
              ),
              child: ListTile(
                contentPadding: EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.xs),
                leading: Icon(
                  r.isToday ? Icons.warning_amber_rounded : Icons.alarm,
                  color: r.isToday ? Colors.red : Colors.orange,
                ),
                title: Text(
                  '${r.name}${r.company != null && r.company!.isNotEmpty ? ' · ${r.company}' : ''}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                ),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    [r.nextAction ?? '', formatIsoDateTime(r.nextActionDate)]
                        .where((s) => s.isNotEmpty && s != '—')
                        .join(' • '),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
                  ),
                ),
                trailing: _busy == r.id
                    ? const SizedBox(
                        width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                    : IconButton(
                        icon: const Icon(Icons.check_circle_outline, color: Colors.green, size: 22),
                        tooltip: 'Relance effectuée',
                        onPressed: () => _markDone(r),
                      ),
                onTap: () => _openProspect(r.id),
              ),
            ),
        ],
      ),
    );
  }

  Widget _toTreatSection(ColorScheme scheme) {
    final items = _data!.toTreat;
    return SectionCard(
      title: 'Prospects à traiter',
      child: Column(
        children: [
          if (items.isEmpty)
            _empty('Aucun prospect à traiter.', Icons.person_search_outlined),
          for (final r in items)
            Card(
              margin: EdgeInsets.only(bottom: AppSpacing.sm),
              elevation: 0,
              color: scheme.surfaceContainerHighest.withValues(alpha: 0.3),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpacing.radiusMd)),
              child: ListTile(
                contentPadding: EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.xs),
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: kPrimary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.person_search_outlined, color: kPrimary, size: 20),
                ),
                title: Text(
                  '${r.name}${r.company != null && r.company!.isNotEmpty ? ' · ${r.company}' : ''}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                ),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    r.lastInteraction != null && r.lastInteraction!.isNotEmpty
                        ? 'Dernière activité le ${formatIsoDateTime(r.lastInteraction)}'
                        : 'Aucune activité enregistrée',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
                  ),
                ),
                onTap: () => _openProspect(r.id),
              ),
            ),
        ],
      ),
    );
  }

  Widget _meetingsSection(ColorScheme scheme) {
    final meetings = _data!.meetings;
    return SectionCard(
      title: 'Prochains rendez-vous',
      child: Column(
        children: [
          if (meetings.isEmpty) _empty('Aucun rendez-vous à venir.', Icons.event_available),
          for (final m in meetings)
            Card(
              margin: EdgeInsets.only(bottom: AppSpacing.sm),
              elevation: 0,
              color: scheme.surfaceContainerHighest.withValues(alpha: 0.3),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpacing.radiusMd)),
              child: ListTile(
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: kPrimary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.event, color: kPrimary, size: 20),
                ),
                title: Text(m.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    [formatIsoDateTime(m.startsAt), m.location]
                        .where((s) => s != null && s.isNotEmpty && s != '—')
                        .join(' • '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
                  ),
                ),
                trailing: m.meetingLink != null && m.meetingLink!.isNotEmpty
                    ? const Icon(Icons.videocam_outlined, color: kPrimary, size: 20)
                    : null,
              ),
            ),
        ],
      ),
    );
  }

  Widget _atRiskSection(ColorScheme scheme) {
    final atRisk = _data!.atRisk;
    return SectionCard(
      title: 'Affaires à risque',
      child: Column(
        children: [
          if (atRisk.isEmpty) _empty('Aucune affaire à risque.', Icons.verified_outlined),
          for (final r in atRisk)
            Card(
              margin: EdgeInsets.only(bottom: AppSpacing.sm),
              elevation: 0,
              color: Colors.red.withValues(alpha: 0.05),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                side: BorderSide(color: Colors.red.withValues(alpha: 0.18)),
              ),
              child: ListTile(
                contentPadding: EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.xs),
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.trending_down, color: Colors.red, size: 20),
                ),
                title: Text(
                  '${r.name}${r.company != null && r.company!.isNotEmpty ? ' · ${r.company}' : ''}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                ),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Badge(label: r.reasonLabel, color: Colors.red),
                      Badge(label: '${r.days} j', color: scheme.onSurfaceVariant),
                      if (r.value > 0)
                        Badge(label: money(r.value), color: Colors.indigo),
                    ],
                  ),
                ),
                onTap: () => _openProspect(r.id),
              ),
            ),
        ],
      ),
    );
  }

  Widget _devisSection(ColorScheme scheme) {
    final devis = _data!.devis;
    return SectionCard(
      title: 'Devis en cours',
      child: Column(
        children: [
          if (devis.isEmpty) _empty('Aucun devis en cours.', Icons.request_quote),
          for (final d in devis)
            Card(
              margin: EdgeInsets.only(bottom: AppSpacing.sm),
              elevation: 0,
              color: scheme.surfaceContainerHighest.withValues(alpha: 0.3),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpacing.radiusMd)),
              child: ListTile(
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.blue.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.request_quote, color: Colors.blue, size: 20),
                ),
                title: Text(d.titre,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    '${d.reference} · ${d.prospectName ?? ''} · ${money(d.montant)}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
                  ),
                ),
                trailing: Badge(
                  label: d.statut == 'valide' ? 'En signature' : 'À valider',
                  color: d.statut == 'valide' ? Colors.blue : Colors.orange,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _activitySection(ColorScheme scheme) {
    final items = _data!.recentInteractions;
    const labels = {
      'email': 'Email',
      'whatsapp': 'WhatsApp',
      'linkedin': 'LinkedIn',
      'appel': 'Appel',
      'visite': 'Visite',
      'rendezvous': 'RDV',
      'note': 'Note',
    };
    return SectionCard(
      title: 'Activité récente',
      child: Column(
        children: [
          if (items.isEmpty) _empty('Aucune activité récente.', Icons.history),
          for (final i in items)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: Colors.green.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      i.type == 'appel' ? Icons.call : Icons.message_outlined,
                      size: 18,
                      color: Colors.green,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${i.prospectName} · ${labels[i.type] ?? i.type}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          i.content,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 12.5, color: scheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    formatIsoDateTime(i.createdAt),
                    style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}