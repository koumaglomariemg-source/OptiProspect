import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Clock,
  FileSignature,
  Phone,
  CalendarDays,
  MessageSquare,
  TrendingUp,
  RotateCw,
} from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useRefresh } from "../hooks/useRefresh.js";
import { formatDate } from "../constants.js";

const RISK_META = {
  overdue: {
    label: "Relance en retard",
    cls: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
  },
  stalled: {
    label: "Sans activité",
    cls: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  },
  pending_validation: {
    label: "Devis à valider",
    cls: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
  },
};

const TYPE_LABEL = {
  email: "Email",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  appel: "Appel",
  visite: "Visite",
  rendezvous: "RDV",
  note: "Note",
};

function SummaryCard({ icon: Icon, label, value, cls }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${cls}`}>
          <Icon size={18} />
        </span>
        <div>
          <div className="text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
            {value}
          </div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MaJourneePage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(false);
    api
      .day()
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  };
  useEffect(load, []);
  useRefresh(() => load(), 30000);

  const markDone = async (a) => {
    setBusy(a.id);
    try {
      await api.markRelanceDone(a.id);
      load();
    } catch {
      /* silencieux */
    } finally {
      setBusy(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        Chargement…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm dark:border-rose-500/20 dark:bg-slate-900">
          <AlertTriangle size={28} className="mx-auto text-rose-500" />
          <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
            Impossible de charger votre journée
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Vérifiez votre connexion puis réessayez.
          </p>
          <button
            type="button"
            onClick={load}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <RotateCw size={14} /> Réessayer
          </button>
        </div>
      </div>
    );
  }

  const relances = data.relances || [];
  const meetings = data.meetings || [];
  const atRisk = data.at_risk || [];
  const devis = data.devis || [];
  const toTreat = data.to_treat || [];
  const recent = data.recent_interactions || [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Ma journée
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {user?.name ? `${user.name.split(" ")[0]}, ` : ""}voici ce qui
            demande votre attention aujourd'hui.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryCard
            icon={Clock}
            label="Relances du jour"
            value={data.counts.relances_today}
            cls="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
          />
          <SummaryCard
            icon={CalendarClock}
            label="Rendez-vous (7j)"
            value={data.counts.meetings}
            cls="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"
          />
          <SummaryCard
            icon={FileSignature}
            label="Devis en cours"
            value={data.counts.devis_pending}
            cls="bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300"
          />
          <SummaryCard
            icon={AlertTriangle}
            label="Affaires à risque"
            value={data.counts.at_risk}
            cls="bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                <Clock size={16} />
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Relances à faire
              </h3>
            </div>
            {relances.length === 0 && (
              <p className="text-sm text-slate-400">Aucune relance à faire.</p>
            )}
            <div className="space-y-3">
              {relances.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      r.is_today
                        ? "bg-rose-100 text-rose-600 dark:bg-rose-500/15"
                        : "bg-amber-100 text-amber-600 dark:bg-amber-500/15"
                    }`}
                  >
                    {r.is_today ? <AlertTriangle size={16} /> : <Clock size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/recherche`}
                      className="truncate text-sm font-semibold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-300"
                    >
                      {r.name}{" "}
                      <span className="font-normal text-slate-400">· {r.company}</span>
                    </Link>
                    <div className="truncate text-xs text-slate-500">
                      {r.next_action} — {formatDate(r.next_action_date)}
                      {r.is_today && (
                        <span className="ml-1 font-semibold text-rose-500">
                          (en retard)
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => markDone(r)}
                    disabled={busy === r.id}
                    title="Marquer comme faite"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-500/10 dark:text-emerald-400"
                  >
                    <Check size={13} />
                  </button>
                </div>
              ))}
            </div>
            {toTreat.length > 0 && (
              <>
                <div className="mb-2 mt-4 flex items-center gap-2">
                  <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Prospects à traiter
                  </span>
                  <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="space-y-3">
                  {toTreat.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        <TrendingUp size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/recherche`}
                          className="truncate text-sm font-semibold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-300"
                        >
                          {r.name}{" "}
                          <span className="font-normal text-slate-400">
                            · {r.company}
                          </span>
                        </Link>
                        <div className="truncate text-xs text-slate-500">
                          {r.last_interaction
                            ? `Dernière activité le ${formatDate(r.last_interaction)}`
                            : "Aucune activité enregistrée"}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">
                        {r.assignee_name || "Non assigné"}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                <CalendarClock size={16} />
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Prochains rendez-vous
              </h3>
            </div>
            {meetings.length === 0 && (
              <p className="text-sm text-slate-400">Aucun rendez-vous à venir.</p>
            )}
            <div className="space-y-3">
              {meetings.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                    <CalendarDays size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{m.title}</div>
                    <div className="truncate text-xs text-slate-500">
                      {formatDate(m.starts_at)}
                      {m.location ? ` · ${m.location}` : ""}
                    </div>
                  </div>
                  {m.meeting_link && (
                    <a
                      href={m.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                    >
                      Rejoindre
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm dark:border-rose-500/20 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
              <AlertTriangle size={16} />
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Affaires à risque
            </h3>
            <span className="ml-auto rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
              {atRisk.length} alerte(s)
            </span>
          </div>
          {atRisk.length === 0 && (
            <p className="text-sm text-slate-400">
              Aucune affaire à risque. Tout est sous contrôle.
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {atRisk.map((r) => (
              <div
                key={`${r.id}-${r.reasons.join(",")}`}
                className="flex items-start gap-3 rounded-xl border border-rose-100 p-3 dark:border-rose-500/20"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                  <TrendingUp size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{r.name}</span>
                    <span className="text-xs text-slate-400">· {r.company}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {r.reasons.map((reason) => (
                      <span
                        key={reason}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${RISK_META[reason]?.cls || "bg-slate-100 text-slate-600 dark:bg-slate-800"}`}
                      >
                        {RISK_META[reason]?.label || reason}
                      </span>
                    ))}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {r.days} j
                    </span>
                  </div>
                  {r.value > 0 && (
                    <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {Math.round(r.value).toLocaleString("fr-FR")} FCFA
                    </div>
                  )}
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {r.assignee_name || "Non assigné"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
                <FileSignature size={16} />
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Devis en cours
              </h3>
            </div>
            {devis.length === 0 && (
              <p className="text-sm text-slate-400">Aucun devis en cours.</p>
            )}
            <div className="space-y-3">
              {devis.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
                    <FileSignature size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{d.titre}</div>
                    <div className="truncate text-xs text-slate-500">
                      {d.reference} · {d.prospect_name} ·{" "}
                      {Math.round(d.montant).toLocaleString("fr-FR")} FCFA
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {d.statut === "valide" ? "En signature" : "À valider"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                <MessageSquare size={16} />
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Activité récente
              </h3>
            </div>
            {recent.length === 0 && (
              <p className="text-sm text-slate-400">Aucune activité récente.</p>
            )}
            <div className="space-y-3">
              {recent.map((i) => (
                <div
                  key={i.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                    {i.type === "appel" ? <Phone size={16} /> : <MessageSquare size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {i.prospect_name}{" "}
                      <span className="font-normal text-slate-400">
                        · {TYPE_LABEL[i.type] || i.type}
                      </span>
                    </div>
                    <div className="line-clamp-2 text-xs text-slate-500">{i.content}</div>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {formatDate(i.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
