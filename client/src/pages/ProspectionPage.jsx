import { useEffect, useState } from "react";
import {
  ArrowRight,
  ClipboardCheck,
  Plus,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useStages } from "../hooks/useStages.js";
import { useRefresh } from "../hooks/useRefresh.js";
import useIsMobile from "../hooks/useIsMobile.js";
import StepFormModal from "../components/StepFormModal.jsx";
import ProspectFormModal from "../components/ProspectFormModal.jsx";

export default function ProspectionPage() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";
  const isMobile = useIsMobile();
  const { stages } = useStages();
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [active, setActive] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (stage) params.stage = stage;
      const rows = await api.prospects(params);
      setProspects(rows);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.importProspects(file);
      alert(`Importé : ${res.created} prospect(s)${res.errors.length ? `, ${res.errors.length} erreur(s)` : ''}`);
      load();
    } catch (err) {
      alert('Erreur import : ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, stage]);

  useRefresh(() => load(), 30000);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Prospection</h1>
            <p className="text-sm text-slate-400">
              Renseignez et validez les étapes du pipeline prospect par prospect
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700"
            >
              <RefreshCw size={14} /> Actualiser
            </button>
            {!isManager && (
              <>
                <button
                  onClick={() => setFormOpen(true)}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  <Plus size={16} /> Nouveau prospect
                </button>
                <label className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 cursor-pointer">
                  <Upload size={16} /> Importer CSV
                  <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
                </label>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un prospect…"
              className="w-64 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="">Toutes les étapes</option>
            {stages.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <span className="ml-auto text-sm text-slate-400">
            {prospects.length} prospect(s)
          </span>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">
            {error}
          </div>
        )}

        {loading && !prospects.length && (
          <div className="py-10 text-center text-sm text-slate-400">
            Chargement…
          </div>
        )}

        {!loading && prospects.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            Aucun prospect à traiter
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          {isMobile ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {prospects.map((p) => (
                <div key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold">{p.name}</span>
                        {p.company && (
                          <span className="truncate text-xs text-slate-400">
                            {p.company}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{
                              width: p.steps_total
                                ? `${(p.steps_done / p.steps_total) * 100}%`
                                : "0%",
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">
                          {p.steps_done}/{p.steps_total}
                        </span>
                      </div>
                    </div>
                    {p.current_step && (
                      <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                        <ClipboardCheck size={13} />
                        {p.current_step.name}
                      </span>
                    )}
                  </div>
                  {!isManager && (
                    <button
                      onClick={() => setActive(p)}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                      Renseigner l'étape <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            prospects.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0 dark:border-slate-800"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold">{p.name}</span>
                    {p.company && (
                      <span className="truncate text-xs text-slate-400">
                        {p.company}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{
                          width: p.steps_total
                            ? `${(p.steps_done / p.steps_total) * 100}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">
                      {p.steps_done}/{p.steps_total}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  {p.current_step && (
                    <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                      <ClipboardCheck size={13} />
                      {p.current_step.name}
                    </span>
                  )}
                  {!isManager && (
                    <button
                      onClick={() => setActive(p)}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                      Renseigner l'étape <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {active && (
        <StepFormModal
          prospect={active}
          onClose={() => setActive(null)}
          onChanged={load}
        />
      )}

      {formOpen && (
        <ProspectFormModal
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}
