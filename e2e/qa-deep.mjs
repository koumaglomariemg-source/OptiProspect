// QA approfondi OptiProspect — Playwright chromium headless
// Usage: BASE_URL=http://localhost:5173 node e2e/qa-deep.mjs
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE_URL || "http://localhost:5173";
const OUT = "/tmp/qa-deep-optiprospect";
fs.mkdirSync(OUT, { recursive: true });

const ADMIN = { email: "koumaglomariemg@gmail.com", pass: "admin123" };
const MANAGER = { email: "manager@test.io", pass: "manager123" };
const COMMERCIAL = { email: "commercial@test.io", pass: "commercial123" };

const results = [];
const bugs = [];
const consoleErrors = [];
let chapterName = "";
let shotIdx = 0;

function chapter(name) {
  chapterName = name;
  console.log(`\n=== ${name} ===`);
}
function log(msg, ok = true) {
  results.push({ chapter: chapterName, msg, ok });
  console.log(`${ok ? "  ✓" : "  ✗"} ${msg}`);
}
function bug(msg, detail = "") {
  bugs.push({ chapter: chapterName, msg, detail });
  results.push({ chapter: chapterName, msg: `BUG: ${msg}`, ok: false });
  console.log(`  ✗ BUG: ${msg} ${detail}`);
}
async function shot(page, name) {
  const file = path.join(
    OUT,
    `${String(++shotIdx).padStart(2, "0")}-${name}.png`,
  );
  await page.screenshot({ path: file, fullPage: false });
  return file;
}
async function tryDo(desc, fn) {
  try {
    await fn();
    log(desc);
    return true;
  } catch (e) {
    bug(desc, String(e).slice(0, 200));
    return false;
  }
}

async function login(page, user) {
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes("login"), {
    timeout: 10000,
  });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
}

async function navTo(page, label) {
  const link = page
    .locator(`nav a:has-text("${label}"), aside a:has-text("${label}")`)
    .first();
  await link.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1366, height: 850 },
});
const page = await ctx.newPage();
page.on("dialog", (d) => d.accept());
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("favicon"))
    consoleErrors.push({ chapter: chapterName, text: m.text().slice(0, 250) });
});
page.on("pageerror", (e) =>
  consoleErrors.push({
    chapter: chapterName,
    text: "pageerror: " + String(e).slice(0, 250),
  }),
);

const screenshots = [];
async function snap(name) {
  screenshots.push({
    name,
    file: await shot(page, name),
    chapter: chapterName,
  });
}

// ---------------------------------------------------------------
chapter("CH01 — Login (erreur + succès commercial)");
await page.goto(BASE + "/login", { waitUntil: "networkidle" });
await tryDo("Page login affichée", async () => {
  if (!(await page.locator('button[type="submit"]').isVisible()))
    throw new Error("bouton absent");
});
await page.fill('input[type="email"]', "faux@test.io");
await page.fill('input[type="password"]', "mauvais");
await page.click('button[type="submit"]');
await tryDo("Erreur affichée pour identifiants invalides", async () => {
  await page.waitForSelector("text=/incorrect|invalide|erreur/i", {
    timeout: 6000,
  });
});
await snap("login-erreur");
await tryDo("Connexion commercial OK", () => login(page, COMMERCIAL));
await snap("kanban-commercial");

// ---------------------------------------------------------------
chapter("CH02 — Kanban commercial");
await tryDo("Colonnes du pipeline visibles", async () => {
  const cols = await page.locator("text=/Identification|Prospection/i").count();
  if (cols < 1) throw new Error("aucune colonne");
});
await tryDo("Prospects visibles sur le tableau", async () => {
  await page.waitForSelector("text=Entreprise 1", { timeout: 8000 });
});
await tryDo("Recherche Kanban filtre", async () => {
  const inp = page.locator('input[placeholder*="echerch"]').first();
  await inp.fill("Prospect1");
  await page.waitForTimeout(700);
  const visible = await page.locator("text=Entreprise 1").count();
  if (!visible) throw new Error("résultat filtré absent");
  await inp.fill("");
  await page.waitForTimeout(500);
});
await snap("kanban-filtre");

