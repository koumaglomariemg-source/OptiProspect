import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { auth, JWT_SECRET } from '../middleware/auth.js';
import { ah } from "../middleware/asyncHandler.js";
import { logAudit } from '../services/audit.js';

const router = Router();

function sign(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function safeUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
    avatar: row.avatar,
    first_name: row.first_name,
    last_name: row.last_name,
  };
}

router.post('/register', ah(async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nom, email et mot de passe sont requis' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
    }
    const exists = await db.get('SELECT id FROM users WHERE email = ?', String(email).toLowerCase());
    if (exists) return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    const hash = await bcrypt.hash(String(password), 10);
    const info = await db.run('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)',
      String(name), String(email).toLowerCase(), hash, 'commercial');
    const user = await db.get('SELECT * FROM users WHERE id = ?', info.insertId);
    res.status(201).json({ user: safeUser(user), token: sign(user) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}));

router.post('/login', ah(async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await db.get('SELECT * FROM users WHERE email = ? AND archived_at IS NULL', String(email || '').toLowerCase());
    if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    const ok = await bcrypt.compare(String(password || ''), user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    logAudit(req, 'auth.login', `${user.name}`);
    res.json({ user: safeUser(user), token: sign(user) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}));

router.get('/me', auth(), ah(async (req, res) => {
  const user = await db.get('SELECT * FROM users WHERE id = ? AND archived_at IS NULL', req.user.id);
  if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' });
  res.json({ user: safeUser(user) });
}));

export default router;
