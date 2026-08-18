import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  CheckCircle2,
  Loader2,
  MessageSquare,
  Phone,
  Send,
  ThumbsDown,
  ThumbsUp,
  Clock,
} from "lucide-react";
import { api } from "../api.js";

const INTERESTS = [
  {
    key: "interesse",
    label: "Intéressé(e)",
    desc: "Je suis intéressé(e) par votre proposition",
    icon: ThumbsUp,
  },
  {
    key: "plus_tard",
    label: "À reconsidérer",
    desc: "Pas pour le moment, mais gardez le contact",
    icon: Clock,
  },
  {
    key: "pas_interesse",
    label: "Pas intéressé(e)",
    desc: "Merci de ne plus me relancer",
    icon: ThumbsDown,
  },
];

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800";

function Shell({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {children}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="mb-6 flex items-center gap-3">
      <img
        src="/icons/icon-192.png"
        alt="OptiProspect"
        className="h-10 w-10 rounded-lg object-cover shadow-sm"
      />
      <div>
        <h1 className="text-base font-bold leading-tight text-slate-900 dark:text-white">
          OptiProspect
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Nous vous recontactons rapidement
        </p>
      </div>
    </div>
  );
}

function ProspectResponse({ id, token }) {
  const [prospect, setProspect] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [interest, setInterest] = useState("");
  const [wantsContact, setWantsContact] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api
      .publicProspectInfo(id, token)
      .then(setProspect)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  const submit = async (e) => {
    e.preventDefault();
    if (!interest) return;
    setBusy(true);
    setError("");
    try {
      await api.publicRespond(id, {
        token,
        interest,
        wants_contact: wantsContact,
        message,
      });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2
          size={28}
          className="animate-spin text-indigo-600 dark:text-indigo-400"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CheckCircle2 size={40} className="mx-auto text-rose-500" />
          <h1 className="mt-4 text-xl font-bold">Lien invalide</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Ce lien est invalide ou a expiré. Contactez directement votre
            interlocuteur pour toute question.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
          <h1 className="mt-4 text-2xl font-bold">
            Merci pour votre réponse !
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Votre retour a bien été transmis à notre équipe.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Shell>
      <Header />
      <h2 className="text-xl font-bold">{prospect.name}</h2>
      {prospect.company && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {prospect.company}
        </p>
      )}
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        Merci de nous donner votre avis sur notre proposition. Votre réponse
        nous aide à mieux vous accompagner.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-2">
          {INTERESTS.map(({ key, label, desc, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setInterest(key)}
              className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                interest === key
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                  : "border-slate-200 hover:border-indigo-300 dark:border-slate-700"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${interest === key ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-400 dark:bg-slate-700"}`}
              >
                <Icon size={17} />
              </span>
              <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {desc}
                </span>
              </span>
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-3 text-sm font-medium dark:bg-slate-800">
          <input
            type="checkbox"
            checked={wantsContact}
            onChange={(e) => setWantsContact(e.target.checked)}
            className="h-4 w-4 accent-indigo-500"
          />
          <Phone size={15} className="text-indigo-500" />
          Souhaitez-vous être recontacté(e) ?
        </label>

        <div className="relative">
          <MessageSquare
            size={15}
            className="absolute left-3 top-3 text-slate-400"
          />
          <textarea
            className={`${inputCls} pl-9`}
            rows="3"
            placeholder="Un commentaire à ajouter ? (optionnel)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !interest}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          {busy ? "Envoi…" : "Envoyer ma réponse"}
        </button>
      </form>
    </Shell>
  );
}

export default function ContactPage() {
  const { id, token } = useParams();
  return <ProspectResponse id={id} token={token} />;
}
