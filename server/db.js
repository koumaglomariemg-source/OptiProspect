import mysql from "mysql2/promise";

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "optiprospect";

let pool = null;

export const SCHEMA_DDL = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    email VARCHAR(191) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'commercial',
    manager_id INT NULL,
    first_name VARCHAR(191),
    last_name VARCHAR(191),
    avatar LONGTEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at DATETIME,
    UNIQUE KEY uq_users_email (email),
    CONSTRAINT fk_users_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS prospects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    first_name VARCHAR(191),
    last_name VARCHAR(191),
    company VARCHAR(191),
    email VARCHAR(191),
    phone VARCHAR(191),
    linkedin VARCHAR(500),
    source VARCHAR(50) DEFAULT 'site',
    value DOUBLE DEFAULT 0,
    score INT DEFAULT 0,
    stage VARCHAR(100) NOT NULL DEFAULT 'nouveau',
    temperature VARCHAR(50) DEFAULT 'tiede',
    secteur VARCHAR(191),
    adresse TEXT,
    latitude DOUBLE,
    longitude DOUBLE,
    assigned_to INT,
    next_action TEXT,
    next_action_date DATETIME,
    note TEXT,
    contact_token VARCHAR(64),
    converted_at DATETIME,
    template_id INT,
    numero VARCHAR(100),
    quartier VARCHAR(191),
    effectif INT,
    product VARCHAR(191),
    contrat_depose INT NOT NULL DEFAULT 0,
    contrat_signe INT NOT NULL DEFAULT 0,
    option_frais_scolaire INT NOT NULL DEFAULT 0,
    archived_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_prospects_stage (stage),
    KEY idx_prospects_assigned (assigned_to),
    KEY idx_prospects_updated (updated_at),
    CONSTRAINT fk_prospects_assigned FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS interactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prospect_id INT NOT NULL,
    user_id INT,
    type VARCHAR(50) NOT NULL DEFAULT 'note',
    content TEXT NOT NULL,
    interaction_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at DATETIME,
    KEY idx_interactions_prospect (prospect_id),
    CONSTRAINT fk_interactions_prospect FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE,
    CONSTRAINT fk_interactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(191) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    \`read\` INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_notifications_user (user_id),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS devis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    \`reference\` VARCHAR(191) NOT NULL,
    prospect_id INT NOT NULL,
    titre VARCHAR(191) NOT NULL,
    description TEXT,
    montant DOUBLE DEFAULT 0,
    arr DOUBLE DEFAULT 0,
    renewal_date DATE,
    items TEXT,
    statut VARCHAR(50) NOT NULL DEFAULT 'brouillon',
    created_by INT,
    validated_by INT,
    validation_comment TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at DATETIME,
    UNIQUE KEY uq_devis_reference (\`reference\`),
    KEY idx_devis_prospect (prospect_id),
    CONSTRAINT fk_devis_prospect FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE,
    CONSTRAINT fk_devis_created FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_devis_validated FOREIGN KEY (validated_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS prospect_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prospect_id INT NOT NULL,
    user_id INT,
    user_name VARCHAR(191),
    type VARCHAR(50) NOT NULL,
    field VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_events_prospect FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE,
    CONSTRAINT fk_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS user_targets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    \`year_month\` VARCHAR(7) NOT NULL,
    target_value DOUBLE NOT NULL DEFAULT 0,
    UNIQUE KEY uq_targets_user_ym (user_id, \`year_month\`),
    CONSTRAINT fk_targets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    period_start DATE,
    period_end DATE,
    content TEXT NOT NULL,
    calls INT DEFAULT 0,
    visits INT DEFAULT 0,
    emails INT DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'en_attente',
    reviewed_by INT,
    review_comment TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_reports_user (user_id),
    CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_reports_reviewed FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    user_name VARCHAR(191),
    role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip VARCHAR(100),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_audit_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS settings (
    \`key\` VARCHAR(191) PRIMARY KEY,
    value TEXT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS pipeline_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    description TEXT,
    is_default INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS pipeline_template_steps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_id INT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    \`key\` VARCHAR(100),
    name VARCHAR(191) NOT NULL,
    color VARCHAR(50) DEFAULT 'indigo',
    form_fields TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_steps_template FOREIGN KEY (template_id) REFERENCES pipeline_templates(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS prospect_steps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prospect_id INT NOT NULL,
    step_id INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    data TEXT,
    validated_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_prospect_steps (prospect_id, step_id),
    CONSTRAINT fk_ps_prospect FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE,
    CONSTRAINT fk_ps_step FOREIGN KEY (step_id) REFERENCES pipeline_template_steps(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS meetings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(191) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'en_ligne',
    location TEXT,
    meeting_link TEXT,
    starts_at DATETIME,
    ends_at DATETIME,
    notes TEXT,
    created_by INT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at DATETIME,
    CONSTRAINT fk_meetings_created FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS meeting_participants (
    meeting_id INT NOT NULL,
    user_id INT NOT NULL,
    PRIMARY KEY (meeting_id, user_id),
    CONSTRAINT fk_mp_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    CONSTRAINT fk_mp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

export const db = {
  async get(sql, ...params) {
    const [rows] = await pool.execute(sql, params);
    return rows[0];
  },
  async all(sql, ...params) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  },
  async run(sql, ...params) {
    const [res] = await pool.execute(sql, params);
    return { insertId: res.insertId, changes: res.affectedRows };
  },
  async exec(sql) {
    await pool.query(sql);
  },
};

async function createPool() {
  pool = await mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    charset: "utf8mb4",
    dateStrings: true,
  });
  pool.on("error", (err) => {
    console.error(`[OptiProspect] Erreur de connexion MySQL : ${err.message}`);
  });
}

async function ensureDatabase() {
  const c = await mysql.createConnection({ host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD });
  await c.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await c.end();
}

async function createSchema() {
  for (const ddl of SCHEMA_DDL) await pool.query(ddl);
}

async function ensureColumn(table, column, ddl) {
  const rows = await pool.query(`SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [table, column]);
  if (!rows[0].length) await pool.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

