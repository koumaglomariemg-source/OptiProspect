import 'package:flutter/material.dart' hide Badge;
import 'package:provider/provider.dart';

import '../config/app_theme.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/constants.dart';
import '../utils/formatters.dart';
import '../widgets/common.dart';
import 'prospect_detail_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  int _tab = 0;
  String _search = '';
  String? _stage;
  String? _source;
  String? _assignedToId;
  DateTime? _dateFrom;
  DateTime? _dateTo;
  DateTime? _rdvFrom;
  DateTime? _rdvTo;
  bool? _contratDepose;
  bool? _optionFraisScolaire;
  bool? _contratSigne;

  List<Prospect>? _prospects;
  int _total = 0;
  int _page = 1;
  int _perPage = 25;
  String? _error;
  bool _showFilters = false;

  ApiClient get _api => context.read<AuthProvider>().api;

  @override
  void initState() {
    super.initState();
    _load();
  }

  bool get _contratSigneTab => _tab == 1;

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final (rows, total) = await _api.prospects(
        search: _search,
        stage: _stage,
        source: _source,
        assignedToId: int.tryParse(_assignedToId ?? ''),
        dateFrom: _dateFrom != null ? toApiDate(_dateFrom!) : null,
        dateTo: _dateTo != null ? toApiDate(_dateTo!) : null,
        nextActionFrom: _rdvFrom != null ? toApiDate(_rdvFrom!) : null,
        nextActionTo: _rdvTo != null ? toApiDate(_rdvTo!) : null,
        contratDepose: _contratDepose,
        optionFraisScolaire: _optionFraisScolaire,
        contratSigne: _contratSigneTab ? true : _contratSigne,
        page: _page,
        limit: _perPage,
      );
      if (mounted) {
        setState(() {
          _prospects = rows;
          _total = total ?? rows.length;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  void _reset() {
    setState(() {
      _search = '';
      _stage = null;
      _source = null;
      _assignedToId = null;
      _dateFrom = null;
      _dateTo = null;
      _rdvFrom = null;
      _rdvTo = null;
      _contratDepose = null;
      _optionFraisScolaire = null;
      _contratSigne = null;
      _page = 1;
    });
    _load();
  }

  bool get _hasActiveFilters =>
      _search.isNotEmpty ||
      _stage != null ||
      _source != null ||
      _assignedToId != null ||
      _dateFrom != null ||
      _dateTo != null ||
      _rdvFrom != null ||
      _rdvTo != null ||
      _contratDepose != null ||
      _optionFraisScolaire != null ||
      _contratSigne != null;

  int get _totalPages => (_total / _perPage).ceil();

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
      appBar: AppBar(
        title: const Text('Recherche'),
        actions: [
          IconButton(
            tooltip: 'Réinitialiser',
            onPressed: _reset,
            icon: const Icon(Icons.filter_alt_off_outlined),
          ),
          IconButton(
            tooltip: 'Filtres',
            onPressed: () => setState(() => _showFilters = !_showFilters),
            icon: Icon(_showFilters ? Icons.filter_alt : Icons.filter_alt_outlined),
          ),
        ],
        bottom: TabBar(
          tabs: const [Tab(text: 'Prospects'), Tab(text: 'Contrats signés')],
          onTap: (i) {
            setState(() {
              _tab = i;
              _page = 1;
            });
            _load();
          },
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Nom, société, email, tél, quartier…',
                prefixIcon: Icon(Icons.search),
                isDense: true,
              ),
              onChanged: (v) {
                _search = v.trim();
                _page = 1;
                _load();
              },
            ),
          ),
          if (_showFilters) _filtersPanel(),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: Row(
              children: [
                Text('$_total prospect(s)',
                    style: const TextStyle(fontSize: 12, color: Colors.grey)),
                if (_hasActiveFilters) ...[
                  const SizedBox(width: 8),
                  const Badge(label: 'Filtres actifs', color: Colors.indigo),
                ],
              ],
            ),
          ),
          Expanded(
            child: _error != null
                ? ErrorRetry(message: _error!, onRetry: _load)
                : _prospects == null
                    ? const Center(child: CircularProgressIndicator())
                    : _prospects!.isEmpty
                        ? const EmptyState(message: 'Aucun prospect trouvé')
                        : RefreshIndicator(
                            onRefresh: _load,
                            child: ListView.builder(
                              physics: const AlwaysScrollableScrollPhysics(),
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              itemCount: _prospects!.length,
                              itemBuilder: (context, i) => _resultTile(_prospects![i]),
                            ),
                          ),
          ),
          if (_totalPages > 1) _paginationBar(),
        ],
      ),
    ),
    );
  }

  Widget _filtersPanel() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
      child: SectionCard(
        title: 'Filtres',
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            _stageSourceRow(),
            const SizedBox(height: 8),
            _dateRow(),
            const SizedBox(height: 8),
            _rdvRow(),
            const SizedBox(height: 8),
            _boolChips(),
          ],
        ),
      ),
    );
  }

  Widget _stageSourceRow() {
    return Row(
      children: [
        Expanded(
          child: DropdownButtonFormField<String?>(
            initialValue: _stage,
            isDense: true,
            decoration: const InputDecoration(labelText: 'Étape'),
            items: [
              const DropdownMenuItem(value: null, child: Text('Toutes')),
              for (final s in kStages)
                DropdownMenuItem(value: s, child: Text(kStageLabels[s] ?? s)),
            ],
            onChanged: (v) {
              _stage = v;
              _page = 1;
              _load();
            },
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: DropdownButtonFormField<String?>(
            initialValue: _source,
            isDense: true,
            decoration: const InputDecoration(labelText: 'Source'),
            items: [
              const DropdownMenuItem(value: null, child: Text('Toutes')),
              for (final k in kSourceKeys)
                DropdownMenuItem(value: k, child: Text(kSourceLabels[k] ?? k)),
            ],
            onChanged: (v) {
              _source = v;
              _page = 1;
              _load();
            },
          ),
        ),
      ],
    );
  }

  Widget _dateRow() {
    return Row(
      children: [
        Expanded(
          child: InkWell(
            onTap: () => _pickDate((d) => _dateFrom = d),
            child: InputDecorator(
              decoration: const InputDecoration(labelText: 'Prospection du', isDense: true),
              child: Text(_dateFrom == null ? '—' : toApiDate(_dateFrom!),
                  style: const TextStyle(fontSize: 13)),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: InkWell(
            onTap: () => _pickDate((d) => _dateTo = d),
            child: InputDecorator(
              decoration: const InputDecoration(labelText: 'au', isDense: true),
              child: Text(_dateTo == null ? '—' : toApiDate(_dateTo!),
                  style: const TextStyle(fontSize: 13)),
            ),
          ),
        ),
      ],
    );
  }

  Widget _rdvRow() {
    return Row(
      children: [
        Expanded(
          child: InkWell(
            onTap: () => _pickDate((d) => _rdvFrom = d),
            child: InputDecorator(
              decoration: const InputDecoration(labelText: 'RDV à partir du', isDense: true),
              child: Text(_rdvFrom == null ? '—' : toApiDate(_rdvFrom!),
                  style: const TextStyle(fontSize: 13)),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: InkWell(
            onTap: () => _pickDate((d) => _rdvTo = d),
            child: InputDecorator(
              decoration: const InputDecoration(labelText: 'jusqu\'au', isDense: true),
              child: Text(_rdvTo == null ? '—' : toApiDate(_rdvTo!),
                  style: const TextStyle(fontSize: 13)),
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _pickDate(void Function(DateTime) set) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2020, 1),
      lastDate: DateTime(2035, 12),
    );
    if (picked == null) return;
    set(picked);
    _page = 1;
    _load();
  }

  Widget _boolChips() {
    Widget chip(String label, bool? value, void Function(bool?) onChanged) {
      return ChoiceChip(
        label: Text(label),
        selected: value != null,
        selectedColor: Colors.indigo.withValues(alpha: 0.2),
        onSelected: (s) {
          final next = s ? !(value ?? false) : null;
          onChanged(next);
          _page = 1;
          _load();
        },
      );
    }

    return Row(
      children: [
        chip('Contrat déposé', _contratDepose, (v) => _contratDepose = v),
        const SizedBox(width: 8),
        chip('Frais scolaire', _optionFraisScolaire, (v) => _optionFraisScolaire = v),
        if (!_contratSigneTab) ...[
          const SizedBox(width: 8),
          chip('Contrat signé', _contratSigne, (v) => _contratSigne = v),
        ],
      ],
    );
  }

  Widget _resultTile(Prospect p) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () async {
          final fresh = await _api.prospect(p.id);
          if (!mounted) return;
          await Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => ProspectDetailScreen(prospect: fresh)),
          );
          _load();
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                backgroundColor: kPrimary.withValues(alpha: 0.15),
                child: Text(initials(p.name),
                    style: const TextStyle(color: kPrimary, fontSize: 12, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                    Text(
                      [p.company ?? '', p.quartier ?? '', p.numero ?? '']
                          .where((s) => s.isNotEmpty)
                          .join(' • '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  if (p.stage != null) StageBadge(stage: p.stage),
                  if (p.contratDepose || p.contratSigne) ...[
                    const SizedBox(height: 4),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (p.contratDepose) const Badge(label: 'déposé', color: Colors.indigo),
                        if (p.contratSigne) ...[
                          const SizedBox(width: 4),
                          const Badge(label: 'signé', color: Colors.green),
                        ],
                      ],
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _paginationBar() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            IconButton(
              icon: const Icon(Icons.chevron_left),
              onPressed: _page > 1
                  ? () {
                      _page--;
                      _load();
                    }
                  : null,
            ),
            Text('Page $_page / $_totalPages'),
            IconButton(
              icon: const Icon(Icons.chevron_right),
              onPressed: _page < _totalPages
                  ? () {
                      _page++;
                      _load();
                    }
                  : null,
            ),
            const SizedBox(width: 8),
            DropdownButton<int>(
              value: _perPage,
              items: const [
                DropdownMenuItem(value: 10, child: Text('10')),
                DropdownMenuItem(value: 25, child: Text('25')),
                DropdownMenuItem(value: 50, child: Text('50')),
                DropdownMenuItem(value: 100, child: Text('100')),
              ],
              onChanged: (v) {
                _perPage = v ?? 25;
                _page = 1;
                _load();
              },
            ),
          ],
        ),
      ),
    );
  }
}