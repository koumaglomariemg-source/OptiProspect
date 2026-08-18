import { Router } from 'express';
import { db } from '../db.js';
import { auth } from '../middleware/auth.js';
import { logAudit } from '../services/audit.js';
import { prospectScope } from '../services/scope.js';
import { ah } from "../middleware/asyncHandler.js";

const router = Router();
router.use(auth());

async function stageKeys() {
  try {
    const row = await db.get("SELECT value FROM settings WHERE \`key\` = 'stages'");
    const arr = JSON.parse(row?.value || '[]');
    if (Array.isArray(arr)) return arr.map((s) => s.key);
  } catch {}
  return [];
}

async function getProgress(id) {
  return await db.get(`
    SELECT ps.*, st.position, st.key AS step_key, st.name AS step_name, st.color, st.form_fields
    FROM prospect_steps ps
    JOIN pipeline_template_steps st ON st.id = ps.step_id
    WHERE ps.id = ?
  `, id);
}

async function scopedProgress(req, id) {
  const progress = await getProgress(Number(id));
  if (!progress) return null;
  const scope = prospectScope(req.user);
  const prospect = await db.get(
    `SELECT p.id FROM prospects p WHERE p.id = ? AND ${scope.sql}`,
    progress.prospect_id,
    ...scope.params,
  );
  return prospect ? progress : null;
}

async function syncProspectFromStep(progress) {
  const data = {};
  try { Object.assign(data, JSON.parse(progress.data || '{}')); } catch {}
  const sets = [];
  const params = [];
  if (data.quartier !== undefined) { sets.push('quartier = ?'); params.push(data.quartier || null); }
  if (data.numero !== undefined) { sets.push('numero = ?'); params.push(data.numero || null); }
  if (data.effectif !== undefined) { sets.push('effectif = ?'); params.push(Number(data.effectif) || null); }
  if (progress.status === 'validated') {
    if (progress.step_key === 'contrat_depose') { sets.push('contrat_depose = 1'); }
    if (progress.step_key === 'contrat_signe') { sets.push('contrat_signe = 1'); }
  }
  if (sets.length) {
    params.push(progress.prospect_id);
    await db.run(`UPDATE prospects SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, ...params);
  }
}

async function advanceStage(progress) {
  const ps = await db.get(`
    SELECT ps.id, ps.step_id FROM prospect_steps ps
    WHERE ps.prospect_id = ? AND ps.status = 'pending'
    ORDER BY ps.id ASC LIMIT 1
  `, progress.prospect_id);
  const keys = await stageKeys();
  const target = ps
    ? await db.get('SELECT `key` FROM pipeline_template_steps WHERE id = ?', ps.step_id)
    : null;
  if (target && keys.includes(target.key)) {
    await db.run("UPDATE prospects SET stage = ?, updated_at = NOW() WHERE id = ?", target.key, progress.prospect_id);
  }
}

router.get('/prospects/:id/steps', ah(async (req, res) => {
  const scope = prospectScope(req.user);
  const prospect = await db.get(
    `SELECT p.id FROM prospects p WHERE p.id = ? AND ${scope.sql}`,
    Number(req.params.id),
    ...scope.params,
  );
  if (!prospect) return res.status(404).json({ error: 'Prospect introuvable' });
  const rows = await db.all(`
    SELECT ps.id AS progress_id, ps.step_id, ps.status, ps.data, ps.validated_at, ps.updated_at,
           st.position, st.key AS step_key, st.name AS step_name, st.color, st.form_fields
    FROM prospect_steps ps
    JOIN pipeline_template_steps st ON st.id = ps.step_id
    WHERE ps.prospect_id = ?
    ORDER BY st.position ASC, st.id ASC
  `, Number(req.params.id));
  for (const r of rows) {
    try { r.data = r.data ? JSON.parse(r.data) : {}; } catch { r.data = {}; }
    try { r.form_fields = r.form_fields ? JSON.parse(r.form_fields) : []; } catch { r.form_fields = []; }
  }
  res.json(rows);
}));

router.put('/steps/:id', ah(async (req, res) => {
  if (req.user.role === 'manager') return res.status(403).json({ error: 'Un manager ne peut pas renseigner une étape' });
  const progress = await scopedProgress(req, req.params.id);
  if (!progress) return res.status(404).json({ error: 'Étape introuvable' });
  const data = req.body?.data && typeof req.body.data === 'object' ? req.body.data : {};
  await db.run("UPDATE prospect_steps SET data = ?, updated_at = NOW() WHERE id = ?", JSON.stringify(data), progress.id);
  const updated = await getProgress(progress.id);
  await syncProspectFromStep(updated);
  logAudit(req, 'step.save', `${updated.step_name}`);
  try { updated.data = JSON.parse(updated.data || '{}'); } catch { updated.data = {}; }
  res.json(updated);
}));

router.post('/steps/:id/validate', ah(async (req, res) => {
  if (req.user.role === 'manager') return res.status(403).json({ error: 'Un manager ne peut pas valider une étape' });
  const progress = await scopedProgress(req, req.params.id);
  if (!progress) return res.status(404).json({ error: 'Étape introuvable' });
  await db.run("UPDATE prospect_steps SET status = 'validated', validated_at = NOW(), updated_at = NOW() WHERE id = ?", progress.id);
  const updated = await getProgress(progress.id);
  await syncProspectFromStep(updated);
  await advanceStage(updated);
  logAudit(req, 'step.validate', `${updated.step_name}`);
  try { updated.data = JSON.parse(updated.data || '{}'); } catch { updated.data = {}; }
  res.json(updated);
}));

router.post('/steps/:id/unvalidate', ah(async (req, res) => {
  if (req.user.role === 'manager') return res.status(403).json({ error: 'Un manager ne peut pas dévalider une étape' });
  const progress = await scopedProgress(req, req.params.id);
  if (!progress) return res.status(404).json({ error: 'Étape introuvable' });
  await db.run("UPDATE prospect_steps SET status = 'pending', validated_at = NULL, updated_at = NOW() WHERE id = ?", progress.id);
  const updated = await getProgress(progress.id);
  if (updated.step_key === 'contrat_depose') {
    await db.run("UPDATE prospects SET contrat_depose = 0, updated_at = NOW() WHERE id = ?", updated.prospect_id);
  }
  if (updated.step_key === 'contrat_signe') {
    await db.run("UPDATE prospects SET contrat_signe = 0, updated_at = NOW() WHERE id = ?", updated.prospect_id);
  }
  await advanceStage(updated);
  logAudit(req, 'step.unvalidate', `${updated.step_name}`);
  try { updated.data = JSON.parse(updated.data || '{}'); } catch { updated.data = {}; }
  res.json(updated);
}));

export default router;
