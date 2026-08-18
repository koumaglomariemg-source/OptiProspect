import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, ROLES } from "../db.js";
import { auth, adminOnly } from "../middleware/auth.js";
import { logAudit } from "../services/audit.js";
import { isMailConfigured, sendWelcomeEmail } from "../services/mail.js";
import { ah } from "../middleware/asyncHandler.js";

const router = Router();
router.use(auth());

async function syncUserNameInNotifications(oldName, newName) {
  if (!oldName || !newName || oldName === newName) return;
  const like = `%${oldName}%`;
  await db.run(
    `
    UPDATE notifications
    SET title = REPLACE(title, ?, ?),
        message = REPLACE(message, ?, ?)
    WHERE title LIKE ? OR message LIKE ?
  `,
    oldName,
    newName,
    oldName,
    newName,
    like,
    like,
  );
}

router.get("/me", ah(async (req, res) => {
  const id = req.user.id;
  const u = await db.get(
    `
    SELECT u.id, u.name, u.first_name, u.last_name, u.avatar, u.email, u.role, u.manager_id, u.created_at,
      m.name AS manager_name
    FROM users u LEFT JOIN users m ON m.id = u.manager_id
    WHERE u.id = ?
  `,
    id,
  );
  if (!u) return res.status(404).json({ error: "Utilisateur introuvable" });

  const total = (await db.get("SELECT COUNT(*) AS n FROM prospects WHERE assigned_to = ?", id)).n;
  const byTemp = await db.all(
    "SELECT temperature, COUNT(*) AS n FROM prospects WHERE assigned_to = ? GROUP BY temperature",
    id,
  );
  const byStage = await db.all(
    `
    SELECT COALESCE(p.stage, 'inconnu') AS stage, COUNT(*) AS n
    FROM prospects p WHERE p.assigned_to = ? GROUP BY p.stage ORDER BY n DESC
  `,
    id,
  );
  const value = await db.get(
    `
    SELECT COALESCE(SUM(CASE WHEN temperature NOT IN ('converti','abandonne') THEN value ELSE 0 END),0) AS pipeline_value,
           COALESCE(SUM(CASE WHEN temperature = 'converti' THEN value ELSE 0 END),0) AS converted_value
    FROM prospects WHERE assigned_to = ?
  `,
    id,
  );
  const interactions = await db.get(
    "SELECT COUNT(*) AS n, MAX(created_at) AS last_at FROM interactions WHERE user_id = ? AND archived_at IS NULL",
    id,
  );
  const devis = await db.get(
    `
    SELECT COUNT(*) AS n,
           COALESCE(SUM(CASE WHEN statut = 'valide' THEN 1 ELSE 0 END),0) AS valid_n,
           COALESCE(SUM(CASE WHEN statut = 'valide' THEN montant ELSE 0 END),0) AS valid_total
    FROM devis WHERE created_by = ? AND archived_at IS NULL
  `,
    id,
  );
  const reports = await db.get(
    `
    SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN status = 'soumis' THEN 1 ELSE 0 END),0) AS pending_n
    FROM reports WHERE user_id = ?
  `,
    id,
  );
  const reminders = await db.get(
    `
    SELECT COUNT(*) AS n FROM prospects
    WHERE assigned_to = ? AND archived_at IS NULL
      AND next_action_date IS NOT NULL
      AND next_action_date <= DATE_ADD(CURDATE(), INTERVAL 14 DAY)
      AND temperature NOT IN ('converti', 'abandonne')
  `,
    id,
  );
  const meetings = await db.get(
    `
    SELECT COUNT(*) AS n FROM meeting_participants mp
    JOIN meetings m ON m.id = mp.meeting_id
    WHERE mp.user_id = ? AND m.archived_at IS NULL AND (m.starts_at IS NULL OR m.starts_at >= NOW())
  `,
    id,
  );
  const lastLogin = await db.get(
    `
    SELECT created_at FROM audit_log WHERE action = 'auth.login' AND user_id = ? ORDER BY created_at DESC LIMIT 1
  `,
    id,
  );
  const targets = await db.all(
    `
    SELECT \`year_month\`, target_value FROM user_targets WHERE user_id = ?
    ORDER BY \`year_month\` DESC LIMIT 6
  `,
    id,
  );

  u.stats = {
    total,
    by_temperature: byTemp,
    by_stage: byStage,
    pipeline_value: value.pipeline_value,
    converted_value: value.converted_value,
    interactions: interactions.n,
    last_interaction: interactions.last_at,
    devis: {
      total: devis.n,
      valid: devis.valid_n,
      valid_total: devis.valid_total,
    },
    reports: { total: reports.n, pending: reports.pending_n },
    reminders_pending: reminders.n,
    upcoming_meetings: meetings.n,
    last_login: lastLogin?.created_at || null,
    targets,
  };
  res.json(u);
}));

