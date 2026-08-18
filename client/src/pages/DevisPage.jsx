import { useEffect, useMemo, useState } from "react";
import { Check, FileSignature, Plus, Search, ThumbsDown } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useRefresh } from "../hooks/useRefresh.js";
import { DEVIS_STATUS, formatDate, PERIOD_LABEL } from "../constants.js";
import DevisFormModal from "../components/DevisFormModal.jsx";
import Modal from "../components/Modal.jsx";

export default function DevisPage() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";
  const canCreate = user?.role === "commercial";
  const [devis, setDevis] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [refusalReasons, setRefusalReasons] = useState([]);

  const load = () => {
    setError("");
    api
      .devis(filter ? { statut: filter } : {})
      .then(setDevis)
      .catch((err) => setError(err.message));
  };
  useEffect(load, [filter]);
  useRefresh(() => load(), 30000);

  useEffect(() => {
    api
      .settings()
      .then((s) => {
        if (Array.isArray(s.refusal_reasons))
          setRefusalReasons(s.refusal_reasons);
      })
      .catch(() => {});
  }, []);

  const openPicker = async () => {
    try {
      const rows = await api.prospects();
      setProspects(rows);
      setPickerOpen(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const review = async (d, decision) => {
    let comment = "";
    if (decision === "refuse") {
      const reason = prompt(
        "Motif de refus :\n" + refusalReasons.join("\n"),
        refusalReasons[0] || "",
      );
      if (reason === null) return;
      comment = reason;
    }
    if (decision === "refuse" && !comment.trim()) return;
    try {
      await api[decision === "valide" ? "validateDevis" : "refuseDevis"](
        d.id,
        comment,
      );
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return devis;
    const q = search.trim().toLowerCase();
    return devis.filter((d) =>
      `${d.reference} ${d.titre} ${d.prospect_name || ""} ${d.prospect_company || ""} ${d.created_by_name || ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [devis, search]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Devis</h1>
            <p className="text-sm text-slate-400">
              {isManager
                ? "Validez ou refusez les devis soumis"
                : "Créez et suivez vos propositions"}
            </p>
          </div>
          {canCreate && (
            <button
              onClick={openPicker}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus size={16} /> Nouveau devis
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {[
            { key: "", label: "Tous" },
            ...Object.entries(DEVIS_STATUS).map(([key, v]) => ({
              key,
              label: v.label,
            })),
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${filter === f.key ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800"}`}
            >
              {f.label}
            </button>
          ))}
          <div className="relative ml-auto">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Référence, prospect…"
              className="w-64 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          {filtered.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-400">
              Aucun devis
            </div>
          )}
          {filtered.map((d) => {
            const st = DEVIS_STATUS[d.statut] || {
              label: d.statut,
              badge: "bg-slate-400/15 text-slate-500",
            };
            return (
              <div
                key={d.id}
                className="border-b border-slate-100 p-4 last:border-0 dark:border-slate-800"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-bold">
                        <FileSignature size={15} className="text-indigo-500" />
                        {d.reference}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.badge}`}
                      >
                        {st.label}
                      </span>
                      {d.statut === "attente_validation" && isManager && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                          À valider par vous
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-semibold">{d.titre}</div>
                    <div className="mt-0.5 text-sm text-slate-500">
                      {d.prospect_name || "Prospect"}{" "}
                      {d.prospect_company ? `— ${d.prospect_company}` : ""}
                    </div>
                    {d.items && d.items.length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                        {d.items.map((it, i) => (
                          <li key={i}>
                            · {it.qty}× {it.name} —{" "}
                            {(Number(it.qty) * Number(it.price)).toLocaleString(
                              "fr-FR",
                            )}{" "}
                            FCFA
                            {it.period && (
                              <span className="ml-1 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-300">
                                {PERIOD_LABEL[it.period]}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                      <span>Créé par {d.created_by_name || "—"}</span>
                      <span>·</span>
                      <span>{formatDate(d.created_at)}</span>
                      {d.renewal_date && (
                        <>
                          <span>·</span>
                          <span>Renouvellement le {d.renewal_date}</span>
                        </>
                      )}
                      {d.validated_by_name && (
                        <>
                          <span>·</span>
                          <span>Décidé par {d.validated_by_name}</span>
                        </>
                      )}
                      {d.validation_comment && (
                        <>
                          <span>·</span>
                          <span className="italic">
                            « {d.validation_comment} »
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="text-lg font-bold text-indigo-500">
                      {d.montant.toLocaleString("fr-FR")} FCFA
                    </span>
                    {d.arr > 0 && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                        ARR {d.arr.toLocaleString("fr-FR")} FCFA/an
                      </span>
                    )}
                    {d.statut === "brouillon" && d.created_by === user?.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setForm(d)}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={async () => {
                            await api.submitDevis(d.id);
                            load();
                          }}
                          className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-600"
                        >
                          Soumettre
                        </button>
                      </div>
                    ) : null}
                    {d.statut === "attente_validation" && isManager && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => review(d, "valide")}
                          className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
                        >
                          <Check size={13} /> Valider
                        </button>
                        <button
                          onClick={() => review(d, "refuse")}
                          className="flex items-center gap-1 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-600"
                        >
                          <ThumbsDown size={13} /> Refuser
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {pickerOpen && (
        <Modal
          title="Choisir un prospect"
          onClose={() => setPickerOpen(false)}
          width="max-w-lg"
        >
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {prospects.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">
                Aucun prospect
              </div>
            )}
            {prospects.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPickerOpen(false);
                  setForm({ prospect: p });
                }}
                className="flex w-full items-center justify-between rounded-xl border border-slate-100 p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-800 dark:hover:bg-slate-800"
              >
                <div>
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-slate-400">
                    {p.company || "Sans société"}
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {p.value?.toLocaleString("fr-FR")} FCFA
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {form && (
        <DevisFormModal
          prospect={form.prospect}
          devis={form.id ? form : null}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            load();
          }}
        />
      )}
    </div>
  );
}
