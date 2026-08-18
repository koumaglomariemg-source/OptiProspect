import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  CalendarClock,
  Check,
  CheckCircle2,
  DollarSign,
  Target,
  TrendingUp,
  Users2,
  XCircle,
  ChartPie,
  MapPin,
  Pencil,
} from "lucide-react";
import { api } from "../api.js";
import { useStages } from "../hooks/useStages.js";
import { useRefresh } from "../hooks/useRefresh.js";
import useDarkMode from "../hooks/useDarkMode.js";
import { useAuth } from "../context/AuthContext.jsx";
import { CHART_COLORS, formatDate } from "../constants.js";

const STAT_TONES = {
  sky: {
    card: "border-sky-100 bg-sky-50/70 dark:border-sky-500/20 dark:bg-sky-500/5",
    chip: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
  },
  emerald: {
    card: "border-emerald-100 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/5",
    chip: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  indigo: {
    card: "border-indigo-100 bg-indigo-50/70 dark:border-indigo-500/20 dark:bg-indigo-500/5",
    chip: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
  },
  amber: {
    card: "border-amber-100 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/5",
    chip: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  },
};

function StatCard({ icon: Icon, label, value, sub, tone = "indigo" }) {
  const t = STAT_TONES[tone];
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 ${t.card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.chip}`}
        >
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {sub}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { stages } = useStages();
  const { user } = useAuth();
  const dark = useDarkMode();
  const isManager = ["manager", "admin"].includes(user?.role);
  const [users, setUsers] = useState([]);
  const [overview, setOverview] = useState(null);
  const [byUser, setByUser] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [targets, setTargets] = useState(null);
  const [commercial, setCommercial] = useState("");
  const [days, setDays] = useState(30);
  const [yearMonth, setYearMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [editingTarget, setEditingTarget] = useState(null);
  const [busyRelance, setBusyRelance] = useState(null);

  const filters = useMemo(() => {
    const f = {};
    if (commercial) f.commercial = commercial;
    return f;
  }, [commercial]);

  const load = () => {
    api
      .statsOverview(filters)
      .then(setOverview)
      .catch(() => {});
    api
      .statsByUser(filters)
      .then(setByUser)
      .catch(() => {});
    api
      .statsTimeline(days, filters)
      .then(setTimeline)
      .catch(() => {});
    api
      .statsForecast(filters)
      .then(setForecast)
      .catch(() => {});
    api
      .statsTargets(yearMonth)
      .then(setTargets)
      .catch(() => {});
  };

  const markDone = async (a) => {
    setBusyRelance(a.id);
    try {
      await api.markRelanceDone(a.id);
      load();
    } catch {
      /* erreur silencieuse : le prochain rafraîchissement reflètera l'état réel */
    } finally {
      setBusyRelance(null);
    }
  };

  useEffect(load, [filters, days, yearMonth]);
  useRefresh(() => load(), 30000);

  useEffect(() => {
    if (isManager)
      api
        .users()
        .then(setUsers)
        .catch(() => {});
  }, [isManager]);

  const saveTarget = async (userId, value) => {
    try {
      await api.setTarget(userId, yearMonth, value);
      const rows = await api.statsTargets(yearMonth);
      setTargets(rows);
    } catch (err) {
      alert(err.message);
    }
    setEditingTarget(null);
  };

  if (!overview) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        Chargement…
      </div>
    );
  }

  const stageData = stages.map((s) => ({
    name: s.label,
    value: overview.by_stage.find((b) => b.stage === s.key)?.n || 0,
    fill: s.dot.replace("bg-", ""),
  }));

  const sourceData = overview.by_source.map((s, i) => ({
    name: s.source,
    value: s.n,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const zoneData = overview.by_zone.map((z, i) => ({
    name: z.secteur,
    value: z.n,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const axisFill = dark ? "#cbd5e1" : "#64748b";
  const gridStroke = dark ? "rgb(148 163 184 / 0.18)" : "rgb(148 163 184 / 0.28)";
  const tooltipText = dark ? "#e2e8f0" : "#0f172a";

  const tooltipStyle = dark
    ? {
        backgroundColor: "rgb(30 41 59)",
        border: "1px solid rgb(51 65 85)",
        borderRadius: "12px",
        color: "#e2e8f0",
        fontSize: "12px",
      }
    : {
        backgroundColor: "#ffffff",
        border: "1px solid rgb(226 232 240)",
        borderRadius: "12px",
        color: "#0f172a",
        fontSize: "12px",
      };

  const inputCls =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Tableau de bord
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {user?.name ? `Bonjour ${user.name.split(" ")[0]}, ` : ""}voici
              l'activité{isManager ? " de votre équipe." : " de vos prospects."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isManager && (
              <select
                value={commercial}
                onChange={(e) => setCommercial(e.target.value)}
                className={inputCls}
              >
                <option value="">Toute l'équipe</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    days === d
                      ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {d}j
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={Users2}
            label="Prospects totaux"
            value={overview.total}
            tone="sky"
          />
          <StatCard
            icon={TrendingUp}
            label="Taux de conversion"
            value={`${overview.conversion_rate}%`}
            sub={`${overview.converted} converti(s)`}
            tone="emerald"
          />
          <StatCard
            icon={Activity}
            label="Pipeline actif"
            value={overview.active}
            sub={`${overview.lost} abandonné(s)`}
            tone="indigo"
          />
          <StatCard
            icon={DollarSign}
            label="Valeur du pipeline"
            value={`${Math.round(overview.pipeline_value).toLocaleString("fr-FR")} FCFA`}
            tone="amber"
          />
        </div>

        {targets && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                <Target size={16} />
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Objectifs — {yearMonth}
              </h3>
              <input
                type="month"
                value={yearMonth}
                onChange={(e) => setYearMonth(e.target.value)}
                className={`${inputCls} ml-auto w-40`}
              />
            </div>
            <div className="space-y-4">
              {targets.users.map((u) => {
                const pct =
                  u.target_value > 0
                    ? Math.round((u.achieved / u.target_value) * 100)
                    : 0;
                return (
                  <div key={u.id}>
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="font-semibold">{u.name}</span>
                      <span className="text-xs text-slate-400">
                        {Math.round(u.achieved).toLocaleString("fr-FR")} FCFA /{" "}
                        {u.target_value.toLocaleString("fr-FR")} FCFA
                        {u.target_value > 0 && (
                          <span
                            className={`ml-1 font-semibold ${pct >= 100 ? "text-emerald-500" : "text-indigo-500"}`}
                          >
                            · {pct}%
                          </span>
                        )}
                      </span>
                      {isManager &&
                        (editingTarget === u.id ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const v = new FormData(e.target).get("target");
                              saveTarget(u.id, Number(v) || 0);
                            }}
                            className="flex items-center gap-1"
                          >
                            <input
                              name="target"
                              type="number"
                              min="0"
                              defaultValue={u.target_value}
                              className={`${inputCls} w-28 py-1`}
                              autoFocus
                            />
                            <button className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white">
                              OK
                            </button>
                          </form>
                        ) : (
                          <button
                            onClick={() => setEditingTarget(u.id)}
                            title="Définir l'objectif"
                            className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800"
                          >
                            <Pencil size={12} />{" "}
                            {u.target_value > 0 ? "Modifier" : "Définir"}
                          </button>
                        ))}
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-indigo-500"}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {forecast && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                <ChartPie size={16} />
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Prévisions de ventes
              </h3>
              <span className="ml-auto rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                {forecast.prospects_per_day} prospect(s)/jour
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Pipeline pondéré
                </div>
                <div className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-indigo-600 dark:text-indigo-400">
                  {forecast.weighted_pipeline.toLocaleString("fr-FR")} FCFA
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Selon la probabilité de conversion estimée
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Attendu à 30 jours
                </div>
                <div className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                  {forecast.expected_next30.toLocaleString("fr-FR")} FCFA
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  {forecast.expected_conversions30} conversion(s) estimées
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Taux de réussite
                </div>
                <div className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
                  {forecast.win_rate}%
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Basé sur les dossiers clôturés
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Panier moyen
                </div>
                <div className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
                  {forecast.avg_deal_value.toLocaleString("fr-FR")} FCFA
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Moyenne des affaires converties
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                <Activity size={16} />
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Prospects par étape
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stageData} barSize={42}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={gridStroke}
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: axisFill }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: axisFill }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: tooltipText }}
                  itemStyle={{ color: tooltipText }}
                  cursor={{ fill: "rgb(148 163 184 / 0.1)" }}
                />
                <Bar dataKey="value" name="Prospects" radius={[8, 8, 0, 0]}>
                  {stageData.map((e, i) => (
                    <Cell key={i} fill={e.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
                <ChartPie size={16} />
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Répartition par source
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={sourceData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {sourceData.map((e, i) => (
                    <Cell key={i} fill={e.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: tooltipText }}
                  itemStyle={{ color: tooltipText }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                <TrendingUp size={16} />
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Nouveaux prospects ({days} jours)
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient
                    id="gradProspects"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#3660db" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3660db" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={gridStroke}
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: axisFill }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: axisFill }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: tooltipText }}
                  itemStyle={{ color: tooltipText }}
                />
                <Area
                  type="monotone"
                  dataKey="n"
                  name="Prospects"
                  stroke="#3660db"
                  strokeWidth={2}
                  fill="url(#gradProspects)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                <Users2 size={16} />
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Performance par commercial
              </h3>
            </div>
            {byUser.length === 0 && (
              <p className="text-sm text-slate-400">Aucune donnée</p>
            )}
            <div className="space-y-3">
              {byUser.map((u) => {
                const total = u.total || 0;
                const pct = total
                  ? Math.round(((u.converted || 0) / total) * 100)
                  : 0;
                return (
                  <div key={u.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-semibold">{u.name}</span>
                      <span className="text-xs text-slate-400">
                        {u.converted || 0}/{total} convertis · {pct}% ·{" "}
                        {Math.round(u.value || 0).toLocaleString("fr-FR")} FCFA
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {zoneData.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                  <MapPin size={16} />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Répartition par secteur géographique
                </h3>
              </div>
              <ResponsiveContainer
                width="100%"
                height={Math.max(200, zoneData.length * 44)}
              >
                <BarChart
                  data={zoneData}
                  layout="vertical"
                  margin={{ left: 8, right: 16 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={gridStroke}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: axisFill }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 11, fill: axisFill }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: tooltipText }}
                    itemStyle={{ color: tooltipText }}
                    cursor={{ fill: "rgb(148 163 184 / 0.1)" }}
                  />
                  <Bar
                    dataKey="value"
                    name="Prospects"
                    radius={[0, 6, 6, 0]}
                    barSize={18}
                  >
                    {zoneData.map((e, i) => (
                      <Cell key={i} fill={e.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              <CalendarClock size={16} />
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Prochaines actions
            </h3>
          </div>
          {overview.next_actions.length === 0 && (
            <p className="text-sm text-slate-400">Aucune action planifiée</p>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {overview.next_actions.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${new Date(a.next_action_date) <= new Date() ? "bg-rose-100 text-rose-600 dark:bg-rose-500/15" : "bg-amber-100 text-amber-600 dark:bg-amber-500/15"}`}
                >
                  {new Date(a.next_action_date) <= new Date() ? (
                    <XCircle size={16} />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {a.name}{" "}
                    <span className="font-normal text-slate-400">
                      · {a.company}
                    </span>
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {a.next_action} — le {formatDate(a.next_action_date)}
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-400">
                  {a.assignee_name || "Non assigné"}
                </span>
                <button
                  type="button"
                  onClick={() => markDone(a)}
                  disabled={busyRelance === a.id}
                  title="Marquer la relance comme faite"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-500/10 dark:text-emerald-400"
                >
                  <Check size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