router.patch("/me", ah(async (req, res) => {
  const user = await db.get("SELECT * FROM users WHERE id = ?", req.user.id);
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
  const updates = [];
  const params = [];
  if (req.body.name) {
    updates.push("name = ?");
    params.push(req.body.name);
  }
  if (req.body.first_name !== undefined) {
    updates.push("first_name = ?");
    params.push(req.body.first_name);
  }
  if (req.body.last_name !== undefined) {
    updates.push("last_name = ?");
    params.push(req.body.last_name);
  }
  if (req.body.avatar !== undefined) {
    const avatar = String(req.body.avatar);
    if (avatar && avatar.length > 8 * 1024 * 1024)
      return res.status(400).json({ error: "La photo ne doit pas dépasser ~6 Mo" });
    updates.push("avatar = ?");
    params.push(avatar);
  }
  if (req.body.email) {
    const email = String(req.body.email).toLowerCase();
    const exists = await db.get(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      email,
      user.id,
    );
    if (exists)
      return res.status(409).json({ error: "Cet email est déjà utilisé" });
    updates.push("email = ?");
    params.push(email);
  }
  if (req.body.password) {
    const current = req.body.current_password;
    if (String(req.body.password).length < 6)
      return res.status(400).json({ error: "Mot de passe trop court" });
    if (!current)
      return res
        .status(400)
        .json({ error: "Le mot de passe actuel est requis" });
    const ok = await bcrypt.compare(String(current), user.password_hash);
    if (!ok)
      return res
        .status(401)
        .json({ error: "Le mot de passe actuel est incorrect" });
    updates.push("password_hash = ?");
    params.push(await bcrypt.hash(String(req.body.password), 10));
  }
  if (!updates.length)
    return res.status(400).json({ error: "Aucune donnée à mettre à jour" });
  params.push(user.id);
  await db.run(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, ...params);
  await syncUserNameInNotifications(user.name, req.body.name);
  const updated = await db.get(
    "SELECT id, name, first_name, last_name, avatar, email, role, manager_id, created_at FROM users WHERE id = ?",
    user.id,
  );
  logAudit(req, "user.update.self", `${updated.name}`);
  res.json(updated);
}));

router.get("/", ah(async (req, res) => {
  if (req.user.role === "commercial")
    return res
      .status(403)
      .json({ error: "Accès réservé aux managers et administrateurs" });
  const where =
    req.user.role === "manager"
      ? "WHERE (u.manager_id = ? OR u.id = ?) AND u.archived_at IS NULL"
      : "WHERE u.archived_at IS NULL";
  const params = req.user.role === "manager" ? [req.user.id, req.user.id] : [];
  const rows = await db.all(
    `
    SELECT u.id, u.name, u.email, u.role, u.manager_id, u.first_name, u.last_name, u.created_at,
      m.name AS manager_name,
      (SELECT COUNT(*) FROM prospects p WHERE p.assigned_to = u.id AND p.archived_at IS NULL) AS prospect_count,
      (SELECT COUNT(*) FROM prospects p WHERE p.assigned_to = u.id AND p.archived_at IS NULL AND p.temperature NOT IN ('converti','abandonne')) AS active_count
    FROM users u LEFT JOIN users m ON m.id = u.manager_id
    ${where}
    ORDER BY u.created_at ASC
  `,
    ...params,
  );
  res.json(rows);
}));

