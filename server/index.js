import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { db, initDb } from './db.js';
import authRoutes from './routes/auth.js';
import prospectRoutes from './routes/prospects.js';
import interactionRoutes from './routes/interactions.js';
import notificationRoutes from './routes/notifications.js';
import statsRoutes from './routes/stats.js';
import userRoutes from './routes/users.js';
import publicRoutes from './routes/public.js';
import devisRoutes from './routes/devis.js';
import reportRoutes from './routes/reports.js';
import settingsRoutes from './routes/settings.js';
import reminderRoutes from './routes/reminders.js';
import templateRoutes from './routes/pipeline-templates.js';
import stepRoutes from './routes/steps.js';
import meetingRoutes from './routes/meetings.js';
import dayRoutes from './routes/day.js';
import { checkAllReminders } from './services/reminders.js';
import { runFollowUpSequences } from './services/automations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
const IS_PROD = process.env.NODE_ENV === 'production';

const app = express();

const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors(corsOrigins.length ? { origin: corsOrigins } : undefined));
app.use(express.json({ limit: '10mb' }));

async function ensureAdmin() {
  const admin = await db.get("SELECT id FROM users WHERE role = 'admin'");
  if (!admin) {
    const email = (process.env.ADMIN_EMAIL || 'koumaglomariemg@gmail.com').toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(password, 10);
    await db.run(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)',
      'Admin',
      email,
      hash,
      'admin',
    );
    console.log(
      `[OptiProspect] Compte admin créé : ${email} / ${process.env.ADMIN_PASSWORD ? 'mot de passe fourni' : 'admin123 (À CHANGER !)'}`,
    );
  }
}

await initDb();
await ensureAdmin();
checkAllReminders().catch(() => {});
runFollowUpSequences().catch(() => {});
setInterval(() => checkAllReminders().catch(() => {}), 60 * 1000);
setInterval(() => runFollowUpSequences().catch(() => {}), 60 * 1000);

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/prospects', prospectRoutes);
app.use('/api', interactionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/devis', devisRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/pipeline-templates', templateRoutes);
app.use('/api', stepRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/day', dayRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur' });
});

if (existsSync(path.join(CLIENT_DIST, 'index.html'))) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
  console.log(`[OptiProspect] Front servi depuis ${CLIENT_DIST}`);
} else {
  console.log('[OptiProspect] Front non buildé (client/dist absent) — API seule');
}

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`[OptiProspect] API démarrée sur http://localhost:${PORT} (${IS_PROD ? 'production' : 'développement'})`);
});
