import { useEffect, useState } from 'react';
import { Download, GripVertical, History, Plus, Save, Trash2, X } from 'lucide-react';
import { api } from '../api.js';
import { formatDate, STAGE_COLORS } from '../constants.js';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800';

const STRING_KEYS = ['products', 'zones', 'refusal_reasons'];

const AUDIT_BADGE = {
  'auth.login': 'bg-sky-500/15 text-sky-600 dark:text-sky-300',
  'user.create': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  'user.update': 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  'user.update.self': 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  'user.delete': 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
  'user.target': 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
  'prospect.create': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  'prospect.update': 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  'prospect.archive': 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
  'devis.create': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  'devis.update': 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  'devis.submit': 'bg-sky-500/15 text-sky-600 dark:text-sky-300',
  'devis.validate': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  'devis.refuse': 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
  'devis.delete': 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
  'meeting.create': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  'meeting.update': 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  'meeting.delete': 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
  'report.submit': 'bg-sky-500/15 text-sky-600 dark:text-sky-300',
  'report.approve': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  'report.reject': 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
  'step.save': 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300',
  'step.validate': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  'step.unvalidate': 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
  'template.create': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  'template.update': 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  'template.delete': 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
  'template.default': 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
  'settings.update': 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
  'backup.export': 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
};

const AUDIT_LABELS = {
  'auth.login': 'Connexion',
  'user.create': 'Création d’utilisateur',
  'user.update': 'Modification d’utilisateur',
  'user.update.self': 'Modification de son profil',
  'user.delete': 'Suppression d’utilisateur',
  'user.target': 'Objectif défini',
  'prospect.create': 'Création de prospect',
  'prospect.update': 'Modification de prospect',
  'prospect.archive': 'Archivage de prospect',
  'devis.create': 'Création de devis',
  'devis.update': 'Modification de devis',
  'devis.submit': 'Soumission de devis',
  'devis.validate': 'Validation de devis',
  'devis.refuse': 'Refus de devis',
  'devis.delete': 'Suppression de devis',
  'meeting.create': 'Création de réunion',
  'meeting.update': 'Modification de réunion',
  'meeting.delete': 'Suppression de réunion',
  'report.submit': 'Soumission de rapport',
  'report.approve': 'Approbation de rapport',
  'report.reject': 'Rejet de rapport',
  'step.save': 'Enregistrement d’étape',
  'step.validate': 'Validation d’étape',
  'step.unvalidate': 'Annulation d’étape',
  'template.create': 'Création de modèle',
  'template.update': 'Modification de modèle',
  'template.delete': 'Suppression de modèle',
  'template.default': 'Modèle par défaut',
  'settings.update': 'Modification de paramètre',
  'backup.export': 'Export de sauvegarde',
};

function auditMeta(action) {
  if (action.startsWith('settings.update.'))
    return { label: 'Modification de paramètre', cls: AUDIT_BADGE['settings.update'] };
  return {
    label: AUDIT_LABELS[action] || action,
    cls: AUDIT_BADGE[action] || 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
  };
}