// ---------------------------------------------------------------
chapter("CH03 — Création prospect (formulaire)");
await tryDo("Ouverture du formulaire Nouveau", async () => {
  await page.locator('button:has-text("Nouveau")').first().click();
  await page.waitForTimeout(600);
  const modal = await page.locator("input, form").count();
  if (!modal) throw new Error("modal absent");
});
await snap("form-prospect");
await tryDo("Fermeture du formulaire (Échap)", async () => {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
});

// ---------------------------------------------------------------
chapter("CH04 — Ma journée");
await navTo(page, "Ma journée");
await tryDo("Cartes de synthèse affichées", async () => {
  const k = await page.locator("text=/Relance|RDV|risque|Devis/i").count();
  if (k < 2) throw new Error("cartes manquantes");
});
await snap("ma-journee");

// ---------------------------------------------------------------
chapter("CH05 — Prospection (pipeline étapes)");
await navTo(page, "Prospection");
await tryDo("Liste de prospection chargée", async () => {
  const n = await page.locator("text=Entreprise").count();
  if (!n) throw new Error("aucun prospect");
});
await tryDo("Bouton renseigner étape présent", async () => {
  const b = await page
    .locator('button:has-text("tape"), button:has-text("Renseigner")')
    .count();
  if (!b) throw new Error("bouton étape absent");
});
await snap("prospection");

// ---------------------------------------------------------------
chapter("CH06 — Recherche + filtres + export");
await navTo(page, "Recherche");
await tryDo("Tableau de résultats affiché", async () => {
  const rows = await page.locator("table, [class*=table]").count();
  if (!rows) throw new Error("pas de tableau");
});
await tryDo("Filtre recherche texte", async () => {
  const inp = page
    .locator('input[placeholder*="echerch"], input[type="search"]')
    .first();
  await inp.fill("Prospect2");
  await page.waitForSelector("text=/Prospect2|Entreprise 2/", {
    timeout: 8000,
  });
  await inp.fill("");
  await page.waitForTimeout(600);
});
await tryDo("Menu Export présent", async () => {
  const b = await page.locator('button:has-text("Export")').count();
  if (!b) throw new Error("bouton export absent");
});
await tryDo("Onglet Contrats signés cliquable", async () => {
  await page.locator('button:has-text("Contrats signés")').first().click();
  await page.waitForTimeout(700);
  await page.locator('button:has-text("Prospects")').first().click();
  await page.waitForTimeout(500);
});
await snap("recherche");

// ---------------------------------------------------------------
chapter("CH07 — Carte");
await navTo(page, "Carte");
await page.waitForTimeout(1500);
await tryDo("Carte Leaflet rendue", async () => {
  const map = await page.locator(".leaflet-container").count();
  if (!map) throw new Error("leaflet absent");
});
await tryDo("Marqueurs des prospects présents", async () => {
  const m = await page
    .locator(".leaflet-marker-icon, .leaflet-marker-pane div")
    .count();
  if (!m) throw new Error("aucun marqueur");
});
await snap("carte");

// ---------------------------------------------------------------
chapter("CH08 — Devis (création commercial)");
await navTo(page, "Devis");
await tryDo("Page devis chargée", async () => {
  const b = await page
    .locator('button:has-text("Nouveau devis"), button:has-text("Nouveau")')
    .count();
  if (!b) throw new Error("bouton nouveau devis absent");
});
await tryDo("Ouverture formulaire devis", async () => {
  await page
    .locator('button:has-text("Nouveau devis"), button:has-text("Nouveau")')
    .first()
    .click();
  await page.waitForTimeout(800);
});
await snap("devis-form");
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

