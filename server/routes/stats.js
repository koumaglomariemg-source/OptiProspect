import { Router } from "express";
import { db } from "../db.js";
import { auth } from "../middleware/auth.js";
import { ah } from "../middleware/asyncHandler.js";
import { teamIds } from "../services/scope.js";
import { getAtRisk } from "../services/risk.js";

const router = Router();
router.use(auth());

async function scope(req, prefix = "") {
  const p = prefix ? `${prefix}.` : "";
  const clauses = [`${p}archived_at IS NULL`];
  const params = [];
  if (req.user.role === "commercial") {
    clauses.push(`${p}assigned_to = ?`);
    params.push(req.user.id);
  } else if (req.user.role === "manager") {
    const ids = await teamIds(req.user);
    clauses.push(
      `(${p}assigned_to IN (${ids.map(() => "?").join(",")}) OR ${p}assigned_to IS NULL)`,
    );
    params.push(...ids);
  }
  if (req.query.commercial) {
    clauses.push(`${p}assigned_to = ?`);
    params.push(Number(req.query.commercial));
  }
  if (req.query.temperature) {
    clauses.push(`${p}temperature = ?`);
    params.push(String(req.query.temperature));
  }
  return { where: clauses.length ? clauses.join(" AND ") : "", params };
}

router.get(
  "/overview",
  ah(async (req, res) => {
    const s = await scope(req);
    const sWhere = s.where ? ` WHERE ${s.where}` : "";
    const total = await db
      .get(`SELECT COUNT(*) AS n FROM prospects${sWhere}`, ...s.params)
      .then((r) => r.n);
    const converted = await db
      .get(
        `SELECT COUNT(*) AS n FROM prospects WHERE temperature = 'converti'${s.where ? ` AND ${s.where}` : ""}`,
        ...s.params,
      )
      .then((r) => r.n);
    const lost = await db
      .get(
        `SELECT COUNT(*) AS n FROM prospects WHERE temperature = 'abandonne'${s.where ? ` AND ${s.where}` : ""}`,
        ...s.params,
      )
      .then((r) => r.n);
    const active = total - converted - lost;
    const pipelineValue = await db
      .get(
        `SELECT COALESCE(SUM(value),0) AS s FROM prospects WHERE temperature NOT IN ('converti','abandonne')${s.where ? ` AND ${s.where}` : ""}`,
        ...s.params,
      )
      .then((r) => r.s);
    const byStage = await db.all(
      `SELECT stage, COUNT(*) AS n FROM prospects${sWhere} GROUP BY stage`,
      ...s.params,
    );
    const byTemp = await db.all(
      `SELECT temperature, COUNT(*) AS n FROM prospects${sWhere} GROUP BY temperature`,
      ...s.params,
    );
    const bySource = await db.all(
      `SELECT COALESCE(source, 'autre') AS source, COUNT(*) AS n FROM prospects${sWhere} GROUP BY source`,
      ...s.params,
    );
    const byZone = await db.all(
      `SELECT COALESCE(secteur, 'Non renseigné') AS secteur, COUNT(*) AS n FROM prospects${sWhere} GROUP BY secteur ORDER BY n DESC LIMIT 8`,
      ...s.params,
    );
    const ns = await scope(req, "p");
    const nsWhere = ns.where ? ` AND ${ns.where}` : "";
    const nextActions = await db.all(
      `
    SELECT p.id, p.name, p.company, p.next_action, p.next_action_date, p.assigned_to, u.name AS assignee_name
    FROM prospects p LEFT JOIN users u ON u.id = p.assigned_to
    WHERE (p.next_action IS NOT NULL OR p.next_action_date IS NOT NULL)${nsWhere}
    ORDER BY COALESCE(p.next_action_date, '9999-12-31') ASC LIMIT 10
  `,
      ...ns.params,
    );
    res.json({
      total,
      active,
      converted,
      lost,
      conversion_rate: total ? Math.round((converted / total) * 100) : 0,
      pipeline_value: pipelineValue,
      by_stage: byStage,
      by_temperature: byTemp,
      by_source: bySource,
      by_zone: byZone,
      next_actions: nextActions,
    });
  }),
);