export default function ReferentielsPage() {
  const [stages, setStages] = useState([]);
  const [stringLists, setStringLists] = useState({ products: [], zones: [], refusal_reasons: [] });
  const [newItem, setNewItem] = useState({ products: '', zones: '', refusal_reasons: '' });
  const [audit, setAudit] = useState([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    api.settings().then((s) => {
      setStages(Array.isArray(s.stages) ? s.stages : []);
      setStringLists({
        products: Array.isArray(s.products) ? s.products : [],
        zones: Array.isArray(s.zones) ? s.zones : [],
        refusal_reasons: Array.isArray(s.refusal_reasons) ? s.refusal_reasons : [],
      });
    }).catch((err) => setError(err.message));
    api.auditLog().then(setAudit).catch(() => {});
  };
  useEffect(load, []);

  const flash = () => {
    setSaved('Modifications enregistrées');
    setTimeout(() => setSaved(''), 2500);
  };

  const save = async (key, value) => {
    setBusy(true);
    setError('');
    try {
      await api.updateSetting(key, value);
      flash();
      if (key === 'stages') load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveStages = () => {
    const cleaned = stages.map((s, i) => ({ ...s, key: (s.key || `etape_${i + 1}`).toLowerCase().replace(/\s+/g, '_') }));
    setStages(cleaned);
    save('stages', cleaned);
  };

  const updateStage = (i, patch) => {
    setStages((arr) => arr.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const addToList = async (key) => {
    const v = newItem[key].trim();
    if (!v) return;
    const updated = [...stringLists[key], v];
    setStringLists((l) => ({ ...l, [key]: updated }));
    setNewItem((n) => ({ ...n, [key]: '' }));
    try {
      await api.updateSetting(key, updated);
      flash();
    } catch (err) {
      setStringLists((l) => ({ ...l, [key]: stringLists[key] }));
      setError(err.message);
    }
  };

  const exportBackup = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await api.backup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `optiprospect-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const stringKeyLabel = {
    products: 'Produits / services',
    zones: 'Zones / secteurs géographiques',
    refusal_reasons: 'Motifs de refus',
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Référentiels</h1>
            <p className="text-sm text-slate-400">Personnalisez le tunnel de vente et les listes métier</p>
          </div>
          <button
            onClick={exportBackup}
            disabled={busy}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <Download size={15} /> Exporter la sauvegarde
          </button>
        </div>

        {error && <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">{error}</div>}
        {saved && <div className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-600 dark:bg-emerald-500/10">{saved}</div>}

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Tunnel de vente</h2>
              <p className="text-xs text-slate-400">Étapes affichées dans le Kanban. Les clés doivent rester uniques.</p>
            </div>
            <button onClick={saveStages} disabled={busy} className="flex items-center gap-1.5 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-60">
              <Save size={14} /> Enregistrer
            </button>
          </div>
          <div className="space-y-2">
            {stages.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <GripVertical size={16} className="shrink-0 text-slate-300" />
                <input
                  value={s.label}
                  onChange={(e) => updateStage(i, { label: e.target.value })}
                  className={`w-40 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800`}
                  placeholder="Libellé"
                />
                <input
                  value={s.key}
                  onChange={(e) => updateStage(i, { key: e.target.value })}
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-500 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800"
                  placeholder="clé_technique"
                />
                <select
                  value={s.color}
                  onChange={(e) => updateStage(i, { color: e.target.value })}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
                >
                  {Object.keys(STAGE_COLORS).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  onClick={() => setStages((arr) => arr.filter((_, idx) => idx !== i))}
                  className="rounded-lg p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setStages((arr) => [...arr, { key: `etape_${arr.length + 1}`, label: 'Nouvelle étape', color: 'indigo' }])}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 py-2.5 text-sm font-semibold text-slate-400 transition hover:border-indigo-300 hover:text-indigo-500 dark:border-slate-700"
          >
            <Plus size={15} /> Ajouter une étape
          </button>
        </section>

        {STRING_KEYS.map((key) => (
          <section key={key} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{stringKeyLabel[key]}</h2>
              <button onClick={() => save(key, stringLists[key])} disabled={busy} className="flex items-center gap-1.5 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-60">
                <Save size={14} /> Enregistrer
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {stringLists[key].map((item, i) => (
                <span key={i} className="group flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-sm dark:bg-slate-800">
                  {item}
                  <button
                    onClick={() => {
                      const updated = stringLists[key].filter((_, idx) => idx !== i);
                      setStringLists((l) => ({ ...l, [key]: updated }));
                      api
                        .updateSetting(key, updated)
                        .then(flash)
                        .catch((err) => {
                          setStringLists((l) => ({ ...l, [key]: stringLists[key] }));
                          setError(err.message);
                        });
                    }}
                    className="rounded-full p-0.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/20"
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
              {stringLists[key].length === 0 && <span className="text-sm text-slate-400">Aucun élément</span>}
            </div>
            <div className="flex gap-2">
              <input
                value={newItem[key]}
                onChange={(e) => setNewItem((n) => ({ ...n, [key]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addToList(key); } }}
                className={inputCls}
                placeholder={`Ajouter ${stringKeyLabel[key].toLowerCase()}…`}
              />
              <button onClick={() => addToList(key)} className="rounded-xl bg-slate-100 px-3 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800">
                <Plus size={15} />
              </button>
            </div>
          </section>
        ))}

        <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 p-5 dark:border-slate-800">
            <History size={16} className="text-indigo-500" />
            <h2 className="font-semibold">Journal d'audit</h2>
            <span className="ml-auto text-xs text-slate-400">100 dernières actions</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {audit.length === 0 && <div className="p-6 text-center text-sm text-slate-400">Aucune action enregistrée</div>}
            {audit.map((a) => {
              const meta = auditMeta(a.action);
              return (
                <div key={a.id} className="flex items-center justify-between gap-3 border-b border-slate-50 px-5 py-2.5 text-sm last:border-0 dark:border-slate-800/50">
                  <div className="min-w-0">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.cls}`}>{meta.label}</span>
                    {a.details && <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{a.details}</span>}
                  </div>
                  <div className="shrink-0 text-xs text-slate-400">
                    {a.user_name || a.user_id} · {formatDate(a.created_at)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