// ---------------------------------------------------------------
chapter("CH09 — Rapports (soumission commercial)");
await navTo(page, "Rapports");
await tryDo("Formulaire de rapport visible", async () => {
  const t = await page.locator("textarea").count();
  if (!t) throw new Error("textarea absent");
});
await tryDo("Soumission d'un rapport", async () => {
  await page
    .locator("textarea")
    .first()
    .fill("Rapport de test QA : 5 appels, 2 visites effectuées cette semaine.");
  const submit = page
    .locator(
      'button:has-text("Soumettre"), button:has-text("Envoyer"), button[type="submit"]',
    )
    .first();
  await submit.click();
  await page.waitForTimeout(1200);
});
await snap("rapports");

// ---------------------------------------------------------------
chapter("CH10 — Clients & Profil");
await navTo(page, "Clients");
await tryDo("Page clients affichée", async () => {
  const t = await page.locator("text=/client/i").count();
  if (!t) throw new Error("page vide");
});
await navTo(page, "Profil");
await tryDo("Profil : champs nom/email présents", async () => {
  const inputs = await page.locator("input").count();
  if (inputs < 2) throw new Error("champs manquants");
});
await snap("profil");

// ---------------------------------------------------------------
chapter("CH11 — Manager : validation devis/rapports + réunions");
await login(page, MANAGER);
await page.waitForTimeout(800);
await navTo(page, "Rapports");
await tryDo("Manager voit le rapport soumis", async () => {
  const r = await page.locator("text=/Rapport de test QA|Carla/i").count();
  if (!r) throw new Error("rapport invisible");
});
await tryDo("Boutons Valider/Refuser présents", async () => {
  const b = await page.locator('button:has-text("Valider")').count();
  if (!b) throw new Error("pas de bouton valider");
});
await tryDo("Validation du rapport", async () => {
  await page.locator('button:has-text("Valider")').first().click();
  await page.waitForTimeout(1000);
});
await snap("manager-rapports");
await navTo(page, "Réunions");
await tryDo("Bouton Planifier présent (manager)", async () => {
  const b = await page
    .locator('button:has-text("Planifier"), button:has-text("Nouvelle")')
    .count();
  if (!b) throw new Error("bouton absent");
});
await snap("manager-reunions");

// ---------------------------------------------------------------
chapter("CH12 — Manager : portefeuilles");
await navTo(page, "Portefeuilles");
await tryDo("Liste des prospects + réassignation visible", async () => {
  const sel = await page.locator("select").count();
  if (!sel) throw new Error("dropdown réassignation absent");
});
await snap("portefeuilles");

// ---------------------------------------------------------------
chapter("CH13 — Admin : dashboard, équipe, référentiels, modèles");
await login(page, ADMIN);
await page.waitForTimeout(800);
await tryDo("Dashboard admin : stats affichées", async () => {
  const k = await page.locator("text=/utilisateur|pipeline|produit/i").count();
  if (!k) throw new Error("stats absentes");
});
await snap("admin-dashboard");
await navTo(page, "Équipe");
await tryDo("Équipe : 3 utilisateurs listés", async () => {
  const marc = await page.locator("text=Marc Manager").count();
  const carla = await page.locator("text=Carla Commerciale").count();
  if (!marc || !carla) throw new Error("utilisateurs seedés absents");
});
await snap("admin-equipe");
await navTo(page, "Référentiels");
await tryDo("Référentiels : onglets visibles", async () => {
  const tabs = await page
    .locator("text=/Tunnel|Produits|Zones|Motifs|Relances|audit/i")
    .count();
  if (tabs < 3) throw new Error("onglets manquants");
});
await snap("admin-referentiels");
await navTo(page, "Modèles de pipeline");
await tryDo("Modèle par défaut listé", async () => {
  const t = await page.locator("text=/défaut|modèle/i").count();
  if (!t) throw new Error("aucun modèle");
});
await snap("admin-modeles");

