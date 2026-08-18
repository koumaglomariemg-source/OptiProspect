import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Crown,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../api.js";
import { useRefresh } from "../hooks/useRefresh.js";
import { FIELD_TYPE_LABEL, STAGE_COLORS } from "../constants.js";
import Modal from "../components/Modal.jsx";

const COLOR_KEYS = Object.keys(STAGE_COLORS);
const FIELD_TYPES = ["text", "textarea", "number", "date", "select"];

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800";

function TemplateForm({ template, onClose, onSaved }) {
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [isDefault, setIsDefault] = useState(!!template?.is_default);
  const [steps, setSteps] = useState(() => {
    if (template?.steps?.length)
      return template.steps.map((s) => ({
        ...s,
        form_fields: [...s.form_fields],
      }));
    return [{ key: "etape_1", name: "Étape 1", color: "sky", form_fields: [] }];
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const setStep = (i, patch) =>
    setSteps((arr) =>
      arr.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    );
  const moveStep = (i, dir) => {
    setSteps((arr) => {
      const next = [...arr];
      const j = i + dir;
      if (j < 0 || j >= next.length) return arr;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const addStep = () =>
    setSteps((arr) => [
      ...arr,
      {
        key: `etape_${arr.length + 1}`,
        name: `Étape ${arr.length + 1}`,
        color: "indigo",
        form_fields: [],
      },
    ]);
  const removeStep = (i) =>
    setSteps((arr) => arr.filter((_, idx) => idx !== i));

  const setField = (si, fi, patch) =>
    setStep(si, {
      form_fields: steps[si].form_fields.map((f, idx) =>
        idx === fi ? { ...f, ...patch } : f,
      ),
    });
  const addField = (si) =>
    setStep(si, {
      form_fields: [
        ...steps[si].form_fields,
        {
          key: `champ_${steps[si].form_fields.length + 1}`,
          label: "",
          type: "text",
          required: false,
        },
      ],
    });
  const removeField = (si, fi) =>
    setStep(si, {
      form_fields: steps[si].form_fields.filter((_, idx) => idx !== fi),
    });
  const moveField = (si, fi, dir) => {
    setStep(si, {
      form_fields: (() => {
        const arr = [...steps[si].form_fields];
        const j = fi + dir;
        if (j < 0 || j >= arr.length) return arr;
        [arr[fi], arr[j]] = [arr[j], arr[fi]];
        return arr;
      })(),
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError("Le nom du modèle est requis");
    const payload = {
      name: name.trim(),
      description,
      is_default: isDefault,
      steps: steps.map((s) => ({
        ...s,
        form_fields: s.form_fields.filter((f) => f.label || f.key),
      })),
    };
    setBusy(true);
    setError("");
    try {
      const saved = template
        ? await api.updatePipelineTemplate(template.id, payload)
        : await api.createPipelineTemplate(payload);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={template ? "Modifier le modèle" : "Nouveau modèle de pipeline"}
      onClose={onClose}
      width="max-w-4xl"
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Nom *
            </label>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pipeline par défaut"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 accent-indigo-500"
              />
              Modèle par défaut (pilote le tableau Kanban)
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Description
            </label>
            <input
              className={inputCls}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objectif de ce pipeline"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Étapes du tunnel</h3>
            <button
              type="button"
              onClick={addStep}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-600"
            >
              <Plus size={13} /> Ajouter une étape
            </button>
          </div>

          {steps.map((s, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveStep(i, -1)}
                    disabled={i === 0}
                    className="text-slate-400 disabled:opacity-30"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(i, 1)}
                    disabled={i === steps.length - 1}
                    className="text-slate-400 disabled:opacity-30"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <div className="flex-1 basis-40">
                  <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-400">
                    Clé
                  </label>
                  <input
                    className={inputCls}
                    value={s.key}
                    onChange={(e) => setStep(i, { key: e.target.value })}
                    placeholder="etape_1"
                  />
                </div>
                <div className="flex-1 basis-40">
                  <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-400">
                    Nom
                  </label>
                  <input
                    className={inputCls}
                    value={s.name}
                    onChange={(e) => setStep(i, { name: e.target.value })}
                    placeholder="Étape 1"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-400">
                    Couleur
                  </label>
                  <select
                    className={inputCls}
                    value={s.color}
                    onChange={(e) => setStep(i, { color: e.target.value })}
                  >
                    {COLOR_KEYS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  className="mt-4 rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Sous-étapes / champs du formulaire
                  </span>
                  <button
                    type="button"
                    onClick={() => addField(i)}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-600"
                  >
                    <Plus size={12} /> Champ
                  </button>
                </div>
                {s.form_fields.length === 0 && (
                  <p className="text-xs text-slate-400">Aucun champ.</p>
                )}
                {s.form_fields.map((f, fi) => (
                  <div
                    key={fi}
                    className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60"
                  >
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => moveField(i, fi, -1)}
                        disabled={fi === 0}
                        className="text-slate-400 disabled:opacity-30"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveField(i, fi, 1)}
                        disabled={fi === s.form_fields.length - 1}
                        className="text-slate-400 disabled:opacity-30"
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                    <input
                      className={inputCls + " !w-24"}
                      value={f.key}
                      onChange={(e) => setField(i, fi, { key: e.target.value })}
                      placeholder="clé"
                    />
                    <input
                      className={inputCls + " flex-1 basis-32"}
                      value={f.label}
                      onChange={(e) =>
                        setField(i, fi, { label: e.target.value })
                      }
                      placeholder="Libellé"
                    />
                    <select
                      className={inputCls + " !w-32"}
                      value={f.type}
                      onChange={(e) =>
                        setField(i, fi, { type: e.target.value })
                      }
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {FIELD_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                    {f.type === "select" && (
                      <input
                        className={inputCls + " flex-1 basis-32"}
                        value={f.options?.join(", ") || ""}
                        onChange={(e) =>
                          setField(i, fi, {
                            options: e.target.value
                              .split(",")
                              .map((o) => o.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="options, séparées par virgule"
                      />
                    )}
                    <label className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                      <input
                        type="checkbox"
                        checked={!!f.required}
                        onChange={(e) =>
                          setField(i, fi, { required: e.target.checked })
                        }
                        className="h-3.5 w-3.5 accent-indigo-500"
                      />
                      Requis
                    </label>
                    <button
                      type="button"
                      onClick={() => removeField(i, fi)}
                      className="rounded p-1 text-slate-300 hover:text-rose-500"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? "Enregistrement…" : "Enregistrer le modèle"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function PipelineTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setTemplates(await api.pipelineTemplates());
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);
  useRefresh(() => load(), 30000);

  const setDefault = async (t) => {
    await api.setDefaultPipelineTemplate(t.id);
    load();
  };

  const remove = async (t) => {
    if (!confirm(`Supprimer le modèle « ${t.name} » ?`)) return;
    await api.deletePipelineTemplate(t.id);
    load();
  };

  const onSaved = () => {
    setFormOpen(false);
    setEditing(null);
    load();
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Modèles de pipeline</h1>
            <p className="text-sm text-slate-400">
              Définissez les tunnels d'étapes ; le modèle par défaut pilote le
              tableau Kanban
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus size={16} /> Nouveau modèle
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">
            {error}
          </div>
        )}

        {loading && (
          <div className="py-10 text-center text-sm text-slate-400">
            Chargement…
          </div>
        )}

        {!loading && templates.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            Aucun modèle de pipeline. Créez-en un pour structurer votre
            prospection.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className={`rounded-2xl border bg-white p-5 dark:bg-slate-900 ${t.is_default ? "border-amber-300 dark:border-amber-500/40" : "border-slate-200 dark:border-slate-800"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {t.is_default && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        <Star size={11} /> Par défaut
                      </span>
                    )}
                    <span className="truncate font-bold">{t.name}</span>
                  </div>
                  {t.description && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {t.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => {
                      setEditing(t);
                      setFormOpen(true);
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-500 dark:hover:bg-slate-800"
                    title="Modifier"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDefault(t)}
                    disabled={!!t.is_default}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-500 disabled:opacity-30 dark:hover:bg-amber-500/10"
                    title="Définir par défaut"
                  >
                    <Crown size={15} />
                  </button>
                  <button
                    onClick={() => remove(t)}
                    disabled={!!t.is_default}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30 dark:hover:bg-rose-500/10"
                    title="Supprimer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {t.steps.map((s, i) => (
                  <div
                    key={s.id || i}
                    className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60"
                  >
                    <span className="w-5 text-center text-[11px] font-bold text-slate-400">
                      {i + 1}
                    </span>
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${(STAGE_COLORS[s.color] || STAGE_COLORS.indigo).dot}`}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {s.name}
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700">
                      {s.form_fields.length} champ(s)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {formOpen && (
        <TemplateForm
          template={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