router.get("/:id", adminOnly, ah(async (req, res) => {
  const id = Number(req.params.id);
  const u = await db.get(
    `
    SELECT u.id, u.name, u.email, u.role, u.manager_id, u.created_at,
      m.name AS manager_name
    FROM users u LEFT JOIN users m ON m.id = u.manager_id
    WHERE u.id = ? AND u.archived_at IS NULL
  `,
    id,
  );
  if (!u) return res.status(404).json({ error: "Utilisateur introuvable" });

  const team =
    u.role === "manager"
      ? (await db.all("SELECT id FROM users WHERE manager_id = ? AND archived_at IS NULL", u.id)).map(
          (r) => r.id,
        )
      : [];
  const isTeam = u.role === "manager";
  const inCol = (col) => {
    if (isTeam) {
      if (!team.length) return "1 = 0";
      return `${col} IN (${team.map(() => "?").join(",")})`;
    }
    return `${col} = ?`;
  };
  const scopeP = () => (isTeam ? team : [u.id]);

  const total = (await db.get(
    `SELECT COUNT(*) AS n FROM prospects WHERE ${inCol("assigned_to")}`,
    ...scopeP(),
  )).n;
  const byTemp = await db.all(
    `SELECT temperature, COUNT(*) AS n FROM prospects WHERE ${inCol("assigned_to")} GROUP BY temperature`,
    ...scopeP(),
  );
  const byStage = await db.all(
    `SELECT COALESCE(p.stage, 'inconnu') AS stage, COUNT(*) AS n
     FROM prospects p WHERE ${inCol("p.assigned_to")} GROUP BY p.stage ORDER BY n DESC`,
    ...scopeP(),
  );
  const value = await db.get(
    `SELECT COALESCE(SUM(CASE WHEN temperature NOT IN ('converti','abandonne') THEN value ELSE 0 END),0) AS pipeline_value,
           COALESCE(SUM(CASE WHEN temperature = 'converti' THEN value ELSE 0 END),0) AS converted_value
     FROM prospects WHERE ${inCol("assigned_to")}`,
    ...scopeP(),
  );
  const interactions = await db.get(
    `SELECT COUNT(*) AS n, MAX(created_at) AS last_at FROM interactions WHERE ${inCol("user_id")} AND archived_at IS NULL`,
    ...scopeP(),
  );
  const devis = await db.get(
    `SELECT COUNT(*) AS n,
           COALESCE(SUM(CASE WHEN statut = 'valide' THEN 1 ELSE 0 END),0) AS valid_n,
           COALESCE(SUM(CASE WHEN statut = 'valide' THEN montant ELSE 0 END),0) AS valid_total
     FROM devis WHERE ${inCol("created_by")} AND archived_at IS NULL`,
    ...scopeP(),
  );
  const reports = await db.get(
    `SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN status = 'soumis' THEN 1 ELSE 0 END),0) AS pending_n
     FROM reports WHERE ${inCol("user_id")}`,
    ...scopeP(),
  );
  const reminders = await db.get(
    `SELECT COUNT(*) AS n FROM prospects
     WHERE ${inCol("assigned_to")} AND next_action_date IS NOT NULL
       AND next_action_date <= DATE_ADD(CURDATE(), INTERVAL 14 DAY)
       AND temperature NOT IN ('converti', 'abandonne')`,
    ...scopeP(),
  );
  const meetings = await db.get(
    `SELECT COUNT(*) AS n FROM meeting_participants mp
     JOIN meetings m ON m.id = mp.meeting_id
     WHERE ${inCol("mp.user_id")} AND (m.starts_at IS NULL OR m.starts_at >= NOW())`,
    ...scopeP(),
  );
  const lastLogin = await db.get(
    `
    SELECT created_at FROM audit_log WHERE action = 'auth.login' AND user_id = ? ORDER BY created_at DESC LIMIT 1
  `,
    u.id,
  );
  const targets = isTeam
    ? team.length
      ? await db.all(
          `SELECT \`year_month\`, SUM(target_value) AS target_value FROM user_targets
           WHERE user_id IN (${team.map(() => "?").join(",")})
           GROUP BY \`year_month\` ORDER BY \`year_month\` DESC LIMIT 6`,
          ...team,
        )
      : []
    : await db.all(
        "SELECT \`year_month\`, target_value FROM user_targets WHERE user_id = ? ORDER BY \`year_month\` DESC LIMIT 6",
        u.id,
      );

  u.team_size = isTeam ? team.length : null;

  if (isTeam && team.length) {
    u.team_members = await db.all(
      `
      SELECT u.id, u.name, u.email,
        (SELECT COUNT(*) FROM prospects p WHERE p.assigned_to = u.id AND p.archived_at IS NULL) AS prospects,
        (SELECT COUNT(*) FROM prospects p WHERE p.assigned_to = u.id AND p.archived_at IS NULL AND p.temperature = 'converti') AS converted,
        (SELECT COALESCE(SUM(p.value),0) FROM prospects p WHERE p.assigned_to = u.id AND p.archived_at IS NULL AND p.temperature = 'converti') AS ca_converted,
        (SELECT COALESCE(SUM(p.value),0) FROM prospects p WHERE p.assigned_to = u.id AND p.archived_at IS NULL AND p.temperature NOT IN ('converti','abandonne')) AS pipeline_value
      FROM users u
      WHERE u.id IN (${team.map(() => "?").join(",")}) AND u.archived_at IS NULL
      ORDER BY u.name ASC
    `,
      ...team,
    );
  } else {
    u.team_members = [];
  }

  u.stats = {
    total,
    by_temperature: byTemp,
    by_stage: byStage,
    pipeline_value: value.pipeline_value,
    converted_value: value.converted_value,
    interactions: interactions.n,
    last_interaction: interactions.last_at,
    devis: {
      total: devis.n,
      valid: devis.valid_n,
      valid_total: devis.valid_total,
    },
    reports: { total: reports.n, pending: reports.pending_n },
    reminders_pending: reminders.n,
    upcoming_meetings: meetings.n,
    last_login: lastLogin?.created_at || null,
    targets,
  };
  res.json(u);
}));

