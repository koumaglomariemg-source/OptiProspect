import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:excel/excel.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:share_plus/share_plus.dart';

import '../models/prospect.dart';
import '../utils/formatters.dart';

enum ExportFormat { csv, xlsx, pdf }

class ExportColumn {
  final String key;

  /// Raw label used as-is for the CSV header (mirrors the web export).
  final String label;

  const ExportColumn(this.key, this.label);
}

/// Colonnes exportées depuis le Kanban (identiques au web).
const kKanbanExportColumns = <ExportColumn>[
  ExportColumn('numero', 'numero'),
  ExportColumn('name', 'name'),
  ExportColumn('company', 'company'),
  ExportColumn('email', 'email'),
  ExportColumn('phone', 'phone'),
  ExportColumn('linkedin', 'linkedin'),
  ExportColumn('source', 'source'),
  ExportColumn('secteur', 'secteur'),
  ExportColumn('adresse', 'adresse'),
  ExportColumn('stage', 'stage'),
  ExportColumn('value', 'value'),
  ExportColumn('next_action', 'next_action'),
  ExportColumn('next_action_date', 'next_action_date'),
  ExportColumn('note', 'note'),
];

/// Colonnes exportées depuis la Recherche (identiques au web).
const kRechercheExportColumns = <ExportColumn>[
  ExportColumn('numero', 'numero'),
  ExportColumn('name', 'name'),
  ExportColumn('company', 'company'),
  ExportColumn('email', 'email'),
  ExportColumn('phone', 'phone'),
  ExportColumn('source', 'source'),
  ExportColumn('secteur', 'secteur'),
  ExportColumn('adresse', 'adresse'),
  ExportColumn('quartier', 'quartier'),
  ExportColumn('effectif', 'effectif'),
  ExportColumn('stage', 'stage'),
  ExportColumn('current_step', 'etape_courante'),
  ExportColumn('value', 'value'),
  ExportColumn('contrat_depose', 'contrat_depose'),
  ExportColumn('contrat_signe', 'contrat_signe'),
  ExportColumn('option_frais_scolaire', 'option_frais_scolaire'),
  ExportColumn('next_action', 'next_action'),
  ExportColumn('next_action_date', 'next_action_date'),
  ExportColumn('note', 'note'),
];

const _headerLabels = <String, String>{
  'numero': 'N°',
  'name': 'Nom',
  'company': 'Société',
  'email': 'Email',
  'phone': 'Téléphone',
  'linkedin': 'LinkedIn',
  'source': 'Source',
  'secteur': 'Secteur',
  'adresse': 'Adresse',
  'quartier': 'Quartier',
  'effectif': 'Effectif',
  'stage': 'Étape',
  'current_step': 'Étape courante',
  'etape_courante': 'Étape courante',
  'value': 'Valeur (FCFA)',
  'contrat_depose': 'Contrat déposé',
  'contrat_signe': 'Contrat signé',
  'option_frais_scolaire': 'Option frais scolaire',
  'next_action': 'Prochaine action',
  'next_action_date': 'Date prochaine action',
  'note': 'Note',
  'created_at': 'Créé le',
  'updated_at': 'Modifié le',
};

const _boolKeys = <String>{
  'contrat_depose',
  'contrat_signe',
  'option_frais_scolaire',
};

String _friendlyHeader(String raw) {
  final mapped = _headerLabels[raw];
  if (mapped != null) return mapped;
  final s = raw.replaceAll('_', ' ');
  return s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}

/// Valeur d'une cellule pour un prospect selon la clé de colonne.
String prospectCell(Prospect p, String key) {
  if (_boolKeys.contains(key)) {
    switch (key) {
      case 'contrat_depose':
        return p.contratDepose ? 'Oui' : 'Non';
      case 'contrat_signe':
        return p.contratSigne ? 'Oui' : 'Non';
      case 'option_frais_scolaire':
        return p.optionFraisScolaire ? 'Oui' : 'Non';
    }
  }
  switch (key) {
    case 'numero':
      return p.numero ?? '';
    case 'name':
      return p.name;
    case 'company':
      return p.company ?? '';
    case 'email':
      return p.email ?? '';
    case 'phone':
      return p.phone ?? '';
    case 'linkedin':
      return p.linkedin ?? '';
    case 'source':
      return p.source ?? '';
    case 'secteur':
      return p.secteur ?? '';
    case 'adresse':
      return p.adresse ?? '';
    case 'quartier':
      return p.quartier ?? '';
    case 'effectif':
      return p.effectif?.toString() ?? '';
    case 'stage':
      return p.stage ?? '';
    case 'current_step':
    case 'etape_courante':
      return p.currentStep?.name ?? '';
    case 'value':
      return p.value == 0 ? '' : p.value.round().toString();
    case 'next_action':
      return p.nextAction ?? '';
    case 'next_action_date':
      return p.nextActionDate == null ? '' : formatDate(p.nextActionDate);
    case 'note':
      return p.note ?? '';
    case 'created_at':
      return p.createdAt == null ? '' : formatIsoDateTime(p.createdAt);
    case 'updated_at':
      return p.updatedAt == null ? '' : formatIsoDateTime(p.updatedAt);
    default:
      return '';
  }
}

