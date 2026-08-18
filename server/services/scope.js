import { db } from "../db.js";

export function canAccessProspects(role) {
  return role === "manager" || role === "commercial" || role === "admin";
}

export function canAccessMeetings(role) {
  return role === "manager" || role === "commercial" || role === "admin";
}

// Condition SQL sur l'alias p (prospects) + paramètres associés
// Exclut toujours les prospects archivés (suppression = changement d'état).
export function prospectScope(user) {
  if (user.role === "admin") {
    return {
      sql: `p.archived_at IS NULL`,
      params: [],
    };
  }
  if (user.role === "manager") {
    return {
      sql: `(p.assigned_to IN (SELECT u.id FROM users u WHERE u.manager_id = ? AND u.archived_at IS NULL) OR p.assigned_to IS NULL) AND p.archived_at IS NULL`,
      params: [user.id],
    };
  }
  if (user.role === "commercial") {
    return {
      sql: `p.assigned_to = ? AND p.archived_at IS NULL`,
      params: [user.id],
    };
  }
  return { sql: "1 = 0", params: [] };
}

// Identifiants des commerciaux couverts (le manager/admin inclus pour leurs propres cibles)
export async function teamIds(user) {
  if (user.role === "admin") {
    const rows = await db.all("SELECT id FROM users WHERE archived_at IS NULL");
    return rows.map((u) => u.id);
  }
  if (user.role === "manager") {
    const rows = await db.all("SELECT id FROM users WHERE manager_id = ? AND archived_at IS NULL", user.id);
    rows.push({ id: user.id });
    return rows.map((u) => u.id);
  }
  return [user.id];
}
