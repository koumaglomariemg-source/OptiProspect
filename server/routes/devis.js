import { Router } from "express";
import { db } from "../db.js";
import { auth } from "../middleware/auth.js";
import { logAudit } from "../services/audit.js";
import {
  canAccessProspects,
  prospectScope,
  teamIds,
} from "../services/scope.js";
import { notifyConversion } from "../services/reminders.js";
import { ah } from "../middleware/asyncHandler.js";

const router = Router();
router.use(auth());
router.use((req, res, next) => {
  if (!canAccessProspects(req.user?.role))
    return res.status(403).json({ error: "Rôle non autorisé" });
  next();
});

const STATUS = ["brouillon", "attente_validation", "valide", "refuse"];
const PERIODS = ["mensuel", "trimestriel", "annuel"];
const PERIOD_MULT = { mensuel: 12, trimestriel: 4, annuel: 1 };

async function nextReference() {
  const count = await db.get("SELECT COUNT(*) AS n FROM devis");
  return `DEV-${new Date().getFullYear()}-${String(count.n + 1).padStart(3, "0")}`;
}

async function notifyManagers(title, message, type = "info") {
  const managers = await db.all(
    "SELECT id FROM users WHERE role = 'manager' AND archived_at IS NULL",
  );
  for (const m of managers) {
    await db.run(
      "INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)",
      m.id,
      title,
      message,
      type,
    );
  }
}

async function getDevis(id) {
  const d = await db.get(
    `
    SELECT d.*, p.name AS prospect_name, p.company AS prospect_company,
           c.name AS created_by_name, v.name AS validated_by_name
    FROM devis d
    LEFT JOIN prospects p ON p.id = d.prospect_id
    LEFT JOIN users c ON c.id = d.created_by
    LEFT JOIN users v ON v.id = d.validated_by
    WHERE d.id = ? AND d.archived_at IS NULL
  `,
    id,
  );
  if (!d) return null;
  try {
    d.items = d.items ? JSON.parse(d.items) : [];
  } catch {
    d.items = [];
  }
  return d;
}

router.get("/", ah(async (req, res) => {
  const { prospect_id, statut } = req.query;
  const where = ["d.archived_at IS NULL"];
  const params = [];
  if (req.user.role === "commercial") {
    where.push(
      "d.created_by = ? OR d.prospect_id IN (SELECT id FROM prospects WHERE assigned_to = ?)",
    );
    params.push(req.user.id, req.user.id);
  } else if (req.user.role === "manager") {
    const ids = await teamIds(req.user);
    where.push(
      `(d.created_by IN (${ids.map(() => "?").join(",")}) OR d.prospect_id IN (SELECT id FROM prospects WHERE assigned_to IN (${ids.map(() => "?").join(",")}) OR assigned_to IS NULL))`,
    );
    params.push(...ids, ...ids);
  }
  if (prospect_id) {
    where.push("d.prospect_id = ?");
    params.push(Number(prospect_id));
  }
  if (statut) {
    where.push("d.statut = ?");
    params.push(statut);
  }
  const rows = await db.all(
    `
    SELECT d.*, p.name AS prospect_name, p.company AS prospect_company,
           c.name AS created_by_name, v.name AS validated_by_name
    FROM devis d
    LEFT JOIN prospects p ON p.id = d.prospect_id
    LEFT JOIN users c ON c.id = d.created_by
    LEFT JOIN users v ON v.id = d.validated_by
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY d.updated_at DESC
  `,
    ...params,
  );
  for (const r of rows) {
    try {
      r.items = r.items ? JSON.parse(r.items) : [];
    } catch {
      r.items = [];
    }
  }
  res.json(rows);
}));

function itemsMontant(items) {
  if (!Array.isArray(items) || !items.length) return 0;
  return items.reduce(
    (sum, it) => sum + (Number(it.qty) || 1) * (Number(it.price) || 0),
    0,
  );
}

function itemsARR(items) {
  if (!Array.isArray(items) || !items.length) return 0;
  return items.reduce((sum, it) => {
    const mult = PERIOD_MULT[it.period];
    if (!mult) return sum;
    return sum + (Number(it.qty) || 1) * (Number(it.price) || 0) * mult;
  }, 0);
}

function sanitizeItems(items) {
  if (!Array.isArray(items)) return null;
  const clean = items
    .filter((it) => it && String(it.name || "").trim())
    .map((it) => ({
      name: String(it.name).trim(),
      qty: Number(it.qty) || 1,
      price: Number(it.price) || 0,
      period: PERIODS.includes(it.period) ? it.period : null,
    }));
  return clean.length ? clean : null;
}

