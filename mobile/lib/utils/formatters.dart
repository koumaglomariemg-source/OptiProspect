import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/painting.dart';
import 'package:intl/intl.dart';

MemoryImage? decodeAvatar(String? image) {
  if (image == null || image.isEmpty) return null;
  try {
    final clean = image.contains(',') ? image.split(',').last : image;
    final Uint8List bytes = base64Decode(clean);
    return bytes.isEmpty ? null : MemoryImage(bytes);
  } catch (_) {
    return null;
  }
}

String formatDate(DateTime? d) {
  if (d == null) return '—';
  final local = d.toLocal();
  return '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}/${local.year}';
}

String formatDateTime(DateTime? d) {
  if (d == null) return '—';
  final local = d.toLocal();
  return '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}/${local.year} '
      '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
}

DateTime? parseIso(String? iso) {
  if (iso == null || iso.isEmpty) return null;
  return DateTime.tryParse(iso.contains('T') ? iso : iso.replaceFirst(' ', 'T'));
}

String formatIsoDate(String? iso) {
  final dt = parseIso(iso);
  if (dt == null) return iso ?? '—';
  return formatDate(dt);
}

String formatIsoDateTime(String? iso) {
  final dt = parseIso(iso);
  if (dt == null) return iso ?? '—';
  return formatDateTime(dt);
}

final _nf = NumberFormat('#,##0', 'fr_FR');

String money(num v) => '${_nf.format(v.round())} FCFA';

String moneyShort(num v) => '${_nf.format(v.round())} F';

String initials(String? name) {
  final clean = (name ?? '').trim();
  if (clean.isEmpty) return '?';
  final parts = clean.split(RegExp(r'\s+'));
  if (parts.length == 1) return parts.first[0].toUpperCase();
  return (parts.first[0] + parts.last[0]).toUpperCase();
}

String toApiDate(DateTime d) =>
    '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

String toApiDateTime(DateTime d) =>
    '${toApiDate(d)} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}:${d.second.toString().padLeft(2, '0')}';

String currentYearMonth() {
  final now = DateTime.now();
  return '${now.year}-${now.month.toString().padLeft(2, '0')}';
}

int? toInt(dynamic v) {
  if (v == null) return null;
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v is bool) return v ? 1 : 0;
  if (v is String && v.trim().isNotEmpty) return int.tryParse(v.trim());
  return null;
}

double? toDouble(dynamic v) {
  if (v == null) return null;
  if (v is num) return v.toDouble();
  if (v is String && v.trim().isNotEmpty) return double.tryParse(v.trim());
  return null;
}