async function resolveManagerId(managerId, role) {
  if (!managerId || managerId === "") return null;
  if (role === "commercial") {
    const m = await db.get(
      "SELECT id FROM users WHERE id = ? AND role = 'manager'",
      Number(managerId),
    );
    if (!m) return null;
    return m.id;
  }
  return null;
}

router.post("/", adminOnly, ah(async (req, res) => {
  try {
    const { name, first_name, last_name, email, password, role } = req.body || {};
    if ((!name && (!first_name || !last_name)) || !email || !password)
      return res
        .status(400)
        .json({ error: "Nom, email et mot de passe sont requis" });
    if (!ROLES.includes(role))
      return res.status(400).json({ error: "Rôle invalide" });
    const exists = await db.get(
      "SELECT id FROM users WHERE email = ?",
      String(email).toLowerCase(),
    );
    if (exists)
      return res.status(409).json({ error: "Cet email est déjà utilisé" });
    const hash = await bcrypt.hash(String(password), 10);
    const managerId = await resolveManagerId(req.body.manager_id, role);
    const fullName =
      String(name || "").trim() ||
      [first_name, last_name].filter(Boolean).join(" ").trim();
    const info = await db.run(
      "INSERT INTO users (name, first_name, last_name, email, password_hash, role, manager_id) VALUES (?,?,?,?,?,?,?)",
      fullName,
      first_name?.trim() || null,
      last_name?.trim() || null,
      String(email).toLowerCase(),
      hash,
      role,
      managerId,
    );
    const user = await db.get(
      "SELECT id, name, email, role, manager_id, created_at FROM users WHERE id = ?",
      info.insertId,
    );
    logAudit(
      req,
      "user.create",
      `${user.name} (${user.role})${user.manager_id ? ` → manager ${user.manager_id}` : ""}`,
    );
    let emailStatus = isMailConfigured() ? "sent" : "not_sent";
    if (isMailConfigured()) {
      try {
        await sendWelcomeEmail({
          name: user.name,
          email: user.email,
          password: String(password),
        });
        emailStatus = "sent";
      } catch (e) {
        console.error("[OptiProspect] Échec envoi email bienvenue :", e.message);
        emailStatus = "error";
      }
    }
    res.status(201).json({ ...user, email_status: emailStatus });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

router.patch("/:id", adminOnly, ah(async (req, res) => {
  const user = await db.get(
    "SELECT * FROM users WHERE id = ?",
    Number(req.params.id),
  );
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
  const updates = [];
  const params = [];
  if (req.body.name) {
    updates.push("name = ?");
    params.push(req.body.name);
  }
  if (req.body.first_name !== undefined) {
    updates.push("first_name = ?");
    params.push(req.body.first_name);
  }
  if (req.body.last_name !== undefined) {
    updates.push("last_name = ?");
    params.push(req.body.last_name);
  }
  if (req.body.avatar !== undefined) {
    const avatar = String(req.body.avatar);
    if (avatar && avatar.length > 8 * 1024 * 1024)
      return res
        .status(400)
        .json({ error: "La photo ne doit pas dépasser ~6 Mo" });
    updates.push("avatar = ?");
    params.push(avatar);
  }
  if (req.body.email) {
    const email = String(req.body.email).toLowerCase();
    const exists = await db.get(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      email,
      user.id,
    );
    if (exists)
      return res.status(409).json({ error: "Cet email est déjà utilisé" });
    updates.push("email = ?");
    params.push(email);
  }
  if (ROLES.includes(req.body.role)) {
    updates.push("role = ?");
    params.push(req.body.role);
  }
  if (req.body.manager_id !== undefined) {
    const nextRole = ROLES.includes(req.body.role) ? req.body.role : user.role;
    updates.push("manager_id = ?");
    params.push(await resolveManagerId(req.body.manager_id, nextRole));
  }
  if (req.body.password) {
    if (String(req.body.password).length < 6)
      return res.status(400).json({ error: "Mot de passe trop court" });
    updates.push("password_hash = ?");
    params.push(await bcrypt.hash(String(req.body.password), 10));
  }
  if (!updates.length)
    return res.status(400).json({ error: "Aucune donnée à mettre à jour" });
  params.push(user.id);
  await db.run(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, ...params);
  await syncUserNameInNotifications(user.name, req.body.name);
  const updated = await db.get(
    "SELECT id, name, email, role, manager_id, created_at FROM users WHERE id = ?",
    user.id,
  );
  logAudit(
    req,
    "user.update",
    `${updated.name} (${updated.role})${updated.manager_id ? ` → manager ${updated.manager_id}` : ""}`,
  );
  res.json(updated);
}));

router.delete("/:id", adminOnly, ah(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id)
    return res
      .status(400)
      .json({ error: "Vous ne pouvez pas supprimer votre propre compte" });
  const info = await db.run(
    "UPDATE users SET archived_at = NOW() WHERE id = ? AND archived_at IS NULL",
    id,
  );
  if (!info.changes)
    return res.status(404).json({ error: "Utilisateur introuvable" });
  logAudit(req, "user.archive", `id=${id}`);
  res.json({ ok: true, archived: true });
}));

function targetGuard(req, res) {
  if (!["manager", "admin"].includes(req.user.role)) {
    res
      .status(403)
      .json({ error: "Seuls les managers peuvent définir des objectifs" });
    return false;
  }
  const ym = String(req.body.year_month || "");
  if (!/^\d{4}-\d{2}$/.test(ym)) {
    res.status(400).json({ error: "year_month doit être au format AAAA-MM" });
    return false;
  }
  return true;
}

router.put("/:id/target", ah(async (req, res) => {
  if (!targetGuard(req, res)) return;
  const user = await db.get("SELECT id FROM users WHERE id = ?", Number(req.params.id));
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
  const targetValue = Math.max(0, Number(req.body.target_value) || 0);
  await db.run(
    `
    INSERT INTO user_targets (user_id, \`year_month\`, target_value) VALUES (?,?,?)
    ON DUPLICATE KEY UPDATE target_value = VALUES(target_value)
  `,
    Number(req.params.id),
    req.body.year_month,
    targetValue,
  );
  logAudit(
    req,
    "user.target",
    `user=${user.id} ${req.body.year_month}=${targetValue}`,
  );
  res.json({
    ok: true,
    user_id: user.id,
    year_month: req.body.year_month,
    target_value: targetValue,
  });
}));

router.delete("/:id/target/:year_month", ah(async (req, res) => {
  if (!["manager", "admin"].includes(req.user.role))
    return res
      .status(403)
      .json({ error: "Seuls les managers peuvent définir des objectifs" });
  await db.run(
    "DELETE FROM user_targets WHERE user_id = ? AND \`year_month\` = ?",
    Number(req.params.id),
    req.params.year_month,
  );
  res.json({ ok: true });
}));

export default router;