String _csvEscape(String value) {
  return RegExp('[",\n;]').hasMatch(value)
      ? '"${value.replaceAll('"', '""')}"'
      : value;
}

String buildCsv(List<ExportColumn> columns, List<Prospect> rows) {
  final header = columns.map((c) => _csvEscape(c.label)).join(';');
  final lines = rows.map(
    (r) => columns.map((c) => _csvEscape(prospectCell(r, c.key))).join(';'),
  );
  return '\uFEFF${[header, ...lines].join('\r\n')}';
}

Uint8List buildXlsx(
  List<ExportColumn> columns,
  List<Prospect> rows, {
  String sheetName = 'Prospects',
}) {
  final excel = Excel.createExcel();
  final defaultSheet = excel.getDefaultSheet();
  final sheet = excel[sheetName];
  sheet.appendRow(
    columns.map((c) => TextCellValue(_friendlyHeader(c.label))).toList(),
  );
  for (final r in rows) {
    sheet.appendRow(
      columns.map((c) => TextCellValue(prospectCell(r, c.key))).toList(),
    );
  }
  if (defaultSheet != null && defaultSheet != sheetName) {
    excel.delete(defaultSheet);
  }
  final bytes = excel.encode();
  return Uint8List.fromList(bytes ?? <int>[]);
}

Future<Uint8List> buildPdf(
  List<ExportColumn> columns,
  List<Prospect> rows, {
  String title = 'Prospects',
}) async {
  final doc = pw.Document();
  final headers = columns.map((c) => _friendlyHeader(c.label)).toList();
  final data = rows
      .map((r) => columns.map((c) => prospectCell(r, c.key)).toList())
      .toList();
  doc.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4.landscape,
      margin: const pw.EdgeInsets.all(16),
      build: (context) => [
        pw.Text(
          title,
          style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold),
        ),
        pw.SizedBox(height: 2),
        pw.Text(
          '${rows.length} prospect(s) — ${formatDate(DateTime.now())}',
          style: pw.TextStyle(fontSize: 8, color: PdfColors.grey600),
        ),
        pw.SizedBox(height: 6),
        pw.TableHelper.fromTextArray(
          headers: headers,
          data: data,
          border: null,
          headerStyle: pw.TextStyle(
            color: PdfColors.white,
            fontWeight: pw.FontWeight.bold,
            fontSize: 7,
          ),
          headerDecoration: const pw.BoxDecoration(
            color: PdfColor.fromInt(0xFF4F46E5),
          ),
          cellStyle: const pw.TextStyle(fontSize: 7),
          cellHeight: 14,
          oddRowDecoration: const pw.BoxDecoration(
            color: PdfColor.fromInt(0xFFF4F4FC),
          ),
          cellAlignment: pw.Alignment.centerLeft,
        ),
      ],
      footer: (context) => pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(
            'OptiProspect',
            style: pw.TextStyle(fontSize: 8, color: PdfColors.grey500),
          ),
          pw.Text(
            'Page ${context.pageNumber}/${context.pagesCount}',
            style: pw.TextStyle(fontSize: 8, color: PdfColors.grey500),
          ),
        ],
      ),
    ),
  );
  return doc.save();
}

/// Génère le fichier au format demandé puis ouvre la feuille de partage système.
Future<void> exportAndShareProspects({
  required ExportFormat format,
  required List<ExportColumn> columns,
  required List<Prospect> rows,
  required String baseName,
  String sheetTitle = 'Prospects',
}) async {
  final base = '$baseName-${toApiDate(DateTime.now())}';
  final Uint8List bytes;
  final String filename;
  final String mime;
  switch (format) {
    case ExportFormat.csv:
      bytes = Uint8List.fromList(utf8.encode(buildCsv(columns, rows)));
      filename = '$base.csv';
      mime = 'text/csv';
      break;
    case ExportFormat.xlsx:
      bytes = buildXlsx(columns, rows);
      filename = '$base.xlsx';
      mime =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      break;
    case ExportFormat.pdf:
      bytes = await buildPdf(columns, rows, title: sheetTitle);
      filename = '$base.pdf';
      mime = 'application/pdf';
      break;
  }
  final dir = await getTemporaryDirectory();
  final file = File('${dir.path}/$filename');
  await file.writeAsBytes(bytes);
  await SharePlus.instance.share(
    ShareParams(
      files: [XFile(file.path, mimeType: mime, name: filename)],
      subject: filename,
    ),
  );
}

/// Écrit un contenu JSON de sauvegarde puis ouvre la feuille de partage.
Future<void> exportAndShareBackup(Map<String, dynamic> data) async {
  final base = 'optiprospect-backup-${toApiDate(DateTime.now())}';
  final filename = '$base.json';
  final bytes = Uint8List.fromList(
    utf8.encode(const JsonEncoder.withIndent('  ').convert(data)),
  );
  final dir = await getTemporaryDirectory();
  final file = File('${dir.path}/$filename');
  await file.writeAsBytes(bytes);
  await SharePlus.instance.share(
    ShareParams(
      files: [XFile(file.path, mimeType: 'application/json', name: filename)],
      subject: filename,
    ),
  );
}
