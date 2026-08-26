import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Loader2,
  Save,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { api } from "../api.js";
import { STAGE_COLORS } from "../constants.js";
import { useRefresh } from "../hooks/useRefresh.js";
import Modal from "./Modal.jsx";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800";

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

const INTERACTION_TYPE_MAP = [
  { type: "rendezvous", keys: ["rdv", "rendez", "rendez-vous", "rendez vous"] },
  { type: "appel", keys: ["appel", "telephone", "téléphone", "phone"] },
  { type: "visite", keys: ["visite"] },
  { type: "email", keys: ["email", "mail", "e mail"] },
  { type: "whatsapp", keys: ["whatsapp", "whats app", "whats"] },
  { type: "linkedin", keys: ["linkedin"] },
  { type: "note", keys: ["note"] },
];

function normalizeStr(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function detectInteractionType(field) {
  const label = normalizeStr(field.label);
  const key = normalizeStr(field.key);
  for (const { type, keys } of INTERACTION_TYPE_MAP) {
    const has = keys.some(
      (k) =>
        label.includes(normalizeStr(k)) || key.includes(normalizeStr(k)),
    );
    if (has) return type;
  }
  return null;
}

function Field({ field, value, onChange, readOnly = false }) {
  const common = {
    className: readOnly
      ? `${inputCls} cursor-not-allowed opacity-70`
      : inputCls,
    value: value ?? "",
    onChange: (e) => onChange(field.key, e.target.value),
    required: !!field.required,
  };
  if (field.type === "textarea") {
    return <textarea rows={3} {...common} readOnly={readOnly} />;
  }
  if (field.type === "number") {
    return <input type="number" {...common} readOnly={readOnly} />;
  }
  if (field.type === "date") {
    return (
      <input
        type="date"
        value={value || todayISO()}
        readOnly
        disabled
        title="Date figée (date de validation de cette étape)"
        className={`${inputCls} cursor-not-allowed opacity-70`}
      />
    );
  }
  if (field.type === "select" && Array.isArray(field.options)) {
    return (
      <select {...common} disabled={readOnly}>
        <option value="">—</option>
        {field.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      type="text"
      {...common}
      readOnly={readOnly}
      placeholder={readOnly ? "" : field.placeholder || ""}
    />
  );
}

export default function StepFormModal({ prospect, onClose, onChanged }) {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(null);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [interactions, setInteractions] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const autoShownRef = useRef(false);
  const dismissedRef = useRef(false);

  const load = async () => {
    try {
      const rows = await api.steps(prospect.id);
      // si toutes les étapes déjà validées -> afficher direct la page succès (sauf si l'utilisateur a demandé à revisiter)
      const allValidated = rows.length > 0 && rows.every((s) => s.status === "validated");
      if (allValidated && !autoShownRef.current && !dismissedRef.current) {
        setShowSuccess(true);
      }
      if (!allValidated) {
        // réinitialiser le flag si on n'est plus en état terminé
        autoShownRef.current = false;
      } else if (!autoShownRef.current) {
        autoShownRef.current = true;
      }
      setSteps((prevSteps) => {
        const firstPending = rows.findIndex((s) => s.status !== "validated");
        let newActiveIdx = firstPending === -1 ? rows.length - 1 : firstPending;
        if (prevSteps.length === rows.length) {
          const sameStep = rows[activeIdx];
          if (sameStep && sameStep.status !== "validated") {
            newActiveIdx = activeIdx;
          }
        }
        setActiveIdx((curr) => {
          if (prevSteps.length === rows.length) {
            const sameStep = rows[curr];
            if (sameStep && sameStep.status !== "validated") {
              return curr;
            }
          }
          return newActiveIdx;
        });
        return rows;
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    autoShownRef.current = false;
    dismissedRef.current = false;
    setShowSuccess(false);
    setLoading(true);
    load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [prospect.id]);

  useEffect(() => {
    api
      .interactions(prospect.id)
      .then(setInteractions)
      .catch(() => {});
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [prospect.id]);
  useRefresh(() => load(), 30000);

  const active = useMemo(
    () => (activeIdx != null ? steps[activeIdx] : null),
    [steps, activeIdx],
  );
  const fields = useMemo(() => active?.form_fields || [], [active]);
  const doneTypes = useMemo(() => {
    const m = {};
    for (const i of interactions) m[i.type] = true;
    return m;
  }, [interactions]);

  useEffect(() => {
    if (active) {
      const data = { ...(active.data || {}) };
      const prevVals = {};
      const priorSteps = [
        ...steps.filter((s) => s.status === "validated"),
        ...steps.filter((s) => s.status !== "validated"),
      ];
      for (const s of priorSteps) {
        if (s.progress_id === active.progress_id) continue;
        const sdata = s.data || {};
        for (const f of s.form_fields || []) {
          const v = sdata[f.key];
          if (v !== undefined && v !== null && v !== "") {
            if (!(f.key in prevVals)) prevVals[f.key] = v;
            const norm = String(f.label || "").trim().toLowerCase();
            if (norm && !(norm in prevVals)) prevVals[norm] = v;
          }
        }
      }
      for (const key of Object.keys(prospect)) {
        const v = prospect[key];
        if (v !== undefined && v !== null && v !== "") {
          if (!(key in prevVals)) prevVals[key] = v;
          const norm = String(key).trim().toLowerCase();
          if (norm && !(norm in prevVals)) prevVals[norm] = v;
        }
      }
      for (const f of active.form_fields || []) {
        if (f.type === "date") {
          if (!data[f.key]) data[f.key] = todayISO();
          continue;
        }
        if (f.key === "numero" && prospect.numero) {
          data[f.key] = prospect.numero;
          continue;
        }
        if (f.key === "effectif" && prospect.effectif) {
          data[f.key] = prospect.effectif;
          continue;
        }
        if (data[f.key] !== undefined && data[f.key] !== "") continue;
        const norm = String(f.label || "").trim().toLowerCase();
        const v =
          data[f.key] ?? prevVals[f.key] ?? (norm ? prevVals[norm] : undefined);
        if (v !== undefined && v !== null && v !== "") data[f.key] = v;
      }
      setDraft(data);
    }
  }, [active?.progress_id]);

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const requiredMissing = fields
    .filter((f) => f.required && !(draft[f.key] ?? ""))
    .map((f) => f.label);

  const save = async (validate = false) => {
    if (!active?.progress_id) {
      setError("Étape invalide — rechargez la page");
      return;
    }
    setError("");
    if (validate && requiredMissing.length) {
      setError(`Champs obligatoires manquants : ${requiredMissing.join(", ")}`);
      return;
    }
    setBusy(true);
    let isLast = false;
    try {
      if (validate) {
        const final = { ...draft };
        for (const f of fields) if (f.type === "date") final[f.key] = todayISO();
        await api.saveStep(active.progress_id, final);
        await api.validateStep(active.progress_id);
        const lastStep = steps[steps.length - 1];
        if (lastStep && lastStep.progress_id === active.progress_id) {
          isLast = true;
          setShowSuccess(true);
        } else {
          setSaved("Étape validée, vous passez à la suivante");
        }
      } else {
        await api.saveStep(active.progress_id, draft);
        setSaved("Brouillon enregistré");
      }
      await load();
      onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      if (!isLast) setTimeout(() => setSaved(""), 3000);
    }
  };

  const unvalidate = async () => {
    if (!active?.progress_id || active.status !== "validated") return;
    setError("");
    setBusy(true);
    try {
      await api.unvalidateStep(active.progress_id);
      await load();
      onChanged?.();
      setSaved("Étape dévalidée, vous pouvez la modifier");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      setTimeout(() => setSaved(""), 3000);
    }
  };

  if (loading) {
    return (
      <Modal title={`Pipeline — ${prospect.name}`} onClose={onClose} fullScreenMobile>
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
          <Loader2 size={16} className="animate-spin" /> Chargement des étapes…
        </div>
      </Modal>
    );
  }

  if (showSuccess) {
    return (
      <Modal title={`Pipeline — ${prospect.name}`} onClose={onClose} fullScreenMobile>
        <div className="py-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
            <CheckCircle2 size={36} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="mt-4 text-xl font-bold">Pipeline terminé !</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Félicitations, toutes les étapes pour <span className="font-semibold text-slate-700 dark:text-slate-200">{prospect.name}</span> ont été validées.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => {
                dismissedRef.current = true;
                setShowSuccess(false);
              }}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              Revisiter les étapes
            </button>
            <button
              onClick={() => {
                dismissedRef.current = true;
                setShowSuccess(false);
                // rester sur la dernière étape pour permettre la modification
                setTimeout(() => setActiveIdx(steps.length - 1), 0);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <RotateCcw size={15} /> Modifier la dernière étape
            </button>
          </div>
          <button
            onClick={onClose}
            className="mt-4 text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            Fermer
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={`Pipeline — ${prospect.name}`}
      onClose={onClose}
      width="max-w-3xl"
      fullScreenMobile
    >
      {steps.length === 0 && (
        <div className="py-10 text-center text-sm text-slate-400">
          Aucune étape définie pour ce prospect
        </div>
      )}

      {steps.length > 0 && (
        <>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {steps.map((s, i) => {
              const done = s.status === "validated";
              const current = i === activeIdx && !done;
              const color = STAGE_COLORS[s.color] || STAGE_COLORS.indigo;
              return (
                <button
                  key={s.progress_id}
                  onClick={() => {
                    setActiveIdx(i);
                    setSaved("");
                  }}
                  className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    current
                      ? "bg-indigo-600 text-white shadow-sm"
                      : done
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                  }`}
                  title={s.step_name}
                >
                  {done ? (
                    <Check size={13} />
                  ) : (
                    <CircleDashed
                      size={13}
                      className={current ? "" : color.accent}
                    />
                  )}
                  <span className="truncate">{s.step_name}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width: `${(steps.filter((s) => s.status === "validated").length / steps.length) * 100}%`,
              }}
            />
          </div>

          {active && (
            <div className="mt-5 space-y-4">
              {saved && (
                <div className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  {saved}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${(STAGE_COLORS[active.color] || STAGE_COLORS.indigo).dot}`}
                />
                <h3 className="text-base font-bold">{active.step_name}</h3>
                {active.status === "validated" && (
                  <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck size={12} /> Validée
                  </span>
                )}
              </div>

              {fields.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {fields.map((f) => {
                    const itype = detectInteractionType(f);
                    const done = itype ? !!doneTypes[itype] : false;
                    return (
                      <div
                        key={f.key}
                        className={f.type === "textarea" ? "sm:col-span-2" : ""}
                      >
                        <label className="mb-1 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500">
                          {f.label}{" "}
                          {f.required && <span className="text-rose-500">*</span>}
                          {done && (
                            <span
                              title={`Une interaction de type ${itype} existe déjà sur ce prospect`}
                              className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                            >
                              Déjà fait
                            </span>
                          )}
                        </label>
                        <Field
                          field={f}
                          value={draft[f.key]}
                          onChange={set}
                          readOnly={f.key === "numero" && !!prospect.numero}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  Aucun champ à renseigner pour cette étape.
                </p>
              )}

              {active.status === "validated" && (
                <p className="text-xs text-slate-400">
                  Validée le {active.validated_at || ""}
                </p>
              )}

              {error && (
                <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
                  disabled={activeIdx === 0}
                  className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
                >
                  <ChevronLeft size={15} /> Précédent
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveIdx((i) => Math.min(steps.length - 1, i + 1))
                  }
                  disabled={activeIdx === steps.length - 1}
                  className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
                >
                  Suivant <ChevronRight size={15} />
                </button>
                <div className="ml-auto flex items-center gap-2">
                  {active.status === "validated" && (
                    <button
                      type="button"
                      onClick={unvalidate}
                      disabled={busy}
                      className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                    >
                      <RotateCcw size={15} /> Modifier (dévalider)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => save(false)}
                    disabled={busy}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 dark:border-slate-700"
                  >
                    <Save size={15} /> Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => save(true)}
                    disabled={busy || active.status === "validated"}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check size={15} /> Valider l'étape
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
