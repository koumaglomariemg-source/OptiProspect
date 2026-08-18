import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const HEADER_LABELS = {
  numero: "N°",
  name: "Nom",
  company: "Société",
  email: "Email",
  phone: "Téléphone",
  linkedin: "LinkedIn",
  source: "Source",
  secteur: "Secteur",
  adresse: "Adresse",
  quartier: "Quartier",
  effectif: "Effectif",
  stage: "Étape",
  current_step: "Étape courante",
  etape_courante: "Étape courante",
  value: "Valeur (FCFA)",
  contrat_depose: "Contrat déposé",
  contrat_signe: "Contrat signé",
  option_frais_scolaire: "Option frais scolaire",
  next_action: "Prochaine action",
  next_action_date: "Date prochaine action",
  note: "Note",
  created_at: "Créé le",
  updated_at: "Modifié le",
};

const BOOL_KEYS = new Set([
  "contrat_depose",
  "contrat_signe",
  "option_frais_scolaire",
]);

export function friendlyHeader(raw) {
  if (HEADER_LABELS[raw]) return HEADER_LABELS[raw];
  const s = String(raw || "").replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function cell(key, v) {
  if (BOOL_KEYS.has(key)) return v ? "Oui" : "Non";
  return v ?? "";
}

function buildMatrix(columns, rows) {
  return {
    headers: columns.map((c) => friendlyHeader(c.label || c.key)),
    body: rows.map((r) => columns.map((c) => cell(c.key, r[c.key]))),
  };
}

export function exportExcel(filename, columns, rows, sheetName = "Prospects") {
  const { headers, body } = buildMatrix(columns, rows);
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
  sheet["!cols"] = columns.map((_, i) => {
    let width = headers[i].length + 2;
    for (const row of body) width = Math.max(width, String(row[i]).length + 2);
    return { wch: Math.min(width, 45) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, sheetName);
  XLSX.writeFile(wb, filename);
}

export function exportPdf(filename, columns, rows, title = "Prospects") {
  const { headers, body } = buildMatrix(columns, rows);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(14);
  doc.text(title, 14, 14);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    `${rows.length} prospect(s) — ${new Date().toLocaleDateString("fr-FR")}`,
    14,
    19,
  );
  autoTable(doc, {
    head: [headers],
    body,
    startY: 23,
    margin: { left: 10, right: 10 },
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: "bold",
      halign: "left",
    },
    alternateRowStyles: { fillColor: [244, 244, 252] },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("OptiProspect", 14, doc.internal.pageSize.getHeight() - 8);
      doc.text(
        `Page ${doc.internal.getNumberOfPages()}`,
        doc.internal.pageSize.getWidth() - 14,
        doc.internal.pageSize.getHeight() - 8,
        { align: "right" },
      );
    },
  });
  doc.save(filename);
}
