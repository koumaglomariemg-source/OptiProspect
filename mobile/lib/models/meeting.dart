import '../utils/formatters.dart';

class Participant {
  final int id;
  final String name;
  final String role;

  const Participant({required this.id, required this.name, this.role = 'commercial'});

  factory Participant.fromJson(Map<String, dynamic> json) {
    return Participant(
      id: toInt(json['id']) ?? 0,
      name: json['name'] as String? ?? '',
      role: json['role'] as String? ?? 'commercial',
    );
  }
}

class Meeting {
  final int id;
  final String title;
  final String type;
  final String? location;
  final String? meetingLink;
  final String? startsAt;
  final String? endsAt;
  final String? notes;
  final String? createdByName;
  final List<Participant> participants;

  const Meeting({
    required this.id,
    required this.title,
    this.type = 'en_ligne',
    this.location,
    this.meetingLink,
    this.startsAt,
    this.endsAt,
    this.notes,
    this.createdByName,
    this.participants = const [],
  });

  bool get inLine => type == 'en_ligne';

  factory Meeting.fromJson(Map<String, dynamic> json) {
    return Meeting(
      id: toInt(json['id']) ?? 0,
      title: json['title'] as String? ?? '',
      type: json['type'] as String? ?? 'en_ligne',
      location: json['location'] as String?,
      meetingLink: json['meeting_link'] as String?,
      startsAt: json['starts_at'] as String?,
      endsAt: json['ends_at'] as String?,
      notes: json['notes'] as String?,
      createdByName: json['created_by_name'] as String?,
      participants: (json['participants'] as List?)
              ?.map((e) => Participant.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );
  }
}