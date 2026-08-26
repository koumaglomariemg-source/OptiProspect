import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { RefreshCw, Search, X } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useStages } from "../hooks/useStages.js";
import { useRefresh } from "../hooks/useRefresh.js";
import useIsMobile from "../hooks/useIsMobile.js";
import { formatDateShort, initials, SOURCES } from "../constants.js";
import ExportMenu from "../components/ExportMenu.jsx";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800";

const EXPORT_COLUMNS = [
  { key: "numero", label: "numero" },
  { key: "name", label: "name" },
  { key: "company", label: "company" },
  { key: "email", label: "email" },
  { key: "phone", label: "phone" },
  { key: "source", label: "source" },
  { key: "secteur", label: "secteur" },
  { key: "adresse", label: "adresse" },
  { key: "quartier", label: "quartier" },
  { key: "effectif", label: "effectif" },
  { key: "stage", label: "stage" },
  { key: "current_step", label: "etape_courante" },
  { key: "value", label: "value" },
  { key: "contrat_depose", label: "contrat_depose" },
  { key: "contrat_signe", label: "contrat_signe" },
  { key: "option_frais_scolaire", label: "option_frais_scolaire" },
  { key: "next_action", label: "next_action" },
  { key: "next_action_date", label: "next_action_date" },
  { key: "note", label: "note" },
];

