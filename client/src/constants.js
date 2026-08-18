export const STAGES = [
  {
    key: "nouveau",
    label: "Nouveau",
    dot: "bg-sky-500",
    badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    accent: "text-sky-500",
  },
  {
    key: "qualification",
    label: "Qualification",
    dot: "bg-amber-500",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    accent: "text-amber-500",
  },
  {
    key: "suivi",
    label: "Suivi",
    dot: "bg-violet-500",
    badge: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    accent: "text-violet-500",
  },
  {
    key: "conversion",
    label: "Conversion",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    accent: "text-emerald-500",
  },
  {
    key: "perdu",
    label: "Perdu",
    dot: "bg-rose-500",
    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    accent: "text-rose-500",
  },
];

export const STAGE_BY_KEY = Object.fromEntries(STAGES.map((s) => [s.key, s]));

export const STAGE_COLORS = {
  sky: {
    dot: "bg-sky-500",
    badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    accent: "text-sky-500",
  },
  amber: {
    dot: "bg-amber-500",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    accent: "text-amber-500",
  },
  violet: {
    dot: "bg-violet-500",
    badge: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    accent: "text-violet-500",
  },
  emerald: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    accent: "text-emerald-500",
  },
  rose: {
    dot: "bg-rose-500",
    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    accent: "text-rose-500",
  },
  indigo: {
    dot: "bg-indigo-500",
    badge: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
    accent: "text-indigo-500",
  },
  teal: {
    dot: "bg-teal-500",
    badge: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
    accent: "text-teal-500",
  },
  orange: {
    dot: "bg-orange-500",
    badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    accent: "text-orange-500",
  },
  fuchsia: {
    dot: "bg-fuchsia-500",
    badge: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400",
    accent: "text-fuchsia-500",
  },
  slate: {
    dot: "bg-slate-400",
    badge: "bg-slate-400/15 text-slate-500 dark:text-slate-400",
    accent: "text-slate-400",
  },
};

export function stagesFromSettings(arr) {
  const src = Array.isArray(arr) && arr.length ? arr : STAGES;
  return src.map((s) => ({
    key: s.key,
    label: s.label,
    color:
      s.color ||
      Object.entries(STAGE_COLORS).find(([c, v]) => v.dot === s.dot)?.[0] ||
      "indigo",
    ...(STAGE_COLORS[s.color] || STAGE_COLORS.indigo),
  }));
}

export const SOURCES = [
  { key: "site", label: "Site web" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "recommandation", label: "Recommandation" },
  { key: "foire", label: "Foire / salon" },
  { key: "appel_sortant", label: "Appel sortant" },
  { key: "publicite", label: "Publicité" },
  { key: "reseau", label: "Réseau" },
  { key: "terrain", label: "Terrain" },
];

export const SOURCE_LABEL = Object.fromEntries(
  SOURCES.map((s) => [s.key, s.label]),
);

export const INTERACTION_TYPES = [
  { key: "email", label: "Email" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "appel", label: "Appel" },
  { key: "visite", label: "Visite terrain" },
  { key: "rendezvous", label: "Rendez-vous" },
  { key: "note", label: "Note" },
];

export const INTERACTION_LABEL = Object.fromEntries(
  INTERACTION_TYPES.map((t) => [t.key, t.label]),
);

export const PERIOD_LABEL = {
  mensuel: "Mensuel",
  trimestriel: "Trimestriel",
  annuel: "Annuel",
};

export const PERIOD_MULT = { mensuel: 12, trimestriel: 4, annuel: 1 };

export const DEVIS_STATUS = {
  brouillon: {
    label: "Brouillon",
    badge: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
  },
  attente_validation: {
    label: "À valider",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  valide: {
    label: "Validé",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  refuse: {
    label: "Refusé",
    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
};

export const REPORT_STATUS = {
  en_attente: {
    label: "En attente",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  valide: {
    label: "Validé",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  refuse: {
    label: "Refusé",
    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
};

export const ROLE_LABEL = {
  admin: "Administrateur",
  manager: "Manager",
  commercial: "Commercial",
};
export const ROLE_BADGE = {
  admin:
    "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  manager:
    "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
  commercial: "bg-slate-100 text-slate-500 dark:bg-slate-800",
};

export const FIELD_TYPE_LABEL = {
  text: "Texte",
  textarea: "Zone de texte",
  number: "Nombre",
  date: "Date",
  select: "Liste déroulante",
};

export const CHART_COLORS = [
  "#3660db",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#64748b",
];

export function scoreColor(score) {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 45) return "bg-amber-500";
  return "bg-slate-400";
}

const SECTEUR_ECOLE = [
  "école",
  "ecole",
  "scolaire",
  "établissement",
  "etablissement",
  "lycée",
  "lycee",
  "collège",
  "college",
  "primaire",
  "maternelle",
  "université",
  "universite",
  "enseignement",
  "education",
];

export function isEcole(p) {
  if (!p) return false;
  if (p.option_frais_scolaire) return true;
  const s = String(p.secteur || "").toLowerCase();
  return SECTEUR_ECOLE.some((k) => s.includes(k));
}

export function effectifLabel(p) {
  return isEcole(p) ? "Nombre d'élèves" : "Nombre de personnel";
}

export function effectifText(p, n) {
  if (n === null || n === undefined || n === "") return null;
  return isEcole(p) ? `${n} élève(s)` : `${n} salarié(s)`;
}

export function formatDate(iso) {
  if (!iso) return "—";
  const [date, time] = iso.split(" ");
  if (!time) return date;
  return `${date} ${time.slice(0, 5)}`;
}

export function formatDateShort(iso) {
  if (!iso) return "—";
  return iso.split("T")[0].split(" ")[0];
}

export function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