router.get(
  "/by-user",
  ah(async (req, res) => {
    const base = `
    SELECT u.id, u.name, u.role,
      COUNT(p.id) AS total,
      SUM(CASE WHEN p.temperature = 'converti' THEN 1 ELSE 0 END) AS converted,
      SUM(CASE WHEN p.temperature = 'abandonne' THEN 1 ELSE 0 END) AS lost,
      SUM(CASE WHEN p.temperature NOT IN ('converti','abandonne') THEN 1 ELSE 0 END) AS advanced,
      COALESCE(SUM(CASE WHEN p.temperature = 'converti' THEN p.value ELSE 0 END), 0) AS value,
      COALESCE(SUM(CASE WHEN p.temperature NOT IN ('converti','abandonne') THEN p.value ELSE 0 END), 0) AS open_value,
      SUM(CASE WHEN p.temperature NOT IN ('converti','abandonne') AND p.next_action_date < NOW() THEN 1 ELSE 0 END) AS relances_late,
      COALESCE(ROUND(AVG(CASE WHEN p.temperature = 'converti' THEN DATEDIFF(p.converted_at, p.created_at) END)), 0) AS avg_cycle_days,
      (SELECT COUNT(*) FROM interactions i JOIN prospects pp ON pp.id = i.prospect_id
        WHERE pp.assigned_to = u.id AND i.type = 'appel' AND i.archived_at IS NULL) AS calls,
      (SELECT COUNT(*) FROM meeting_participants mp WHERE mp.user_id = u.id) AS meetings_count
    FROM users u
    LEFT JOIN prospects p ON p.assigned_to = u.id AND p.archived_at IS NULL
  `;
    let rows;
    const only = Number(req.query.commercial) || null;
    if (req.user.role === "commercial") {
      rows = await db.all(
        `${base} WHERE u.id = ? AND u.archived_at IS NULL GROUP BY u.id`,
        req.user.id,
      );
    } else if (only) {
      rows = await db.all(
        `${base} WHERE u.id = ? AND u.archived_at IS NULL GROUP BY u.id`,
        only,
      );
    } else if (req.user.role === "manager") {
      const ids = await teamIds(req.user);
      rows = await db.all(
        `${base} WHERE u.id IN (${ids.map(() => "?").join(",")}) AND u.archived_at IS NULL GROUP BY u.id ORDER BY converted DESC`,
        ...ids,
      );
    } else {
      rows = await db.all(
        `${base} WHERE u.archived_at IS NULL GROUP BY u.id ORDER BY converted DESC`,
      );
    }
    res.json(
      rows.map((r) => ({
        ...r,
        converted: r.converted ?? 0,
        lost: r.lost ?? 0,
        advanced: r.advanced ?? 0,
      })),
    );
  }),
);

router.get(
  "/clients",
  ah(async (req, res) => {
    const s = await scope(req, "p");
    const rows = await db.all(
      `
    SELECT p.id, p.name, p.company, p.email, p.phone, p.value, p.converted_at, p.assigned_to,
           u.name AS assignee_name,
      (SELECT COUNT(*) FROM devis d WHERE d.prospect_id = p.id AND d.statut = 'valide' AND d.archived_at IS NULL) AS valid_devis,
      (SELECT COALESCE(SUM(d.montant), 0) FROM devis d WHERE d.prospect_id = p.id AND d.statut = 'valide' AND d.archived_at IS NULL) AS total_valide,
      (SELECT COUNT(*) FROM interactions i WHERE i.prospect_id = p.id AND i.archived_at IS NULL) AS interactions,
      (SELECT MAX(i.created_at) FROM interactions i WHERE i.prospect_id = p.id AND i.archived_at IS NULL) AS last_interaction
    FROM prospects p
    LEFT JOIN users u ON u.id = p.assigned_to
    WHERE p.temperature = 'converti'${s.where ? ` AND ${s.where}` : ""}
    ORDER BY p.converted_at DESC
  `,
      ...s.params,
    );
    res.json(rows);
  }),
);

