import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/app_theme.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/formatters.dart';

class MeetingFormScreen extends StatefulWidget {
  const MeetingFormScreen({super.key});

  @override
  State<MeetingFormScreen> createState() => _MeetingFormScreenState();
}

class _MeetingFormScreenState extends State<MeetingFormScreen> {
  final _title = TextEditingController();
  final _location = TextEditingController();
  final _link = TextEditingController();
  final _notes = TextEditingController();
  String _type = 'en_ligne';
  DateTime _date = DateTime.now();
  TimeOfDay _start = const TimeOfDay(hour: 10, minute: 0);
  TimeOfDay _end = const TimeOfDay(hour: 11, minute: 0);
  List<User>? _users;
  final Set<int> _participants = {};
  bool _saving = false;
  String? _error;

  ApiClient get _api => context.read<AuthProvider>().api;

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    try {
      final users = await _api.users();
      if (mounted) setState(() => _users = users);
    } catch (_) {}
  }

  @override
  void dispose() {
    _title.dispose();
    _location.dispose();
    _link.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_title.text.trim().isEmpty) {
      setState(() => _error = 'Le titre est requis');
      return;
    }
    if (_participants.isEmpty) {
      setState(() => _error = 'Ajoutez au moins un participant');
      return;
    }
    final start = DateTime(
        _date.year, _date.month, _date.day, _start.hour, _start.minute);
    final end =
        DateTime(_date.year, _date.month, _date.day, _end.hour, _end.minute);
    if (!end.isAfter(start)) {
      setState(() => _error = 'L\'heure de fin doit être après l\'heure de début');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await _api.createMeeting({
        'title': _title.text.trim(),
        'type': _type,
        if (_location.text.trim().isNotEmpty) 'location': _location.text.trim(),
        if (_link.text.trim().isNotEmpty) 'meeting_link': _link.text.trim(),
        'starts_at': toApiDateTime(start),
        'ends_at': toApiDateTime(end),
        if (_notes.text.trim().isNotEmpty) 'notes': _notes.text.trim(),
        'participants': _participants.toList(),
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
      appBar: AppBar(title: const Text('Nouvelle réunion')),
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
                TextField(
                  controller: _title,
                  decoration: const InputDecoration(labelText: 'Titre *'),
                ),
                const SizedBox(height: 16),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(
                      value: 'en_ligne',
                      label: Text('En ligne'),
                      icon: Icon(Icons.videocam_outlined),
                    ),
                    ButtonSegment(
                      value: 'presentiel',
                      label: Text('Présentiel'),
                      icon: Icon(Icons.place_outlined),
                    ),
                  ],
                  selected: {_type},
                  onSelectionChanged: (s) => setState(() => _type = s.first),
                ),
                const SizedBox(height: 16),
                if (_type == 'presentiel')
                  TextField(
                    controller: _location,
                    decoration: const InputDecoration(
                      labelText: 'Lieu',
                      prefixIcon: Icon(Icons.place_outlined),
                    ),
                  )
                else
                  TextField(
                    controller: _link,
                    decoration: const InputDecoration(
                      labelText: 'Lien de visioconférence',
                      prefixIcon: Icon(Icons.link),
                    ),
                  ),
                const SizedBox(height: 16),
                TextField(
                  controller: _notes,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Ordre du jour (optionnel)',
                    alignLabelWithHint: true,
                  ),
                ),
                const SizedBox(height: 16),
                InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _date,
                      firstDate: DateTime(2020, 1),
                      lastDate: DateTime(2035, 12),
                    );
                    if (picked != null) setState(() => _date = picked);
                  },
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'Date',
                      prefixIcon: Icon(Icons.calendar_today),
                    ),
                    child: Text(toApiDate(_date),
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () async {
                          final picked = await showTimePicker(
                              context: context, initialTime: _start);
                          if (picked != null) setState(() => _start = picked);
                        },
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Début',
                            prefixIcon: Icon(Icons.access_time),
                          ),
                          child: Text(_start.format(context),
                              style: const TextStyle(fontWeight: FontWeight.w600)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: InkWell(
                        onTap: () async {
                          final picked = await showTimePicker(
                              context: context, initialTime: _end);
                          if (picked != null) setState(() => _end = picked);
                        },
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Fin',
                            prefixIcon: Icon(Icons.access_time),
                          ),
                          child: Text(_end.format(context),
                              style: const TextStyle(fontWeight: FontWeight.w600)),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Text('Participants',
                    style: Theme.of(context)
                        .textTheme
                        .titleSmall
                        ?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                if (_users == null)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(16),
                      child: CircularProgressIndicator(),
                    ),
                  )
                else
                  for (final u in _users!)
                    CheckboxListTile(
                      value: _participants.contains(u.id),
                      onChanged: (v) => setState(() {
                        if (v == true) {
                          _participants.add(u.id);
                        } else {
                          _participants.remove(u.id);
                        }
                      }),
                      title: Text(u.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                      subtitle: Text(u.role, maxLines: 1, overflow: TextOverflow.ellipsis),
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                    ),
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: _submit,
                  style: FilledButton.styleFrom(
                    backgroundColor: kPrimary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  icon: const Icon(Icons.event_available),
                  label: const Text('Créer la réunion'),
                ),
                const SizedBox(height: 24),
              ],
            ),
    );
  }
}