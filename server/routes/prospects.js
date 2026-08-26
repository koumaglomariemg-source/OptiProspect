import { Router } from "express";
import multer from "multer";
import { db, getDefaultTemplate, getTemplateSteps } from "../db.js";
import { ah } from "../middleware/asyncHandler.js";
import { auth } from "../middleware/auth.js";
import { scheduleReminder, notifyConversion } from "../services/reminders.js";
import { sendMail, isMailConfigured } from "../services/mail.js";
import { logAudit } from "../services/audit.js";
import { parse } from "csv-parse/sync";
import {
  canAccessProspects,
  prospectScope,
  teamIds,
} from "../services/scope.js";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();
router.use(auth());
router.use((req, res, next) => {
  if (!canAccessProspects(req.user?.role)) {
    return res
      .status(403)
      .json({ error: "Rôle non autorisé à accéder aux prospects" });
  }
  next();
});

const FIELDS = [
  "name",
  "first_name",
  "last_name",
  "company",
  "email",
  "phone",
  "linkedin",
  "source",
  "value",
  "stage",
  "assigned_to",
  "next_action",
  "next_action_date",
  "note",
  "temperature",
  "secteur",
  "adresse",
  "latitude",
  "longitude",
  "template_id",
  "numero",
  "quartier",
  "effectif",
  "product",
  "contrat_depose",
  "contrat_signe",
  "option_frais_scolaire",
];
const TEMPERATURES = ["froid", "tiede", "chaud", "converti", "abandonne"];

async function computeStepProgress(prospectId) {
  const rows = await db.all(
    `
    SELECT ps.status, st.position, st.key AS step_key, st.name AS step_name, st.color
    FROM prospect_steps ps
    JOIN pipeline_template_steps st ON st.id = ps.step_id
    WHERE ps.prospect_id = ?
    ORDER BY st.position ASC, st.id ASC
  `,
    prospectId,
  );
  const done = rows.filter((r) => r.status === "validated");
  const current = rows.find((r) => r.status === "pending");
  return {
    current_step: current
      ? {
          position: current.position,
          key: current.step_key,
          name: current.step_name,
          color: current.color,
        }
      : rows.length
        ? {
            position: rows.length,
            key: "done",
            name: "Terminé",
            color: "emerald",
          }
        : null,
    steps_done: done.length,
    steps_total: rows.length,
  };
}

async function getStageKeys() {
  try {
    const row = await db.get(
      "SELECT value FROM settings WHERE \`key\` = 'stages'",
    );
    const arr = JSON.parse(row?.value || "[]");
    if (Array.isArray(arr) && arr.length) return arr.map((s) => s.key);
  } catch {}
  return [
    "etablissements_identifies",
    "prospection",
    "suivi",
    "contrat_depose",
    "contrat_signe",
  ];
}

const EVENT_FIELD_TYPE = {
  stage: "etape",
  temperature: "temperature",
  assigned_to: "assignation",
  value: "valeur",
  next_action: "action",
  next_action_date: "action",
};

async function logEvent(prospectId, actor, type, field, oldValue, newValue) {
  await db.run(
    "INSERT INTO prospect_events (prospect_id, user_id, user_name, type, field, old_value, new_value) VALUES (?,?,?,?,?,?,?)",
    prospectId,
    actor?.id || null,
    actor?.name || null,
    type,
    field || null,
    oldValue == null ? null : String(oldValue),
    newValue == null ? null : String(newValue),
  );
}

const SOURCE_BASE = {
  site: 5,
  linkedin: 8,
  recommandation: 12,
  foire: 6,
  appel_sortant: 10,
  publicite: 4,
  reseau: 7,
};
const STAGE_BASE = {
  etablissements_identifies: 10,
  prospection: 25,
  suivi: 45,
  contrat_depose: 70,
  contrat_signe: 100,
};
const TYPE_WEIGHT = {
  email: 3,
  whatsapp: 5,
  linkedin: 4,
  appel: 8,
  visite: 10,
  rendezvous: 12,
  note: 2,
};

function toTimestamp(sqlDate) {
  if (!sqlDate) return null;
  return new Date(sqlDate.replace(" ", "T") + "Z").getTime();
}