router.get(
  "/targets",
  ah(async (req, res) => {
    const ym = /^\d{4}-\d{2}$/.test(String(req.query.year_month || ""))
      ? String(req.query.year_month)
      : new Date().toISOString().slice(0, 7);
    let where = "";
    let params = [ym, ym];
    if (req.user.role === "commercial") {
      where = "WHERE u.id = ? AND u.archived_at IS NULL";
      params = [ym, ym, req.user.id];
    } else if (req.user.role === "manager") {
      const ids = await teamIds(req.user);
      where = `WHERE u.id IN (${ids.map(() => "?").join(",")}) AND u.archived_at IS NULL`;
      params = [ym, ym, ...ids];
    } else {
      where = "WHERE u.archived_at IS NULL";
    }
    const rows = await db.all(
      `
    SELECT u.id, u.name, u.role,
      COALESCE(MAX(t.target_value), 0) AS target_value,
      COALESCE(SUM(CASE WHEN p.temperature = 'converti' AND DATE_FORMAT(p.converted_at, '%Y-%m') = ? THEN p.value ELSE 0 END), 0) AS achieved
    FROM users u
    LEFT JOIN user_targets t ON t.user_id = u.id AND t.\`year_month\` = ?
    LEFT JOIN prospects p ON p.assigned_to = u.id AND p.archived_at IS NULL
    ${where}
    GROUP BY u.id, u.name, u.role
    ORDER BY u.name ASC
  `,
      ...params,
    );
    res.json({ year_month: ym, users: rows });
  }),
);

router.get(
  "/timeline",
  ah(async (req, res) => {
    const days = Number(req.query.days) || 30;
    const s = await scope(req);
    const rows = await db.all(
      `
    SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day, COUNT(*) AS n
    FROM prospects
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)${s.where ? ` AND ${s.where}` : ""}
    GROUP BY day ORDER BY day ASC
  `,
      days,
      ...s.params,
    );
    res.json(rows);
  }),
);

const TEMP_PROB = {
  froid: 0.05,
  tiede: 0.2,
  chaud: 0.5,
  converti: 1,
  abandonne: 0,
};

router.get(
  "/at-risk",
  ah(async (req, res) => {
    const items = await getAtRisk(req.user);
    res.json(items);
  }),
);

router.get(
  "/aging",
  ah(async (req, res) => {
    const s = await scope(req);
    const sWhere = s.where ? ` WHERE ${s.where}` : "";
    const rows = await db.all(
      `SELECT p.id, p.created_at, p.value
     FROM prospects p${sWhere}
       AND p.temperature NOT IN ('converti', 'abandonne')`,
      ...s.params,
    );
    const now = Date.now();
    const buckets = [
      { key: "0_7", label: "0 à 7 jours", min: 0, max: 7, n: 0, value: 0 },
      { key: "8_30", label: "8 à 30 jours", min: 8, max: 30, n: 0, value: 0 },
      {
        key: "31_90",
        label: "31 à 90 jours",
        min: 31,
        max: 90,
        n: 0,
        value: 0,
      },
      {
        key: "90_plus",
        label: "Plus de 90 jours",
        min: 91,
        max: Infinity,
        n: 0,
        value: 0,
      },
    ];
    let ageSum = 0;
    let oldest = null;
    for (const r of rows) {
      const created = new Date(
        String(r.created_at).replace("T", " "),
      ).getTime();
      const age = Math.floor((now - created) / 86_400_000);
      ageSum += age;
      if (!oldest || age > oldest.days) oldest = { days: age, id: r.id };
      const b =
        buckets.find((b) => age >= b.min && age <= b.max) ||
        buckets[buckets.length - 1];
      b.n += 1;
      b.value += r.value || 0;
    }
    res.json({
      total: rows.length,
      avg_age_days: rows.length ? Math.round(ageSum / rows.length) : 0,
      oldest: oldest,
      buckets,
    });
  }),
);

