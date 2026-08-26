import 'package:flutter/material.dart';

import '../models/prospect.dart';
import '../services/export_service.dart';

/// Bouton d'export (CSV / Excel / PDF) à placer dans une AppBar.
///
/// [getRows] permet de récupérer l'ensemble des lignes à exporter au moment du
/// clic (utile lorsque la liste est paginée côté serveur). Si absent, [rows]
/// est utilisé directement.
class ProspectExportButton extends StatefulWidget {
  final List<ExportColumn> columns;
  final List<Prospect>? rows;
  final Future<List<Prospect>> Function()? getRows;
  final String baseName;
  final String sheetTitle;
  final bool enabled;

  const ProspectExportButton({
    super.key,
    required this.columns,
    required this.baseName,
    this.rows,
    this.getRows,
    this.sheetTitle = 'Prospects',
    this.enabled = true,
  });

  @override
  State<ProspectExportButton> createState() => _ProspectExportButtonState();
}

class _ProspectExportButtonState extends State<ProspectExportButton> {
  bool _busy = false;

  Future<void> _run(ExportFormat format) async {
    if (_busy) return;
    setState(() => _busy = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final rows = widget.getRows != null
          ? await widget.getRows!()
          : (widget.rows ?? const <Prospect>[]);
      if (rows.isEmpty) {
        messenger.showSnackBar(
          const SnackBar(content: Text('Aucune donnée à exporter')),
        );
        return;
      }
      await exportAndShareProspects(
        format: format,
        columns: widget.columns,
        rows: rows,
        baseName: widget.baseName,
        sheetTitle: widget.sheetTitle,
      );
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('Export impossible : $e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _openSheet() async {
    final format = await showModalBottomSheet<ExportFormat>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 4, 16, 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Exporter',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.description_outlined),
              title: const Text('CSV'),
              subtitle: const Text('Tableur brut (.csv)'),
              onTap: () => Navigator.pop(ctx, ExportFormat.csv),
            ),
            ListTile(
              leading: const Icon(Icons.table_chart_outlined),
              title: const Text('Excel'),
              subtitle: const Text('Classeur Excel (.xlsx)'),
              onTap: () => Navigator.pop(ctx, ExportFormat.xlsx),
            ),
            ListTile(
              leading: const Icon(Icons.picture_as_pdf_outlined),
              title: const Text('PDF'),
              subtitle: const Text('Tableau PDF (.pdf)'),
              onTap: () => Navigator.pop(ctx, ExportFormat.pdf),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (format != null) await _run(format);
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: 'Exporter',
      onPressed: (!widget.enabled || _busy) ? null : _openSheet,
      icon: _busy
          ? const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : const Icon(Icons.ios_share_outlined),
    );
  }
}