async function migrateSchema() {
  await ensureColumn("prospects", "first_name", "first_name VARCHAR(191) NULL");
  await ensureColumn("prospects", "last_name", "last_name VARCHAR(191) NULL");
  await ensureColumn("prospects", "product", "product VARCHAR(191) NULL");
  await ensureColumn(
    "prospects",
    "relance_email_sent_date",
    "relance_email_sent_date VARCHAR(32) NULL",
  );
  const [colRows] = await pool.query(
    "SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prospects' AND COLUMN_NAME = 'relance_email_sent_date'",
  );
  if (colRows[0]?.DATA_TYPE === "date") {
    await pool.query(
      "ALTER TABLE prospects MODIFY relance_email_sent_date VARCHAR(32) NULL",
    );
  }
  const [dtRows] = await pool.query(
    "SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prospects' AND COLUMN_NAME = 'next_action_date'",
  );
  if (dtRows[0]?.DATA_TYPE === "date") {
    await pool.query(
      "ALTER TABLE prospects MODIFY next_action_date DATETIME NULL",
    );
  }
}

async function backfillMissingTokens() {
  await pool.execute(
    "UPDATE prospects SET contact_token = REPLACE(UUID(), '-', '') WHERE contact_token IS NULL OR contact_token = ''",
  );
}

const DEFAULT_SETTINGS = {
  stages: JSON.stringify([
    { key: "nouveau", label: "Nouveau", color: "sky" },
    { key: "qualification", label: "Qualification", color: "amber" },
    { key: "suivi", label: "Suivi", color: "violet" },
    { key: "conversion", label: "Conversion", color: "emerald" },
    { key: "perdu", label: "Perdu", color: "rose" },
  ]),
  products: JSON.stringify([
    "Abonnement CRM",
    "Accompagnement terrain",
    "Formation équipe",
    "Support premium",
  ]),
  zones: JSON.stringify([
    "Île-de-France",
    "Auvergne-Rhône-Alpes",
    "Provence-Alpes-Côte d'Azur",
    "Hauts-de-France",
    "Nouvelle-Aquitaine",
    "Occitanie",
    "Grand Est",
    "Bretagne",
    "Normandie",
  ]),
  refusal_reasons: JSON.stringify([
    "Budget insuffisant",
    "Déjà un fournisseur",
    "Délai trop long",
    "Besoin non prioritaire",
    "Prix trop élevé",
    "Sans suite",
  ]),
};

async function seedSettings() {
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    await pool.execute(
      "INSERT IGNORE INTO settings (\`key\`, value) VALUES (?, ?)",
      [k, v],
    );
  }
}