export default function RecherchePage() {
  const { stages } = useStages();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState("prospects");
  const [users, setUsers] = useState([]);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    stage: "",
    source: "",
    assignedToId: "",
    dateProspectionFrom: "",
    dateProspectionTo: "",
    prochainRdvFrom: "",
    prochainRdvTo: "",
    contratSigne: "",
    contratDepose: "",
    optionFraisScolaire: "",
  });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const location = useLocation();
  useEffect(() => {
    const q = location.state?.q;
    if (q) {
      setFilters((f) => ({ ...f, search: q }));
      setPage(1);
    }
  }, [location.state]);

  useEffect(() => {
    if (user?.role === "commercial") return;
    api
      .users()
      .then(setUsers)
      .catch(() => {});
  }, [user?.role]);

  const set = (k, v) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };

  const switchTab = (t) => {
    setTab(t);
    setPage(1);
  };

  const fetchAll = async () => {
    const rows = await api.prospects(buildParams(true));
    return rows.data || rows;
  };

  const buildParams = (all) => {
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.stage) params.stage = filters.stage;
    if (filters.source) params.source = filters.source;
    if (filters.assignedToId) params.assignedToId = filters.assignedToId;
    if (filters.dateProspectionFrom)
      params.dateProspectionFrom = filters.dateProspectionFrom;
    if (filters.dateProspectionTo)
      params.dateProspectionTo = filters.dateProspectionTo;
    if (filters.prochainRdvFrom)
      params.prochainRdvFrom = filters.prochainRdvFrom;
    if (filters.prochainRdvTo) params.prochainRdvTo = filters.prochainRdvTo;
    if (tab === "contrats") {
      params.contratSigne = "true";
    } else {
      if (filters.contratSigne !== "")
        params.contratSigne = filters.contratSigne;
    }
    if (filters.contratDepose !== "")
      params.contratDepose = filters.contratDepose;
    if (filters.optionFraisScolaire !== "")
      params.optionFraisScolaire = filters.optionFraisScolaire;
    if (!all) {
      params.page = page;
      params.limit = limit;
    }
    return params;
  };

  const load = async () => {
    try {
      setLoading(true);
      const params = buildParams(false);
      const res = await api.prospects(params);
      setData(res.data || res);
      setTotal(res.total ?? res.length);
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
  }, [page, limit, tab, JSON.stringify(filters)]);

  useRefresh(() => load(), 30000);

  const hasFilters = Object.values(filters).some((v) => v !== "");
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const reset = () => {
    setFilters({
      search: "",
      stage: "",
      source: "",
      assignedToId: "",
      dateProspectionFrom: "",
      dateProspectionTo: "",
      prochainRdvFrom: "",
      prochainRdvTo: "",
      contratSigne: "",
      contratDepose: "",
      optionFraisScolaire: "",
    });
    setPage(1);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Recherche avancée</h1>
            <p className="text-sm text-slate-400">
              Filtres combinés, pagination et export CSV, Excel ou PDF
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportMenu
              columns={EXPORT_COLUMNS}
              getRows={fetchAll}
              baseName={`optiprospect-recherche-${tab}`}
              sheetTitle={`Recherche — ${tab}`}
              disabled={!total}
            />
            <button
              onClick={() => {
                reset();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700"
            >
              <X size={15} /> Réinitialiser
            </button>
          </div>
        </div>

        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
          {[
            { key: "prospects", label: "Prospects" },
            { key: "contrats", label: "Contrats signés" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={`rounded-t-xl px-4 py-2 text-sm font-semibold transition ${
                tab === t.key
                  ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <div className="col-span-2 lg:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Recherche libre
              </label>
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={filters.search}
                  onChange={(e) => set("search", e.target.value)}
                  placeholder="Nom, société, email, téléphone, quartier, n°…"
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Étape
              </label>
              <select
                value={filters.stage}
                onChange={(e) => set("stage", e.target.value)}
                className={inputCls}
              >
                <option value="">Toutes</option>
                {stages.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Source
              </label>
              <select
                value={filters.source}
                onChange={(e) => set("source", e.target.value)}
                className={inputCls}
              >
                <option value="">Toutes</option>
                {SOURCES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Commercial
              </label>
              <select
                value={filters.assignedToId}
                onChange={(e) => set("assignedToId", e.target.value)}
                className={inputCls}
              >
                <option value="">Tous</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Prospection du
              </label>
              <input
                type="date"
                value={filters.dateProspectionFrom}
                onChange={(e) => set("dateProspectionFrom", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Prospection au
              </label>
              <input
                type="date"
                value={filters.dateProspectionTo}
                onChange={(e) => set("dateProspectionTo", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                RDV à partir du
              </label>
              <input
                type="date"
                value={filters.prochainRdvFrom}
                onChange={(e) => set("prochainRdvFrom", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                RDV jusqu'au
              </label>
              <input
                type="date"
                value={filters.prochainRdvTo}
                onChange={(e) => set("prochainRdvTo", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Contrat déposé
              </label>
              <select
                value={filters.contratDepose}
                onChange={(e) => set("contratDepose", e.target.value)}
                className={inputCls}
              >
                <option value="">Tous</option>
                <option value="true">Oui</option>
                <option value="false">Non</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Option frais scolaire
              </label>
              <select
                value={filters.optionFraisScolaire}
                onChange={(e) => set("optionFraisScolaire", e.target.value)}
                className={inputCls}
              >
                <option value="">Tous</option>
                <option value="true">Oui</option>
                <option value="false">Non</option>
              </select>
            </div>
            {tab === "prospects" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Contrat signé
                </label>
                <select
                  value={filters.contratSigne}
                  onChange={(e) => set("contratSigne", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Tous</option>
                  <option value="true">Oui</option>
                  <option value="false">Non</option>
                </select>
              </div>
            )}
          </div>
          {hasFilters && (
            <div className="mt-3 text-xs text-slate-400">
              Filtres actifs : {hasFilters ? "oui" : "non"}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          {isMobile ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading && (
                <div className="p-10 text-center text-sm text-slate-400">
                  Chargement…
                </div>
              )}
              {!loading && data.length === 0 && (
                <div className="p-10 text-center text-sm text-slate-400">
                  Aucun résultat
                </div>
              )}
              {!loading &&
                data.map((p) => (
                  <div key={p.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                        {initials(p.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{p.name}</div>
                        <div className="truncate text-xs text-slate-400">
                          {p.company || "—"}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                        {p.current_step?.name || p.stage}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>
                        {p.quartier || "—"}
                        {p.numero ? ` · ${p.numero}` : ""}
                        {p.effectif ? ` · ${p.effectif} sal.` : ""}
                      </span>
                      <span>{p.assignee_name || "Non assigné"}</span>
                      {p.contrat_depose && (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                          déposé
                        </span>
                      )}
                      {p.contrat_signe && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                          signé
                        </span>
                      )}
                      {p.next_action_date && (
                        <span>
                          Prochaine action :{" "}
                          <span className="font-medium">
                            {formatDateShort(p.next_action_date)}
                          </span>
                        </span>
                      )}
                    </div>
                    {p.next_action && (
                      <div className="mt-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                        {p.next_action}
                      </div>
                    )}
                  </div>
                ))}
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                <span className="text-xs text-slate-400">
                  {total} résultat(s)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-indigo-300 disabled:opacity-40 dark:border-slate-700"
                  >
                    Précédent
                  </button>
                  <span className="text-xs text-slate-500">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-indigo-300 disabled:opacity-40 dark:border-slate-700"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Prospect</th>
                      <th className="px-5 py-3 font-semibold">
                        Étape courante
                      </th>
                      <th className="px-5 py-3 font-semibold">Quartier / N°</th>
                      <th className="px-5 py-3 font-semibold">Commercial</th>
                      <th className="px-5 py-3 font-semibold">Contrats</th>
                      <th className="px-5 py-3 font-semibold">
                        Prochaine action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {loading && (
                      <tr>
                        <td
                          colSpan="6"
                          className="px-5 py-10 text-center text-slate-400"
                        >
                          Chargement…
                        </td>
                      </tr>
                    )}
                    {!loading && data.length === 0 && (
                      <tr>
                        <td
                          colSpan="6"
                          className="px-5 py-10 text-center text-slate-400"
                        >
                          Aucun résultat
                        </td>
                      </tr>
                    )}
                    {!loading &&
                      data.map((p) => (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                                {initials(p.name)}
                              </span>
                              <div className="min-w-0">
                                <div className="truncate font-semibold">
                                  {p.name}
                                </div>
                                <div className="truncate text-xs text-slate-400">
                                  {p.company || "—"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                              {p.current_step?.name || p.stage}
                            </span>
                            <div className="mt-1 text-[10px] text-slate-400">
                              {p.steps_done}/{p.steps_total} étapes
                            </div>
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-500">
                            {p.quartier || "—"}
                            {p.numero ? ` · ${p.numero}` : ""}
                            {p.effectif ? ` · ${p.effectif} sal.` : ""}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-500">
                            {p.assignee_name || "—"}
                          </td>
                          <td className="px-5 py-3 text-xs">
                            {p.contrat_depose ? (
                              <span className="mr-1 rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                                déposé
                              </span>
                            ) : null}
                            {p.contrat_signe ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                                signé
                              </span>
                            ) : null}
                            {!p.contrat_depose && !p.contrat_signe ? "—" : null}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-500">
                            {p.next_action_date ? (
                              <span className="font-medium">
                                {formatDateShort(p.next_action_date)}
                              </span>
                            ) : (
                              "—"
                            )}
                            {p.next_action ? (
                              <span className="block max-w-[160px] truncate text-slate-400">
                                {p.next_action}
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
                <span className="text-xs text-slate-400">
                  {total} résultat(s)
                </span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="10">10 / page</option>
                  <option value="25">25 / page</option>
                  <option value="50">50 / page</option>
                  <option value="100">100 / page</option>
                </select>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-indigo-300 disabled:opacity-40 dark:border-slate-700"
                  >
                    Précédent
                  </button>
                  <span className="text-xs text-slate-500">
                    Page {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-indigo-300 disabled:opacity-40 dark:border-slate-700"
                  >
                    Suivant
                  </button>
                  <button
                    onClick={load}
                    className="ml-1 flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-indigo-300 dark:border-slate-700"
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
