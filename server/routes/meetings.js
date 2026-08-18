import { Router } from 'express';
import { db } from '../db.js';
import { auth } from '../middleware/auth.js';
import { ah } from '../middleware/asyncHandler.js';
import { logAudit } from '../services/audit.js';
import { canAccessMeetings, teamIds } from '../services/scope.js';

const router = Router();
router.use(auth());
router.use((req, res, next) => {
  if (!canAccessMeetings(req.user?.role)) return res.status(403).json({ error: 'Rôle non autorisé' });
  next();
});

const TYPES = ['en_ligne', 'presentiel'];

async function scopeSql(user, alias = 'm') {
  if (user.role === 'commercial') {
    return { sql: `${alias}.id IN (SELECT mp.meeting_id FROM meeting_participants mp WHERE mp.user_id = ?)`, params: [user.id] };
  }
  const ids = await teamIds(user);
  return {
    sql: `(${alias}.created_by = ? OR ${alias}.id IN (SELECT mp.meeting_id FROM meeting_participants mp WHERE mp.user_id IN (${ids.map(() => '?').join(',')})))`,
    params: [user.id, ...ids],
  };
}

async function fullMeeting(id) {
  const m = await db.get(`
    SELECT m.*, u.name AS created_by_name
    FROM meetings m LEFT JOIN users u ON u.id = m.created_by
    WHERE m.id = ? AND m.archived_at IS NULL
  `, id);
  if (!m) return null;
  m.participants = await db.all(`
    SELECT u.id, u.name, u.role
    FROM meeting_participants mp JOIN users u ON u.id = mp.user_id
    WHERE mp.meeting_id = ? ORDER BY u.name
  `, id);
  return m;
}

async function replaceParticipants(meetingId, participants) {
  await db.run('DELETE FROM meeting_participants WHERE meeting_id = ?', meetingId);
  const list = Array.isArray(participants) ? participants.map(Number).filter(Boolean) : [];
  for (const uid of [...new Set(list)]) await db.run('INSERT IGNORE INTO meeting_participants (meeting_id, user_id) VALUES (?,?)', meetingId, uid);
  return list;
}

router.get('/', ah(async (req, res) => {
  const s = await scopeSql(req.user);
  const rows = await db.all(`
    SELECT m.*, u.name AS created_by_name
    FROM meetings m LEFT JOIN users u ON u.id = m.created_by
    WHERE ${s.sql} AND m.archived_at IS NULL
    ORDER BY m.starts_at IS NULL, m.starts_at ASC
  `, ...s.params);
  for (const r of rows) {
    r.participants = await db.all(`
      SELECT u.id, u.name, u.role FROM meeting_participants mp JOIN users u ON u.id = mp.user_id
      WHERE mp.meeting_id = ? ORDER BY u.name
    `, r.id);
  }
  res.json(rows);
}));

router.get('/:id', ah(async (req, res) => {
  const s = await scopeSql(req.user);
  const m = await db.get(`SELECT m.id FROM meetings m WHERE m.id = ? AND ${s.sql} AND m.archived_at IS NULL`, Number(req.params.id), ...s.params);
  if (!m) return res.status(404).json({ error: 'Réunion introuvable' });
  res.json(await fullMeeting(m.id));
}));

router.post('/', ah(async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Seul un manager peut planifier une réunion' });
  const { title, type, location, meeting_link, starts_at, ends_at, notes, participants } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: 'Le titre de la réunion est requis' });
  const t = TYPES.includes(type) ? type : 'en_ligne';
  const info = await db.run(
    'INSERT INTO meetings (title, type, location, meeting_link, starts_at, ends_at, notes, created_by) VALUES (?,?,?,?,?,?,?,?)',
    title.trim(), t, location || null, meeting_link || null, starts_at || null, ends_at || null, notes || null, req.user.id);
  const list = await replaceParticipants(info.insertId, participants);
  if (!list.length) {
    const team = (await teamIds(req.user)).filter((id) => id !== req.user.id);
    await replaceParticipants(info.insertId, team);
    list.push(...team);
  }
  const notifyIds = [...new Set([...list, req.user.id])];
  const titleTxt = title.trim();
  const when = starts_at || 'date à définir';
  for (const uid of notifyIds) {
    const msg = uid === req.user.id
      ? `Vous avez planifié « ${titleTxt} » le ${when}.`
      : `${req.user.name} vous invite à « ${titleTxt} » le ${when}.`;
    await db.run('INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)',
      uid, 'Réunion planifiée', msg, 'info');
  }
  logAudit(req, 'meeting.create', `${title.trim()}`);
  res.status(201).json(await fullMeeting(info.insertId));
}));

router.put('/:id', ah(async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Seul un manager peut modifier une réunion' });
  const m = await db.get('SELECT * FROM meetings WHERE id = ? AND archived_at IS NULL', Number(req.params.id));
  if (!m) return res.status(404).json({ error: 'Réunion introuvable' });
  const updates = [];
  const params = [];
  if (req.body.title !== undefined) {
    if (!String(req.body.title).trim()) return res.status(400).json({ error: 'Le titre est requis' });
    updates.push('title = ?'); params.push(String(req.body.title).trim());
  }
  if (req.body.type !== undefined) { updates.push('type = ?'); params.push(TYPES.includes(req.body.type) ? req.body.type : m.type); }
  if (req.body.location !== undefined) { updates.push('location = ?'); params.push(req.body.location || null); }
  if (req.body.meeting_link !== undefined) { updates.push('meeting_link = ?'); params.push(req.body.meeting_link || null); }
  if (req.body.starts_at !== undefined) { updates.push('starts_at = ?'); params.push(req.body.starts_at || null); }
  if (req.body.ends_at !== undefined) { updates.push('ends_at = ?'); params.push(req.body.ends_at || null); }
  if (req.body.notes !== undefined) { updates.push('notes = ?'); params.push(req.body.notes || null); }
  if (updates.length) {
    params.push(m.id);
    await db.run(`UPDATE meetings SET ${updates.join(', ')} WHERE id = ?`, ...params);
  }
  if (req.body.participants !== undefined) await replaceParticipants(m.id, req.body.participants);
  logAudit(req, 'meeting.update', `${m.title}`);
  res.json(await fullMeeting(m.id));
}));

router.delete('/:id', ah(async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Seul un manager peut supprimer une réunion' });
  const m = await db.get('SELECT * FROM meetings WHERE id = ? AND archived_at IS NULL', Number(req.params.id));
  if (!m) return res.status(404).json({ error: 'Réunion introuvable' });
  await db.run('UPDATE meetings SET archived_at = NOW() WHERE id = ?', m.id);
  logAudit(req, 'meeting.archive', `${m.title}`);
  res.json({ ok: true, archived: true });
}));

export default router;
