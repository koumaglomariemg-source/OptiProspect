import '../utils/formatters.dart';

class Report {
  final int id;
  final int? userId;
  final String? periodStart;
  final String? periodEnd;
  final String content;
  final int calls;
  final int visits;
  final int emails;
  final String status;
  final String? reviewComment;
  final String? userName;
  final String? reviewedByName;
  final String? createdAt;

  const Report({
    required this.id,
    this.userId,
    this.periodStart,
    this.periodEnd,
    required this.content,
    this.calls = 0,
    this.visits = 0,
    this.emails = 0,
    this.status = 'en_attente',
    this.reviewComment,
    this.userName,
    this.reviewedByName,
    this.createdAt,
  });

  factory Report.fromJson(Map<String, dynamic> json) {
    return Report(
      id: toInt(json['id']) ?? 0,
      userId: toInt(json['user_id']),
      periodStart: json['period_start'] as String?,
      periodEnd: json['period_end'] as String?,
      content: json['content'] as String? ?? '',
      calls: toInt(json['calls']) ?? 0,
      visits: toInt(json['visits']) ?? 0,
      emails: toInt(json['emails']) ?? 0,
      status: json['status'] as String? ?? 'en_attente',
      reviewComment: json['review_comment'] as String?,
      userName: json['user_name'] as String?,
      reviewedByName: json['reviewed_by_name'] as String?,
      createdAt: json['created_at'] as String?,
    );
  }
}