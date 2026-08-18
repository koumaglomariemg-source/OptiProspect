import { Router } from 'express';
import { db, getDefaultTemplate, getTemplateSteps, syncStagesFromTemplate } from '../db.js';
import { auth, adminOnly } from '../middleware/auth.js';
import { logAudit } from '../services/audit.js';
import { ah } from '../middleware/asyncHandler.js';

const router = Router();
router.use(auth());

async function fullTemplate(id) {
  const t = await db.get('SELECT * FROM pipeline_templates WHERE id = ?', Number(id));
  if (!t) return null;
  t.steps = (await getTemplateSteps(t.id)).map((s) => {
    let fields = [];
    try { fields = s.form_fields ? JSON.parse(s.form_fields) : []; } catch {}
    return { ...s, form_fields: fields };
  });
  return t;
}

function parseSteps(steps) {
  if (!Array.isArray(steps)) return [];
  return steps.map((s, i) => ({
    key: String(s.key || `etape_${i + 1}`).toLowerCase().replace(/\s+/g, '_'),
    name: String(s.name || `Étape ${i + 1}`),
    color: s.color || 'indigo',
    form_fields: Array.isArray(s.form_fields) ? s.form_fields : [],
  }));
}

router.get('/', ah(async (req, res) => {
  const templates = await db.all('SELECT * FROM pipeline_templates ORDER BY is_default DESC, created_at ASC');
  res.json(await Promise.all(templates.map((t) => fullTemplate(t.id))));
}));

router.get('/:id', ah(async (req, res) => {
  const t = await fullTemplate(req.params.id);
  if (!t) return res.status(404).json({ error: 'Modèle introuvable' });
  res.json(t);
}));

router.post('/', adminOnly, ah(async (req, res) => {
  try {
    const { name, description, is_default, steps } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: 'Le nom du modèle est requis' });
    const info = await db.run('INSERT INTO pipeline_templates (name, description, is_default) VALUES (?,?,?)',
      String(name).trim(), description || null, is_default ? 1 : 0);
    if (is_default) await db.run("UPDATE pipeline_templates SET is_default = CASE WHEN id = ? THEN 1 ELSE 0 END", info.insertId);
    const insertStep = 'INSERT INTO pipeline_template_steps (template_id, position, \`key\`, name, color, form_fields) VALUES (?,?,?,?,?,?)';
    for (const [i, s] of parseSteps(steps).entries()) {
      await db.run(insertStep, info.insertId, i, s.key, s.name, s.color, JSON.stringify(s.form_fields));
    }
    if (is_default) await syncStagesFromTemplate();
    logAudit(req, 'template.create', `${name}`);
    res.status(201).json(await fullTemplate(info.insertId));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

router.put('/:id', adminOnly, ah(async (req, res) => {
  const t = await db.get('SELECT * FROM pipeline_templates WHERE id = ?', Number(req.params.id));
  if (!t) return res.status(404).json({ error: 'Modèle introuvable' });
  const { name, description, is_default, steps } = req.body || {};
  if (req.body.name !== undefined && !String(req.body.name).trim()) return res.status(400).json({ error: 'Le nom du modèle est requis' });

  const updates = [];
  const params = [];
  if (req.body.name !== undefined) { updates.push('name = ?'); params.push(String(req.body.name).trim()); }
  if (req.body.description !== undefined) { updates.push('description = ?'); params.push(req.body.description || null); }
  if (is_default) {
    await db.run('UPDATE pipeline_templates SET is_default = CASE WHEN id = ? THEN 1 ELSE 0 END', t.id);
  }
  if (updates.length) {
    params.push(t.id);
    await db.run(`UPDATE pipeline_templates SET ${updates.join(', ')} WHERE id = ?`, ...params);
  }

  if (steps !== undefined) {
    await db.run('DELETE FROM pipeline_template_steps WHERE template_id = ?', t.id);
    const insertStep = 'INSERT INTO pipeline_template_steps (template_id, position, \`key\`, name, color, form_fields) VALUES (?,?,?,?,?,?)';
    for (const [i, s] of parseSteps(steps).entries()) {
      await db.run(insertStep, t.id, i, s.key, s.name, s.color, JSON.stringify(s.form_fields));
    }
  }

  const updated = await db.get('SELECT is_default FROM pipeline_templates WHERE id = ?', t.id);
  if (updated.is_default) await syncStagesFromTemplate();
  logAudit(req, 'template.update', `${t.name}`);
  res.json(await fullTemplate(t.id));
}));

router.post('/:id/default', adminOnly, ah(async (req, res) => {
  const t = await db.get('SELECT id FROM pipeline_templates WHERE id = ?', Number(req.params.id));
  if (!t) return res.status(404).json({ error: 'Modèle introuvable' });
  await db.run('UPDATE pipeline_templates SET is_default = CASE WHEN id = ? THEN 1 ELSE 0 END', t.id);
  await syncStagesFromTemplate();
  logAudit(req, 'template.default', `${t.id}`);
  res.json({ ok: true });
}));

router.delete('/:id', adminOnly, ah(async (req, res) => {
  const t = await db.get('SELECT * FROM pipeline_templates WHERE id = ?', Number(req.params.id));
  if (!t) return res.status(404).json({ error: 'Modèle introuvable' });
  if (t.is_default) return res.status(400).json({ error: 'Impossible de supprimer le modèle par défaut' });
  const inUse = await db.get('SELECT COUNT(*) AS n FROM prospects WHERE template_id = ?', t.id);
  if (inUse.n > 0) return res.status(400).json({ error: `Ce modèle est utilisé par ${inUse.n} prospect(s). Réaffectez-les avant suppression.` });
  await db.run('DELETE FROM pipeline_templates WHERE id = ?', t.id);
  logAudit(req, 'template.delete', `${t.name}`);
  res.json({ ok: true });
}));

export default router;
