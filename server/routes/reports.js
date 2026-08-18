import { Router } from 'express';
import { db } from '../db.js';
import { auth } from '../middleware/auth.js';
import { ah } from '../middleware/asyncHandler.js';
import { logAudit } from '../services/audit.js';
import { canAccessProspects, teamIds } from '../services/scope.js';

const router = Router();
router.use(auth());
router.use((req, res, next) => {
  if (!canAccessProspects(req.user?.role)) return res.status(403).json({ error: 'Rôle non autorisé' });
  next();
});

async function notifyManagers(title, message, type = 'info') {
  const managers = await db.all("SELECT id FROM users WHERE role = 'manager' AND archived_at IS NULL");
  for (const m of managers) {
    await db.run('INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)', m.id, title, message, type);
  }
}

async function getReport(id) {
  return await db.get(`
    SELECT r.*, u.name AS user_name, rev.name AS reviewed_by_name
    FROM reports r
    LEFT JOIN users u ON u.id = r.user_id
    LEFT JOIN users rev ON rev.id = r.reviewed_by
    WHERE r.id = ?
  `, id);
}

router.get('/', ah(async (req, res) => {
  const where = [];
  const params = [];
  if (req.user.role === 'commercial') {
    where.push('r.user_id = ?');
    params.push(req.user.id);
  } else if (req.user.role === 'manager') {
    const ids = await teamIds(req.user);
    where.push(`r.user_id IN (${ids.map(() => '?').join(',')})`);
    params.push(...ids);
  }
  if (req.query.status) { where.push('r.status = ?'); params.push(req.query.status); }
  const rows = await db.all(`
    SELECT r.*, u.name AS user_name, rev.name AS reviewed_by_name
    FROM reports r
    LEFT JOIN users u ON u.id = r.user_id
    LEFT JOIN users rev ON rev.id = r.reviewed_by
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY r.created_at DESC
  `, ...params);
  res.json(rows);
}));

router.post('/', ah(async (req, res) => {
  if (req.user.role === 'admin') return res.status(400).json({ error: 'Les administrateurs ne soumettent pas de rapports' });
  const { period_start, period_end, content, calls, visits, emails } = req.body || {};
  if (!content?.trim()) return res.status(400).json({ error: 'Le contenu du rapport est requis' });
  const info = await db.run(
    'INSERT INTO reports (user_id, period_start, period_end, content, calls, visits, emails, status) VALUES (?,?,?,?,?,?,?,?)',
    req.user.id,
    period_start || null,
    period_end || null,
    content.trim(),
    Number(calls) || 0,
    Number(visits) || 0,
    Number(emails) || 0,
    'en_attente'
  );
  await notifyManagers('Rapport d\'activité à valider', `${req.user.name} a soumis son rapport d'activité.`, 'info');
  logAudit(req, 'report.submit', `REPORT ${info.insertId}`);
  res.status(201).json(await getReport(info.insertId));
}));

router.post('/:id/review', ah(async (req, res) => {
  if (req.user.role === 'commercial') return res.status(403).json({ error: 'Seul un manager peut valider un rapport' });
  const report = await db.get('SELECT * FROM reports WHERE id = ?', Number(req.params.id));
  if (!report) return res.status(404).json({ error: 'Rapport introuvable' });
  const { decision, comment } = req.body || {};
  if (!['valide', 'refuse'].includes(decision)) return res.status(400).json({ error: 'Décision invalide' });
  await db.run("UPDATE reports SET status = ?, reviewed_by = ?, review_comment = ?, updated_at = NOW() WHERE id = ?",
    decision, req.user.id, (comment || '').slice(0, 500), report.id);
  if (report.user_id) {
    await db.run('INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)',
      report.user_id, decision === 'valide' ? 'Rapport validé' : 'Rapport refusé',
      `Votre rapport d'activité a été ${decision}${comment ? ` : ${comment}` : ''}.`, decision === 'valide' ? 'succes' : 'info');
  }
  logAudit(req, `report.${decision}`, `REPORT ${report.id}`);
  res.json(await getReport(report.id));
}));

export default router;
