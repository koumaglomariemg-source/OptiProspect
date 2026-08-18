import { Router } from 'express';
import { db } from '../db.js';
import { auth } from '../middleware/auth.js';
import { ah } from "../middleware/asyncHandler.js";
import { canAccessProspects, prospectScope } from '../services/scope.js';

const router = Router();
router.use(auth());
router.use((req, res, next) => {
  if (!canAccessProspects(req.user?.role)) return res.status(403).json({ error: 'Rôle non autorisé' });
  next();
});

router.get('/', ah(async (req, res) => {
  const where = [];
  const params = [];
  const scope = prospectScope(req.user);
  where.push(scope.sql);
  params.push(...scope.params);
  where.push("p.next_action_date IS NOT NULL AND p.next_action_date <= DATE_ADD(CURDATE(), INTERVAL 14 DAY)");
  where.push("p.temperature NOT IN ('converti', 'abandonne')");

  const rows = await db.all(`
    SELECT p.id, p.name, p.company, p.phone, p.email, p.next_action, p.next_action_date, p.assigned_to,
           u.name AS assignee_name
    FROM prospects p
    LEFT JOIN users u ON u.id = p.assigned_to
    WHERE ${where.join(' AND ')}
    ORDER BY p.next_action_date ASC
  `, ...params);

  const now = new Date();
  res.json(rows.map((r) => {
    const due = new Date(String(r.next_action_date).replace("T", " "));
    return { ...r, due_in_days: Math.round((due - now) / 864e5) };
  }));
}));

export default router;
