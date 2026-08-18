import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/app_theme.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/formatters.dart';

class ReportFormScreen extends StatefulWidget {
  const ReportFormScreen({super.key});

  @override
  State<ReportFormScreen> createState() => _ReportFormScreenState();
}

class _ReportFormScreenState extends State<ReportFormScreen> {
  final _content = TextEditingController();
  final _calls = TextEditingController();
  final _visits = TextEditingController();
  final _emails = TextEditingController();
  DateTime? _start;
  DateTime? _end;
  bool _saving = false;
  String? _error;

  ApiClient get _api => context.read<AuthProvider>().api;

  @override
  void dispose() {
    _content.dispose();
    _calls.dispose();
    _visits.dispose();
    _emails.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_content.text.trim().isEmpty) {
      setState(() => _error = 'Le compte rendu est requis');
      return;
    }
    if (_start == null || _end == null) {
      setState(() => _error = 'Sélectionnez la période du rapport');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await _api.createReport({
        'period_start': toApiDate(_start!),
        'period_end': toApiDate(_end!),
        'content': _content.text.trim(),
        'calls': int.tryParse(_calls.text) ?? 0,
        'visits': int.tryParse(_visits.text) ?? 0,
        'emails': int.tryParse(_emails.text) ?? 0,
      });
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Rapport d\'activité')),
      body: _saving
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(_error!,
                        style: TextStyle(color: Theme.of(context).colorScheme.error)),
                  ),
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () => _pickDate(true),
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Du',
                            prefixIcon: Icon(Icons.calendar_today),
                          ),
                          child: Text(
                            _start == null ? '—' : toApiDate(_start!),
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: InkWell(
                        onTap: () => _pickDate(false),
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Au',
                            prefixIcon: Icon(Icons.calendar_today),
                          ),
                          child: Text(
                            _end == null ? '—' : toApiDate(_end!),
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _calls,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Appels'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _visits,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Visites terrain'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _emails,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Emails'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _content,
                  maxLines: 6,
                  decoration: const InputDecoration(
                    labelText: 'Compte rendu *',
                    alignLabelWithHint: true,
                  ),
                ),
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: _submit,
                  style: FilledButton.styleFrom(
                    backgroundColor: kPrimary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  icon: const Icon(Icons.send),
                  label: const Text('Soumettre le rapport'),
                ),
                const SizedBox(height: 24),
              ],
            ),
    );
  }

  Future<void> _pickDate(bool isStart) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2020, 1),
      lastDate: DateTime(2035, 12),
    );
    if (picked == null) return;
    setState(() {
      if (isStart) {
        _start = picked;
      } else {
        _end = picked;
      }
    });
  }
}