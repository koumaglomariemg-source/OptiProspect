import '../utils/formatters.dart';

class StageSetting {
  final String key;
  final String label;
  final String color;

  const StageSetting({required this.key, required this.label, this.color = 'indigo'});

  factory StageSetting.fromJson(Map<String, dynamic> json) {
    return StageSetting(
      key: json['key'] as String? ?? '',
      label: json['label'] as String? ?? '',
      color: json['color'] as String? ?? 'indigo',
    );
  }
}

class Settings {
  final List<StageSetting> stages;
  final List<String> products;
  final List<String> zones;
  final List<String> refusalReasons;

  const Settings({
    this.stages = const [],
    this.products = const [],
    this.zones = const [],
    this.refusalReasons = const [],
  });

  factory Settings.fromJson(Map<String, dynamic> json) {
    return Settings(
      stages: (json['stages'] as List?)
              ?.map((e) => StageSetting.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      products: (json['products'] as List?)?.map((e) => e.toString()).toList() ??
          const [],
      zones: (json['zones'] as List?)?.map((e) => e.toString()).toList() ??
          const [],
      refusalReasons:
          (json['refusal_reasons'] as List?)?.map((e) => e.toString()).toList() ??
              const [],
    );
  }
}

class AuditLogEntry {
  final int id;
  final String? userName;
  final String action;
  final String? details;
  final String? createdAt;

  const AuditLogEntry({
    required this.id,
    this.userName,
    required this.action,
    this.details,
    this.createdAt,
  });

  factory AuditLogEntry.fromJson(Map<String, dynamic> json) {
    return AuditLogEntry(
      id: toInt(json['id']) ?? 0,
      userName: json['user_name'] as String?,
      action: json['action'] as String? ?? '',
      details: json['details'] as String?,
      createdAt: json['created_at'] as String?,
    );
  }
}