import { Router } from 'express';
import { db } from '../db.js';
import { auth } from '../middleware/auth.js';
import { ah } from '../middleware/asyncHandler.js';
import { computeScore } from './prospects.js';
import { canAccessProspects, prospectScope } from '../services/scope.js';

const router = Router();
router.use(auth());

const TYPES = ['email', 'whatsapp', 'linkedin', 'appel', 'visite', 'rendezvous', 'note'];

function guard(req, res) {
  if (!canAccessProspects(req.user?.role)) {
    res.status(403).json({ error: 'Rôle non autorisé' });
    return false;
  }
  return true;
}

async function refreshScore(prospectId) {
  const p = await db.get('SELECT * FROM prospects WHERE id = ?', prospectId);
  if (!p) return;
  const score = await computeScore(p);
  await db.run('UPDATE prospects SET score = ?, updated_at = NOW() WHERE id = ?', score, prospectId);
}

router.get('/prospects/:id/interactions', ah(async (req, res) => {
  if (!guard(req, res)) return;
  const scope = prospectScope(req.user);
  const p = await db.get(`SELECT p.id FROM prospects p WHERE p.id = ? AND ${scope.sql}`, Number(req.params.id), ...scope.params);
  if (!p) return res.status(404).json({ error: 'Prospect introuvable' });
  const rows = await db.all(`
    SELECT i.*, u.name AS user_name
    FROM interactions i LEFT JOIN users u ON u.id = i.user_id
    WHERE i.prospect_id = ? AND i.archived_at IS NULL
    ORDER BY i.created_at DESC
  `, p.id);
  res.json(rows);
}));

router.post('/prospects/:id/interactions', ah(async (req, res) => {
  if (!guard(req, res)) return;
  if (req.user.role === 'manager') return res.status(403).json({ error: 'Un manager ne peut pas ajouter d\'interaction' });
  const scope = prospectScope(req.user);
  const prospect = await db.get(`SELECT p.id FROM prospects p WHERE p.id = ? AND ${scope.sql}`, Number(req.params.id), ...scope.params);
  if (!prospect) return res.status(404).json({ error: 'Prospect introuvable' });
  const { type, content, date } = req.body || {};
  const t = TYPES.includes(type) ? type : 'note';
  if (!content?.trim()) return res.status(400).json({ error: 'Le contenu est requis' });
  const interactionDate = date
    ? date.includes("T")
      ? date.replace("T", " ")
      : `${date} 00:00:00`
    : null;
  const info = await db.run(
    'INSERT INTO interactions (prospect_id, user_id, type, content, interaction_date) VALUES (?,?,?,?, COALESCE(?, CURRENT_TIMESTAMP))',
    prospect.id, req.user.id, t, content.trim(), interactionDate);
  await db.run(
    'INSERT INTO prospect_events (prospect_id, user_id, user_name, type, field, old_value, new_value) VALUES (?,?,?,?,?,?,?)',
    prospect.id, req.user.id, req.user.name || null, 'interaction', t, null, content.trim());
  await refreshScore(prospect.id);
  const row = await db.get(`
    SELECT i.*, u.name AS user_name
    FROM interactions i LEFT JOIN users u ON u.id = i.user_id
    WHERE i.id = ?
  `, info.insertId);
  res.status(201).json(row);
}));

router.delete('/interactions/:id', ah(async (req, res) => {
  if (!guard(req, res)) return;
  const row = await db.get('SELECT * FROM interactions WHERE id = ?', Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Interaction introuvable' });
  await db.run('UPDATE interactions SET archived_at = NOW() WHERE id = ?', row.id);
  await refreshScore(row.prospect_id);
  res.json({ ok: true, archived: true });
}));

export default router;
