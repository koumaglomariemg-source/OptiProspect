import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/constants.dart';
import '../utils/formatters.dart';

class StepFormScreen extends StatefulWidget {
  final StepProgress step;
  final Prospect prospect;

  const StepFormScreen({super.key, required this.step, required this.prospect});

  @override
  State<StepFormScreen> createState() => _StepFormScreenState();
}

class _StepFormScreenState extends State<StepFormScreen> {
  late List<StepProgress> _steps;
  late int _index;
  late StepProgress _current;
  final Map<String, TextEditingController> _controllers = {};
  final Map<String, String> _selects = {};
  bool _loading = true;
  bool _saving = false;
  String? _error;

  ApiClient get _api => context.read<AuthProvider>().api;

  @override
  void initState() {
    super.initState();
    _steps = [widget.step];
    _index = 0;
    _current = widget.step;
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final steps = await _api.steps(widget.prospect.id);
      if (!mounted) return;
      var i = steps.indexWhere((s) => s.progressId == widget.step.progressId);
      if (i < 0) i = steps.where((s) => !s.isValidated).firstOrNull != null
          ? steps.indexWhere((s) => !s.isValidated)
          : 0;
      setState(() {
        _steps = steps;
        _index = i;
        _current = steps[i];
        _error = null;
      });
      _buildControllers();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  void _buildControllers() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    _controllers.clear();
    _selects.clear();
    for (final f in _current.formFields) {
      final value = _current.data[f.key]?.toString() ?? '';
      _controllers[f.key] = TextEditingController(text: value);
      if (f.type == 'select' && value.isNotEmpty) {
        _selects[f.key] = value;
      }
    }
  }

  void _select(int i) {
    setState(() {
      _index = i;
      _current = _steps[i];
      _error = null;
    });
    _buildControllers();
  }

  Map<String, dynamic> _collect() {
    return {
      for (final f in _current.formFields)
        f.key: f.type == 'select' ? _selects[f.key] ?? '' : _controllers[f.key]!.text.trim(),
    };
  }

  bool _validate() {
    for (final f in _current.formFields) {
      if (!f.required) continue;
      final v = f.type == 'select' ? _selects[f.key] ?? '' : _controllers[f.key]!.text.trim();
      if (v.isEmpty) {
        setState(() => _error = 'Le champ « ${f.label} » est requis');
        return false;
      }
    }
    return true;
  }

