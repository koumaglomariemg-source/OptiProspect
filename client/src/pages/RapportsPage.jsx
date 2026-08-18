import { useEffect, useState } from "react";
import { Check, FileText, Phone, Send, X } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatDate, REPORT_STATUS, initials } from "../constants.js";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800";

export default function RapportsPage() {
  const { user } = useAuth();
  const isManager = ["admin", "manager"].includes(user?.role);
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    period_start: "",
    period_end: "",
    calls: 0,
    visits: 0,
    emails: 0,
    content: "",
  });

  const load = () => {
    setError("");
    api
      .reports(status ? { status } : {})
      .then(setReports)
      .catch((err) => setError(err.message));
  };
  useEffect(load, [status]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createReport({
        ...form,
        calls: Number(form.calls) || 0,
        visits: Number(form.visits) || 0,
        emails: Number(form.emails) || 0,
      });
      setForm({
        period_start: "",
        period_end: "",
        calls: 0,
        visits: 0,
        emails: 0,
        content: "",
      });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const review = async (r, decision) => {
    const comment =
      decision === "refuse" ? prompt("Motif du refus :") || "" : "";
    if (decision === "refuse" && !comment.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api.reviewReport(r.id, decision, comment);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div>
          <h1 className="text-xl font-bold">Rapports d'activité</h1>
          <p className="text-sm text-slate-400">
            {isManager
              ? "Validez les rapports soumis par vos commerciaux"
              : "Renseignez votre activité hebdomadaire"}
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">
            {error}
          </div>
        )}

        {!isManager && (
          <form
            onSubmit={submit}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-2 font-semibold">
              <FileText size={16} className="text-indigo-500" /> Soumettre un
              rapport
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Du
                </label>
                <input
                  className={inputCls}
                  type="date"
                  value={form.period_start}
                  onChange={(e) =>
                    setForm({ ...form, period_start: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Au
                </label>
                <input
                  className={inputCls}
                  type="date"
                  value={form.period_end}
                  onChange={(e) =>
                    setForm({ ...form, period_end: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Appels
                </label>
                <input
                  className={inputCls}
                  type="number"
                  min="0"
                  value={form.calls}
                  onChange={(e) => setForm({ ...form, calls: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Visites terrain
                </label>
                <input
                  className={inputCls}
                  type="number"
                  min="0"
                  value={form.visits}
                  onChange={(e) => setForm({ ...form, visits: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Emails envoyés
                </label>
                <input
                  className={inputCls}
                  type="number"
                  min="0"
                  value={form.emails}
                  onChange={(e) => setForm({ ...form, emails: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Compte rendu *
                </label>
                <textarea
                  className={inputCls}
                  rows="5"
                  required
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                  placeholder="Prospects contactés, avancements, obstacles, besoins…"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy || !form.content.trim()}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {busy ? "Envoi…" : "Soumettre le rapport"}
              </button>
            </div>
          </form>
        )}

        <div className="flex flex-wrap gap-2">
          {[
            { key: "", label: "Tous" },
            ...Object.entries(REPORT_STATUS).map(([key, v]) => ({
              key,
              label: v.label,
            })),
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${status === f.key ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {reports.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              Aucun rapport pour le moment
            </div>
          )}
          {reports.map((r) => {
            const st = REPORT_STATUS[r.status] || {
              label: r.status,
              badge: "bg-slate-400/15 text-slate-500",
            };
            return (
              <div
                key={r.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                      {initials(r.user_name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {r.user_name || "—"}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.badge}`}
                        >
                          {st.label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatDate(r.created_at)}
                        {r.period_start && (
                          <>
                            {" "}
                            · {r.period_start} → {r.period_end || "aujourd'hui"}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {isManager && r.status === "en_attente" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => review(r, "valide")}
                        disabled={busy}
                        className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                      >
                        <Check size={13} /> Valider
                      </button>
                      <button
                        onClick={() => review(r, "refuse")}
                        disabled={busy}
                        className="flex items-center gap-1 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
                      >
                        <X size={13} /> Refuser
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1">
                    <Phone size={12} /> {r.calls} appels
                  </span>
                  <span className="flex items-center gap-1">
                    <Send size={12} /> {r.emails} emails
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText size={12} /> {r.visits} visites
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
                  {r.content}
                </p>

                {r.review_comment && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
                    <span className="font-semibold">Avis du manager : </span>
                    {r.review_comment}
                  </div>
                )}
                {r.reviewed_by_name && (
                  <div className="mt-2 text-xs text-slate-400">
                    Décision prise par {r.reviewed_by_name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
