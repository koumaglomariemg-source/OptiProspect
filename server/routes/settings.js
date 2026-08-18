import { Router } from 'express';
import { db } from '../db.js';
import { auth, adminOnly } from '../middleware/auth.js';
import { ah } from "../middleware/asyncHandler.js";
import { logAudit } from '../services/audit.js';

const router = Router();
router.use(auth());

const KEYS = ['stages', 'products', 'zones', 'refusal_reasons'];

router.get('/', ah(async (req, res) => {
  const rows = await db.all('SELECT \`key\`, value FROM settings');
  const out = {};
  for (const r of rows) {
    try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; }
  }
  res.json(out);
}));

router.get('/stages', ah(async (req, res) => {
  const row = await db.get("SELECT value FROM settings WHERE \`key\` = 'stages'");
  let stages;
  try { stages = JSON.parse(row.value); } catch { stages = []; }
  res.json(stages);
}));

router.put('/:key', ah(async (req, res) => {
  const key = req.params.key;
  if (!KEYS.includes(key)) return res.status(400).json({ error: 'Clé de réglage inconnue' });
  if (req.user.role === 'commercial') return res.status(403).json({ error: 'Accès réservé aux managers et administrateurs' });

  let value;
  if (!Array.isArray(req.body.value)) return res.status(400).json({ error: 'Valeur invalide' });
  value = JSON.stringify(req.body.value);
  await db.run('INSERT INTO settings (\`key\`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
    key, value);
  logAudit(req, `settings.update.${key}`);
  let parsed;
  try { parsed = JSON.parse(value); } catch { parsed = value; }
  res.json({ key, value: parsed });
}));

router.get('/audit', ah(async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const rows = await db.all('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?', limit);
  res.json(rows);
}));

router.get('/backup', ah(async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  const tables = ['users', 'prospects', 'interactions', 'devis', 'reports', 'notifications', 'settings', 'audit_log'];
  const backup = {};
  for (const t of tables) backup[t] = await db.all(`SELECT * FROM ${t}`);
  logAudit(req, 'backup.export');
  res.json({ exported_at: new Date().toISOString(), data: backup });
}));

export default router;
