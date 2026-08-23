import { db } from "../db.js";
import { prospectScope, teamIds } from "./scope.js";

const DAY_MS = 86_400_000;

export async function getAtRisk(user) {
  const scope = prospectScope(user);
  const active = `p.temperature NOT IN ('converti', 'abandonne')`;
  const overdue = await db.all(
    `
    SELECT p.id, p.name, p.company, p.value, p.temperature, p.next_action,
           p.next_action_date, p.assigned_to, u.name AS assignee_name,
           DATEDIFF(CURDATE(), DATE(p.next_action_date)) AS days
    FROM prospects p
    LEFT JOIN users u ON u.id = p.assigned_to
    WHERE ${scope.sql} AND ${active}
      AND p.next_action_date IS NOT NULL
      AND DATE(p.next_action_date) < CURDATE()
    ORDER BY days DESC
    LIMIT 20
  `,
    ...scope.params,
  );

  const stalled = await db.all(
    `
    SELECT p.id, p.name, p.company, p.value, p.temperature, p.next_action,
           p.next_action_date, p.assigned_to, u.name AS assignee_name,
           p.created_at,
           (SELECT MAX(i.interaction_date) FROM interactions i
             WHERE i.prospect_id = p.id AND i.archived_at IS NULL) AS last_interaction
    FROM prospects p
    LEFT JOIN users u ON u.id = p.assigned_to
    WHERE ${scope.sql} AND ${active}
      AND (p.next_action_date IS NULL OR DATE(p.next_action_date) >= CURDATE())
      AND (
        (SELECT MAX(i.interaction_date) FROM interactions i
           WHERE i.prospect_id = p.id AND i.archived_at IS NULL) IS NULL
        OR (SELECT MAX(i.interaction_date) FROM interactions i
           WHERE i.prospect_id = p.id AND i.archived_at IS NULL) < DATE_SUB(NOW(), INTERVAL 7 DAY)
      )
    ORDER BY COALESCE(last_interaction, p.created_at) ASC
    LIMIT 20
  `,
    ...scope.params,
  );
  for (const r of stalled) {
    const last = r.last_interaction ? new Date(String(r.last_interaction).replace("T", " ")) : null;
    r.days = last
      ? Math.max(1, Math.round((Date.now() - last.getTime()) / DAY_MS))
      : Math.max(1, Math.round((Date.now() - new Date(String(r.created_at || Date.now()).replace("T", " ")).getTime()) / DAY_MS));
    delete r.last_interaction;
  }

  let pendingValidation = [];
  if (user.role !== "commercial") {
    const ids = await teamIds(user);
    pendingValidation = await db.all(
      `
      SELECT d.id AS devis_id, d.\`reference\`, d.titre, d.montant, d.updated_at,
             p.id, p.name, p.company, p.value, p.temperature, p.assigned_to,
             u.name AS assignee_name,
             DATEDIFF(NOW(), d.updated_at) AS days
      FROM devis d
      JOIN prospects p ON p.id = d.prospect_id
      LEFT JOIN users u ON u.id = p.assigned_to
      WHERE d.archived_at IS NULL AND d.statut = 'attente_validation'
        AND (p.assigned_to IN (${ids.map(() => "?").join(",")}) OR p.assigned_to IS NULL)
        AND DATE(d.updated_at) <= DATE_SUB(CURDATE(), INTERVAL 3 DAY)
      ORDER BY days DESC
      LIMIT 20
    `,
      ...ids,
    );
  }

  const map = (r, reason) => ({
    id: r.id,
    name: r.name,
    company: r.company,
    value: r.value,
    temperature: r.temperature,
    reason,
    days: r.days,
    assignee_name: r.assignee_name,
    next_action: r.next_action,
    next_action_date: r.next_action_date,
    devis_ref: r.reference || null,
  });

  const items = [
    ...overdue.map((r) => map(r, "overdue")),
    ...stalled.map((r) => map(r, "stalled")),
    ...pendingValidation.map((r) => map(r, "pending_validation")),
  ];
  return items;
}