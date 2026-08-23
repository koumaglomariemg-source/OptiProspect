import '../utils/formatters.dart';
import 'meeting.dart';
import 'prospect.dart';

class CountSlice {
  final String key;
  final int n;

  const CountSlice({required this.key, required this.n});

  factory CountSlice.fromJson(Map<String, dynamic> json) {
    return CountSlice(
      key: json['stage'] as String? ??
          json['temperature'] as String? ??
          json['source'] as String? ??
          json['secteur'] as String? ??
          '',
      n: toInt(json['n']) ?? 0,
    );
  }
}

class StatsOverview {
  final int total;
  final int active;
  final int converted;
  final int lost;
  final int conversionRate;
  final double pipelineValue;
  final List<CountSlice> byStage;
  final List<CountSlice> byTemperature;
  final List<CountSlice> bySource;
  final List<CountSlice> byZone;
  final List<NextAction> nextActions;

  const StatsOverview({
    required this.total,
    required this.active,
    required this.converted,
    required this.lost,
    required this.conversionRate,
    required this.pipelineValue,
    this.byStage = const [],
    this.byTemperature = const [],
    this.bySource = const [],
    this.byZone = const [],
    this.nextActions = const [],
  });

  factory StatsOverview.fromJson(Map<String, dynamic> json) {
    return StatsOverview(
      total: toInt(json['total']) ?? 0,
      active: toInt(json['active']) ?? 0,
      converted: toInt(json['converted']) ?? 0,
      lost: toInt(json['lost']) ?? 0,
      conversionRate: toInt(json['conversion_rate']) ?? 0,
      pipelineValue: toDouble(json['pipeline_value']) ?? 0,
      byStage: (json['by_stage'] as List?)
              ?.map((e) => CountSlice.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      byTemperature: (json['by_temperature'] as List?)
              ?.map((e) => CountSlice.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      bySource: (json['by_source'] as List?)
              ?.map((e) => CountSlice.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      byZone: (json['by_zone'] as List?)
              ?.map((e) => CountSlice.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      nextActions: (json['next_actions'] as List?)
              ?.map((e) => NextAction.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );
  }
}

class ByUserStat {
  final int id;
  final String name;
  final String role;
  final int total;
  final int converted;
  final int lost;
  final int advanced;
  final double value;
  final double openValue;
  final int relancesLate;
  final int calls;
  final int meetingsCount;
  final int avgCycleDays;

  const ByUserStat({
    required this.id,
    required this.name,
    this.role = 'commercial',
    this.total = 0,
    this.converted = 0,
    this.lost = 0,
    this.advanced = 0,
    this.value = 0,
    this.openValue = 0,
    this.relancesLate = 0,
    this.calls = 0,
    this.meetingsCount = 0,
    this.avgCycleDays = 0,
  });

  factory ByUserStat.fromJson(Map<String, dynamic> json) {
    return ByUserStat(
      id: toInt(json['id']) ?? 0,
      name: json['name'] as String? ?? '',
      role: json['role'] as String? ?? 'commercial',
      total: toInt(json['total']) ?? 0,
      converted: toInt(json['converted']) ?? 0,
      lost: toInt(json['lost']) ?? 0,
      advanced: toInt(json['advanced']) ?? 0,
      value: toDouble(json['value']) ?? 0,
      openValue: toDouble(json['open_value']) ?? 0,
      relancesLate: toInt(json['relances_late']) ?? 0,
      calls: toInt(json['calls']) ?? 0,
      meetingsCount: toInt(json['meetings_count']) ?? 0,
      avgCycleDays: toInt(json['avg_cycle_days']) ?? 0,
    );
  }
}

class TimelinePoint {
  final String day;
  final int n;

  const TimelinePoint({required this.day, required this.n});

  factory TimelinePoint.fromJson(Map<String, dynamic> json) {
    return TimelinePoint(
      day: json['day'] as String? ?? '',
      n: toInt(json['n']) ?? 0,
    );
  }
}

class Forecast {
  final double weightedPipeline;
  final double winRate;
  final double avgDealValue;
  final double expectedNext30;
  final int expectedConversions30;
  final double prospectsPerDay;

  const Forecast({
    required this.weightedPipeline,
    required this.winRate,
    required this.avgDealValue,
    required this.expectedNext30,
    required this.expectedConversions30,
    required this.prospectsPerDay,
  });

  factory Forecast.fromJson(Map<String, dynamic> json) {
    return Forecast(
      weightedPipeline: toDouble(json['weighted_pipeline']) ?? 0,
      winRate: toDouble(json['win_rate']) ?? 0,
      avgDealValue: toDouble(json['avg_deal_value']) ?? 0,
      expectedNext30: toDouble(json['expected_next30']) ?? 0,
      expectedConversions30: toInt(json['expected_conversions30']) ?? 0,
      prospectsPerDay: toDouble(json['prospects_per_day']) ?? 0,
    );
  }
}

class TargetUser {
  final int id;
  final String name;
  final String role;
  final double targetValue;
  final double achieved;

  const TargetUser({
    required this.id,
    required this.name,
    this.role = 'commercial',
    this.targetValue = 0,
    this.achieved = 0,
  });

  double get pct => targetValue > 0 ? (achieved / targetValue * 100).clamp(0, 100) : 0;

  factory TargetUser.fromJson(Map<String, dynamic> json) {
    return TargetUser(
      id: toInt(json['id']) ?? 0,
      name: json['name'] as String? ?? '',
      role: json['role'] as String? ?? 'commercial',
      targetValue: toDouble(json['target_value']) ?? 0,
      achieved: toDouble(json['achieved']) ?? 0,
    );
  }
}

class TargetsResult {
  final String yearMonth;
  final List<TargetUser> users;

  const TargetsResult({required this.yearMonth, this.users = const []});

  factory TargetsResult.fromJson(Map<String, dynamic> json) {
    return TargetsResult(
      yearMonth: json['year_month'] as String? ?? '',
      users: (json['users'] as List?)
              ?.map((e) => TargetUser.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );
  }
}

class ClientInfo {
  final int id;
  final String name;
  final String? company;
  final String? email;
  final String? phone;
  final double value;
  final String? convertedAt;
  final String? assigneeName;
  final int validDevis;
  final double totalValide;
  final int interactions;
  final String? lastInteraction;

  const ClientInfo({
    required this.id,
    required this.name,
    this.company,
    this.email,
    this.phone,
    this.value = 0,
    this.convertedAt,
    this.assigneeName,
    this.validDevis = 0,
    this.totalValide = 0,
    this.interactions = 0,
    this.lastInteraction,
  });

  factory ClientInfo.fromJson(Map<String, dynamic> json) {
    return ClientInfo(
      id: toInt(json['id']) ?? 0,
      name: json['name'] as String? ?? '',
      company: json['company'] as String?,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      value: toDouble(json['value']) ?? 0,
      convertedAt: json['converted_at'] as String?,
      assigneeName: json['assignee_name'] as String?,
      validDevis: toInt(json['valid_devis']) ?? 0,
      totalValide: toDouble(json['total_valide']) ?? 0,
      interactions: toInt(json['interactions']) ?? 0,
      lastInteraction: json['last_interaction'] as String?,
    );
  }
}

class AtRiskItem {
  final int id;
  final String name;
  final String? company;
  final double value;
  final String? temperature;
  final String reason;
  final int days;
  final String? assigneeName;
  final String? nextAction;
  final String? nextActionDate;
  final String? devisRef;

  const AtRiskItem({
    required this.id,
    required this.name,
    this.company,
    this.value = 0,
    this.temperature,
    this.reason = 'overdue',
    this.days = 0,
    this.assigneeName,
    this.nextAction,
    this.nextActionDate,
    this.devisRef,
  });

  String get reasonLabel => switch (reason) {
        'overdue' => 'Relance en retard',
        'stalled' => 'Sans activité',
        'pending_validation' => 'Devis à valider',
        _ => reason,
      };

  factory AtRiskItem.fromJson(Map<String, dynamic> json) {
    return AtRiskItem(
      id: toInt(json['id']) ?? 0,
      name: json['name'] as String? ?? '',
      company: json['company'] as String?,
      value: toDouble(json['value']) ?? 0,
      temperature: json['temperature'] as String?,
      reason: json['reason'] as String? ?? 'overdue',
      days: toInt(json['days']) ?? 0,
      assigneeName: json['assignee_name'] as String?,
      nextAction: json['next_action'] as String?,
      nextActionDate: json['next_action_date'] as String?,
      devisRef: json['devis_ref'] as String?,
    );
  }
}

class AgingBucket {
  final String key;
  final String label;
  final int n;
  final double value;

  const AgingBucket({
    required this.key,
    required this.label,
    this.n = 0,
    this.value = 0,
  });

  factory AgingBucket.fromJson(Map<String, dynamic> json) {
    return AgingBucket(
      key: json['key'] as String? ?? '',
      label: json['label'] as String? ?? '',
      n: toInt(json['n']) ?? 0,
      value: toDouble(json['value']) ?? 0,
    );
  }
}

class AgingStats {
  final int total;
  final int avgAgeDays;
  final List<AgingBucket> buckets;

  const AgingStats({this.total = 0, this.avgAgeDays = 0, this.buckets = const []});

  factory AgingStats.fromJson(Map<String, dynamic> json) {
    return AgingStats(
      total: toInt(json['total']) ?? 0,
      avgAgeDays: toInt(json['avg_age_days']) ?? 0,
      buckets: (json['buckets'] as List?)
              ?.map((e) => AgingBucket.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );
  }
}

class DayRelance {
  final int id;
  final String name;
  final String? company;
  final double value;
  final String? temperature;
  final String? nextAction;
  final String? nextActionDate;
  final String? assigneeName;
  final int? dueInDays;
  final bool isToday;

  const DayRelance({
    required this.id,
    required this.name,
    this.company,
    this.value = 0,
    this.temperature,
    this.nextAction,
    this.nextActionDate,
    this.assigneeName,
    this.dueInDays,
    this.isToday = false,
  });

  factory DayRelance.fromJson(Map<String, dynamic> json) {
    return DayRelance(
      id: toInt(json['id']) ?? 0,
      name: json['name'] as String? ?? '',
      company: json['company'] as String?,
      value: toDouble(json['value']) ?? 0,
      temperature: json['temperature'] as String?,
      nextAction: json['next_action'] as String?,
      nextActionDate: json['next_action_date'] as String?,
      assigneeName: json['assignee_name'] as String?,
      dueInDays: toInt(json['due_in_days']),
      isToday: (json['is_today'] as bool?) ?? false,
    );
  }
}

class DayDevis {
  final int id;
  final String reference;
  final String titre;
  final double montant;
  final String statut;
  final String? prospectName;

  const DayDevis({
    required this.id,
    required this.reference,
    required this.titre,
    this.montant = 0,
    this.statut = 'attente_validation',
    this.prospectName,
  });

  factory DayDevis.fromJson(Map<String, dynamic> json) {
    return DayDevis(
      id: toInt(json['id']) ?? 0,
      reference: json['reference'] as String? ?? '',
      titre: json['titre'] as String? ?? '',
      montant: toDouble(json['montant']) ?? 0,
      statut: json['statut'] as String? ?? 'attente_validation',
      prospectName: json['prospect_name'] as String?,
    );
  }
}

class DayInteraction {
  final int id;
  final String prospectName;
  final String type;
  final String content;
  final String? createdAt;

  const DayInteraction({
    required this.id,
    required this.prospectName,
    this.type = 'note',
    this.content = '',
    this.createdAt,
  });

  factory DayInteraction.fromJson(Map<String, dynamic> json) {
    return DayInteraction(
      id: toInt(json['id']) ?? 0,
      prospectName: json['prospect_name'] as String? ?? '',
      type: json['type'] as String? ?? 'note',
      content: json['content'] as String? ?? '',
      createdAt: json['created_at'] as String?,
    );
  }
}

class DayProspect {
  final int id;
  final String name;
  final String? company;
  final double value;
  final String? temperature;
  final String? assigneeName;
  final String? lastInteraction;
  final String? createdAt;

  const DayProspect({
    required this.id,
    required this.name,
    this.company,
    this.value = 0,
    this.temperature,
    this.assigneeName,
    this.lastInteraction,
    this.createdAt,
  });

  factory DayProspect.fromJson(Map<String, dynamic> json) {
    return DayProspect(
      id: toInt(json['id']) ?? 0,
      name: json['name'] as String? ?? '',
      company: json['company'] as String?,
      value: toDouble(json['value']) ?? 0,
      temperature: json['temperature'] as String?,
      assigneeName: json['assignee_name'] as String?,
      lastInteraction: json['last_interaction'] as String?,
      createdAt: json['created_at'] as String?,
    );
  }
}

class DayData {
  final List<DayRelance> relances;
  final List<Meeting> meetings;
  final List<DayDevis> devis;
  final List<DayInteraction> recentInteractions;
  final List<AtRiskItem> atRisk;
  final List<DayProspect> toTreat;
  final Map<String, dynamic> counts;

  const DayData({
    this.relances = const [],
    this.meetings = const [],
    this.devis = const [],
    this.recentInteractions = const [],
    this.atRisk = const [],
    this.toTreat = const [],
    this.counts = const {},
  });

  int get countRelancesToday => toInt(counts['relances_today']) ?? 0;
  int get countMeetings => toInt(counts['meetings']) ?? 0;
  int get countDevisPending => toInt(counts['devis_pending']) ?? 0;
  int get countAtRisk => toInt(counts['at_risk']) ?? 0;
  int get countToTreat => toInt(counts['to_treat']) ?? 0;

  factory DayData.fromJson(Map<String, dynamic> json) {
    return DayData(
      relances: (json['relances'] as List?)
              ?.map((e) => DayRelance.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      meetings: (json['meetings'] as List?)
              ?.map((e) => Meeting.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      devis: (json['devis'] as List?)
              ?.map((e) => DayDevis.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      recentInteractions: (json['recent_interactions'] as List?)
              ?.map((e) => DayInteraction.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      atRisk: (json['at_risk'] as List?)
              ?.map((e) => AtRiskItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      toTreat: (json['to_treat'] as List?)
              ?.map((e) => DayProspect.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      counts: (json['counts'] as Map<String, dynamic>?) ?? const {},
    );
  }
}