import 'package:flutter/material.dart';
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
        if (isAdminOrManager) _api.users(),
      ]);
      if (mounted) {
        setState(() {
          _overview = results[0] as StatsOverview;
          _byUser = results[1] as List<ByUserStat>;
          _timeline = results[2] as List<TimelinePoint>;
          _forecast = results[3] as Forecast;
          _targets = results[4] as TargetsResult;
          if (isAdminOrManager && results.length > 5) {
            _users = results[5] as List<User>;
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
                      _teamPerformanceSection(),
                      const SizedBox(height: AppSpacing.lg),
                      _nextActionsSection(),
                      const SizedBox(height: AppSpacing.xxl),
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
    return Row(
      children: [
        Expanded(
          child: KpiCard(label: 'Total', value: '${o.total}', icon: Icons.people_outline, color: Colors.indigo),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: KpiCard(label: 'Actifs', value: '${o.active}', icon: Icons.rocket_launch_outlined, color: Colors.blue),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: KpiCard(label: 'Converti', value: '${o.converted}', icon: Icons.check_circle_outline, color: Colors.green),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: KpiCard(label: 'Perdu', value: '${o.lost}', icon: Icons.cancel_outlined, color: Colors.red),
        ),
      ],
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
                  style: TextStyle(fontSize: 10.5, color: Colors.grey.shade600),
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
                          style: TextStyle(fontSize: 10.5, color: Colors.grey.shade600)),
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
      title: 'Performance par commercial',
      child: Column(
        children: [
          for (final u in byUser)
            Padding(
              padding: EdgeInsets.symmetric(vertical: AppSpacing.sm),
              child: Row(
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
                  Text('${u.total}',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: kPrimary)),
                  const SizedBox(width: AppSpacing.md),
                  Text('${u.converted}✓',
                      style: const TextStyle(fontSize: 13, color: Colors.green, fontWeight: FontWeight.w600)),
                  const SizedBox(width: AppSpacing.md),
                  Text(money(u.value),
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
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
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
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

  }