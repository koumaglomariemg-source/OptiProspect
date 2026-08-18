import '../utils/formatters.dart';

class FormFieldDef {
  final String key;
  final String label;
  final String type;
  final bool required;
  final List<String> options;

  const FormFieldDef({
    required this.key,
    required this.label,
    this.type = 'text',
    this.required = false,
    this.options = const [],
  });

  factory FormFieldDef.fromJson(Map<String, dynamic> json) {
    return FormFieldDef(
      key: json['key'] as String? ?? '',
      label: json['label'] as String? ?? '',
      type: json['type'] as String? ?? 'text',
      required: json['required'] == true || json['required'] == 1,
      options: (json['options'] as List?)?.map((e) => e.toString()).toList() ??
          const [],
    );
  }

  Map<String, dynamic> toJson() => {
        'key': key,
        'label': label,
        'type': type,
        'required': required,
        if (options.isNotEmpty) 'options': options,
      };
}

class StepProgress {
  final int progressId;
  final int? stepId;
  final String status;
  final Map<String, dynamic> data;
  final String? validatedAt;
  final String? updatedAt;
  final int position;
  final String stepKey;
  final String stepName;
  final String color;
  final List<FormFieldDef> formFields;

  const StepProgress({
    required this.progressId,
    this.stepId,
    required this.status,
    this.data = const {},
    this.validatedAt,
    this.updatedAt,
    this.position = 0,
    required this.stepKey,
    required this.stepName,
    this.color = 'indigo',
    this.formFields = const [],
  });

  bool get isValidated => status == 'validated';

  factory StepProgress.fromJson(Map<String, dynamic> json) {
    return StepProgress(
      progressId: toInt(json['progress_id']) ?? toInt(json['id']) ?? 0,
      stepId: toInt(json['step_id']),
      status: json['status'] as String? ?? 'pending',
      data: json['data'] is Map<String, dynamic>
          ? json['data'] as Map<String, dynamic>
          : const {},
      validatedAt: json['validated_at'] as String?,
      updatedAt: json['updated_at'] as String?,
      position: toInt(json['position']) ?? 0,
      stepKey: json['step_key'] as String? ?? '',
      stepName: json['step_name'] as String? ?? '',
      color: json['color'] as String? ?? 'indigo',
      formFields: json['form_fields'] is List
          ? (json['form_fields'] as List)
              .map((e) => FormFieldDef.fromJson(e as Map<String, dynamic>))
              .toList()
          : const [],
    );
  }
}

class PipelineStep {
  final int id;
  final int position;
  final String key;
  final String name;
  final String color;
  final List<FormFieldDef> formFields;

  const PipelineStep({
    this.id = 0,
    this.position = 0,
    required this.key,
    required this.name,
    this.color = 'indigo',
    this.formFields = const [],
  });

  factory PipelineStep.fromJson(Map<String, dynamic> json) {
    return PipelineStep(
      id: toInt(json['id']) ?? 0,
      position: toInt(json['position']) ?? 0,
      key: json['key'] as String? ?? '',
      name: json['name'] as String? ?? '',
      color: json['color'] as String? ?? 'indigo',
      formFields: json['form_fields'] is List
          ? (json['form_fields'] as List)
              .map((e) => FormFieldDef.fromJson(e as Map<String, dynamic>))
              .toList()
          : const [],
    );
  }

  Map<String, dynamic> toPayload() => {
        'key': key,
        'name': name,
        'color': color,
        'form_fields': formFields.map((f) => f.toJson()).toList(),
      };
}

class PipelineTemplate {
  final int id;
  final String name;
  final String? description;
  final bool isDefault;
  final List<PipelineStep> steps;

  const PipelineTemplate({
    required this.id,
    required this.name,
    this.description,
    this.isDefault = false,
    this.steps = const [],
  });

  factory PipelineTemplate.fromJson(Map<String, dynamic> json) {
    return PipelineTemplate(
      id: toInt(json['id']) ?? 0,
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      isDefault: (toInt(json['is_default']) ?? 0) == 1,
      steps: (json['steps'] as List?)
              ?.map((e) => PipelineStep.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );
  }
}