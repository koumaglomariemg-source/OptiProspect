import { useEffect, useState } from "react";
import { Users2, LayoutDashboard, Package, Target, TrendingUp, Activity, DollarSign, ChartPie, AlertTriangle, CheckCircle2, XCircle, CalendarClock, Check } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import useDarkMode from "../hooks/useDarkMode.js";
import { useRefresh } from "../hooks/useRefresh.js";
import { CHART_COLORS, formatDate } from "../constants.js";

const STAT_TONES = {
  sky: { card: "border-sky-100 bg-sky-50/70 dark:border-sky-500/20 dark:bg-sky-500/5", chip: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300" },
  emerald: { card: "border-emerald-100 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/5", chip: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" },
  indigo: { card: "border-indigo-100 bg-indigo-50/70 dark:border-indigo-500/20 dark:bg-indigo-500/5", chip: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300" },
  amber: { card: "border-amber-100 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/5", chip: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300" },
};

function StatCard({ icon: Icon, label, value, sub, tone = "indigo" }) {
  const t = STAT_TONES[tone];
  return (
    <div className={`rounded-2xl border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 ${t.card}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.chip}`}><Icon size={18} /></div>
      </div>
      <div className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  );
}

const inputCls = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";

const axisFill = dark => dark ? "#cbd5e1" : "#64748b";
const gridStroke = dark => dark ? "rgb(148 163 184 / 0.18)" : "rgb(148 163 184 / 0.28)";
const tooltipText = dark => dark ? "#e2e8f0" : "#0f172a";
const tooltipStyle = dark => dark
  ? { backgroundColor: "rgb(30 41 59)", border: "1px solid rgb(51 65 85)", borderRadius: "12px", color: "#e2e8f0", fontSize: "12px" }
  : { backgroundColor: "#ffffff", border: "1px solid rgb(226 232 240)", borderRadius: "12px", color: "#0f172a", fontSize: "12px" };

export default function DashboardPage() {
  const { user } = useAuth();
  const dark = useDarkMode();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isCommercial = user?.role === 'commercial';
  const isManagerOrAdmin = isAdmin || isManager;

  const [counts, setCounts] = useState(null);
  const [error, setError] = useState(null);
  const [targets, setTargets] = useState(null);
  const [yearMonth, setYearMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [editingTarget, setEditingTarget] = useState(null);
  const [users, setUsers] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [overview, setOverview] = useState(null);
  const [days, setDays] = useState(30);
  const [myTimeline, setMyTimeline] = useState([]);

  const myStageData = (myStats?.by_stage || []).map(s => ({ name: s.stage, value: s.n, fill: s.stage })).filter(s => s.name);

  const load = async () => {
    try {
      if (isAdmin) {
        const [c, o, tl] = await Promise.all([
          api.statsCounts(),
          api.statsOverview({}),
          api.statsTimeline(days, {}),
        ]);
        setCounts(c);
        setOverview(o);
        setMyTimeline(tl);
      } else if (isManager) {
        const [c, o] = await Promise.all([api.statsCounts(), api.statsOverview({})]);
        setCounts(c);
        setOverview(o);
        const tl = await api.statsTimeline(days, {});
        setMyTimeline(tl);
      } else if (isCommercial) {
        const me = await api.profile();
        setMyStats(me.stats);
        const tl = await api.statsTimeline(days, { commercial: user.id });
        setMyTimeline(tl);
      }
      setError(null);
    } catch (e) {
      setError(e.message);
    }
    if (isManagerOrAdmin) {
      try {
        const t = await api.statsTargets(yearMonth);
        setTargets(t);
        const u = await api.users();
        setUsers(u);
      } catch {}
    }
  };

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

  useEffect(() => { void load(); }, [yearMonth]);
  useRefresh(() => { void load(); }, 60000);

  if (error) {
    return <div className="flex h-full items-center justify-center text-sm text-rose-500">Erreur : {error}</div>;
  }

  // Vue admin
  if (isAdmin) {
    if (!counts || !overview) return <div className="flex h-full items-center justify-center text-sm text-slate-400">Chargement...</div>;

    const stageData = (overview?.by_stage || []).map(s => ({ name: s.stage, value: s.n, fill: s.stage })).filter(s => s.name);
    const sourceData = (overview?.by_source || []).map((s, i) => ({ name: s.source, value: s.n, fill: CHART_COLORS[i % CHART_COLORS.length] }));
    const zoneData = (overview?.by_zone || []).map((z, i) => ({ name: z.secteur, value: z.n, fill: CHART_COLORS[i % CHART_COLORS.length] }));

    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-6 p-6">
          <div><h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Tableau de bord Admin</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Création & Configuration</p></div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StatCard icon={Users2} label="Utilisateurs créés" value={counts.users} tone="sky" />
            <StatCard icon={LayoutDashboard} label="Modèles pipeline" value={counts.pipeline_templates} tone="emerald" />
            <StatCard icon={Package} label="Produits / services" value={counts.products} tone="indigo" />
            <StatCard icon={DollarSign} label="Valeur pipeline" value={`${Math.round(overview.pipeline_value || 0).toLocaleString("fr-FR")} FCFA`} tone="amber" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><Users2 size={16} /></span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Répartition des utilisateurs par rôle</h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={[
                    { name: 'Admin', value: counts.roles?.admin || 0 },
                    { name: 'Manager', value: counts.roles?.manager || 0 },
                    { name: 'Commercial', value: counts.roles?.commercial || 0 },
                  ].filter(d => d.value > 0)} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} paddingAngle={3}>
                    {['Admin', 'Manager', 'Commercial'].map((n, i) => <Cell key={n} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle(dark)} labelStyle={{ color: tooltipText(dark) }} itemStyle={{ color: tooltipText(dark) }} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"><LayoutDashboard size={16} /></span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Modèles de pipeline créés</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><span className="text-sm font-medium">Total modèles</span><span className="text-2xl font-bold text-emerald-600">{counts.pipeline_templates}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm font-medium">Produits / services configurés</span><span className="text-2xl font-bold text-indigo-600">{counts.products}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm font-medium">Utilisateurs actifs</span><span className="text-2xl font-bold text-sky-600">{counts.users}</span></div>
              </div>
            </div>
          </div>

          {targets && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"><Target size={16} /></span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Objectifs équipe — {yearMonth}</h3>
                <input type="month" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} className={`${inputCls} ml-auto w-40`} />
              </div>
              <div className="space-y-4">
                {targets.users.map((u) => {
                  const pct = u.target_value > 0 ? Math.round((u.achieved / u.target_value) * 100) : 0;
                  return (
                    <div key={u.id}>
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-semibold">{u.name} <span className="text-xs text-slate-400 font-normal">({u.role})</span></span>
                        <span className="text-xs text-slate-400">{Math.round(u.achieved).toLocaleString("fr-FR")} FCFA / {u.target_value.toLocaleString("fr-FR")} FCFA {u.target_value > 0 && <span className={`ml-1 font-semibold ${pct >= 100 ? "text-emerald-500" : "text-indigo-500"}`}>· {pct}%</span>}</span>
                        {editingTarget === u.id ? (
                          <form onSubmit={(e) => { e.preventDefault(); const v = new FormData(e.target).get("target"); saveTarget(u.id, Number(v) || 0); }} className="flex items-center gap-1">
                            <input name="target" type="number" min="0" defaultValue={u.target_value} className={`${inputCls} w-28 py-1`} autoFocus />
                            <button className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white">OK</button>
                          </form>
                        ) : (
                          <button onClick={() => setEditingTarget(u.id)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-200 dark:bg-slate-800"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> {u.target_value > 0 ? "Modifier" : "Définir"}</button>
                        )}
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><TrendingUp size={16} /></span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Activité équipe ({days} jours)</h3>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={myTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke(dark)} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: axisFill(dark) }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: axisFill(dark) }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle(dark)} labelStyle={{ color: tooltipText(dark) }} itemStyle={{ color: tooltipText(dark) }} />
                  <Area type="monotone" dataKey="n" name="Prospects créés" stroke="#3660db" strokeWidth={2} fill="#3660db" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"><ChartPie size={16} /></span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Prospects par étape (équipe)</h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={overview?.by_stage?.map(s => ({ name: s.stage, value: s.n, fill: s.stage })).filter(s => s.name) || []} barSize={42}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke(dark)} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: axisFill(dark) }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: axisFill(dark) }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle(dark)} labelStyle={{ color: tooltipText(dark) }} itemStyle={{ color: tooltipText(dark) }} cursor={{ fill: "rgb(148 163 184 / 0.1)" }} />
                  <Bar dataKey="value" name="Prospects" radius={[8, 8, 0, 0]}><Cell fill="#0ea5e9" /></Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vue manager
  if (isManager) {
    if (!counts) return <div className="flex h-full items-center justify-center text-sm text-slate-400">Chargement...</div>;
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-6 p-6">
          <div><h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Tableau de bord Manager</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Suivi de votre équipe</p></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={Users2} label="Commerciaux dans l'équipe" value={users.filter(u => u.role === 'commercial').length} tone="sky" />
            <StatCard icon={LayoutDashboard} label="Modèles pipeline dispo" value={counts.pipeline_templates} tone="emerald" />
            <StatCard icon={Package} label="Produits / services" value={counts.products} tone="indigo" />
          </div>
          {targets && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"><Target size={16} /></span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Objectifs commerciaux — {yearMonth}</h3>
                <input type="month" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} className={`${inputCls} ml-auto w-40`} />
              </div>
              <div className="space-y-4">
                {targets.users.filter(u => u.role === 'commercial').map((u) => {
                  const pct = u.target_value > 0 ? Math.round((u.achieved / u.target_value) * 100) : 0;
                  return (
                    <div key={u.id}>
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-semibold">{u.name}</span>
                        <span className="text-xs text-slate-400">{Math.round(u.achieved).toLocaleString("fr-FR")} FCFA / {u.target_value.toLocaleString("fr-FR")} FCFA {u.target_value > 0 && <span className={`ml-1 font-semibold ${pct >= 100 ? "text-emerald-500" : "text-indigo-500"}`}>· {pct}%</span>}</span>
                        {editingTarget === u.id ? (
                          <form onSubmit={(e) => { e.preventDefault(); const v = new FormData(e.target).get("target"); saveTarget(u.id, Number(v) || 0); }} className="flex items-center gap-1">
                            <input name="target" type="number" min="0" defaultValue={u.target_value} className={`${inputCls} w-28 py-1`} autoFocus />
                            <button className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white">OK</button>
                          </form>
                        ) : (
                          <button onClick={() => setEditingTarget(u.id)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-200 dark:bg-slate-800"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> {u.target_value > 0 ? "Modifier" : "Définir"}</button>
                        )}
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><TrendingUp size={16} /></span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Activité équipe ({days} jours)</h3>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={myTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke(dark)} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: axisFill(dark) }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: axisFill(dark) }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle(dark)} labelStyle={{ color: tooltipText(dark) }} itemStyle={{ color: tooltipText(dark) }} />
                  <Area type="monotone" dataKey="n" name="Prospects créés" stroke="#3660db" strokeWidth={2} fill="#3660db" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"><ChartPie size={16} /></span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Prospects par étape (équipe)</h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={overview?.by_stage?.map(s => ({ name: s.stage, value: s.n, fill: s.stage })).filter(s => s.name) || []} barSize={42}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke(dark)} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: axisFill(dark) }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: axisFill(dark) }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle(dark)} labelStyle={{ color: tooltipText(dark) }} itemStyle={{ color: tooltipText(dark) }} cursor={{ fill: "rgb(148 163 184 / 0.1)" }} />
                  <Bar dataKey="value" name="Prospects" radius={[8, 8, 0, 0]}><Cell fill="#0ea5e9" /></Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vue commercial
  if (isCommercial) {
    if (!myStats) return <div className="flex h-full items-center justify-center text-sm text-slate-400">Chargement...</div>;
    const total = myStats.total || 0;
    const converted = myStats.by_temperature?.find(t => t.temperature === 'converti')?.n || 0;
    const abandoned = myStats.by_temperature?.find(t => t.temperature === 'abandonne')?.n || 0;
    const pipelineValue = myStats.pipeline_value || 0;
    const convertedValue = myStats.converted_value || 0;
    const active = total - converted - abandoned;
    const conversionRate = total ? Math.round((converted / total) * 100) : 0;

    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-6 p-6">
          <div><h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Mon tableau de bord</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Bonjour {user?.name?.split(" ")[0] || ""}, voici votre activité</p></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StatCard icon={Users2} label="Mes prospects" value={total} tone="sky" sub={`${active} actifs · ${converted} convertis`} />
            <StatCard icon={TrendingUp} label="Taux conversion" value={`${conversionRate}%`} tone="emerald" />
            <StatCard icon={Activity} label="Pipeline actif" value={Math.round(pipelineValue).toLocaleString("fr-FR") + " FCFA"} tone="indigo" />
            <StatCard icon={DollarSign} label="CA validé" value={Math.round(convertedValue).toLocaleString("fr-FR") + " FCFA"} tone="amber" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><TrendingUp size={16} /></span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Activité ({days} jours)</h3>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={myTimeline}>
                  <defs>
                    <linearGradient id="gradProspects2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3660db" stopOpacity={0.4} /><stop offset="100%" stopColor="#3660db" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke(dark)} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: axisFill(dark) }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: axisFill(dark) }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle(dark)} labelStyle={{ color: tooltipText(dark) }} itemStyle={{ color: tooltipText(dark) }} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  <Area type="monotone" dataKey="n" name="Prospects créés" stroke="#3660db" strokeWidth={2} fill="url(#gradProspects2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"><ChartPie size={16} /></span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Prospects par étape</h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={myStageData} barSize={42}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke(dark)} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: axisFill(dark) }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: axisFill(dark) }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle(dark)} labelStyle={{ color: tooltipText(dark) }} itemStyle={{ color: tooltipText(dark) }} cursor={{ fill: "rgb(148 163 184 / 0.1)" }} />
                  <Bar dataKey="value" name="Prospects" radius={[8, 8, 0, 0]}><Cell fill="#0ea5e9" /></Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {targets && targets.users.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><Target size={16} /></span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Mon objectif — {yearMonth}</h3>
              </div>
              {targets.users.map((u) => {
                if (u.id !== user?.id) return null;
                const pct = u.target_value > 0 ? Math.round((u.achieved / u.target_value) * 100) : 0;
                return (
                  <div key={u.id}>
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="font-semibold">Objectif mensuel</span>
                      <span className="text-xs text-slate-400">{Math.round(u.achieved).toLocaleString("fr-FR")} FCFA / {u.target_value.toLocaleString("fr-FR")} FCFA {u.target_value > 0 && <span className={`ml-1 font-semibold ${pct >= 100 ? "text-emerald-500" : "text-indigo-500"}`}>· {pct}%</span>}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}
          {!targets && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><Target size={16} /></span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Objectifs</h3>
              </div>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Contactez votre manager pour définir vos objectifs mensuels.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <div className="flex h-full items-center justify-center text-sm text-slate-400">Rôle non reconnu</div>;
}