export async function computeScore(prospect) {
  let score = 0;
  score += SOURCE_BASE[prospect.source] ?? 5;
  score += STAGE_BASE[prospect.stage] ?? 10;
  const rows = await db.all(
    "SELECT type, created_at FROM interactions WHERE prospect_id = ? AND archived_at IS NULL ORDER BY created_at DESC LIMIT 20",
    prospect.id,
  );
  for (const r of rows) score += TYPE_WEIGHT[r.type] ?? 2;
  if (rows.length) {
    const last = toTimestamp(rows[0].created_at);
    if (last && Date.now() - last < 7 * 864e5) score += 8;
  }
  if (prospect.next_action_date) score += 5;
  if (prospect.value > 0)
    score += Math.min(15, Math.round(prospect.value / 1000));
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function decorate(prospect) {
  const p = { ...prospect };
  if (!p.assignee_name) p.assignee_name = p.creator_commercial_name || null;
  delete p.creator_commercial_name;
  if (p.next_action_date) {
    const due = new Date(p.next_action_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    p.due_in_days = Math.round((due - today) / 864e5);
  }
  const step = await computeStepProgress(p.id);
  p.current_step = step.current_step;
  p.steps_done = step.steps_done;
  p.steps_total = step.steps_total;
  return p;
}

router.get(
  "/",
  ah(async (req, res) => {
    const {
      search,
      stage,
      status,
      source,
      assigned_to,
      assignedToId,
      dateProspectionFrom,
      dateProspectionTo,
      prochainRdvFrom,
      prochainRdvTo,
      contratSigne,
      contratDepose,
      optionFraisScolaire,
      sortBy,
      sortOrder,
      page,
      limit,
    } = req.query;
    const where = [];
    const params = [];
    if (search) {
      where.push(
        "(p.name LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ? OR p.company LIKE ? OR p.email LIKE ? OR p.phone LIKE ? OR p.quartier LIKE ? OR p.adresse LIKE ? OR p.numero LIKE ?)",
      );
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s, s, s, s);
    }
    const stageVal = stage || status;
    if (stageVal) {
      where.push("p.stage = ?");
      params.push(stageVal);
    }
    if (source) {
      where.push("p.source = ?");
      params.push(source);
    }
    const assignedVal = assigned_to || assignedToId;
    if (assignedVal) {
      where.push("p.assigned_to = ?");
      params.push(assignedVal);
    }
    if (dateProspectionFrom) {
      where.push("date(p.created_at) >= ?");
      params.push(dateProspectionFrom);
    }
    if (dateProspectionTo) {
      where.push("date(p.created_at) <= ?");
      params.push(dateProspectionTo);
    }
    if (prochainRdvFrom) {
      where.push("p.next_action_date >= ?");
      params.push(prochainRdvFrom);
    }
    if (prochainRdvTo) {
      where.push("p.next_action_date <= ?");
      params.push(prochainRdvTo);
    }
    if (contratSigne === "true") {
      where.push("p.contrat_signe = 1");
    }
    if (contratSigne === "false") {
      where.push("p.contrat_signe = 0");
    }
    if (contratDepose === "true") {
      where.push("p.contrat_depose = 1");
    }
    if (contratDepose === "false") {
      where.push("p.contrat_depose = 0");
    }
    if (optionFraisScolaire === "true") {
      where.push("p.option_frais_scolaire = 1");
    }
    if (optionFraisScolaire === "false") {
      where.push("p.option_frais_scolaire = 0");
    }

    const scope = prospectScope(req.user);
    where.push(scope.sql);
    params.push(...scope.params);

    const sortMap = {
      createdAt: "p.created_at",
      updatedAt: "p.updated_at",
      firstName: "p.name",
      lastName: "p.name",
      company: "p.company",
      status: "p.stage",
      value: "p.value",
      nextFollowUp: "p.next_action_date",
    };
    const col = sortMap[sortBy] || "p.updated_at";
    const dir = String(sortOrder).toLowerCase() === "asc" ? "ASC" : "DESC";
    const order = `${col} ${dir}, p.id DESC`;

    const base = `SELECT p.*, u.name AS assignee_name,
    (SELECT m.name FROM prospect_events pe JOIN users m ON m.id = pe.user_id
     WHERE pe.prospect_id = p.id AND pe.type = 'creation' AND m.role = 'commercial'
     ORDER BY pe.id ASC LIMIT 1) AS creator_commercial_name
    FROM prospects p LEFT JOIN users u ON u.id = p.assigned_to`;
    const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";

    const hasPagination = page !== undefined && limit !== undefined;
    if (hasPagination) {
      const p = Math.max(1, Number(page) || 1);
      const l = Math.min(100, Math.max(1, Number(limit) || 25));
      const total = (
        await db.get(
          `SELECT COUNT(*) AS n FROM prospects p${whereSql}`,
          ...params,
        )
      ).n;
      const rows = await db.all(
        `${base}${whereSql} ORDER BY ${order} LIMIT ${l} OFFSET ${(p - 1) * l}`,
        ...params,
      );
      res.json({
        data: await Promise.all(rows.map(decorate)),
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l),
      });
      return;
    }

    const rows = await db.all(
      `${base}${whereSql} ORDER BY ${order}`,
      ...params,
    );
    res.json(await Promise.all(rows.map(decorate)));
  }),
);

