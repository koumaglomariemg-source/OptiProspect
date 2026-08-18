import '../utils/formatters.dart';
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

  const ByUserStat({
    required this.id,
    required this.name,
    this.role = 'commercial',
    this.total = 0,
    this.converted = 0,
    this.lost = 0,
    this.advanced = 0,
    this.value = 0,
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