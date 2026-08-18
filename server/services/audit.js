import { db } from '../db.js';

export function logAudit(req, action, details = '') {
  const ip = req.ip || req.socket?.remoteAddress || '';
  db.run(
    'INSERT INTO audit_log (user_id, user_name, role, action, details, ip) VALUES (?,?,?,?,?,?)',
    req.user?.id || null,
    req.user?.name || 'anonyme',
    req.user?.role || '-',
    action,
    typeof details === 'string' ? details : JSON.stringify(details),
    ip,
  ).catch(() => {
    // l'audit ne doit jamais faire planter la requête
  });
}