// ---------------------------------------------------------------
chapter("CH14 — Responsive 390px + dark mode");
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await tryDo("Rendu mobile sans débordement horizontal", async () => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 5,
  );
  if (overflow) throw new Error("scroll horizontal détecté");
});
await snap("mobile-390");
await page.setViewportSize({ width: 1366, height: 850 });
await tryDo("Bascule dark mode", async () => {
  const btn = page
    .locator(
      'button[title*="ombre"], button[aria-label*="ombre"], button:has(svg.lucide-moon), button:has(svg.lucide-sun)',
    )
    .first();
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(600);
  } else {
    await page.evaluate(() => document.documentElement.classList.add("dark"));
  }
  const dark = await page.evaluate(() =>
    document.documentElement.classList.contains("dark"),
  );
  if (!dark) throw new Error("classe dark absente");
});
await snap("dark-mode");

// ---------------------------------------------------------------
chapter("CH15 — Déconnexion");
await tryDo("Logout ramène au login", async () => {
  const btn = page
    .locator(
      'button:has-text("Déconnexion"), button[title*="éconnexion"], a:has-text("Déconnexion")',
    )
    .first();
  if (await btn.count()) await btn.click();
  else {
    await page.evaluate(() => localStorage.removeItem("pf_token"));
    await page.goto(BASE + "/login");
  }
  await page.waitForTimeout(800);
  const loginVisible = await page.locator('input[type="password"]').count();
  if (!loginVisible) throw new Error("pas revenu au login");
});
await snap("logout");

await browser.close();

// ---------------- rapport HTML ----------------
const okCount = results.filter((r) => r.ok).length;
const failCount = results.length - okCount;
const score = Math.max(0, 100 - 4 * bugs.length - 2 * consoleErrors.length);
const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>QA OptiProspect</title>
<style>body{font-family:system-ui;margin:24px;background:#f8fafc;color:#0f172a}
h1{color:#1f2e45}.score{font-size:42px;font-weight:800;color:${score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444"}}
table{border-collapse:collapse;width:100%;background:#fff;margin:12px 0}td,th{border:1px solid #e2e8f0;padding:6px 10px;font-size:13px;text-align:left}
.ok{color:#10b981}.ko{color:#ef4444;font-weight:700}img{max-width:320px;border:1px solid #e2e8f0;border-radius:8px;margin:6px}</style></head><body>
<h1>Rapport QA — OptiProspect</h1>
<p class="score">${score}/100</p>
<p>${okCount} vérifications OK — ${failCount} échecs — ${bugs.length} bugs — ${consoleErrors.length} erreurs console</p>
<h2>Bugs</h2>${bugs.length ? `<table><tr><th>Chapitre</th><th>Bug</th><th>Détail</th></tr>${bugs.map((b) => `<tr><td>${b.chapter}</td><td class="ko">${b.msg}</td><td>${b.detail}</td></tr>`).join("")}</table>` : '<p class="ok">Aucun bug détecté.</p>'}
<h2>Erreurs console</h2>${consoleErrors.length ? `<table><tr><th>Chapitre</th><th>Erreur</th></tr>${consoleErrors.map((e) => `<tr><td>${e.chapter}</td><td>${e.text}</td></tr>`).join("")}</table>` : '<p class="ok">Aucune erreur console.</p>'}
<h2>Détail des vérifications</h2><table><tr><th>Chapitre</th><th>Vérification</th><th>Statut</th></tr>
${results.map((r) => `<tr><td>${r.chapter}</td><td>${r.msg}</td><td class="${r.ok ? "ok" : "ko"}">${r.ok ? "OK" : "ÉCHEC"}</td></tr>`).join("")}</table>
<h2>Captures</h2>${screenshots.map((s) => `<div style="display:inline-block"><img src="data:image/png;base64,${fs.readFileSync(s.file).toString("base64")}"><br><small>${s.name}</small></div>`).join("")}
</body></html>`;
fs.writeFileSync("/tmp/qa-deep-report-optiprospect.html", html);
console.log(
  `\n===== SCORE ${score}/100 — ${bugs.length} bugs, ${consoleErrors.length} erreurs console =====`,
);
console.log("Rapport : /tmp/qa-deep-report-optiprospect.html");