router.post(
  "/",
  ah(async (req, res) => {
    try {
      const b = req.body || {};
      if (!b.name?.trim() && (!b.first_name?.trim() || !b.last_name?.trim()))
        return res.status(400).json({ error: "Le nom est requis" });
      if (!b.product?.trim())
        return res
          .status(400)
          .json({ error: "Le produit à proposer est requis" });
      const stageKeys = await getStageKeys();
      const stage = stageKeys.includes(b.stage)
        ? b.stage
        : stageKeys[0] || "etablissements_identifies";
      const temperature = TEMPERATURES.includes(b.temperature)
        ? b.temperature
        : "tiede";
      const template = b.template_id
        ? await db.get(
            "SELECT * FROM pipeline_templates WHERE id = ?",
            Number(b.template_id),
          )
        : await getDefaultTemplate();
      const assignTarget =
        req.user.role === "commercial"
          ? req.user.id
          : b.assigned_to
            ? Number(b.assigned_to)
            : null;
      if (req.user.role === "commercial" && assignTarget !== req.user.id) {
        return res.status(403).json({
          error: "Un commercial ne peut s'attribuer que ses propres prospects",
        });
      }
      if (
        req.user.role === "manager" &&
        assignTarget !== null &&
        !(await teamIds(req.user)).includes(assignTarget)
      ) {
        return res
          .status(403)
          .json({ error: "Vous ne pouvez assigner qu'à vos commerciaux" });
      }
      let numero = b.numero ? String(b.numero).trim() : "";
      if (!numero) {
        const nums = await db.all(
          "SELECT numero FROM prospects WHERE numero IS NOT NULL AND numero != ''",
        );
        let max = 0;
        for (const r of nums) {
          const m = String(r.numero).match(/(\d+)\s*$/);
          if (m) max = Math.max(max, parseInt(m[1], 10));
        }
        numero = `N-${String(max + 1).padStart(3, "0")}`;
      }
      const fullName =
        b.name?.trim() ||
        [b.first_name, b.last_name].filter(Boolean).join(" ").trim();
      const info = await db.run(
        `INSERT INTO prospects (name, first_name, last_name, company, email, phone, linkedin, source, value, stage, temperature, secteur, adresse, latitude, longitude, assigned_to, next_action, next_action_date, note, template_id, numero, quartier, effectif, product, contrat_depose, contrat_signe, option_frais_scolaire, contact_token)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,REPLACE(UUID(), '-', ''))`,
        fullName,
        b.first_name?.trim() || null,
        b.last_name?.trim() || null,
        b.company || null,
        b.email || null,
        b.phone || null,
        b.linkedin || null,
        b.source || "site",
        Number(b.value) || 0,
        stage,
        temperature,
        b.secteur || null,
        b.adresse || null,
        b.latitude ? Number(b.latitude) : null,
        b.longitude ? Number(b.longitude) : null,
        assignTarget,
        b.next_action || null,
        b.next_action_date || null,
        b.note || null,
        template?.id || null,
        numero,
        b.quartier || null,
        b.effectif ? Number(b.effectif) : null,
        b.product?.trim() || null,
        b.contrat_depose ? 1 : 0,
        b.contrat_signe ? 1 : 0,
        b.option_frais_scolaire ? 1 : 0,
      );
      if (template) {
        const steps = await getTemplateSteps(template.id);
        for (const s of steps)
          await db.run(
            "INSERT IGNORE INTO prospect_steps (prospect_id, step_id, status) VALUES (?,?,?)",
            info.insertId,
            s.id,
            "pending",
          );
        const first = steps[0];
        if (
          first &&
          first.key &&
          stageKeys.includes(first.key) &&
          b.stage === undefined
        ) {
          await db.run(
            "UPDATE prospects SET stage = ? WHERE id = ?",
            first.key,
            info.insertId,
          );
        }
      }
      const prospect = await db.get(
        "SELECT * FROM prospects WHERE id = ?",
        info.insertId,
      );
      const score = await computeScore(prospect);
      await db.run(
        "UPDATE prospects SET score = ? WHERE id = ?",
        score,
        prospect.id,
      );
      prospect.score = score;
      await logEvent(prospect.id, req.user, "creation");
      await scheduleReminder(prospect, req.user.id);
      logAudit(req, "prospect.create", `${prospect.name}`);
      res.status(201).json(await decorate(prospect));
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }),
);

router.post(
  "/import",
  upload.single("file"),
  ah(async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: "Fichier CSV requis" });
      const content = file.buffer.toString("utf-8");
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      if (!records.length) return res.status(400).json({ error: "CSV vide" });

      const stageKeys = await getStageKeys();
      const template = await getDefaultTemplate();
      const results = { created: 0, errors: [] };

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNum = i + 2;
        try {
          const name = (row.name || row.nom || "").trim();
          const firstName = (row.first_name || row.prenom || "").trim();
          const lastName = (row.last_name || row.nom || "").trim();
          const fullName =
            name ||
            [firstName, lastName].filter(Boolean).join(" ") ||
            `Prospect ${rowNum}`;
          if (!fullName) {
            results.errors.push({ row: rowNum, error: "Nom requis" });
            continue;
          }
          const product = (row.product || row.produit || "").trim();
          if (!product) {
            results.errors.push({ row: rowNum, error: "Produit requis" });
            continue;
          }
          const stage = stageKeys.includes(row.stage)
            ? row.stage
            : stageKeys[0] || "etablissements_identifies";
          const temperature = TEMPERATURES.includes(row.temperature)
            ? row.temperature
            : "tiede";

          let assignTarget =
            req.user.role === "commercial"
              ? req.user.id
              : row.assigned_to
                ? Number(row.assigned_to)
                : null;
          if (req.user.role === "commercial" && assignTarget !== req.user.id) {
            assignTarget = req.user.id;
          }
          if (
            req.user.role === "manager" &&
            assignTarget &&
            !(await teamIds(req.user)).includes(assignTarget)
          ) {
            assignTarget = null;
          }

          let numero = row.numero ? String(row.numero).trim() : "";
          if (!numero) {
            const nums = await db.all(
              "SELECT numero FROM prospects WHERE numero IS NOT NULL AND numero != ''",
            );
            let max = 0;
            for (const r of nums) {
              const m = String(r.numero).match(/(\d+)\s*$/);
              if (m) max = Math.max(max, parseInt(m[1], 10));
            }
            numero = `N-${String(max + 1).padStart(3, "0")}`;
          }

          const info = await db.run(
            `INSERT INTO prospects (name, first_name, last_name, company, email, phone, linkedin, source, value, stage, temperature, secteur, adresse, latitude, longitude, assigned_to, next_action, next_action_date, note, template_id, numero, quartier, effectif, product, contrat_depose, contrat_signe, option_frais_scolaire, contact_token)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,REPLACE(UUID(), '-', ''))`,
            fullName,
            firstName || null,
            lastName || null,
            row.company || null,
            row.email || null,
            row.phone || null,
            row.linkedin || null,
            row.source || "import",
            Number(row.value) || 0,
            stage,
            temperature,
            row.secteur || null,
            row.adresse || null,
            row.latitude ? Number(row.latitude) : null,
            row.longitude ? Number(row.longitude) : null,
            assignTarget,
            row.next_action || null,
            row.next_action_date || null,
            row.note || null,
            template?.id || null,
            numero,
            row.quartier || null,
            row.effectif ? Number(row.effectif) : null,
            product,
            row.contrat_depose ? 1 : 0,
            row.contrat_signe ? 1 : 0,
            row.option_frais_scolaire ? 1 : 0,
          );

          if (template) {
            const steps = await getTemplateSteps(template.id);
            for (const s of steps)
              await db.run(
                "INSERT IGNORE INTO prospect_steps (prospect_id, step_id, status) VALUES (?,?,?)",
                info.insertId,
                s.id,
                "pending",
              );
          }

          const prospect = await db.get(
            "SELECT * FROM prospects WHERE id = ?",
            info.insertId,
          );
          const score = await computeScore(prospect);
          await db.run(
            "UPDATE prospects SET score = ? WHERE id = ?",
            score,
            prospect.id,
          );
          await logEvent(prospect.id, req.user, "creation");
          await scheduleReminder(prospect, req.user.id);
          logAudit(req, "prospect.create", `${prospect.name} (import)`);
          results.created++;
        } catch (e) {
          results.errors.push({ row: rowNum, error: e.message });
        }
      }
      res.json(results);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }),
);