router.get(
  "/forecast",
  ah(async (req, res) => {
    const s = await scope(req);
    const sWhere = s.where ? ` WHERE ${s.where}` : "";
    const rows = await db.all(
      `SELECT temperature, value FROM prospects${sWhere}`,
      ...s.params,
    );
    const total = rows.length;

    const weightedPipeline = rows.reduce(
      (acc, r) =>
        acc + (r.value || 0) * (TEMP_PROB[r.temperature] ?? TEMP_PROB.tiede),
      0,
    );

    const convertedRows = rows.filter((r) => r.temperature === "converti");
    const closed = rows.filter(
      (r) => r.temperature === "converti" || r.temperature === "abandonne",
    );
    const winRate = closed.length
      ? convertedRows.length / closed.length
      : total
        ? convertedRows.length / total
        : 0;
    const avgValue = convertedRows.length
      ? convertedRows.reduce((s, r) => s + (r.value || 0), 0) /
        convertedRows.length
      : 0;

    const recentCount = await db
      .get(
        `SELECT COUNT(*) AS n FROM prospects WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)${s.where ? ` AND ${s.where}` : ""}`,
        ...s.params,
      )
      .then((r) => r.n);
    const perDay = recentCount / 30;

    const expectedNext30 = perDay * 30 * winRate * avgValue;
    const expectedConversions30 = perDay * 30 * winRate;

    res.json({
      weighted_pipeline: Math.round(weightedPipeline),
      win_rate: Math.round(winRate * 100),
      avg_deal_value: Math.round(avgValue),
      expected_next30: Math.round(expectedNext30),
      expected_conversions30: Math.round(expectedConversions30),
      prospects_per_day: Math.round(perDay * 10) / 10,
    });
  }),
);

router.get(
  "/counts",
  ah(async (req, res) => {
    const userCount = await db
      .get("SELECT COUNT(*) AS n FROM users WHERE archived_at IS NULL")
      .then((r) => r.n);
    const templateCount = await db
      .get("SELECT COUNT(*) AS n FROM pipeline_templates")
      .then((r) => r.n);
    const productsRow = await db.get(
      "SELECT value FROM settings WHERE \`key\` = 'products'",
    );
    let productsCount = 0;
    if (productsRow) {
      try {
        productsCount = JSON.parse(productsRow.value).length;
      } catch {}
    }

    // Répartition par rôle
    const roleRows = await db.all(
      "SELECT role, COUNT(*) AS n FROM users WHERE archived_at IS NULL GROUP BY role",
    );
    const roles = { admin: 0, manager: 0, commercial: 0 };
    for (const r of roleRows) roles[r.role] = r.n;

    res.json({
      users: userCount,
      pipeline_templates: templateCount,
      products: productsCount,
      roles,
    });
  }),
);