  Future<void> _save({bool validate = false}) async {
    if (validate && !_validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await _api.saveStep(_current.progressId, _collect());
      if (validate) {
        await _api.validateStep(_current.progressId);
      }
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _unvalidate() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await _api.unvalidateStep(_current.progressId);
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canEdit = _current.status != 'validated';
    return Scaffold(
      appBar: AppBar(
        title: Text(_current.stepName),
        bottom: _steps.length > 1
            ? PreferredSize(
                preferredSize: const Size.fromHeight(56),
                child: SizedBox(
                  height: 56,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    children: [
                      for (var i = 0; i < _steps.length; i++) _stepperItem(i),
                    ],
                  ),
                ),
              )
            : null,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? ErrorState(message: _error!, onRetry: _load)
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _progressCard(),
                    if (_current.isValidated)
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(top: 12),
                        decoration: BoxDecoration(
                          color: Colors.green.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.check_circle, color: Colors.green),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Étape validée le ${formatIsoDateTime(_current.validatedAt)}',
                                style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                      ),
                    if (_current.formFields.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Center(child: Text('Aucun champ pour cette étape')),
                      )
                    else ...[
                      const SizedBox(height: 12),
                      for (final f in _current.formFields) ..._field(f),
                    ],
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        if (_index > 0)
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => _select(_index - 1),
                              icon: const Icon(Icons.chevron_left),
                              label: const Text('Précédent'),
                            ),
                          ),
                        if (_index > 0) const SizedBox(width: 8),
                        if (_index < _steps.length - 1)
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => _select(_index + 1),
                              icon: const Icon(Icons.chevron_right),
                              label: const Text('Suivant'),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (canEdit)
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: _saving ? null : () => _save(),
                              icon: const Icon(Icons.save_outlined),
                              label: const Text('Enregistrer'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: FilledButton.icon(
                              onPressed: _saving ? null : () => _save(validate: true),
                              icon: const Icon(Icons.check_circle_outline),
                              label: const Text('Valider l\'étape'),
                            ),
                          ),
                        ],
                      )
                    else
                      FilledButton.icon(
                        onPressed: _saving ? null : _unvalidate,
                        style: FilledButton.styleFrom(backgroundColor: Colors.orange),
                        icon: const Icon(Icons.undo),
                        label: const Text('Modifier (dévalider)'),
                      ),
                  ],
                ),
    );
  }

  Widget _stepperItem(int i) {
    final s = _steps[i];
    final selected = i == _index;
    final color = colorFromName(s.color);
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ChoiceChip(
        avatar: Icon(
          s.isValidated ? Icons.check_circle : (selected ? Icons.radio_button_checked : Icons.circle_outlined),
          size: 16,
          color: s.isValidated ? Colors.green : color,
        ),
        label: Text('${i + 1}'),
        selected: selected,
        onSelected: (_) => _select(i),
        tooltip: s.stepName,
      ),
    );
  }

  Widget _progressCard() {
    final done = _steps.where((s) => s.isValidated).length;
    return Card(
      color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${widget.prospect.name} — $done/${_steps.length} étapes validées',
                style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: _steps.isEmpty ? 0 : done / _steps.length,
                minHeight: 8,
                backgroundColor: Colors.grey.withValues(alpha: 0.2),
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _field(FormFieldDef f) {
    switch (f.type) {
      case 'number':
        return [
          TextFormField(
            controller: _controllers[f.key],
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: '${f.label}${f.required ? ' *' : ''}',
              prefixIcon: const Icon(Icons.numbers),
            ),
          ),
          const SizedBox(height: 12),
        ];
      case 'textarea':
        return [
          TextFormField(
            controller: _controllers[f.key],
            maxLines: 4,
            decoration: InputDecoration(
              labelText: '${f.label}${f.required ? ' *' : ''}',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 12),
        ];
      case 'select':
        return [
          DropdownButtonFormField<String>(
            initialValue: _selects[f.key],
            decoration: InputDecoration(
              labelText: '${f.label}${f.required ? ' *' : ''}',
            ),
            items: [
              for (final o in f.options) DropdownMenuItem(value: o, child: Text(o)),
            ],
            onChanged: (v) => setState(() => _selects[f.key] = v ?? ''),
          ),
          const SizedBox(height: 12),
        ];
      case 'date':
        return [
          InkWell(
            onTap: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: DateTime.now(),
                firstDate: DateTime(2020, 1),
                lastDate: DateTime(2035, 12),
              );
              if (picked != null) {
                setState(() => _controllers[f.key]!.text = toApiDate(picked));
              }
            },
            child: InputDecorator(
              decoration: InputDecoration(
                labelText: '${f.label}${f.required ? ' *' : ''}',
                prefixIcon: const Icon(Icons.calendar_today),
              ),
              child: Text(
                _controllers[f.key]!.text.isEmpty
                    ? 'Sélectionner une date'
                    : _controllers[f.key]!.text,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ),
          const SizedBox(height: 12),
        ];
      default:
        return [
          TextFormField(
            controller: _controllers[f.key],
            decoration: InputDecoration(
              labelText: '${f.label}${f.required ? ' *' : ''}',
              prefixIcon: const Icon(Icons.edit_outlined),
            ),
          ),
          const SizedBox(height: 12),
        ];
    }
  }
}

class ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const ErrorState({super.key, required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message,
                textAlign: TextAlign.center,
                style: TextStyle(color: Theme.of(context).colorScheme.error)),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Réessayer'),
            ),
          ],
        ),
      ),
    );
  }
}