router.get(
  "/:id",
  ah(async (req, res) => {
    const p = await findScopedProspect(req, Number(req.params.id));
    if (!p) return res.status(404).json({ error: "Prospect introuvable" });
    res.json(await decorate(p));
  }),
);

router.get(
  "/:id/events",
  ah(async (req, res) => {
    const p = await findScopedProspect(req, Number(req.params.id));
    if (!p) return res.status(404).json({ error: "Prospect introuvable" });
    const rows = await db.all(
      "SELECT * FROM prospect_events WHERE prospect_id = ? ORDER BY created_at DESC, id DESC",
      p.id,
    );
    res.json(rows);
  }),
);

async function findScopedProspect(req, id) {
  const scope = prospectScope(req.user);
  return (
    (await db.get(
      `
    SELECT p.*, u.name AS assignee_name,
      (SELECT m.name FROM prospect_events pe JOIN users m ON m.id = pe.user_id
       WHERE pe.prospect_id = p.id AND pe.type = 'creation' AND m.role = 'commercial'
       ORDER BY pe.id ASC LIMIT 1) AS creator_commercial_name
    FROM prospects p LEFT JOIN users u ON u.id = p.assigned_to
    WHERE p.id = ? AND ${scope.sql}
  `,
      id,
      ...scope.params,
    )) || null
  );
}

