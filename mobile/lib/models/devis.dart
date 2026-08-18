import '../utils/formatters.dart';

class DevisItem {
  final String name;
  final int qty;
  final double price;
  final String? period;

  const DevisItem({required this.name, this.qty = 1, this.price = 0, this.period});

  factory DevisItem.fromJson(Map<String, dynamic> json) {
    return DevisItem(
      name: json['name'] as String? ?? '',
      qty: toInt(json['qty']) ?? 1,
      price: toDouble(json['price']) ?? 0,
      period: json['period'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'qty': qty,
        'price': price,
        if (period != null) 'period': period,
      };

  double get total => qty * price;
  double get annual => total * switch (period) {
        'mensuel' => 12,
        'trimestriel' => 4,
        'annuel' => 1,
        _ => 0,
      };
}

class Devis {
  final int id;
  final String reference;
  final int? prospectId;
  final String? prospectName;
  final String? prospectCompany;
  final String titre;
  final String? description;
  final double montant;
  final double arr;
  final String statut;
  final int? createdBy;
  final String? renewalDate;
  final String? createdByName;
  final String? validatedByName;
  final String? validationComment;
  final List<DevisItem> items;
  final String? createdAt;

  const Devis({
    required this.id,
    required this.reference,
    this.prospectId,
    this.prospectName,
    this.prospectCompany,
    required this.titre,
    this.description,
    this.montant = 0,
    this.arr = 0,
    this.statut = 'brouillon',
    this.createdBy,
    this.renewalDate,
    this.createdByName,
    this.validatedByName,
    this.validationComment,
    this.items = const [],
    this.createdAt,
  });

  factory Devis.fromJson(Map<String, dynamic> json) {
    return Devis(
      id: toInt(json['id']) ?? 0,
      reference: json['reference'] as String? ?? '',
      prospectId: toInt(json['prospect_id']),
      prospectName: json['prospect_name'] as String?,
      prospectCompany: json['prospect_company'] as String?,
      titre: json['titre'] as String? ?? '',
      description: json['description'] as String?,
      montant: toDouble(json['montant']) ?? 0,
      arr: toDouble(json['arr']) ?? 0,
      statut: json['statut'] as String? ?? 'brouillon',
      createdBy: toInt(json['created_by']),
      renewalDate: json['renewal_date'] as String?,
      createdByName: json['created_by_name'] as String?,
      validatedByName: json['validated_by_name'] as String?,
      validationComment: json['validation_comment'] as String?,
      items: (json['items'] as List?)
              ?.map((e) => DevisItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      createdAt: json['created_at'] as String?,
    );
  }
}