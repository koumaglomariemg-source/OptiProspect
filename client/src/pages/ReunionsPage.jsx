import { useEffect, useState } from "react";
import {
  CalendarClock,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import { api } from "../api.js";
import { useRefresh } from "../hooks/useRefresh.js";
import { useAuth } from "../context/AuthContext.jsx";
import { initials } from "../constants.js";
import Modal from "../components/Modal.jsx";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800";

const TYPE_BADGE = {
  en_ligne: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  presentiel: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
};

function MeetingForm({ meeting, users, onClose, onSaved }) {
  const [title, setTitle] = useState(meeting?.title || "");
  const [type, setType] = useState(meeting?.type || "en_ligne");
  const [location, setLocation] = useState(meeting?.location || "");
  const [meetingLink, setMeetingLink] = useState(meeting?.meeting_link || "");
  const [startsAt, setStartsAt] = useState(
    meeting?.starts_at ? meeting.starts_at.slice(0, 16) : "",
  );
  const [endsAt, setEndsAt] = useState(
    meeting?.ends_at ? meeting.ends_at.slice(0, 16) : "",
  );
  const [notes, setNotes] = useState(meeting?.notes || "");
  const [selected, setSelected] = useState(
    () => meeting?.participants?.map((p) => p.id) || [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id) =>
    setSelected((arr) =>
      arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id],
    );

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError("Le titre est requis");
    const link = meetingLink.trim();
    if (type === "en_ligne" && !link)
      return setError("Un lien Google Meet est requis pour une réunion en ligne");
    const payload = {
      title: title.trim(),
      type,
      location: location.trim() || null,
      meeting_link: link || null,
      starts_at: startsAt || null,
      ends_at: endsAt || null,
      notes: notes.trim() || null,
      participants: selected,
    };
    setBusy(true);
    setError("");
    try {
      await (meeting
        ? api.updateMeeting(meeting.id, payload)
        : api.createMeeting(payload));
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={meeting ? "Modifier la réunion" : "Planifier une réunion"}
      onClose={onClose}
      width="max-w-2xl"
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Titre *
          </label>
          <input
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Point hebdo équipe prospection"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Type
            </label>
            <select
              className={inputCls}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="en_ligne">En ligne (Google Meet)</option>
              <option value="presentiel">Présentiel</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Date et heure
            </label>
            <input
              type="datetime-local"
              className={inputCls}
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          {type === "en_ligne" ? (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Lien Google Meet
              </label>
              <input
                className={inputCls}
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Collez ici le lien Google Meet de la réunion.
              </p>
            </div>
          ) : (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Lieu
              </label>
              <input
                className={inputCls}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Salle de réunion, adresse…"
              />
            </div>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Notes / ordre du jour
          </label>
          <textarea
            className={inputCls}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Points à aborder…"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Participants ({selected.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => toggle(u.id)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  selected.includes(u.id)
                    ? "border-indigo-400 bg-indigo-500 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {initials(u.name)}
                {u.name}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? "Enregistrement…" : meeting ? "Enregistrer" : "Planifier"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReunionsPage() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";
  const [meetings, setMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setMeetings(await api.meetings());
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    if (isManager)
      api
        .users()
        .then(setUsers)
        .catch(() => {});
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);
  useRefresh(() => load(), 30000);

  const remove = async (m) => {
    if (!confirm(`Supprimer la réunion « ${m.title} » ?`)) return;
    await api.deleteMeeting(m.id);
    load();
  };

  const onSaved = () => {
    setFormOpen(false);
    setEditing(null);
    load();
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Réunions</h1>
            <p className="text-sm text-slate-400">
              Plannings et points d'équipe
              {isManager
                ? " — vous pouvez planifier des réunions avec vos commerciaux"
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700"
            >
              <RefreshCw size={14} />
            </button>
            {isManager && (
              <button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                <Plus size={16} /> Planifier
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">
            {error}
          </div>
        )}

        {loading && (
          <div className="py-10 text-center text-sm text-slate-400">
            Chargement…
          </div>
        )}

        {!loading && meetings.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            {isManager
              ? "Aucune réunion planifiée. Créez votre première réunion d'équipe."
              : "Aucune réunion planifiée pour le moment."}
          </div>
        )}

        <div className="space-y-4">
          {meetings.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${TYPE_BADGE[m.type] || TYPE_BADGE.en_ligne}`}
                    >
                      {m.type === "en_ligne" ? (
                        <Video size={11} />
                      ) : (
                        <MapPin size={11} />
                      )}
                      {m.type === "en_ligne" ? "En ligne" : "Présentiel"}
                    </span>
                    <span className="truncate text-base font-bold">
                      {m.title}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <CalendarClock size={14} />
                      {fmtDate(m.starts_at) || "Date à définir"}
                    </span>
                    {m.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin size={14} />
                        {m.location}
                      </span>
                    )}
                    {m.meeting_link && (
                      <a
                        href={m.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 font-medium text-indigo-500 hover:underline"
                      >
                        <Video size={14} /> Rejoindre la réunion
                      </a>
                    )}
                  </div>
                  {m.notes && (
                    <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                      {m.notes}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                      <Users size={12} />
                      {m.participants.length} participant(s)
                    </span>
                    {m.participants.map((p) => (
                      <span
                        key={p.id}
                        className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-100 text-[8px] font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                          {initials(p.name)}
                        </span>
                        {p.name}
                      </span>
                    ))}
                    <span className="text-[11px] text-slate-300">
                      • organisée par {m.created_by_name}
                    </span>
                  </div>
                </div>
                {isManager && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => {
                        setEditing(m);
                        setFormOpen(true);
                      }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-500 dark:hover:bg-slate-800"
                      title="Modifier"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => remove(m)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                      title="Supprimer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {formOpen && (
        <MeetingForm
          meeting={editing}
          users={users}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
