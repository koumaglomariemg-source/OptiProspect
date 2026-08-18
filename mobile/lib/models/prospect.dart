import '../utils/formatters.dart';

DateTime? parseApiDate(dynamic v) {
  if (v == null || v is! String || v.isEmpty) return null;
  final s = v.contains('T') ? v : v.replaceFirst(' ', 'T');
  return DateTime.tryParse(s)?.toLocal();
}

class CurrentStep {
  final int position;
  final String key;
  final String name;
  final String color;

  const CurrentStep({
    this.position = 0,
    this.key = '',
    this.name = '',
    this.color = 'indigo',
  });

  factory CurrentStep.fromJson(Map<String, dynamic> json) {
    return CurrentStep(
      position: toInt(json['position']) ?? 0,
      key: json['key'] as String? ?? '',
      name: json['name'] as String? ?? '',
      color: json['color'] as String? ?? 'indigo',
    );
  }
}

class Prospect {
  final int id;
  final String name;
  final String? firstName;
  final String? lastName;
  final String? company;
  final String? email;
  final String? phone;
  final String? linkedin;
  final String? source;
  final double value;
  final int score;
  final String? stage;
  final String? temperature;
  final String? secteur;
  final String? adresse;
  final double? latitude;
  final double? longitude;
  final int? assignedTo;
  final String? nextAction;
  final DateTime? nextActionDate;
  final int? dueInDays;
  final String? note;
  final String? contactToken;
  final DateTime? convertedAt;
  final int? templateId;
  final String? numero;
  final String? quartier;
  final int? effectif;
  final String? product;
  final bool contratDepose;
  final bool contratSigne;
  final bool optionFraisScolaire;
  final String? assigneeName;
  final int stepsDone;
  final int stepsTotal;
  final CurrentStep? currentStep;
  final String? createdAt;
  final String? updatedAt;

  const Prospect({
    required this.id,
    required this.name,
    this.firstName,
    this.lastName,
    this.company,
    this.email,
    this.phone,
    this.linkedin,
    this.source,
    this.value = 0,
    this.score = 0,
    this.stage,
    this.temperature,
    this.secteur,
    this.adresse,
    this.latitude,
    this.longitude,
    this.assignedTo,
    this.nextAction,
    this.nextActionDate,
    this.dueInDays,
    this.note,
    this.contactToken,
    this.convertedAt,
    this.templateId,
    this.numero,
    this.quartier,
    this.effectif,
    this.product,
    this.contratDepose = false,
    this.contratSigne = false,
    this.optionFraisScolaire = false,
    this.assigneeName,
    this.stepsDone = 0,
    this.stepsTotal = 0,
    this.currentStep,
    this.createdAt,
    this.updatedAt,
  });

  factory Prospect.fromJson(Map<String, dynamic> json) {
    return Prospect(
      id: toInt(json['id']) ?? 0,
      name: json['name'] as String? ?? '',
      firstName: json['first_name'] as String?,
      lastName: json['last_name'] as String?,
      company: json['company'] as String?,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      linkedin: json['linkedin'] as String?,
      source: json['source'] as String?,
      value: toDouble(json['value']) ?? 0,
      score: toInt(json['score']) ?? 0,
      stage: json['stage'] as String?,
      temperature: json['temperature'] as String?,
      secteur: json['secteur'] as String?,
      adresse: json['adresse'] as String?,
      latitude: toDouble(json['latitude']),
      longitude: toDouble(json['longitude']),
      assignedTo: toInt(json['assigned_to']),
      nextAction: json['next_action'] as String?,
      nextActionDate: parseApiDate(json['next_action_date']),
      dueInDays: toInt(json['due_in_days']),
      note: json['note'] as String?,
      contactToken: json['contact_token'] as String?,
      convertedAt: parseApiDate(json['converted_at']),
      templateId: toInt(json['template_id']),
      numero: json['numero'] as String?,
      quartier: json['quartier'] as String?,
      effectif: toInt(json['effectif']),
      product: json['product'] as String?,
      contratDepose: (toInt(json['contrat_depose']) ?? 0) == 1,
      contratSigne: (toInt(json['contrat_signe']) ?? 0) == 1,
      optionFraisScolaire: (toInt(json['option_frais_scolaire']) ?? 0) == 1,
      assigneeName: json['assignee_name'] as String?,
      stepsDone: toInt(json['steps_done']) ?? 0,
      stepsTotal: toInt(json['steps_total']) ?? 0,
      currentStep: json['current_step'] is Map<String, dynamic>
          ? CurrentStep.fromJson(json['current_step'] as Map<String, dynamic>)
          : null,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }
}

class NextAction {
  final int id;
  final String name;
  final String? company;
  final String? nextAction;
  final String? nextActionDate;
  final int? assignedTo;
  final String? assigneeName;

  const NextAction({
    required this.id,
    required this.name,
    this.company,
    this.nextAction,
    this.nextActionDate,
    this.assignedTo,
    this.assigneeName,
  });

  factory NextAction.fromJson(Map<String, dynamic> json) {
    return NextAction(
      id: toInt(json['id']) ?? 0,
      name: json['name'] as String? ?? '',
      company: json['company'] as String?,
      nextAction: json['next_action'] as String?,
      nextActionDate: json['next_action_date'] as String?,
      assignedTo: toInt(json['assigned_to']),
      assigneeName: json['assignee_name'] as String?,
    );
  }
}

class Interaction {
  final int id;
  final int? prospectId;
  final String type;
  final String content;
  final String? interactionDate;
  final String? userName;

  const Interaction({
    required this.id,
    this.prospectId,
    required this.type,
    required this.content,
    this.interactionDate,
    this.userName,
  });

  factory Interaction.fromJson(Map<String, dynamic> json) {
    return Interaction(
      id: toInt(json['id']) ?? 0,
      prospectId: toInt(json['prospect_id']),
      type: json['type'] as String? ?? '',
      content: json['content'] as String? ?? '',
      interactionDate: json['interaction_date'] as String?,
      userName: json['user_name'] as String?,
    );
  }
}

class ProspectEvent {
  final int id;
  final String type;
  final String? field;
  final String? oldValue;
  final String? newValue;
  final String? userName;
  final String? createdAt;

  const ProspectEvent({
    required this.id,
    required this.type,
    this.field,
    this.oldValue,
    this.newValue,
    this.userName,
    this.createdAt,
  });

  factory ProspectEvent.fromJson(Map<String, dynamic> json) {
    return ProspectEvent(
      id: toInt(json['id']) ?? 0,
      type: json['type'] as String? ?? '',
      field: json['field'] as String?,
      oldValue: json['old_value'] as String?,
      newValue: json['new_value'] as String?,
      userName: json['user_name'] as String?,
      createdAt: json['created_at'] as String?,
    );
  }
}