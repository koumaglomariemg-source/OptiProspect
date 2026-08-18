import '../utils/formatters.dart';

class AppNotification {
  final int id;
  final String title;
  final String message;
  final String type;
  final bool read;
  final String createdAt;

  const AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.read,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: toInt(json['id']) ?? 0,
      title: json['title'] as String? ?? '',
      message: json['message'] as String? ?? '',
      type: json['type'] as String? ?? 'info',
      read: (toInt(json['read']) ?? 0) == 1 || json['read'] == true,
      createdAt: json['created_at'] as String? ?? '',
    );
  }
}

class MessageSuggestion {
  final String? subject;
  final String? email;
  final String? whatsapp;
  final String? linkedin;
  final String? nextActionSuggestion;

  const MessageSuggestion({
    this.subject,
    this.email,
    this.whatsapp,
    this.linkedin,
    this.nextActionSuggestion,
  });

  factory MessageSuggestion.fromJson(Map<String, dynamic> json) {
    return MessageSuggestion(
      subject: json['subject'] as String?,
      email: json['email'] as String?,
      whatsapp: json['whatsapp'] as String?,
      linkedin: json['linkedin'] as String?,
      nextActionSuggestion: json['next_action_suggestion'] as String?,
    );
  }
}

class MessageResult {
  final String channel;
  final bool delivered;
  final bool skipped;
  final String? reason;

  const MessageResult({
    required this.channel,
    required this.delivered,
    required this.skipped,
    this.reason,
  });

  factory MessageResult.fromJson(Map<String, dynamic> json) {
    return MessageResult(
      channel: json['channel'] as String? ?? 'email',
      delivered: json['delivered'] == true,
      skipped: json['skipped'] == true,
      reason: json['reason'] as String?,
    );
  }
}