router.patch(
  "/:id",
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const prospect = await findScopedProspect(req, id);
    if (!prospect)
      return res.status(404).json({ error: "Prospect introuvable" });
    if (
      req.user.role === "manager" &&
      Object.keys(req.body).some((k) => k !== "assigned_to")
    ) {
      return res.status(403).json({
        error:
          "Un manager peut uniquement assigner un prospect à un commercial",
      });
    }

    const stageKeys = await getStageKeys();
    const updates = [];
    const params = [];
    const changes = [];
    const str = (v) => (v === null || v === undefined ? "" : String(v));
    const num = (v) => Number(v) || 0;

    for (const f of FIELDS) {
      if (req.body[f] === undefined) continue;
      let v;
      if (f === "stage") {
        v = stageKeys.includes(req.body[f]) ? req.body[f] : prospect.stage;
        updates.push("stage = ?");
        params.push(v);
      } else if (f === "temperature") {
        v = TEMPERATURES.includes(req.body[f])
          ? req.body[f]
          : prospect.temperature;
        updates.push("temperature = ?");
        params.push(v);
      } else if (f === "value") {
        v = num(req.body[f]);
        updates.push("value = ?");
        params.push(v);
      } else if (f === "latitude" || f === "longitude") {
        v =
          req.body[f] === "" || req.body[f] === null ? null : num(req.body[f]);
        updates.push(`${f} = ?`);
        params.push(v);
      } else if (f === "assigned_to") {
        v = req.body[f];
        const tid = v ? Number(v) : null;
        if (
          req.user.role === "commercial" &&
          tid !== null &&
          tid !== req.user.id
        ) {
          return res.status(403).json({
            error:
              "Un commercial ne peut s'attribuer que ses propres prospects",
          });
        }
        if (
          req.user.role === "manager" &&
          tid !== null &&
          !(await teamIds(req.user)).includes(tid)
        ) {
          return res
            .status(403)
            .json({ error: "Vous ne pouvez assigner qu'à vos commerciaux" });
        }
        updates.push("assigned_to = ?");
        params.push(v || null);
      } else if (f === "effectif") {
        v =
          req.body[f] === "" || req.body[f] === null ? null : num(req.body[f]);
        updates.push("effectif = ?");
        params.push(v);
      } else if (f === "next_action_date") {
        v = req.body[f] === "" ? null : req.body[f];
        if (v) {
          const raw = String(v).replace("T", " ").slice(0, 16);
          const d = new Date(raw);
          const now = new Date();
          if (Number.isNaN(d.getTime()) || d < now) {
            return res
              .status(400)
              .json({
                error:
                  "La date et l'heure de relance ne peuvent pas être dans le passé",
              });
          }
          v = `${raw}:00`;
        }
        updates.push("next_action_date = ?");
        params.push(v);
        updates.push("relance_email_sent_date = NULL");
      } else if (
        f === "contrat_depose" ||
        f === "contrat_signe" ||
        f === "option_frais_scolaire"
      ) {
        v = req.body[f] ? 1 : 0;
        updates.push(`${f} = ?`);
        params.push(v);
      } else if (f === "template_id") {
        const tid = req.body[f] ? Number(req.body[f]) : null;
        const exists = tid
          ? await db.get("SELECT id FROM pipeline_templates WHERE id = ?", tid)
          : null;
        v = exists ? tid : prospect.template_id;
        if (v !== prospect.template_id) {
          await db.run("DELETE FROM prospect_steps WHERE prospect_id = ?", id);
          const t = await db.get(
            "SELECT * FROM pipeline_templates WHERE id = ?",
            v,
          );
          if (t) {
            const steps = await getTemplateSteps(t.id);
            const keys = new Set(stageKeys);
            for (const s of steps) {
              await db.run(
                "INSERT IGNORE INTO prospect_steps (prospect_id, step_id, status) VALUES (?,?,?)",
                id,
                s.id,
                "pending",
              );
              if (!keys.has(s.key)) {
                await db.run(
                  "UPDATE prospects SET stage = ? WHERE id = ?",
                  s.key,
                  id,
                );
                keys.add(s.key);
              }
            }
          }
          updates.push("template_id = ?");
          params.push(v);
        }
      } else {
        v = req.body[f] === "" ? null : req.body[f];
        updates.push(`${f} = ?`);
        params.push(v);
      }

      const oldV =
        f === "value" || f === "latitude" || f === "longitude"
          ? (prospect[f] ?? 0)
          : (prospect[f] ?? null);
      const oldS =
        f === "value" || f === "latitude" || f === "longitude"
          ? num(oldV)
          : str(oldV);
      const newS =
        f === "value" || f === "latitude" || f === "longitude"
          ? num(v)
          : str(v);
      if (oldS !== newS) changes.push({ field: f, old: oldS, new: newS });
    }
    if (!updates.length)
      return res.status(400).json({ error: "Aucune donnée à mettre à jour" });

    if (
      req.body.temperature === "converti" &&
      prospect.temperature !== "converti"
    ) {
      updates.push("converted_at = NOW()");
    } else if (
      req.body.temperature !== undefined &&
      req.body.temperature !== "converti"
    ) {
      updates.push("converted_at = NULL");
    }

    updates.push("updated_at = NOW()");
    params.push(id);
    await db.run(
      `UPDATE prospects SET ${updates.join(", ")} WHERE id = ?`,
      ...params,
    );

    const updated = await db.get("SELECT * FROM prospects WHERE id = ?", id);
    const score = await computeScore(updated);
    await db.run("UPDATE prospects SET score = ? WHERE id = ?", score, id);
    updated.score = score;

    for (const c of changes) {
      await logEvent(
        id,
        req.user,
        EVENT_FIELD_TYPE[c.field] || "champ",
        c.field,
        c.old,
        c.new,
      );
    }

    await scheduleReminder(updated, req.user.id);
    if (req.body.stage === "conversion" && prospect.stage !== "conversion") {
      await notifyConversion(updated);
    }
    logAudit(req, "prospect.update", `${updated.name}`);
    res.json(await decorate(updated));
  }),
);

