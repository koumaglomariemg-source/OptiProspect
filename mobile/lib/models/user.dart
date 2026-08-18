import '../utils/formatters.dart';

class User {
  final int id;
  final String name;
  final String email;
  final String role;
  final String? first_name;
  final String? last_name;
  final String? avatar;
  final int? manager_id;
  final String? manager_name;
  final String? created_at;
  final int prospect_count;
  final int active_count;

  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.first_name,
    this.last_name,
    this.avatar,
    this.manager_id,
    this.manager_name,
    this.created_at,
    this.prospect_count = 0,
    this.active_count = 0,
  });

  bool get isAdmin => role == 'admin';
  bool get isManager => role == 'manager';

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: toInt(json['id']) ?? 0,
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      role: json['role'] as String? ?? 'commercial',
      first_name: json['first_name'] as String?,
      last_name: json['last_name'] as String?,
      avatar: json['avatar'] as String?,
      manager_id: toInt(json['manager_id']),
      manager_name: json['manager_name'] as String?,
      created_at: json['created_at'] as String?,
      prospect_count: toInt(json['prospect_count']) ?? 0,
      active_count: toInt(json['active_count']) ?? 0,
    );
  }

  String initials() {
    final clean = name.trim();
    if (clean.isEmpty) return '?';
    final parts = clean.split(RegExp(r'\s+'));
    if (parts.length == 1) return parts.first[0].toUpperCase();
    return (parts.first[0] + parts.last[0]).toUpperCase();
  }
}

class UserDetail {
  final User user;
  final int? teamSize;
  final List<Map<String, dynamic>> teamMembers;
  final Map<String, dynamic>? stats;

  UserDetail({
    required this.user,
    this.teamSize,
    this.teamMembers = const [],
    this.stats,
  });

  factory UserDetail.fromJson(Map<String, dynamic> json) {
    return UserDetail(
      user: User.fromJson(json),
      teamSize: toInt(json['team_size']),
      teamMembers: (json['team_members'] as List?)
              ?.map((e) => e as Map<String, dynamic>)
              .toList() ??
          const [],
      stats: json['stats'] is Map<String, dynamic>
          ? json['stats'] as Map<String, dynamic>
          : null,
    );
  }
}