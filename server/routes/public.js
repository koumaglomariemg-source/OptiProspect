import { Router } from 'express';
import { db, getDefaultTemplate, getTemplateSteps } from '../db.js';
import { computeScore } from './prospects.js';
import { ah } from "../middleware/asyncHandler.js";

const router = Router();

const INTEREST_META = {
  interesse: { label: 'Intéressé(e)', temperature: 'chaud' },
  plus_tard: { label: 'À reconsidérer plus tard', temperature: 'tiede' },
  pas_interesse: { label: 'Pas intéressé(e)', temperature: 'abandonne' },
};

async function findByToken(id, token) {
  if (!token) return null;
  return await db.get('SELECT * FROM prospects WHERE id = ? AND contact_token = ?', Number(id), String(token)) || null;
}

router.get('/prospects/:id/info', ah(async (req, res) => {
  const p = await findByToken(req.params.id, req.query.token);
  if (!p) return res.status(404).json({ error: 'Lien invalide ou expiré' });
  res.json({ name: p.name, company: p.company });
}));

router.post('/contact', ah(async (req, res) => {
  const { name, company, email, phone, message, wants_contact } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Votre nom est requis' });
  if (!email?.trim() && !phone?.trim()) {
    return res.status(400).json({ error: 'Renseignez au moins un email ou un téléphone pour être recontacté(e)' });
  }

  const nums = await db.all("SELECT numero FROM prospects WHERE numero IS NOT NULL AND numero != ''");
  let max = 0;
  for (const r of nums) {
    const m = String(r.numero).match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const numero = `N-${String(max + 1).padStart(3, '0')}`;

  let stageKeys;
  try {
    const row = await db.get("SELECT value FROM settings WHERE \`key\` = 'stages'");
    const arr = JSON.parse(row?.value || '[]');
    if (Array.isArray(arr) && arr.length) stageKeys = arr.map((s) => s.key);
  } catch {}
  stageKeys = stageKeys || ['etablissements_identifies', 'prospection', 'suivi', 'contrat_depose', 'contrat_signe'];

  const template = await getDefaultTemplate();
  const firstStep = template ? (await getTemplateSteps(template.id))[0] : null;
  const stage = firstStep && stageKeys.includes(firstStep.key) ? firstStep.key : stageKeys[0];

  const temperature = wants_contact ? 'chaud' : 'tiede';
  const note = message?.trim()
    ? `Contact reçu suite à une publicité — « ${message.trim()} »`
    : 'Contact reçu suite à une publicité';

  const info = await db.run(
    `INSERT INTO prospects (name, company, email, phone, linkedin, source, value, stage, temperature, secteur, adresse, latitude, longitude, assigned_to, next_action, next_action_date, note, template_id, numero, quartier, effectif, contrat_depose, contrat_signe, option_frais_scolaire, contact_token)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,REPLACE(UUID(), '-', ''))`,
    name.trim(), company?.trim() || null, email?.trim() || null, phone?.trim() || null, null,
    'publicite', 0, stage, temperature, null, null, null, null, null,
    'Relancer ce prospect entrant', null, note, template?.id || null, numero, null, null, 0, 0, 0
  );

  if (template) {
    for (const s of await getTemplateSteps(template.id)) {
      await db.run('INSERT IGNORE INTO prospect_steps (prospect_id, step_id, status) VALUES (?,?,?)', info.insertId, s.id, 'pending');
    }
  }

  const prospect = await db.get('SELECT * FROM prospects WHERE id = ?', info.insertId);
  const score = await computeScore(prospect);
  await db.run('UPDATE prospects SET score = ? WHERE id = ?', score, prospect.id);

  await db.run('INSERT INTO prospect_events (prospect_id, user_id, user_name, type, field, old_value, new_value) VALUES (?,?,?,?,?,?,?)', prospect.id, null, null, 'creation', null, null, null);
  await db.run('INSERT INTO interactions (prospect_id, user_id, type, content) VALUES (?,?,?,?)', prospect.id, null, 'note', note);

  const label = company?.trim() ? ` (${company.trim()})` : '';
  const title = `Nouveau prospect entrant : ${name.trim()}${label}`;
  const msgText = `${email ? `Email : ${email}. ` : ''}${phone ? `Tél : ${phone}. ` : ''}${wants_contact ? 'Souhaite être recontacté(e). ' : ''}${message?.trim() ? `Message : « ${message.trim()} »` : ''}`;
  const targets = await db.all("SELECT id FROM users WHERE role IN ('admin', 'manager') AND archived_at IS NULL");
  for (const t of targets) {
    await db.run('INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)', t.id, title, msgText, 'succes');
  }

  res.status(201).json({ ok: true, numero });
}));

router.post('/prospects/:id/respond', ah(async (req, res) => {
  const { token, interest, wants_contact, message } = req.body || {};
  const p = await findByToken(req.params.id, token);
  if (!p) return res.status(404).json({ error: 'Lien invalide ou expiré' });

  const meta = INTEREST_META[interest];
  if (!meta) return res.status(400).json({ error: 'Choix invalide' });

  const wants = wants_contact ? ' — souhaite être recontacté(e)' : '';
  const content = `Réponse formulaire : ${meta.label}${wants}${message?.trim() ? ` — « ${message.trim()} »` : ''}`;
  await db.run('INSERT INTO interactions (prospect_id, user_id, type, content) VALUES (?,?,?,?)', p.id, null, 'note', content);

  if (p.temperature !== meta.temperature) {
    await db.run('INSERT INTO prospect_events (prospect_id, user_id, user_name, type, field, old_value, new_value) VALUES (?,?,?,?,?,?,?)', p.id, null, null, 'temperature', 'temperature', p.temperature, meta.temperature);
  }

  await db.run("UPDATE prospects SET temperature = ?, updated_at = NOW() WHERE id = ?", meta.temperature, p.id);
  const updated = await db.get('SELECT * FROM prospects WHERE id = ?', p.id);
  const score = await computeScore(updated);
  await db.run('UPDATE prospects SET score = ? WHERE id = ?', score, p.id);

  const label = p.company ? ` (${p.company})` : '';
  const title = `Réponse reçue de ${p.name}${label}`;
  const targetIds = p.assigned_to
    ? [p.assigned_to]
    : (await db.all("SELECT id FROM users WHERE role = 'admin' AND archived_at IS NULL")).map((r) => r.id);
  for (const uid of targetIds) {
    await db.run('INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)', uid, title, `Réponse au formulaire : ${meta.label}.${wants}${message?.trim() ? ` Commentaire : « ${message.trim()} »` : ''}`, 'info');
  }

  res.json({ ok: true });
}));

export default router;