function cleanDate(v) {
  if (!v) return null;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : v;
}

router.post("/", ah(async (req, res) => {
  if (req.user.role !== "commercial")
    return res
      .status(403)
      .json({ error: "Seul un commercial peut créer un devis" });
  const { prospect_id, titre, description, items, renewal_date } = req.body || {};
  if (!prospect_id || !titre?.trim())
    return res.status(400).json({ error: "Prospect et titre sont requis" });
  const scope = prospectScope(req.user);
  const prospect = await db.get(
    `SELECT p.id FROM prospects p WHERE p.id = ? AND ${scope.sql}`,
    Number(prospect_id),
    ...scope.params,
  );
  if (!prospect) return res.status(404).json({ error: "Prospect introuvable" });
  const cleanItems = sanitizeItems(items);
  const montant = cleanItems
    ? itemsMontant(cleanItems)
    : Number(req.body.montant) || 0;
  const arr = cleanItems ? itemsARR(cleanItems) : 0;
  const info = await db.run(
    "INSERT INTO devis (\`reference\`, prospect_id, titre, description, items, montant, arr, renewal_date, statut, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)",
    await nextReference(),
    Number(prospect_id),
    titre.trim(),
    description || null,
    cleanItems ? JSON.stringify(cleanItems) : null,
    montant,
    arr,
    cleanDate(renewal_date),
    "brouillon",
    req.user.id,
  );
  logAudit(req, "devis.create", `DEV ${info.insertId}`);
  res.status(201).json(await getDevis(info.insertId));
}));

router.patch("/:id", ah(async (req, res) => {
  if (req.user.role === "manager")
    return res
      .status(403)
      .json({ error: "Seul un commercial peut modifier un devis" });
  const devis = await db.get(
    "SELECT * FROM devis WHERE id = ? AND archived_at IS NULL",
    Number(req.params.id),
  );
  if (!devis) return res.status(404).json({ error: "Devis introuvable" });
  if (devis.created_by !== req.user.id) {
    return res
      .status(403)
      .json({ error: "Vous ne pouvez modifier que vos propres devis" });
  }
  if (devis.statut !== "brouillon")
    return res
      .status(400)
      .json({ error: "Seul un devis brouillon est modifiable" });

  const fields = ["titre", "description"];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f] === "" ? null : req.body[f]);
    }
  }
  if (req.body.renewal_date !== undefined) {
    updates.push("renewal_date = ?");
    params.push(cleanDate(req.body.renewal_date));
  }
  if (req.body.items !== undefined) {
    const cleanItems = sanitizeItems(req.body.items);
    updates.push("items = ?");
    params.push(cleanItems ? JSON.stringify(cleanItems) : null);
    updates.push("montant = ?");
    params.push(
      cleanItems ? itemsMontant(cleanItems) : Number(req.body.montant) || 0,
    );
    updates.push("arr = ?");
    params.push(cleanItems ? itemsARR(cleanItems) : 0);
  } else if (req.body.montant !== undefined) {
    updates.push("montant = ?");
    params.push(Number(req.body.montant) || 0);
  }
  if (!updates.length)
    return res.status(400).json({ error: "Aucune donnée à mettre à jour" });
  updates.push("updated_at = NOW()");
  params.push(devis.id);
  await db.run(`UPDATE devis SET ${updates.join(", ")} WHERE id = ?`, ...params);
  logAudit(req, "devis.update", `DEV ${devis.id}`);
  res.json(await getDevis(devis.id));
}));

router.post("/:id/submit", ah(async (req, res) => {
  if (req.user.role === "manager")
    return res
      .status(403)
      .json({ error: "Seul un commercial peut soumettre un devis" });
  const devis = await db.get(
    "SELECT * FROM devis WHERE id = ? AND archived_at IS NULL",
    Number(req.params.id),
  );
  if (!devis) return res.status(404).json({ error: "Devis introuvable" });
  if (devis.created_by !== req.user.id) {
    return res
      .status(403)
      .json({ error: "Vous ne pouvez soumettre que vos propres devis" });
  }
  if (devis.statut === "valide" || devis.statut === "attente_validation")
    return res.status(400).json({ error: "Devis déjà soumis" });

  // Tout devis soumis passe en validation manager (pas d'auto-validation).
  await db.run(
    "UPDATE devis SET statut = 'attente_validation', updated_at = NOW() WHERE id = ?",
    devis.id,
  );
  await notifyManagers(
    "Devis à valider",
    `${devis.reference} — ${devis.titre} — ${devis.montant.toLocaleString("fr-FR")} FCFA.`,
  );
  logAudit(req, "devis.submit", `DEV ${devis.id}`);
  res.json(await getDevis(devis.id));
}));

