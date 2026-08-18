import { useEffect, useMemo, useState } from "react";
import { Plus, Search, SlidersHorizontal, Upload } from "lucide-react";
import { api } from "../api.js";
import { SOURCES } from "../constants.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useStages } from "../hooks/useStages.js";
import { useRefresh } from "../hooks/useRefresh.js";
import useIsMobile from "../hooks/useIsMobile.js";
import ProspectCard from "../components/ProspectCard.jsx";
import ProspectFormModal from "../components/ProspectFormModal.jsx";
import ProspectDrawer from "../components/ProspectDrawer.jsx";
import CsvImportModal from "../components/CsvImportModal.jsx";
import ExportMenu from "../components/ExportMenu.jsx";

const EXPORT_COLUMNS = [
  { key: "numero", label: "numero" },
  { key: "name", label: "name" },
  { key: "company", label: "company" },
  { key: "email", label: "email" },
  { key: "phone", label: "phone" },
  { key: "linkedin", label: "linkedin" },
  { key: "source", label: "source" },
  { key: "secteur", label: "secteur" },
  { key: "adresse", label: "adresse" },
  { key: "stage", label: "stage" },
  { key: "value", label: "value" },
  { key: "next_action", label: "next_action" },
  { key: "next_action_date", label: "next_action_date" },
  { key: "note", label: "note" },
];

export default function KanbanPage() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";
  const isMobile = useIsMobile();
  const { stages, byKey } = useStages();
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [activeStage, setActiveStage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [drawerId, setDrawerId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (source) params.source = source;
      const rows = await api.prospects(params);
      setProspects(rows);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, source]);

  useRefresh(() => load(), 30000);

  const columns = useMemo(
    () =>
      stages.map((s) => ({
        ...s,
        items: prospects.filter((p) => p.stage === s.key),
      })),
    [prospects, stages],
  );

  const handleSaved = (p) => {
    setFormOpen(false);
    setEditing(null);
    load();
    if (drawerId === p.id) setDrawerId(null);
  };

  const drawerProspect = prospects.find((p) => p.id === drawerId) || null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-bold leading-tight">
            Pipeline de prospection
          </h1>
          <p className="text-xs text-slate-400">
            Le statut évolue automatiquement à la validation des étapes du
            pipeline.
          </p>
        </div>
        <div className="relative ml-auto">
          <Search
            size={16}
            className="absolute left-3 top-2.5 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un prospect…"
            className="w-56 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-slate-400" />
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="">Toutes les sources</option>
            {SOURCES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            columns={EXPORT_COLUMNS}
            rows={prospects}
            baseName="optiprospect-prospects"
            sheetTitle="Pipeline de prospection"
            disabled={!prospects.length}
          />
          {!isManager && (
            <button
              onClick={() => setImportOpen(true)}
              title="Importer un CSV"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700"
            >
              <Upload size={15} /> Import
            </button>
          )}
          {!isManager && (
            <button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus size={16} /> Nouveau prospect
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        {isMobile && (
          <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
            {columns.map((col) => (
              <button
                key={col.key}
                onClick={() => setActiveStage(col.key)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  activeStage === col.key
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                {col.label}
                <span className="rounded-full bg-black/10 px-1.5 text-[10px] dark:bg-white/10">
                  {col.items.length}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="flex h-full gap-4 p-4">
          {loading && !prospects.length ? (
            <div className="flex w-full items-center justify-center text-sm text-slate-400">
              Chargement…
            </div>
          ) : isMobile ? (
            columns
              .filter((col) => activeStage === "" || col.key === activeStage)
              .map((col) => (
                <div
                  key={col.key}
                  className="flex w-full flex-col rounded-2xl bg-slate-200/60 dark:bg-slate-900 min-h-[calc(100vh-200px)]"
                >
                  <div className="flex items-center gap-2 px-4 py-3 sticky top-0 z-10 bg-slate-200/95 dark:bg-slate-900/95 backdrop-blur rounded-t-2xl border-b border-slate-200/50 dark:border-slate-800/50">
                    <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                    <span className="text-sm font-bold">{col.label}</span>
                    <span className="ml-auto rounded-full bg-slate-300/50 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {col.items.length}
                    </span>
                  </div>
                  <div className="flex min-h-[60px] flex-1 flex-col gap-2 overflow-y-auto px-3 pb-20">
                    {col.items.map((p) => (
                      <ProspectCard
                        key={p.id}
                        prospect={p}
                        stageMeta={byKey[p.stage]}
                        onClick={() => setDrawerId(p.id)}
                        onEdit={
                          isManager
                            ? null
                            : () => {
                                setEditing(p);
                                setFormOpen(true);
                              }
                        }
                      />
                    ))}
                    {col.items.length === 0 && (
                      <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-slate-300/60 p-6 text-xs text-slate-400 dark:border-slate-800">
                        Aucun prospect
                      </div>
                    )}
                  </div>
                </div>
              ))
          ) : (
            columns.map((col) => (
              <div
                key={col.key}
                className="flex w-72 shrink-0 flex-col rounded-2xl bg-slate-200/60 dark:bg-slate-900"
              >
                <div className="flex items-center gap-2 px-4 py-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                  <span className="text-sm font-bold">{col.label}</span>
                  <span className="ml-auto rounded-full bg-slate-300/50 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {col.items.length}
                  </span>
                </div>
                <div className="flex min-h-[60px] flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3">
                  {col.items.map((p) => (
                    <ProspectCard
                      key={p.id}
                      prospect={p}
                      stageMeta={byKey[p.stage]}
                      onClick={() => setDrawerId(p.id)}
                      onEdit={
                        isManager
                          ? null
                          : () => {
                              setEditing(p);
                              setFormOpen(true);
                            }
                      }
                    />
                  ))}
                  {col.items.length === 0 && (
                    <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-slate-300/60 p-6 text-xs text-slate-400 dark:border-slate-800">
                      Aucun prospect
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {formOpen && (
        <ProspectFormModal
          prospect={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {importOpen && (
        <CsvImportModal
          onClose={() => setImportOpen(false)}
          onDone={() => load()}
        />
      )}

      {drawerProspect && (
        <ProspectDrawer
          prospect={drawerProspect}
          onClose={() => setDrawerId(null)}
          onChanged={() => load()}
          onEdit={
            isManager
              ? null
              : () => {
                  setEditing(drawerProspect);
                  setFormOpen(true);
                }
          }
        />
      )}
    </div>
  );
}
