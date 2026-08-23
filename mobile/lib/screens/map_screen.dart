import 'package:flutter/material.dart' hide Badge;
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';

import '../config/app_theme.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/api_client.dart';
import '../utils/constants.dart';
import '../utils/formatters.dart';
import '../widgets/common.dart';
import 'prospect_detail_screen.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();
  List<Prospect>? _prospects;
  String? _error;

  ApiClient get _api => context.read<AuthProvider>().api;

  List<Prospect> get _positioned => (_prospects ?? [])
      .where((p) => p.latitude != null && p.longitude != null)
      .toList();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _mapController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final (rows, _) = await _api.prospects();
      if (mounted) {
        setState(() {
          _prospects = rows;
        });
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          final positioned = _positioned;
          if (positioned.isEmpty) return;
          final bounds = LatLngBounds.fromPoints([
            for (final p in positioned) LatLng(p.latitude!, p.longitude!),
          ]);
          _mapController.fitCamera(
            CameraFit.bounds(
              bounds: bounds,
              padding: const EdgeInsets.all(48),
            ),
          );
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  void _openProspect(Prospect p) async {
    if (!mounted) return;
    Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => ProspectDetailScreen(prospect: p)));
  }

  void _showDetails(Prospect p) {
    final scheme = Theme.of(context).colorScheme;
    final color = stageColor(p.stage ?? 'identification');
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      backgroundColor: scheme.surfaceContainerHigh,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppSpacing.radiusLg)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(AppSpacing.md, 0, AppSpacing.md, AppSpacing.md),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: color.withValues(alpha: 0.12),
                    child: Text(
                      initials(p.name),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: color,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          p.name,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                        ),
                        if (p.company != null && p.company!.isNotEmpty)
                          Text(
                            p.company!,
                            style: TextStyle(fontSize: 13, color: scheme.onSurfaceVariant),
                          ),
                      ],
                    ),
                  ),
                  Badge(label: kStageLabels[p.stage] ?? p.stage ?? '', color: color),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if (p.quartier != null && p.quartier!.isNotEmpty)
                    InfoRow(icon: Icons.location_on_outlined, label: p.quartier!),
                  if (p.value > 0)
                    InfoRow(icon: Icons.payments_outlined, label: money(p.value)),
                  if (p.nextActionDate != null)
                    InfoRow(
                      icon: Icons.event_outlined,
                      label: 'Action : ${formatDate(p.nextActionDate)}',
                    ),
                ],
              ),
              if (p.adresse != null && p.adresse!.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    p.adresse!,
                    style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
                  ),
                ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () {
                    Navigator.pop(ctx);
                    _openProspect(p);
                  },
                  icon: const Icon(Icons.open_in_new),
                  label: const Text('Voir le prospect'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: widget.embedded ? null : AppBar(title: const Text('Carte')),
      body: _error != null
          ? ErrorRetry(message: _error!, onRetry: _load)
          : _prospects == null
              ? const Center(child: CircularProgressIndicator())
              : Stack(
                  children: [
                    FlutterMap(
                      mapController: _mapController,
                      options: MapOptions(
                        initialCenter: const LatLng(6.1319, 1.2228),
                        initialZoom: 10,
                        backgroundColor: scheme.surfaceContainerLowest,
                        onTap: (_, __) {},
                      ),
                      children: [
                        TileLayer(
                          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          maxZoom: 19,
                          userAgentPackageName: 'com.optiprospect.app',
                        ),
                        MarkerLayer(
                          markers: [
                            for (final p in _positioned)
                              Marker(
                                point: LatLng(p.latitude!, p.longitude!),
                                width: 190,
                                height: 36,
                                alignment: Alignment.centerLeft,
                                child: GestureDetector(
                                  onTap: () => _showDetails(p),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Container(
                                        width: 34,
                                        height: 34,
                                        decoration: BoxDecoration(
                                          color: stageColor(p.stage ?? 'identification'),
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                            color: scheme.surface,
                                            width: 3,
                                          ),
                                          boxShadow: [
                                            BoxShadow(
                                              color: Colors.black.withValues(alpha: 0.25),
                                              blurRadius: 6,
                                              offset: const Offset(0, 2),
                                            ),
                                          ],
                                        ),
                                        child: Center(
                                          child: Text(
                                            initials(p.name),
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Flexible(
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: scheme.surface.withValues(alpha: 0.94),
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(color: scheme.outlineVariant),
                                            boxShadow: [
                                              BoxShadow(
                                                color: Colors.black.withValues(alpha: 0.12),
                                                blurRadius: 3,
                                                offset: const Offset(0, 1),
                                              ),
                                            ],
                                          ),
                                          child: Text(
                                            p.name,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600,
                                              color: scheme.onSurface,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                    Positioned(
                      top: 12,
                      left: 12,
                      right: 12,
                      child: Material(
                        color: scheme.surface.withValues(alpha: 0.92),
                        elevation: 2,
                        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          child: Row(
                            children: [
                              Icon(Icons.map_outlined, size: 18, color: kPrimary),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  '${_positioned.length} prospect(s) positionné(s) sur ${_prospects?.length ?? 0}',
                                  style: TextStyle(fontSize: 13, color: scheme.onSurface),
                                ),
                              ),
                              IconButton(
                                visualDensity: VisualDensity.compact,
                                tooltip: 'Actualiser',
                                icon: const Icon(Icons.refresh, size: 18),
                                onPressed: _load,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    if (_positioned.isEmpty)
                      Center(
                        child: Material(
                          color: scheme.surface,
                          elevation: 2,
                          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                          child: Padding(
                            padding: const EdgeInsets.all(20),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.location_off_outlined, size: 36, color: scheme.onSurfaceVariant),
                                const SizedBox(height: 10),
                                const Text(
                                  "Aucun prospect n'a de coordonnées GPS",
                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  "Renseignez la latitude / longitude d'un prospect pour le voir apparaître ici.",
                                  textAlign: TextAlign.center,
                                  style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    Positioned(
                      left: 12,
                      right: 12,
                      bottom: 16,
                      child: Align(
                        alignment: Alignment.bottomCenter,
                        child: Material(
                          color: scheme.surface.withValues(alpha: 0.92),
                          elevation: 2,
                          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                for (final s in _visibleStages()) ...[
                                  _LegendDot(color: stageColor(s), label: kStageLabels[s] ?? s),
                                  if (s != _visibleStages().last) const SizedBox(width: 10),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }

  List<String> _visibleStages() {
    final stages = <String>[];
    for (final p in _positioned) {
      final s = p.stage ?? 'identification';
      if (!stages.contains(s)) stages.add(s);
    }
    return stages;
  }
}

class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendDot({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
      ],
    );
  }
}