router.post(
  "/:id/relance-done",
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const prospect = await findScopedProspect(req, id);
    if (!prospect)
      return res.status(404).json({ error: "Prospect introuvable" });
    const action = prospect.next_action || "Action planifiée";
    await db.run(
      "UPDATE prospects SET next_action = NULL, next_action_date = NULL, relance_email_sent_date = NULL, updated_at = NOW() WHERE id = ?",
      id,
    );
    await db.run(
      "INSERT INTO interactions (prospect_id, user_id, type, content) VALUES (?,?,?,?)",
      id,
      req.user.id,
      "note",
      `Relance effectuée : ${action}`,
    );
    await logEvent(
      id,
      req.user,
      "action",
      "next_action",
      prospect.next_action,
      null,
    );
    logAudit(req, "prospect.relance-done", `${prospect.name}`);
    const updated = await db.get("SELECT * FROM prospects WHERE id = ?", id);
    res.json(await decorate(updated));
  }),
);

router.delete(
  "/:id",
  ah(async (req, res) => {
    if (req.user.role === "manager")
      return res
        .status(403)
        .json({ error: "Un manager ne peut pas supprimer de prospect" });
    const p = await findScopedProspect(req, Number(req.params.id));
    if (!p) return res.status(404).json({ error: "Prospect introuvable" });
    // Suppression = archivage (changement d'état), la ligne est conservée en base.
    await db.run(
      "UPDATE prospects SET archived_at = NOW(), updated_at = NOW() WHERE id = ?",
      p.id,
    );
    logAudit(req, "prospect.archive", `id=${req.params.id}`);
    res.json({ ok: true, archived: true });
  }),
);

