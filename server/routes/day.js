import { Router } from "express";
import { db } from "../db.js";
import { auth } from "../middleware/auth.js";
import { ah } from "../middleware/asyncHandler.js";
import { prospectScope } from "../services/scope.js";
import { getAtRisk } from "../services/risk.js";

const router = Router();
router.use(auth());

function f(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

router.get("/", ah(async (req, res) => {
  const scope = prospectScope(req.user);
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const in7 = new Date(todayStart.getTime() + 7 * 86_400_000);

  const relances = await db.all(
    `
    SELECT p.id, p.name, p.company, p.value, p.temperature, p.next_action,
           p.next_action_date, p.assigned_to, u.name AS assignee_name
    FROM prospects p
    LEFT JOIN users u ON u.id = p.assigned_to
    WHERE ${scope.sql}
      AND p.next_action_date IS NOT NULL
      AND DATE(p.next_action_date) <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    ORDER BY p.next_action_date ASC
  `,
    ...scope.params,
  );
  const todayStr = f(todayStart);
  for (const r of relances) {
    r.due_in_days = r.next_action_date
      ? Math.round(
          (new Date(String(r.next_action_date).replace("T", " ")).getTime() - now.getTime()) / 86_400_000,
        )
      : null;
    r.is_today = r.due_in_days <= 0;
  }

  const me = req.user.id;
  const meetings = await db.all(
    `
    SELECT m.*, u.name AS created_by_name
    FROM meetings m
    LEFT JOIN users u ON u.id = m.created_by
    WHERE m.archived_at IS NULL
      AND m.starts_at IS NOT NULL
      AND m.starts_at >= ?
      AND DATE(m.starts_at) <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      AND (m.created_by = ? OR m.id IN (
        SELECT mp.meeting_id FROM meeting_participants mp WHERE mp.user_id = ?
      ))
    ORDER BY m.starts_at ASC
  `,
    todayStr,
    me,
    me,
  );

  const devis = await db.all(
    `
    SELECT d.id, d.\`reference\`, d.titre, d.montant, d.statut, d.updated_at,
           p.id AS prospect_id, p.name AS prospect_name, p.company AS prospect_company
    FROM devis d
    JOIN prospects p ON p.id = d.prospect_id
    WHERE d.archived_at IS NULL
      AND d.statut IN ('attente_validation', 'valide')
      AND p.archived_at IS NULL
      AND ${scope.sql}
    ORDER BY d.updated_at ASC
  `,
    ...scope.params,
  );

  const toTreat = await db.all(
    `
    SELECT p.id, p.name, p.company, p.value, p.temperature, p.assigned_to,
           u.name AS assignee_name, p.created_at,
           (SELECT MAX(i.created_at) FROM interactions i
             WHERE i.prospect_id = p.id AND i.archived_at IS NULL) AS last_interaction
    FROM prospects p
    LEFT JOIN users u ON u.id = p.assigned_to
    WHERE ${scope.sql}
      AND p.archived_at IS NULL
      AND p.next_action IS NULL
      AND p.temperature NOT IN ('converti', 'abandonne')
      AND (
        (SELECT MAX(i.created_at) FROM interactions i
           WHERE i.prospect_id = p.id AND i.archived_at IS NULL) IS NULL
        OR (SELECT MAX(i.created_at) FROM interactions i
           WHERE i.prospect_id = p.id AND i.archived_at IS NULL) < DATE_SUB(NOW(), INTERVAL 14 DAY)
      )
    ORDER BY p.created_at ASC
    LIMIT 5
  `,
    ...scope.params,
  );

  const recentInteractions = await db.all(
    `
    SELECT i.id, i.prospect_id, i.type, i.content, i.interaction_date, i.created_at,
           p.name AS prospect_name, u.name AS user_name
    FROM interactions i
    JOIN prospects p ON p.id = i.prospect_id
    LEFT JOIN users u ON u.id = i.user_id
    WHERE i.archived_at IS NULL AND p.archived_at IS NULL
      AND ${scope.sql}
    ORDER BY i.created_at DESC
    LIMIT 10
  `,
    ...scope.params,
  );

  const atRisk = await getAtRisk(req.user);
  const atRiskByProspect = atRisk.reduce((acc, r) => {
    const key = String(r.id);
    if (!acc[key]) {
      acc[key] = { ...r, reasons: [r.reason] };
    } else {
      acc[key].reasons.push(r.reason);
    }
    return acc;
  }, {});
  const atRiskGrouped = Object.values(atRiskByProspect);

  const overdue = relances.filter((r) => r.is_today);
  res.json({
    relances,
    meetings,
    devis,
    to_treat: toTreat,
    recent_interactions: recentInteractions,
    at_risk: atRiskGrouped,
    counts: {
      relances_today: overdue.length,
      relances_upcoming: relances.length - overdue.length,
      meetings: meetings.length,
      devis_pending: devis.length,
      at_risk: atRiskGrouped.length,
      to_treat: toTreat.length,
    },
  });
}));

export default router;