import 'package:flutter/material.dart' hide Badge;
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../config/app_theme.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/constants.dart';
import '../utils/formatters.dart';
import '../widgets/charts.dart';
import '../widgets/common.dart';
import 'prospect_detail_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  StatsOverview? _overview;
  List<ByUserStat>? _byUser;
  List<TimelinePoint>? _timeline;
  Forecast? _forecast;
  TargetsResult? _targets;
  List<User>? _users;
  List<AtRiskItem> _atRisk = [];
  AgingStats? _aging;
  String? _error;
  String? _selectedUserId;
  int _days = 30;
  String _yearMonth = currentYearMonth();

  ApiClient get _api => context.read<AuthProvider>().api;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Map<String, dynamic> _filters() {
    final f = <String, dynamic>{};
    if (_selectedUserId != null) f['commercial'] = _selectedUserId;
    return f;
  }

  Future<void> _load() async {
    setState(() => _error = null);
    final user = context.read<AuthProvider>().user;
    final isAdminOrManager = user != null && (user.isAdmin || user.isManager);
    try {
      final f = _filters();
      final results = await Future.wait([
        _api.statsOverview(f),
        _api.statsByUser(f),
        _api.statsTimeline(_days, f),
        _api.statsForecast(f),
        _api.statsTargets(_yearMonth, f),
        _api.statsAtRisk(f),
        if (isAdminOrManager) _api.users(),
        if (isAdminOrManager) _api.statsAging(f),
      ]);
      if (mounted) {
        setState(() {
          _overview = results[0] as StatsOverview;
          _byUser = results[1] as List<ByUserStat>;
          _timeline = results[2] as List<TimelinePoint>;
          _forecast = results[3] as Forecast;
          _targets = results[4] as TargetsResult;
          _atRisk = results[5] as List<AtRiskItem>;
          if (isAdminOrManager && results.length > 6) {
            _users = results[6] as List<User>;
            _aging = results[7] as AgingStats;
          }
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _pickMonth() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: parseIso('$_yearMonth-01') ?? now,
      firstDate: DateTime(2023, 1),
      lastDate: DateTime(2030, 12),
      helpText: 'Sélectionner le mois',
    );
    if (picked == null) return;
    setState(() => _yearMonth = '${picked.year}-${picked.month.toString().padLeft(2, '0')}');
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final isAdmin = user?.isAdmin ?? false;
    final showUserFilter = user != null && (user.isAdmin || user.isManager);
    return Scaffold(
      body: _error != null
          ? ErrorRetry(message: _error!, onRetry: _load)
          : _overview == null
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.md, AppSpacing.md, AppSpacing.xl),
                    children: [
                      _heroSection(user),
                      const SizedBox(height: AppSpacing.lg),
                      if (showUserFilter) ...[
                        _filtersSection(),
                        const SizedBox(height: AppSpacing.lg),
                      ],
                      _kpisSection(),
                      const SizedBox(height: AppSpacing.lg),
                      _forecastSection(),
                      const SizedBox(height: AppSpacing.lg),
                      _progressSection(),
                      const SizedBox(height: AppSpacing.lg),
                      if (!isAdmin) ...[
                        TimelineChart(
                          title: 'Nouveaux prospects ($_days j)',
                          data: [for (final t in _timeline ?? const <TimelinePoint>[]) (t.day, t.n)],
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        BarChartWidget(
                          title: 'Prospects par étape',
                          data: [
                            for (final s in _overview!.byStage) (kStageLabels[s.key] ?? s.key, s.n)
                          ],
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        BarChartWidget(
                          title: 'Prospects par source',
                          data: [
                            for (final s in _overview!.bySource) (kSourceLabels[s.key] ?? s.key, s.n)
                          ],
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        BarChartWidget(
                          title: 'Prospects par zone',
                          data: [for (final z in _overview!.byZone) (z.key, z.n)],
                          color: Colors.teal,
                        ),
                        const SizedBox(height: AppSpacing.lg),
                      ],
                      _teamPerformanceSection(),
                      const SizedBox(height: AppSpacing.lg),
                      if (!isAdmin) ...[
                        _atRiskSection(),
                        const SizedBox(height: AppSpacing.lg),
                      ],
                      if (showUserFilter) ...[
                        _agingSection(),
                        const SizedBox(height: AppSpacing.lg),
                      ],
                      if (!isAdmin) ...[
                        _nextActionsSection(),
                        const SizedBox(height: AppSpacing.xxl),
                      ],
                      if (isAdmin) ...[
                        _adminGlobalStatsSection(),
                        const SizedBox(height: AppSpacing.xxl),
                      ],
                    ],
                  ),
                ),
    );
  }

  Widget _heroSection(User? user) {
    final now = DateTime.now();
    final day = DateFormat('EEEE d MMMM yyyy', 'fr_FR').format(now);
    final first = user?.name.split(' ').first ?? '';
    return Container(
      padding: EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [kPrimary, kPrimaryDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
        boxShadow: [
          BoxShadow(
            color: kPrimary.withValues(alpha: 0.4),
            blurRadius: 28,
            offset: const Offset(0, 12),
            spreadRadius: -4,
          ),
        ],
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            right: -20,
            top: -24,
            child: IgnorePointer(
              child: Icon(Icons.auto_graph, size: 140, color: Colors.white.withValues(alpha: 0.08)),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                day[0].toUpperCase() + day.substring(1),
                style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.8),
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.3),
              ),
              const SizedBox(height: 10),
              Text(
                'Bonjour $first',
                style: const TextStyle(
                    color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -0.3),
              ),
              const SizedBox(height: 8),
              Text(
                'Voici votre tableau de bord du jour.',
                style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 14.5, height: 1.3),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _filtersSection() {
    return SectionCard(
      title: 'Filtres',
      child: Column(
        children: [
          DropdownButtonFormField<String?>(
            initialValue: _selectedUserId,
            decoration: const InputDecoration(labelText: 'Commercial', isDense: true),
            items: [
              const DropdownMenuItem(value: null, child: Text('Tous')),
              for (final u in _users ?? const <User>[])
                DropdownMenuItem(
                  value: u.id.toString(),
                  child: Text(u.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                ),
            ],
            onChanged: (v) {
              setState(() => _selectedUserId = v);
              _load();
            },
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<int>(
                  initialValue: _days,
                  decoration: const InputDecoration(labelText: 'Période', isDense: true),
                  items: const [
                    DropdownMenuItem(value: 7, child: Text('7 jours')),
                    DropdownMenuItem(value: 30, child: Text('30 jours')),
                    DropdownMenuItem(value: 90, child: Text('90 jours')),
                  ],
                  onChanged: (v) {
                    setState(() => _days = v ?? 30);
                    _load();
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: InkWell(
                  onTap: _pickMonth,
                  child: InputDecorator(
                    decoration: const InputDecoration(labelText: 'Mois', isDense: true),
                    child: Text(_yearMonth,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _kpisSection() {
    final o = _overview!;
    final kpis = <(String, String, IconData, Color)>[
      ('Total', '${o.total}', Icons.people_outline, Colors.indigo),
      ('Actifs', '${o.active}', Icons.rocket_launch_outlined, Colors.blue),
      ('Converti', '${o.converted}', Icons.check_circle_outline, Colors.green),
      ('Perdu', '${o.lost}', Icons.cancel_outlined, Colors.red),
    ];
    return LayoutBuilder(
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
    );
  }

  Widget _forecastSection() {
    final f = _forecast!;
    return SectionCard(
      title: 'Prévisions',
      child: Column(
        children: [
          InfoRow(icon: Icons.payments_outlined, label: 'Pipeline pondéré', value: money(f.weightedPipeline)),
          InfoRow(icon: Icons.insights, label: 'Attendu 30 jours', value: money(f.expectedNext30)),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              _miniStat('Taux de victoire', '${f.winRate.toStringAsFixed(0)}%', Colors.green),
              const SizedBox(width: AppSpacing.md),
              _miniStat('Conversions 30j', '${f.expectedConversions30}', Colors.indigo),
              const SizedBox(width: AppSpacing.md),
              _miniStat('Panier moyen', money(f.avgDealValue), Colors.orange),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          InfoRow(icon: Icons.speed, label: 'Prospects / jour', value: f.prospectsPerDay.toStringAsFixed(1)),
        ],
      ),
    );
  }

  Widget _miniStat(String label, String value, Color color) {
    return Expanded(
      child: Card(
        color: color.withValues(alpha: 0.07),
        margin: const EdgeInsets.only(top: AppSpacing.sm),
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpacing.radiusMd)),
        child: Padding(
          padding: EdgeInsets.all(AppSpacing.md),
          child: Column(
            children: [
              Text(value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: color)),
              const SizedBox(height: 4),
              Text(label,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 10.5, color: Theme.of(context).colorScheme.onSurfaceVariant),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
            ],
          ),
        ),
      ),
    );
  }

  Widget _progressSection() {
    final targets = _targets;
    final user = context.watch<AuthProvider>().user;
    if (targets == null || targets.users.isEmpty) return const SizedBox.shrink();
    return SectionCard(
      title: 'Objectifs ${targets.yearMonth}',
      child: Column(
        children: [
          for (final u in targets.users)
            Padding(
              padding: EdgeInsets.symmetric(vertical: AppSpacing.sm),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(u.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                        const SizedBox(height: 6),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: LinearProgressIndicator(
                            value: u.pct / 100,
                            minHeight: 8,
                            color: u.pct >= 100 ? Colors.green : kPrimary,
                            backgroundColor: Colors.grey.withValues(alpha: 0.15),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpacing.lg),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(money(u.achieved),
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                      Text('${money(u.targetValue)} — ${u.pct.toStringAsFixed(0)}%',
                          style: TextStyle(fontSize: 10.5, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                    ],
                  ),
                  if (user?.isManager == true)
                    IconButton(
                      icon: const Icon(Icons.edit_outlined, size: 18),
                      tooltip: 'Définir l\'objectif',
                      onPressed: () => _editTarget(u),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _editTarget(TargetUser u) async {
    final controller = TextEditingController(
        text: u.targetValue == 0 ? '' : u.targetValue.toStringAsFixed(0));
    final int? result = await showDialog<int>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Objectif — ${u.name}'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Objectif (FCFA)'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, -1), child: const Text('Supprimer')),
          TextButton(onPressed: () => Navigator.pop(ctx, null), child: const Text('Annuler')),
          FilledButton(
            onPressed: () =>
                Navigator.pop(ctx, int.tryParse(controller.text.replaceAll(',', '.')) ?? 0),
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
    if (result == null) return;
    final value = result < 0 ? 0 : result;
    try {
      await _api.setTarget(u.id, _yearMonth, value.toDouble());
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Widget _teamPerformanceSection() {
    final byUser = _byUser ?? [];
    if (byUser.isEmpty) return const SizedBox.shrink();
    return SectionCard(
      title: 'Suivi d\'activité par commercial',
      child: Column(
        children: [
          for (final u in byUser)
            Padding(
              padding: EdgeInsets.symmetric(vertical: AppSpacing.sm),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Avatar(name: u.name, radius: 18),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Text(u.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Text('${u.converted}/${u.total}✓',
                          style: const TextStyle(fontSize: 12.5, color: Colors.green, fontWeight: FontWeight.w600)),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Wrap(
                    spacing: AppSpacing.sm,
                    runSpacing: AppSpacing.sm,
                    children: [
                      _miniChip('Pipeline', money(u.openValue), Colors.indigo),
                      _miniChip('Relances', '${u.relancesLate} en retard', Colors.red),
                      _miniChip('Appels', '${u.calls}', Colors.blue),
                      _miniChip('RDV', '${u.meetingsCount}', Colors.teal),
                      _miniChip('Cycle', '${u.avgCycleDays} j', Colors.orange),
                    ],
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _miniChip(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        '$label : $value',
        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: color),
      ),
    );
  }

  Widget _atRiskSection() {
    final atRisk = _atRisk;
    if (atRisk.isEmpty) return const SizedBox.shrink();
    return SectionCard(
      title: 'Affaires à risque',
      child: Column(
        children: [
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
                      Badge(label: '${r.days} j', color: Theme.of(context).colorScheme.onSurfaceVariant),
                      if (r.value > 0) Badge(label: money(r.value), color: Colors.indigo),
                    ],
                  ),
                ),
                onTap: () async {
                  try {
                    final p = await _api.prospect(r.id);
                    if (!mounted) return;
                    await Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => ProspectDetailScreen(prospect: p)),
                    );
                    _load();
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context)
                          .showSnackBar(SnackBar(content: Text(e.toString())));
                    }
                  }
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _agingSection() {
    final aging = _aging;
    if (aging == null || aging.total == 0) return const SizedBox.shrink();
    return SectionCard(
      title: 'Ancienneté du pipeline',
      child: Column(
        children: [
          Padding(
            padding: EdgeInsets.only(bottom: AppSpacing.sm),
            child: Row(
              children: [
                Text('Ancienneté moyenne',
                    style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                const Spacer(),
                Text('${aging.avgAgeDays} jours',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.orange)),
              ],
            ),
          ),
          for (final b in aging.buckets)
            Padding(
              padding: EdgeInsets.symmetric(vertical: AppSpacing.xs),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(b.label,
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12.5)),
                      Text('${b.n} · ${money(b.value)}',
                          style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: aging.total == 0 ? 0 : (b.n / aging.total).clamp(0.0, 1.0),
                      minHeight: 8,
                      color: b.key == '90_plus'
                          ? Colors.red
                          : b.key == '31_90'
                              ? Colors.orange
                              : Colors.green,
                      backgroundColor: Colors.grey.withValues(alpha: 0.15),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _nextActionsSection() {
    final next = _overview!.nextActions;
    if (next.isEmpty) return const SizedBox.shrink();
    return SectionCard(
      title: 'Prochaines actions',
      child: Column(
        children: [
          for (final na in next)
            Card(
              margin: EdgeInsets.only(bottom: AppSpacing.sm),
              elevation: 0,
              color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
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
                  child: const Icon(Icons.event, color: kPrimary, size: 20),
                ),
                title: Text(na.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    [na.nextAction ?? '', formatIsoDateTime(na.nextActionDate)]
                        .where((s) => s.isNotEmpty && s != '—')
                        .join(' • '),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
                  ),
                ),
                trailing: IconButton(
                  icon: const Icon(Icons.check_circle_outline, color: Colors.green, size: 22),
                  tooltip: 'Relance effectuée',
                  onPressed: () async {
                    try {
                      await _api.markRelanceDone(na.id);
                      _load();
                    } catch (e) {
                      if (mounted) {
                        ScaffoldMessenger.of(context)
                            .showSnackBar(SnackBar(content: Text(e.toString())));
                      }
                    }
                  },
                ),
                onTap: () async {
                  try {
                    final p = await _api.prospect(na.id);
                    if (!mounted) return;
                    await Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => ProspectDetailScreen(prospect: p)),
                    );
                    _load();
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context)
                          .showSnackBar(SnackBar(content: Text(e.toString())));
                    }
                  }
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _adminGlobalStatsSection() {
    final overview = _overview!;
    final byUser = _byUser ?? [];
    final targets = _targets;
    return SectionCard(
      title: 'Vue globale administrateur',
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _adminStatCard('Équipe', '${_users?.length ?? 0}', Icons.people_outline, Colors.indigo),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: _adminStatCard('Pipeline total', money(overview.byStage.fold(0, (sum, s) => sum + s.n * 100000)), Icons.attach_money, Colors.green),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          if (targets != null && targets.users.isNotEmpty) ...[
            Text('Objectifs ${targets.yearMonth}',
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
            const SizedBox(height: AppSpacing.sm),
            for (final u in targets.users)
              Padding(
                padding: EdgeInsets.symmetric(vertical: AppSpacing.xs),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(u.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          const SizedBox(height: 4),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: u.pct / 100,
                              minHeight: 6,
                              color: u.pct >= 100 ? Colors.green : kPrimary,
                              backgroundColor: Colors.grey.withValues(alpha: 0.15),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Text('${u.pct.toStringAsFixed(0)}%',
                        style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                            color: u.pct >= 100 ? Colors.green : kPrimary)),
                  ],
                ),
              ),
          ],
          const SizedBox(height: AppSpacing.md),
          if (byUser.isNotEmpty) ...[
            const Divider(),
            const Text('Activité par commercial',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
            const SizedBox(height: AppSpacing.sm),
            for (final u in byUser)
              Padding(
                padding: EdgeInsets.symmetric(vertical: AppSpacing.xs),
                child: Row(
                  children: [
                    Avatar(name: u.name, radius: 16),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(u.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          Text('${u.converted}/${u.total} convertis · ${u.calls} appels · ${u.meetingsCount} RDV',
                              style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                        ],
                      ),
                    ),
                    Text(money(u.openValue),
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Colors.indigo)),
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _adminStatCard(String label, String value, IconData icon, Color color) {
    return Card(
      color: color.withValues(alpha: 0.07),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpacing.radiusMd)),
      child: Padding(
        padding: EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 20),
                const SizedBox(width: 8),
                Text(label, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)),
              ],
            ),
            const SizedBox(height: 8),
            Text(value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18, color: color)),
          ],
        ),
      ),
    );
  }

  }