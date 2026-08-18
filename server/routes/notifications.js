import { Router } from 'express';
import { db } from '../db.js';
import { auth } from '../middleware/auth.js';
import { ah } from "../middleware/asyncHandler.js";

const router = Router();
router.use(auth());

router.get('/', ah(async (req, res) => {
  const rows = await db.all(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY \`read\` ASC, created_at DESC
    LIMIT 50
  `, req.user.id);
  res.json(rows);
}));

router.get('/unread-count', ah(async (req, res) => {
  const row = await db.get('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND \`read\` = 0', req.user.id);
  res.json({ count: row.n });
}));

router.patch('/:id/read', ah(async (req, res) => {
  const info = await db.run('UPDATE notifications SET \`read\` = 1 WHERE id = ? AND user_id = ?',
    Number(req.params.id), req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Notification introuvable' });
  res.json({ ok: true });
}));

router.post('/read-all', ah(async (req, res) => {
  await db.run('UPDATE notifications SET \`read\` = 1 WHERE user_id = ? AND \`read\` = 0', req.user.id);
  res.json({ ok: true });
}));

router.delete('/:id', ah(async (req, res) => {
  await db.run('DELETE FROM notifications WHERE id = ? AND user_id = ?', Number(req.params.id), req.user.id);
  res.json({ ok: true });
}));

export default router;