router.get(
  "/:id/suggest-message",
  ah(async (req, res) => {
    const p = await findScopedProspect(req, Number(req.params.id));
    if (!p) return res.status(404).json({ error: "Prospect introuvable" });
    const firstName = (p.name || "").split(" ")[0] || p.name;
    const company = p.company || "votre entreprise";
    const senderFirst = (req.user?.name || "L'équipe OptiProspect").split(
      " ",
    )[0];
    const isInbound = ["site", "publicite"].includes(p.source);
    const temp = p.temperature || "tiede";
    const quartier = p.quartier;
    const secteur = p.secteur;

    const srcLabel =
      {
        site: `suite à votre demande sur notre site web`,
        linkedin: `après avoir vu votre profil LinkedIn`,
        recommandation: `sur la recommandation de ${p.assignee_name || "un collègue"}`,
        foire: `après notre échange lors du dernier salon`,
        appel_sortant: `à la suite de notre premier échange téléphonique`,
        publicite: `après votre contact suite à notre publicité`,
        reseau: `à travers notre réseau commun`,
        terrain: `dans le cadre de notre prospection auprès de ${company}`,
      }[p.source] || "";

    const contexte = [
      secteur ? `du secteur ${secteur}` : null,
      quartier ? `du quartier ${quartier}` : null,
    ]
      .filter(Boolean)
      .join(" et ");

    let intro;
    if (isInbound && p.stage === "prospection") {
      intro = `Bonjour ${firstName},\n\nMerci de nous avoir contactés${srcLabel ? ` ${srcLabel}` : ""} ! Votre demande a bien été reçue par notre équipe${contexte ? ` (${contexte})` : ""}.`;
    } else if (isInbound) {
      intro = `Bonjour ${firstName},\n\nMerci de nous avoir contactés${srcLabel ? ` ${srcLabel}` : ""}. Nous avons bien reçu votre demande${contexte ? ` concernant ${contexte}` : ""} et souhaitons échanger avec vous au sujet de ${company}.`;
    } else if (p.stage === "prospection" || p.stage === "qualification") {
      intro = `Bonjour ${firstName},\n\n${capitalize(srcLabel || "je souhaiterais vous présenter nos solutions")}${contexte ? `, particulièrement adaptées à ${contexte}` : ""}.`;
    } else {
      intro =
        {
          qualification: `Bonjour ${firstName},\n\nNous avions commencé à échanger au sujet de ${company}${contexte ? ` (${contexte})` : ""} et je souhaitais approfondir vos besoins actuels.`,
          suivi: `Bonjour ${firstName},\n\nJe reviens vers vous pour faire suite à notre dernier échange concernant ${company}. Avez-vous eu le temps de réfléchir à notre proposition ?`,
          conversion: `Bonjour ${firstName},\n\nTout est prêt pour démarrer notre collaboration. Je vous propose que nous calions ensemble la mise en place.`,
          perdu: `Bonjour ${firstName},\n\nJe reste à votre disposition si vos besoins évoluent concernant ${company}.`,
        }[p.stage] || `Bonjour ${firstName},`;
    }

    const rappel = p.next_action
      ? `\n\nPour rappel, nous avions convenu de : « ${p.next_action} »${p.next_action_date ? ` (prévu le ${String(p.next_action_date).replace("T", " ").slice(0, 16)})` : ""}.`
      : "";

    let cta;
    if (temp === "chaud") {
      cta =
        "Seriez-vous disponible pour un échange de 15 minutes cette semaine afin d'aller de l'avant ?";
    } else if (temp === "froid") {
      cta =
        "Seriez-vous ouvert(e) à un premier échange rapide de 15 minutes pour que je vous en dise plus ?";
    } else {
      cta =
        "Auriez-vous un moment cette semaine pour un rapide échange de 15 minutes ?";
    }

    const email = `${intro}${rappel}\n\n${cta}\n\nJe peux également vous faire parvenir une présentation si vous préférez.\n\nCordialement,\n${senderFirst}`;

    const whatsapp = isInbound
      ? `${firstName} bonjour ! Merci pour votre intérêt${quartier ? ` (quartier ${quartier})` : ""}. ${temp === "chaud" ? "On se cale un échange cette semaine ?" : "Souhaitez-vous échanger avec nous cette semaine pour en discuter ?"}`
      : `${firstName} bonjour, je vous relance au sujet de ${company}. ${temp === "chaud" ? "On se cale un créneau cette semaine ?" : "Disponible pour un rapide échange cette semaine ?"}`;

    const linkedin = `Bonjour ${firstName},\n\n${isInbound ? "Merci de nous avoir contactés." : `${capitalize(srcLabel || "Je souhaiterais vous présenter nos solutions")}.`} ${cta}\n\nMerci d'avance, ${senderFirst}`;

    const subject = isInbound
      ? `Votre demande — ${company}`
      : `Suite à notre échange — ${company}`;

    res.json({
      subject,
      email,
      whatsapp,
      linkedin,
      next_action_suggestion: await suggestNextAction(p),
    });
  }),
);

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

