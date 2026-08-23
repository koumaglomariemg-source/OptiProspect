import 'package:flutter/material.dart';

const kStages = [
  'identification',
  'prospection',
  'suivi',
  'depot_contrat',
  'signature_contrat',
];

const kStageLabels = {
  'identification': 'Identification',
  'prospection': 'Prospection',
  'suivi': 'Suivi',
  'depot_contrat': 'Dépôt de contrat',
  'signature_contrat': 'Signature de contrat',
};

const kSourceLabels = {
  'site': 'Site web',
  'linkedin': 'LinkedIn',
  'recommandation': 'Recommandation',
  'foire': 'Foire / Salon',
  'appel_sortant': 'Appel sortant',
  'publicite': 'Publicité',
  'reseau': 'Réseau',
  'terrain': 'Terrain',
};

const kSourceKeys = [
  'site',
  'linkedin',
  'recommandation',
  'foire',
  'appel_sortant',
  'publicite',
  'reseau',
  'terrain',
];

const kTemperatureLabels = {
  'froid': 'Froid',
  'tiede': 'Tiède',
  'chaud': 'Chaud',
  'converti': 'Converti',
  'abandonne': 'Abandonné',
};

const kInteractionTypes = {
  'email': 'Email',
  'whatsapp': 'WhatsApp',
  'linkedin': 'LinkedIn',
  'appel': 'Appel',
  'visite': 'Visite terrain',
  'rendezvous': 'Rendez-vous',
  'note': 'Note',
};

const kPeriodLabels = {
  'ponctuel': 'Ponctuel',
  'mensuel': 'Mensuel',
  'trimestriel': 'Trimestriel',
  'annuel': 'Annuel',
};

const kRoleLabels = {
  'admin': 'Administrateur',
  'manager': 'Manager',
  'commercial': 'Commercial',
};

const kDevisStatusLabels = {
  'brouillon': 'Brouillon',
  'attente_validation': 'À valider',
  'valide': 'Validé',
  'refuse': 'Refusé',
};

const kReportStatusLabels = {
  'en_attente': 'En attente',
  'valide': 'Validé',
  'refuse': 'Refusé',
};

const kStageColors = [
  'sky',
  'amber',
  'violet',
  'emerald',
  'rose',
  'indigo',
  'teal',
  'orange',
  'fuchsia',
  'slate',
];

Color stageColor(String stage) {
  switch (stage) {
    case 'identification':
      return Colors.blue;
    case 'prospection':
      return Colors.indigo;
    case 'suivi':
      return Colors.orange;
    case 'depot_contrat':
      return Colors.purple;
    case 'signature_contrat':
      return Colors.green;
    default:
      return Colors.grey;
  }
}

Color colorFromName(String name, [Color fallback = Colors.indigo]) {
  switch (name) {
    case 'sky':
      return Colors.lightBlue;
    case 'amber':
      return Colors.amber.shade600;
    case 'violet':
      return Colors.purple;
    case 'emerald':
      return Colors.green;
    case 'rose':
      return Colors.pink;
    case 'indigo':
      return Colors.indigo;
    case 'teal':
      return Colors.teal;
    case 'orange':
      return Colors.orange;
    case 'fuchsia':
      return Colors.pinkAccent;
    case 'slate':
      return Colors.blueGrey;
    default:
      return fallback;
  }
}

Color devisStatusColor(String status) {
  switch (status) {
    case 'brouillon':
      return Colors.grey;
    case 'attente_validation':
      return Colors.orange;
    case 'valide':
      return Colors.green;
    case 'refuse':
      return Colors.red;
    default:
      return Colors.grey;
  }
}

Color reportStatusColor(String status) {
  switch (status) {
    case 'en_attente':
      return Colors.orange;
    case 'valide':
      return Colors.green;
    case 'refuse':
      return Colors.red;
    default:
      return Colors.grey;
  }
}

Color temperatureColor(String t) {
  switch (t) {
    case 'froid':
      return Colors.blueGrey;
    case 'tiede':
      return Colors.lightBlue;
    case 'chaud':
      return Colors.orange;
    case 'converti':
      return Colors.green;
    case 'abandonne':
      return Colors.red;
    default:
      return Colors.grey;
  }
}

Color roleColor(String role) {
  switch (role) {
    case 'admin':
      return Colors.purple;
    case 'manager':
      return Colors.indigo;
    default:
      return Colors.blueGrey;
  }
}

Color scoreColor(int score) {
  if (score >= 70) return Colors.green;
  if (score >= 45) return Colors.amber;
  return Colors.grey;
}