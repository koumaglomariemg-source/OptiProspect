import { useEffect, useState } from "react";
import {
  CalendarClock,
  FileSignature,
  MessageSquare,
  Phone,
  Target,
  Users,
  X,
} from "lucide-react";
import { api } from "../api.js";
import {
  formatDate,
  initials,
  ROLE_BADGE,
  ROLE_LABEL,
  STAGE_BY_KEY,
} from "../constants.js";
import Modal from "./Modal.jsx";

const eur = (v) => `${Number(v || 0).toLocaleString("fr-FR")} FCFA`;

export default function UserDetailModal({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .userDetail(userId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  const isManager = data?.role === "manager";
  const isAdmin = data?.role === "admin";

  return (
    <Modal
      title={data ? `Fiche utilisateur — ${data.name}` : "Fiche utilisateur"}
      onClose={onClose}
      width="max-w-3xl"
    >
      {loading && (
        <div className="py-10 text-center text-sm text-slate-400">
          Chargement…
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
              {initials(data.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{data.name}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${ROLE_BADGE[data.role] || "bg-slate-100 text-slate-500"}`}
                >
                  {ROLE_LABEL[data.role] || data.role}
                </span>
              </div>
              <div className="text-sm text-slate-400">{data.email}</div>
              <div className="mt-0.5 text-xs text-slate-400">
                Inscrit le {formatDate(data.created_at)}
                {data.role === "commercial" && (
                  <> · Équipe : {data.manager_name || "non affecté"}</>
                )}
                {isManager && (
                  <> · Équipe de {data.team_size ?? 0} commerciaux</>
                )}
                {data.stats?.last_login && (
                  <>
                    {" "}
                    · Dernière connexion : {formatDate(data.stats.last_login)}
                  </>
                )}
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="rounded-xl bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
              Compte administrateur — gère la configuration, les équipes et les
              référentiels. Aucune donnée de prospection.
            </div>
          )}

          {isManager && (
            <>
              <div className="rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                Les statistiques ci-dessous couvrent toute son équipe (
                {data.team_size ?? 0} commercial(s)).
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    label: "Prospects (équipe)",
                    value: String(data.stats?.total ?? 0),
                    icon: Users,
                    cls: "text-indigo-500",
                  },
                  {
                    label: "Pipeline (valeur)",
                    value: eur(data.stats?.pipeline_value),
                    icon: Target,
                    cls: "text-violet-500",
                  },
                  {
                    label: "Converti",
                    value: eur(data.stats?.converted_value),
                    icon: FileSignature,
                    cls: "text-emerald-500",
                  },
                  {
                    label: "Relances à faire",
                    value: String(data.stats?.reminders_pending ?? 0),
                    icon: Phone,
                    cls: "text-amber-500",
                  },
                ].map((c) => (
                  <div
                    key={c.label}
                    className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800"
                  >
                    <div
                      className={`flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 ${c.cls}`}
                    >
                      <c.icon size={13} /> {c.label}
                    </div>
                    <div className="mt-1 truncate text-lg font-bold">
                      {c.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <Users size={13} /> Commerciaux de l'équipe (
                  {data.team_members?.length ?? 0})
                </div>
                {(data.team_members || []).length === 0 && (
                  <div className="text-sm text-slate-400">
                    Aucun commercial dans cette équipe
                  </div>
                )}
                <div className="space-y-2">
                  {(data.team_members || []).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                        {initials(m.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{m.name}</div>
                        <div className="truncate text-[11px] text-slate-400">
                          {m.email}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-semibold">
                          {m.prospects} prospects
                        </div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          {m.converted} convertis · {eur(m.ca_converted)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Par étape (équipe)
                </div>
                {(data.stats?.by_stage || []).map((s) => (
                  <div
                    key={s.stage}
                    className="flex items-center justify-between py-1 text-sm"
                  >
                    <span className="text-slate-500 dark:text-slate-400">
                      {STAGE_BY_KEY[s.stage]?.label || s.stage}
                    </span>
                    <span className="font-semibold">{s.n}</span>
                  </div>
                ))}
                {(data.stats?.by_stage || []).length === 0 && (
                  <div className="text-sm text-slate-400">Aucun prospect</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                  <div className="text-lg font-bold">
                    {data.stats?.interactions ?? 0}
                  </div>
                  <div className="text-[11px] font-medium text-slate-400">
                    Interactions
                  </div>
                  {data.stats?.last_interaction && (
                    <div className="mt-0.5 text-[10px] text-slate-400">
                      {formatDate(data.stats.last_interaction)}
                    </div>
                  )}
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                  <div className="text-lg font-bold">
                    {data.stats?.devis?.valid ?? 0}
                    <span className="text-xs font-medium text-slate-400">
                      /{data.stats?.devis?.total ?? 0}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-400">
                    Devis validés
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-400">
                    {eur(data.stats?.devis?.valid_total)}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                  <div className="text-lg font-bold">
                    {data.stats?.reports?.pending ?? 0}
                    <span className="text-xs font-medium text-slate-400">
                      /{data.stats?.reports?.total ?? 0}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-400">
                    Rapports en attente
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                  <div className="text-lg font-bold">
                    {data.stats?.upcoming_meetings ?? 0}
                  </div>
                  <div className="text-[11px] font-medium text-slate-400">
                    Réunions à venir
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <Target size={13} /> Objectifs (6 derniers mois)
                </div>
                {(data.stats?.targets || []).length === 0 && (
                  <div className="text-sm text-slate-400">
                    Aucun objectif défini
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(data.stats?.targets || []).map((t) => (
                    <div
                      key={t.year_month}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60"
                    >
                      <span className="font-medium">{t.year_month}</span>
                      <span className="font-bold">{eur(t.target_value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {data.role === "commercial" && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    label: "Prospects",
                    value: String(data.stats?.total ?? 0),
                    icon: Users,
                    cls: "text-indigo-500",
                  },
                  {
                    label: "Pipeline (valeur)",
                    value: eur(data.stats?.pipeline_value),
                    icon: Target,
                    cls: "text-violet-500",
                  },
                  {
                    label: "Converti",
                    value: eur(data.stats?.converted_value),
                    icon: FileSignature,
                    cls: "text-emerald-500",
                  },
                  {
                    label: "Relances à faire",
                    value: String(data.stats?.reminders_pending ?? 0),
                    icon: Phone,
                    cls: "text-amber-500",
                  },
                ].map((c) => (
                  <div
                    key={c.label}
                    className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800"
                  >
                    <div
                      className={`flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 ${c.cls}`}
                    >
                      <c.icon size={13} /> {c.label}
                    </div>
                    <div className="mt-1 truncate text-lg font-bold">
                      {c.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Par étape
                </div>
                {(data.stats?.by_stage || []).map((s) => (
                  <div
                    key={s.stage}
                    className="flex items-center justify-between py-1 text-sm"
                  >
                    <span className="text-slate-500 dark:text-slate-400">
                      {STAGE_BY_KEY[s.stage]?.label || s.stage}
                    </span>
                    <span className="font-semibold">{s.n}</span>
                  </div>
                ))}
                {(data.stats?.by_stage || []).length === 0 && (
                  <div className="text-sm text-slate-400">Aucun prospect</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                  <div className="text-lg font-bold">
                    {data.stats?.interactions ?? 0}
                  </div>
                  <div className="text-[11px] font-medium text-slate-400">
                    Interactions
                  </div>
                  {data.stats?.last_interaction && (
                    <div className="mt-0.5 text-[10px] text-slate-400">
                      {formatDate(data.stats.last_interaction)}
                    </div>
                  )}
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                  <div className="text-lg font-bold">
                    {data.stats?.devis?.valid ?? 0}
                    <span className="text-xs font-medium text-slate-400">
                      /{data.stats?.devis?.total ?? 0}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-400">
                    Devis validés
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-400">
                    {eur(data.stats?.devis?.valid_total)}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                  <div className="text-lg font-bold">
                    {data.stats?.reports?.pending ?? 0}
                    <span className="text-xs font-medium text-slate-400">
                      /{data.stats?.reports?.total ?? 0}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-400">
                    Rapports en attente
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                  <div className="text-lg font-bold">
                    {data.stats?.upcoming_meetings ?? 0}
                  </div>
                  <div className="text-[11px] font-medium text-slate-400">
                    Réunions à venir
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <Target size={13} /> Objectifs (6 derniers mois)
                </div>
                {(data.stats?.targets || []).length === 0 && (
                  <div className="text-sm text-slate-400">
                    Aucun objectif défini
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(data.stats?.targets || []).map((t) => (
                    <div
                      key={t.year_month}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60"
                    >
                      <span className="font-medium">{t.year_month}</span>
                      <span className="font-bold">{eur(t.target_value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <X size={15} /> Fermer
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