router.post(
  "/:id/send-message",
  ah(async (req, res) => {
    const p = await findScopedProspect(req, Number(req.params.id));
    if (!p) return res.status(404).json({ error: "Prospect introuvable" });
    if (req.user.role === "manager")
      return res
        .status(403)
        .json({ error: "Un manager ne peut pas envoyer de message" });
    const { channel, subject, content } = req.body || {};
    const ch = ["email", "whatsapp", "linkedin"].includes(channel)
      ? channel
      : "email";
    if (!content?.trim())
      return res
        .status(400)
        .json({ error: "Le contenu du message est requis" });

    const result = { channel: ch, delivered: false, skipped: false };

    if (ch === "email") {
      if (!isMailConfigured()) {
        result.skipped = true;
        result.reason = "SMTP non configuré";
      } else {
        try {
          await sendMail({
            to: p.email,
            subject: subject?.trim() || `Contact ${p.name}`,
            text: content.trim(),
          });
          result.delivered = true;
        } catch (e) {
          return res
            .status(500)
            .json({ error: `Échec de l'envoi SMTP : ${e.message}` });
        }
      }
    } else {
      result.skipped = true;
      result.reason = "Envoi manuel via l'application cible";
    }

    await db.run(
      "INSERT INTO interactions (prospect_id, user_id, type, content) VALUES (?,?,?,?)",
      p.id,
      req.user.id,
      ch,
      content.trim(),
    );
    await logEvent(p.id, req.user, "interaction", ch, null, content.trim());
    await db.run("UPDATE prospects SET updated_at = NOW() WHERE id = ?", p.id);
    logAudit(req, "prospect.send-message", `${p.name} (${ch})`);
    res.status(201).json(result);
  }),
);

async function suggestNextAction(p) {
  const last = await db.get(
    "SELECT created_at FROM interactions WHERE prospect_id = ? AND archived_at IS NULL ORDER BY created_at DESC LIMIT 1",
    p.id,
  );
  if (!last) {
    if (p.stage === "etablissements_identifies")
      return "Créer la fiche établissement avec contacts";
    return `Reprendre le contact avec ${p.name}`;
  }
  const diffDays = (Date.now() - toTimestamp(last.created_at)) / 864e5;
  if (diffDays > 5)
    return "Relancer par téléphone (inactif depuis plus de 5 jours)";
  switch (p.stage) {
    case "etablissements_identifies":
      return "Planifier la première visite terrain";
    case "prospection":
      return "Qualifier le besoin et noter les réactions";
    case "suivi":
      return "Effectuer la relance et mettre à jour le dossier";
    case "contrat_depose":
      return "Suivre le dépôt du contrat et relancer";
    case "contrat_signe":
      return "Finaliser et archiver le dossier";
    default:
      return "Prendre un nouveau contact";
  }
}

export { suggestNextAction };

export default router;