router.get(
  "/prospection",
  ah(async (req, res) => {
    const s = await scope(req);
    const sWhere = s.where ? ` WHERE ${s.where}` : "";
    const days = Number(req.query.days) || 30;

    const interactionsByType = await db.all(
      `
    SELECT i.type, DATE_FORMAT(i.created_at, '%Y-%m-%d') AS day, COUNT(*) AS n
    FROM interactions i
    JOIN prospects p ON p.id = i.prospect_id
    ${sWhere ? ` AND ${s.where.replace(/^/, "p.")}` : ""}
    AND i.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    AND i.archived_at IS NULL
    GROUP BY i.type, day ORDER BY day ASC
  `,
      days,
      ...s.params,
    );

    const interactionsByUser = await db.all(
      `
    SELECT u.id, u.name, u.role,
      SUM(CASE WHEN i.type = 'appel' THEN 1 ELSE 0 END) AS appels,
      SUM(CASE WHEN i.type = 'visite' THEN 1 ELSE 0 END) AS visites,
      SUM(CASE WHEN i.type = 'email' THEN 1 ELSE 0 END) AS emails,
      SUM(CASE WHEN i.type = 'whatsapp' THEN 1 ELSE 0 END) AS whatsapp,
      SUM(CASE WHEN i.type = 'linkedin' THEN 1 ELSE 0 END) AS linkedin,
      SUM(CASE WHEN i.type = 'rendezvous' THEN 1 ELSE 0 END) AS rdv,
      SUM(CASE WHEN i.type = 'note' THEN 1 ELSE 0 END) AS notes,
      COUNT(*) AS total
    FROM users u
    LEFT JOIN prospects p ON p.assigned_to = u.id AND p.archived_at IS NULL
    LEFT JOIN interactions i ON i.prospect_id = p.id AND i.archived_at IS NULL
      AND i.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    WHERE u.archived_at IS NULL
    ${req.user.role === "commercial" ? "AND u.id = ?" : ""}
    ${req.user.role === "manager" && !req.query.commercial ? "AND u.manager_id = ?" : ""}
    GROUP BY u.id ORDER BY total DESC
  `,
      days,
      ...(req.user.role === "commercial"
        ? [req.user.id]
        : req.user.role === "manager" && !req.query.commercial
          ? [req.user.id]
          : []),
    );

    const meetingsByUser = await db.all(
      `
    SELECT u.id, u.name,
      COUNT(DISTINCT mp.meeting_id) AS meetings_count,
      SUM(CASE WHEN m.type = 'terrain' THEN 1 ELSE 0 END) AS terrain_meetings,
      SUM(CASE WHEN m.type = 'en_ligne' THEN 1 ELSE 0 END) AS online_meetings
    FROM users u
    LEFT JOIN meeting_participants mp ON mp.user_id = u.id
    LEFT JOIN meetings m ON m.id = mp.meeting_id AND m.archived_at IS NULL
      AND m.starts_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    WHERE u.archived_at IS NULL
    ${req.user.role === "commercial" ? "AND u.id = ?" : ""}
    ${req.user.role === "manager" && !req.query.commercial ? "AND u.manager_id = ?" : ""}
    GROUP BY u.id ORDER BY meetings_count DESC
  `,
      days,
      ...(req.user.role === "commercial"
        ? [req.user.id]
        : req.user.role === "manager" && !req.query.commercial
          ? [req.user.id]
          : []),
    );

    const dailyActivity = await db.all(
      `
    SELECT DATE_FORMAT(i.created_at, '%Y-%m-%d') AS day,
      SUM(CASE WHEN i.type = 'appel' THEN 1 ELSE 0 END) AS appels,
      SUM(CASE WHEN i.type = 'visite' THEN 1 ELSE 0 END) AS visites,
      SUM(CASE WHEN i.type = 'email' THEN 1 ELSE 0 END) AS emails,
      SUM(CASE WHEN i.type = 'whatsapp' THEN 1 ELSE 0 END) AS whatsapp,
      SUM(CASE WHEN i.type = 'linkedin' THEN 1 ELSE 0 END) AS linkedin,
      SUM(CASE WHEN i.type = 'rendezvous' THEN 1 ELSE 0 END) AS rdv,
      SUM(CASE WHEN i.type = 'note' THEN 1 ELSE 0 END) AS notes,
      COUNT(*) AS total
    FROM interactions i
    JOIN prospects p ON p.id = i.prospect_id
    ${sWhere ? ` AND ${s.where.replace(/^/, "p.")}` : ""}
    AND i.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    AND i.archived_at IS NULL
    GROUP BY day ORDER BY day ASC
  `,
      days,
      ...s.params,
    );

    res.json({
      days,
      interactions_by_type: interactionsByType,
      interactions_by_user: interactionsByUser,
      meetings_by_user: meetingsByUser,
      daily_activity: dailyActivity,
    });
  }),
);

export default router;