router.post("/:id/validate", ah(async (req, res) => {
  if (req.user.role === "commercial")
    return res
      .status(403)
      .json({ error: "Seul un manager peut valider un devis" });
  const devis = await db.get(
    "SELECT * FROM devis WHERE id = ? AND archived_at IS NULL",
    Number(req.params.id),
  );
  if (!devis) return res.status(404).json({ error: "Devis introuvable" });
  if (
    req.user.role === "manager" &&
    devis.created_by &&
    !(await teamIds(req.user)).includes(devis.created_by)
  ) {
    return res.status(403).json({ error: "Devis hors de votre équipe" });
  }
  if (devis.statut !== "attente_validation")
    return res
      .status(400)
      .json({ error: "Seul un devis soumis peut être validé" });
  await db.run(
    "UPDATE devis SET statut = 'valide', validated_by = ?, validation_comment = ?, updated_at = NOW() WHERE id = ?",
    req.user.id,
    (req.body?.comment || "").slice(0, 500),
    devis.id,
  );
  // Un prospect avec un devis validé devient client (converti).
  if (devis.prospect_id) {
    const p = await db.get(
      "SELECT id, temperature, assigned_to, name, company FROM prospects WHERE id = ?",
      devis.prospect_id,
    );
    if (p && p.temperature !== "converti") {
      await db.run(
        "UPDATE prospects SET temperature = 'converti', converted_at = NOW(), updated_at = NOW() WHERE id = ?",
        p.id,
      );
      await notifyConversion(p);
    }
  }
  if (devis.created_by) {
    await db.run(
      "INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)",
      devis.created_by,
      "Devis validé",
      `Votre devis ${devis.reference} a été validé. Le prospect devient client.`,
      "succes",
    );
  }
  logAudit(req, "devis.validate", `DEV ${devis.id}`);
  res.json(await getDevis(devis.id));
}));

router.post("/:id/refuse", ah(async (req, res) => {
  if (req.user.role === "commercial")
    return res
      .status(403)
      .json({ error: "Seul un manager peut refuser un devis" });
  const devis = await db.get(
    "SELECT * FROM devis WHERE id = ? AND archived_at IS NULL",
    Number(req.params.id),
  );
  if (!devis) return res.status(404).json({ error: "Devis introuvable" });
  if (
    req.user.role === "manager" &&
    devis.created_by &&
    !(await teamIds(req.user)).includes(devis.created_by)
  ) {
    return res.status(403).json({ error: "Devis hors de votre équipe" });
  }
  if (devis.statut !== "attente_validation")
    return res
      .status(400)
      .json({ error: "Seul un devis soumis peut être refusé" });
  await db.run(
    "UPDATE devis SET statut = 'refuse', validated_by = ?, validation_comment = ?, updated_at = NOW() WHERE id = ?",
    req.user.id,
    (req.body?.comment || "").slice(0, 500),
    devis.id,
  );
  if (devis.created_by) {
    await db.run(
      "INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)",
      devis.created_by,
      "Devis refusé",
      `Votre devis ${devis.reference} a été refusé${req.body?.comment ? ` : ${req.body.comment}` : ""}.`,
      "info",
    );
  }
  logAudit(req, "devis.refuse", `DEV ${devis.id}`);
  res.json(await getDevis(devis.id));
}));

router.delete("/:id", ah(async (req, res) => {
  if (req.user.role === "manager")
    return res
      .status(403)
      .json({ error: "Seul un commercial peut supprimer un devis" });
  const devis = await db.get(
    "SELECT * FROM devis WHERE id = ? AND archived_at IS NULL",
    Number(req.params.id),
  );
  if (!devis) return res.status(404).json({ error: "Devis introuvable" });
  if (devis.created_by !== req.user.id) {
    return res
      .status(403)
      .json({ error: "Vous ne pouvez supprimer que vos propres devis" });
  }
  await db.run("UPDATE devis SET archived_at = NOW() WHERE id = ?", devis.id);
  logAudit(req, "devis.archive", `DEV ${devis.id}`);
  res.json({ ok: true, archived: true });
}));

export default router;