const DEFAULT_TEMPLATE_STEPS = [
  {
    key: "identifie",
    name: "Établissements Identifiés",
    color: "sky",
    fields: [
      { key: "date", label: "Date", type: "date", required: true },
      { key: "numero", label: "N°", type: "text" },
      { key: "entreprises", label: "Noms des entreprises", type: "text" },
      { key: "contacts", label: "Contacts", type: "text", placeholder: "Ex: 06 12 34 56 78" },
      { key: "quartier", label: "Quartier", type: "text" },
    ],
  },
  {
    key: "prospection",
    name: "Prospection (évaluation terrain)",
    color: "amber",
    fields: [
      { key: "date", label: "Date", type: "date", required: true },
      { key: "numero", label: "N°", type: "text" },
      { key: "decideurs", label: "Décideurs rencontrés", type: "text" },
      { key: "reactions", label: "Réactions / Objections", type: "textarea" },
      { key: "opportunites", label: "Opportunités", type: "textarea" },
      {
        key: "prochaines_actions",
        label: "Prochaines actions",
        type: "textarea",
      },
      {
        key: "difficultes",
        label: "Difficultés rencontrées",
        type: "textarea",
      },
    ],
  },
  {
    key: "suivi",
    name: "Établissements Suivis (relances / dossiers)",
    color: "violet",
    fields: [
      { key: "date", label: "Date", type: "date", required: true },
      { key: "effectif", label: "Effectif", type: "number" },
      { key: "decideur", label: "Décideur", type: "text" },
      { key: "reactions", label: "Réactions / Objections", type: "textarea" },
      { key: "opportunites", label: "Opportunités", type: "textarea" },
      { key: "actions", label: "Actions", type: "textarea" },
      {
        key: "prochaines_actions",
        label: "Prochaines actions",
        type: "textarea",
      },
      { key: "difficultes", label: "Difficultés", type: "textarea" },
    ],
  },
  {
    key: "contrat_depose",
    name: "Contrats Déposés",
    color: "indigo",
    fields: [
      { key: "date", label: "Date", type: "date", required: true },
      { key: "numero", label: "N°", type: "text" },
      { key: "representants", label: "Représentants rencontrés", type: "text" },
      { key: "quartier", label: "Quartier", type: "text" },
      { key: "commentaires", label: "Commentaires", type: "textarea" },
    ],
  },
  {
    key: "contrat_signe",
    name: "Contrats Signés",
    color: "emerald",
    fields: [
      { key: "date", label: "Date", type: "date", required: true },
      { key: "ordre", label: "Ordre", type: "text" },
      { key: "representants", label: "Représentants rencontrés", type: "text" },
      { key: "quartier", label: "Quartier", type: "text" },
      { key: "note", label: "Note", type: "textarea" },
    ],
  },
];

export async function getDefaultTemplate() {
  return (
    (await db.get(
      "SELECT * FROM pipeline_templates WHERE is_default = 1 ORDER BY id ASC LIMIT 1",
    )) || null
  );
}

export async function getTemplateSteps(templateId) {
  return db.all(
    "SELECT * FROM pipeline_template_steps WHERE template_id = ? ORDER BY position ASC, id ASC",
    templateId,
  );
}

export async function syncStagesFromTemplate() {
  const tmpl = await getDefaultTemplate();
  if (!tmpl) return;
  const steps = await getTemplateSteps(tmpl.id);
  if (!steps.length) return;
  const stages = steps.map((s, i) => ({
    key: s.key || `etape_${i + 1}`,
    label: s.name,
    color: s.color || "indigo",
  }));
  await db.run(
    "INSERT INTO settings (\`key\`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
    "stages",
    JSON.stringify(stages),
  );
}

async function ensureDefaultTemplate() {
  const existing = await db.get(
    "SELECT id FROM pipeline_templates WHERE is_default = 1",
  );
  if (existing) {
    await syncStagesFromTemplate();
    return;
  }
  const info = await db.run(
    "INSERT INTO pipeline_templates (name, description, is_default) VALUES (?,?,?)",
    "Pipeline par défaut",
    "5 étapes : identification → prospection → suivi → contrats déposés → contrats signés",
    1,
  );
  for (let i = 0; i < DEFAULT_TEMPLATE_STEPS.length; i++) {
    const s = DEFAULT_TEMPLATE_STEPS[i];
    await db.run(
      "INSERT INTO pipeline_template_steps (template_id, position, \`key\`, name, color, form_fields) VALUES (?,?,?,?,?,?)",
      info.insertId,
      i,
      s.key,
      s.name,
      s.color,
      JSON.stringify(s.fields),
    );
  }
  await syncStagesFromTemplate();
}

export async function initDb() {
  await ensureDatabase();
  await createPool();
  await createSchema();
  await migrateSchema();
  await seedSettings();
  await ensureDefaultTemplate();
  await backfillMissingTokens();
  console.log(`[OptiProspect] MySQL connecté : ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
}

export const STAGES = [
  "nouveau",
  "qualification",
  "suivi",
  "conversion",
  "perdu",
];
export const ROLES = ["commercial", "manager", "admin"];
