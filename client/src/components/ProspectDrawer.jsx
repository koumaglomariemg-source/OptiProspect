import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  ClipboardCheck,
  Copy,
  Euro,
  FileSignature,
  FileText,
  History,
  Lightbulb,
  Link2,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Send,
  ThumbsDown,
  Trash2,
  UserRound,
  X,
  Linkedin,
} from "lucide-react";
import { api } from "../api.js";
import {
  formatDate,
  INTERACTION_LABEL,
  INTERACTION_TYPES,
  SOURCE_LABEL,
  STAGE_BY_KEY,
  DEVIS_STATUS,
  PERIOD_LABEL,
  scoreColor,
} from "../constants.js";
import { useStages } from "../hooks/useStages.js";
import { useAuth } from "../context/AuthContext.jsx";
import DevisFormModal from "./DevisFormModal.jsx";
import StepFormModal from "./StepFormModal.jsx";

const pad = (n) => String(n).padStart(2, "0");
const toLocalDT = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;

const TABS = [
  { key: "fiche", label: "Fiche", icon: UserRound },
  { key: "pipeline", label: "Pipeline", icon: ClipboardCheck },
  { key: "interactions", label: "Interactions", icon: MessageSquare },
  { key: "historique", label: "Historique", icon: History },
  { key: "messages", label: "Messages", icon: Send },
];

const EVENT_META = {
  creation: {
    label: "Prospect créé",
    color:
      "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300",
    icon: Plus,
  },
  etape: {
    label: "Étape modifiée",
    color:
      "text-indigo-600 bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300",
    icon: ArrowRight,
  },
  assignation: {
    label: "Commercial modifié",
    color:
      "text-violet-600 bg-violet-100 dark:bg-violet-500/20 dark:text-violet-300",
    icon: UserRound,
  },
  valeur: {
    label: "Valeur estimée modifiée",
    color:
      "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300",
    icon: Euro,
  },
  action: {
    label: "Prochaine action modifiée",
    color: "text-sky-600 bg-sky-100 dark:bg-sky-500/20 dark:text-sky-300",
    icon: CalendarClock,
  },
  champ: {
    label: "Champ modifié",
    color: "text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-300",
    icon: Pencil,
  },
  interaction: {
    label: "Interaction ajoutée",
    color: "text-sky-600 bg-sky-100 dark:bg-sky-500/20 dark:text-sky-300",
    icon: MessageSquare,
  },
};

export default function ProspectDrawer({
  prospect,
  onClose,
  onChanged,
  onEdit,
}) {
  const { byKey } = useStages();
  const { user } = useAuth();
  const isManager = ["manager", "admin"].includes(user?.role);
  const canWrite = user?.role !== "manager";
  const [tab, setTab] = useState("interactions");
  const [interactions, setInteractions] = useState([]);
  const [devisList, setDevisList] = useState([]);
  const [devisModal, setDevisModal] = useState(null);
  const [events, setEvents] = useState([]);
  const [refusalReasons, setRefusalReasons] = useState([]);
  const [type, setType] = useState("note");
  const [content, setContent] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [interactionDate, setInteractionDate] = useState(toLocalDT(new Date()));
  const [planRelance, setPlanRelance] = useState(false);
  const [nextAction, setNextAction] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [message, setMessage] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [copied, setCopied] = useState("");
  const [drafts, setDrafts] = useState({
    subject: "",
    email: "",
    whatsapp: "",
    linkedin: "",
  });
  const [sendStatus, setSendStatus] = useState("");
  const sendStatusTimer = useRef(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [assignUsers, setAssignUsers] = useState([]);
  const [assignedTo, setAssignedTo] = useState(prospect.assigned_to || "");
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignMsg, setAssignMsg] = useState("");
  const [stepOpen, setStepOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [live, setLive] = useState(prospect);
  const bodyRef = useRef(null);

  useEffect(() => setLive(prospect), [prospect]);

  const stage = byKey[prospect.stage] || STAGE_BY_KEY[prospect.stage];

  const relanceDateInvalid =
    planRelance &&
    nextActionDate &&
    new Date(nextActionDate) < new Date();

  const loadInteractions = () => {
    api
      .interactions(prospect.id)
      .then(setInteractions)
      .catch(() => {});
  };

  const loadDevis = () => {
    api
      .devis({ prospect_id: prospect.id })
      .then(setDevisList)
      .catch(() => {});
  };

  const loadEvents = () => {
    api
      .events(prospect.id)
      .then(setEvents)
      .catch(() => {});
  };

  useEffect(loadInteractions, [prospect.id]);
  useEffect(loadDevis, [prospect.id]);
  useEffect(loadEvents, [prospect.id]);

  useEffect(() => {
    api
      .settings()
      .then((s) => {
        if (Array.isArray(s.refusal_reasons))
          setRefusalReasons(s.refusal_reasons);
      })
      .catch(() => {});
  }, []);

  // Liste des commerciaux assignables (managers/admins uniquement)
  useEffect(() => {
    if (user?.role === "manager" || user?.role === "admin") {
      api
        .users()
        .then((rows) =>
          setAssignUsers(rows.filter((u) => u.role === "commercial")),
        )
        .catch(() => {});
    }
  }, [user?.role]);

  useEffect(() => {
    setAssignedTo(prospect.assigned_to || "");
    setAssignMsg("");
  }, [prospect.id, prospect.assigned_to]);

  const assignTo = async (val) => {
    setAssignBusy(true);
    setAssignMsg("");
    try {
      await api.updateProspect(prospect.id, { assigned_to: val || null });
      setAssignedTo(val ? String(val) : "");
      setAssignMsg("Assignation enregistrée");
      setTimeout(() => setAssignMsg(""), 2500);
      onChanged();
    } catch (e) {
      setAssignMsg(e.message);
      setTimeout(() => setAssignMsg(""), 4000);
    } finally {
      setAssignBusy(false);
    }
  };

  const onDevisSaved = (d) => {
    setDevisModal(null);
    loadDevis();
    onChanged();
  };

  const reviewDevis = async (d, decision) => {
    let comment = "";
    if (decision === "refuse") {
      const reason = prompt(
        "Choisir un motif de refus (optionnel) :\n" + refusalReasons.join("\n"),
        refusalReasons[0] || "",
      );
      if (reason === null) return;
      comment = reason;
    }
    if (decision === "refuse" && !comment.trim()) return;
    try {
      await api[decision === "valide" ? "validateDevis" : "refuseDevis"](
        d.id,
        comment,
      );
      loadDevis();
      onChanged();
    } catch (err) {
      alert(err.message);
    }
  };

  const loadMessages = async () => {
    if (message) return;
    setLoadingMsg(true);
    try {
      const m = await api.suggestMessage(prospect.id);
      setMessage(m);
      setDrafts({
        subject: m.subject || "",
        email: m.email || "",
        whatsapp: m.whatsapp || "",
        linkedin: m.linkedin || "",
      });
    } catch {
    } finally {
      setLoadingMsg(false);
    }
  };

  const sendMessage = async (channel) => {
    const content = (drafts[channel] || "").trim();
    if (!content) return;
    setSendStatus("");
    try {
      await api.sendMessage(prospect.id, {
        channel,
        subject: drafts.subject,
        content,
      });
      setSendStatus("Message envoyé ✓");
      clearTimeout(sendStatusTimer.current);
      sendStatusTimer.current = setTimeout(() => setSendStatus(""), 2500);
      loadInteractions();
      onChanged();
    } catch (e) {
      setSendStatus(`Erreur : ${e.message}`);
      clearTimeout(sendStatusTimer.current);
      sendStatusTimer.current = setTimeout(() => setSendStatus(""), 4000);
    }
  };

  const resetDraft = (channel) => {
    if (!message) return;
    setDrafts((d) => ({ ...d, [channel]: message[channel] }));
    setSendStatus("");
  };

  const addInteraction = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (planRelance) {
      if (!nextActionDate) return;
      if (new Date(nextActionDate) < new Date()) return;
      await api.updateProspect(prospect.id, {
        next_action: nextAction.trim() || prospect.next_action || null,
        next_action_date: nextActionDate || prospect.next_action_date || null,
      });
    }
    await api.addInteraction(prospect.id, {
      type,
      content,
      date: interactionDate,
    });
    setContent("");
    setShowForm(false);
    setPlanRelance(false);
    setNextAction("");
    setNextActionDate("");
    setSavedMsg("Interaction enregistrée ✓");
    setTimeout(() => setSavedMsg(""), 2500);
    loadInteractions();
    onChanged();
  };

  const removeInteraction = async (id) => {
    await api.deleteInteraction(id);
    loadInteractions();
    onChanged();
  };

  const copy = async (text, key) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  };

  const copyResponseLink = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}/contact/${prospect.id}/${prospect.contact_token}`,
    );
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  };

  const applySuggestion = async () => {
    if (!message?.next_action_suggestion) return;
    await api.updateProspect(prospect.id, {
      next_action: message.next_action_suggestion,
    });
    onChanged();
  };

  const markRelanceDone = async () => {
    const updated = await api.markRelanceDone(prospect.id);
    setLive(updated);
    onChanged();
  };

  const removeProspect = async () => {
    await api.deleteProspect(prospect.id);
    onClose();
    onChanged();
  };

  const infoRow = (icon, label, value, href) => (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </div>
        {value ? (
          href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sm font-medium text-indigo-500 hover:underline"
            >
              {value}
            </a>
          ) : (
            <div className="break-all text-sm font-medium">{value}</div>
          )
        ) : (
          <div className="text-sm text-slate-400">—</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl dark:bg-slate-900 lg:rounded-l-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-bold">{prospect.name}</h2>
              {stage && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${stage.badge}`}
                >
                  {stage.label}
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
              <Building2 size={14} />
              {prospect.company || "Sans société"}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {canWrite && (
              <button
                onClick={onEdit}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-500 dark:hover:bg-slate-800"
                title="Modifier"
              >
                <Pencil size={17} />
              </button>
            )}
            {canWrite && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                title="Supprimer"
              >
                <Trash2 size={17} />
              </button>
            )}
            {prospect.contact_token && (
              <button
                onClick={copyResponseLink}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-500 dark:hover:bg-slate-800"
                title={
                  linkCopied
                    ? "Lien copié !"
                    : "Copier le lien de réponse du prospect"
                }
              >
                <Link2 size={17} />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-3 pb-2 dark:border-slate-800">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                if (key === "messages") loadMessages();
              }}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-xl px-3 py-2 text-sm font-semibold transition ${
                tab === key
                  ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto p-5">
          {tab === "pipeline" && (
            <div className="space-y-4">
              {prospect.steps_total > 0 && (
                <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">
                      Progression du pipeline
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {prospect.steps_done}/{prospect.steps_total}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: prospect.steps_total
                          ? `${(prospect.steps_done / prospect.steps_total) * 100}%`
                          : "0%",
                      }}
                    />
                  </div>
                  {prospect.current_step && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                      <ClipboardCheck size={15} />
                      Étape courante : {prospect.current_step.name}
                    </div>
                  )}
                  {canWrite && (
                    <button
                      onClick={() => setStepOpen(true)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                      Renseigner / valider l'étape <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-slate-100 p-4 text-sm dark:border-slate-800">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Informations de terrain
                </div>
                <div className="grid grid-cols-1 gap-2 text-slate-600 sm:grid-cols-2 dark:text-slate-300">
                  <div>
                    Quartier :{" "}
                    <span className="font-medium">
                      {prospect.quartier || "—"}
                    </span>
                  </div>
                  <div>
                    N° :{" "}
                    <span className="font-medium">
                      {prospect.numero || "—"}
                    </span>
                  </div>
                  <div>
                    Effectif :{" "}
                    <span className="font-medium">
                      {prospect.effectif
                        ? `${prospect.effectif} salarié(s)`
                        : "—"}
                    </span>
                  </div>
                  <div>
                    Modèle :{" "}
                    <span className="font-medium">
                      {prospect.template_id
                        ? `#${prospect.template_id}`
                        : "par défaut"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "interactions" && (
            <>
              {canWrite && !showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-semibold text-slate-500 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
                >
                  <Plus size={16} /> Nouvelle interaction
                </button>
              )}

              {savedMsg && (
                <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  {savedMsg}
                </div>
              )}

              {canWrite && showForm && (
                <form
                  onSubmit={addInteraction}
                  className="space-y-2 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"
                >
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900"
                    >
                      {INTERACTION_TYPES.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <span className="ml-auto self-center text-[11px] text-slate-400">
                      {INTERACTION_LABEL[type]}
                    </span>
                  </div>
                  <input
                    type="datetime-local"
                    value={interactionDate}
                    onChange={(e) => setInteractionDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900"
                  />
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Compte-rendu de l'échange…"
                    rows="3"
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900"
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={planRelance}
                      onChange={(e) => setPlanRelance(e.target.checked)}
                      className="h-4 w-4 accent-indigo-500"
                    />
                    Planifier une relance future
                  </label>
                  {planRelance && (
                    <div className="space-y-2 rounded-xl bg-white p-3 dark:bg-slate-900">
                      <input
                        value={nextAction}
                        onChange={(e) => setNextAction(e.target.value)}
                        placeholder="Prochaine action à effectuer"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900"
                      />
                      <input
                        type="datetime-local"
                        value={nextActionDate}
                        onChange={(e) => setNextActionDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                  )}
                  {relanceDateInvalid && (
                    <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                      La date et l'heure de relance ne peuvent pas être dans le passé.
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={!content.trim() || relanceDateInvalid}
                    className="w-full rounded-xl bg-indigo-500 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-50"
                  >
                    Enregistrer
                  </button>
                </form>
              )}

              <div className="mt-5 space-y-3">
                {interactions.length === 0 && (
                  <div className="py-8 text-center text-sm text-slate-400">
                    Aucune interaction enregistrée
                  </div>
                )}
                {interactions.map((it) => (
                  <div
                    key={it.id}
                    className="group flex items-start gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-800"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                      {(it.user_name || "?").slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                          {INTERACTION_LABEL[it.type] || it.type}
                        </span>
                        <span className="text-slate-400">
                          {formatDate(it.interaction_date || it.created_at)}
                        </span>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm">
                        {it.content}
                      </p>
                    </div>
                    {canWrite && (
                      <button
                        onClick={() => removeInteraction(it.id)}
                        className="rounded p-1 text-slate-300 opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "historique" && (
            <div className="relative space-y-4 pl-1">
              {events.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-400">
                  Aucun événement enregistré
                </div>
              )}
              {events.map((ev) => {
                const meta = EVENT_META[ev.type] || EVENT_META.champ;
                const Icon = meta.icon;
                let text = "";
                if (ev.type === "etape") {
                  text = `${ev.old_value || "—"} → ${ev.new_value || "—"}`;
                } else if (ev.type === "assignation") {
                  text = ev.old_value
                    ? `${ev.old_value} → ${ev.new_value || "Non assigné"}`
                    : `Assigné à ${ev.new_value || "personne"}`;
                } else if (ev.type === "valeur") {
                  text = `${Number(ev.old_value || 0).toLocaleString("fr-FR")} FCFA → ${Number(ev.new_value || 0).toLocaleString("fr-FR")} FCFA`;
                } else if (ev.type === "action") {
                  text = `${ev.old_value || "—"} → ${ev.new_value || "—"}`;
                } else if (ev.type === "champ") {
                  text = `${ev.field} : ${ev.old_value || "—"} → ${ev.new_value || "—"}`;
                } else if (ev.type === "creation") {
                  text = `Créé par ${ev.user_name || "système"}`;
                } else if (ev.type === "interaction") {
                  text = ev.new_value;
                }
                return (
                  <div key={ev.id} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.color}`}
                    >
                      <Icon size={14} />
                    </span>
                    <div className="min-w-0 flex-1 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold">{meta.label}</span>
                        <span className="text-slate-400">
                          {formatDate(ev.created_at)}
                        </span>
                        {ev.user_name && (
                          <span className="ml-auto text-slate-400">
                            par {ev.user_name}
                          </span>
                        )}
                      </div>
                      {text && <p className="mt-1 text-sm">{text}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "messages" && (
            <div className="space-y-4">
              {loadingMsg && (
                <div className="py-8 text-center text-sm text-slate-400">
                  Génération…
                </div>
              )}
              {message && (
                <>
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                    <div className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                      <Lightbulb size={15} /> Action recommandée
                    </div>
                    <p className="mt-1.5 text-sm">
                      {message.next_action_suggestion}
                    </p>
                    {canWrite && (
                      <button
                        onClick={applySuggestion}
                        className="mt-3 rounded-xl bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-600"
                      >
                        Définir comme prochaine action
                      </button>
                    )}
                  </div>

                  {[
                    {
                      key: "email",
                      label: "Email",
                      icon: Mail,
                      sender: {
                        openLabel: "Ouvrir Gmail",
                        href: prospect.email
                          ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(prospect.email)}&su=${encodeURIComponent(drafts.subject || `Contact ${prospect.name} — ${prospect.company || ""}`.trim())}&body=${encodeURIComponent(drafts.email || "")}`
                          : null,
                        configured: true,
                        hasContact: !!prospect.email,
                        noContact: "Pas d'email renseigné",
                      },
                    },
                    {
                      key: "whatsapp",
                      label: "WhatsApp",
                      icon: MessageSquare,
                      sender: {
                        openLabel: "Ouvrir WhatsApp",
                        href: prospect.phone
                          ? `https://wa.me/${String(prospect.phone).replace(/[^\d]/g, "")}?text=${encodeURIComponent(drafts.whatsapp || "")}`
                          : null,
                        configured: true,
                        hasContact: !!prospect.phone,
                        noContact: "Pas de téléphone renseigné",
                      },
                    },
                    {
                      key: "linkedin",
                      label: "LinkedIn",
                      icon: Linkedin,
                      sender: {
                        openLabel: "Ouvrir le profil",
                        href: prospect.linkedin
                          ? `https://www.linkedin.com/in/${String(prospect.linkedin).replace(/^https?:\/\/www\.linkedin\.com\/in\//, "").replace(/^https?:\/\/linkedin\.com\/in\//, "").replace(/\/.*$/, "")}`
                          : null,
                        configured: true,
                        hasContact: !!prospect.linkedin,
                        noContact: "Pas de profil LinkedIn renseigné",
                      },
                    },
                  ].map(({ key, label, icon: Icon, sender }) => (
                    <div
                      key={key}
                      className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          <Icon size={15} className="text-indigo-500" /> Modèle{" "}
                          {label}
                        </span>
                        <div className="flex items-center gap-2">
                          {sender && !sender.configured && (
                            <span
                              className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                              title="Renseignez la configuration dans server/.env"
                            >
                              API non configurée
                            </span>
                          )}
                          {sender && canWrite && (
                            sender.href ? (
                              <a
                                href={sender.href}
                                target="_blank"
                                rel="noreferrer"
                                title={
                                  sender.hasContact
                                    ? `${sender.openLabel} avec le message pré-rempli`
                                    : sender.noContact
                                }
                                className="flex items-center gap-1 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-600"
                              >
                                <Send size={12} /> {sender.openLabel}
                              </a>
                            ) : (
                              <button
                                disabled={!sender.hasContact}
                                title={
                                  sender.hasContact
                                    ? `Envoyer réellement via ${label}`
                                    : sender.noContact
                                }
                                className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                              >
                                <Send size={12} /> Envoyer
                              </button>
                            )
                          )}
                          {canWrite && key === "email" && (
                            <button
                              onClick={() => sendMessage(key)}
                              disabled={!drafts[key]?.trim()}
                              title="Envoyer réellement par SMTP"
                              className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                            >
                              <Send size={12} />
                              Envoyer par email
                            </button>
                          )}
                          <button
                            onClick={() => resetDraft(key)}
                            className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                            title="Revenir au message suggéré"
                          >
                            <RefreshCw size={12} /> Régénérer
                          </button>
                          <button
                            onClick={() => copy(drafts[key] || "", key)}
                            className="flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300"
                          >
                            {copied === key ? "Copié !" : "Copier"}
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>
                      {sender?.status && (
                        <div
                          className={`mb-2 rounded-lg px-3 py-2 text-xs font-medium ${sender.status.includes("succès") ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10"}`}
                        >
                          {sender.status}
                        </div>
                      )}
                      {sendStatus && (
                        <div className="mb-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-600 dark:bg-emerald-500/10">
                          {sendStatus}
                        </div>
                      )}
                      {key === "email" && (
                        <input
                          value={drafts.subject}
                          onChange={(e) =>
                            setDrafts((d) => ({
                              ...d,
                              subject: e.target.value,
                            }))
                          }
                          placeholder="Objet de l'email"
                          className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900"
                        />
                      )}
                      <textarea
                        value={drafts[key] || ""}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [key]: e.target.value }))
                        }
                        rows="6"
                        className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 font-sans text-sm leading-relaxed outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
          {tab === "devis" && (
            <div className="space-y-3">
              {canWrite && (
                <button
                  onClick={() => setDevisModal({})}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-3 text-sm font-semibold text-slate-400 transition hover:border-indigo-300 hover:text-indigo-500 dark:border-slate-700"
                >
                  <Plus size={16} /> Nouveau devis
                </button>
              )}

              {devisList.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-400">
                  Aucun devis pour ce prospect
                </div>
              )}

              {devisList.map((d) => {
                const st = DEVIS_STATUS[d.statut] || {
                  label: d.statut,
                  badge: "bg-slate-400/15 text-slate-500",
                };
                return (
                  <div
                    key={d.id}
                    className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">
                            {d.reference}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.badge}`}
                          >
                            {st.label}
                          </span>
                        </div>
                        <div className="mt-1 font-semibold">{d.titre}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-bold text-indigo-500">
                          {d.montant.toLocaleString("fr-FR")} FCFA
                        </div>
                        {d.arr > 0 && (
                          <div className="mt-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                            ARR {d.arr.toLocaleString("fr-FR")} FCFA/an
                          </div>
                        )}
                      </div>
                    </div>
                    {d.description && (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-500">
                        {d.description}
                      </p>
                    )}
                    {d.items && d.items.length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                        {d.items.map((it, i) => (
                          <li key={i}>
                            · {it.qty}× {it.name} —{" "}
                            {(Number(it.qty) * Number(it.price)).toLocaleString(
                              "fr-FR",
                            )}{" "}
                            FCFA
                            {it.period && (
                              <span className="ml-1 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-300">
                                {PERIOD_LABEL[it.period]}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                      <span>Créé par {d.created_by_name || "—"}</span>
                      <span>·</span>
                      <span>{formatDate(d.created_at)}</span>
                      {d.renewal_date && (
                        <>
                          <span>·</span>
                          <span>Renouvellement le {d.renewal_date}</span>
                        </>
                      )}
                      {d.validated_by_name && (
                        <>
                          <span>·</span>
                          <span>Décidé par {d.validated_by_name}</span>
                        </>
                      )}
                      {d.validation_comment && (
                        <>
                          <span>·</span>
                          <span className="italic">
                            « {d.validation_comment} »
                          </span>
                        </>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {d.statut === "brouillon" && canWrite && (
                        <>
                          <button
                            onClick={() => setDevisModal(d)}
                            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={async () => {
                              await api.submitDevis(d.id);
                              loadDevis();
                              onChanged();
                            }}
                            className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-600"
                          >
                            Soumettre à validation
                          </button>
                        </>
                      )}
                      {(d.statut === "attente_validation" ||
                        d.statut === "brouillon") &&
                        canWrite && (
                          <button
                            onClick={async () => {
                              if (
                                !confirm(`Supprimer le devis ${d.reference} ?`)
                              )
                                return;
                              await api.deleteDevis(d.id);
                              loadDevis();
                              onChanged();
                            }}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                          >
                            Supprimer
                          </button>
                        )}
                      {d.statut === "valide" && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <Check size={13} /> Validé
                        </span>
                      )}
                      {d.statut === "attente_validation" && isManager && (
                        <>
                          <button
                            onClick={() => reviewDevis(d, "valide")}
                            className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
                          >
                            <Check size={13} /> Valider
                          </button>
                          <button
                            onClick={() => reviewDevis(d, "refuse")}
                            className="flex items-center gap-1 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-600"
                          >
                            <ThumbsDown size={13} /> Refuser
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {tab === "fiche" && (
            <div className="space-y-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500">
                Score de potentiel
              </span>
              <span className="font-bold">{prospect.score}/100</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full ${scoreColor(prospect.score)} transition-all`}
                style={{ width: `${prospect.score}%` }}
              />
            </div>

            {(user?.role === "manager" || user?.role === "admin") && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <UserRound size={13} /> Assigner à un commercial
                </label>
                <select
                  value={assignedTo}
                  disabled={assignBusy}
                  onChange={(e) => assignTo(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="">Non assigné</option>
                  {assignUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                {assignMsg && (
                  <p className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {assignMsg}
                  </p>
                )}
              </div>
            )}

            {user?.role === "commercial" &&
              String(assignedTo) !== String(user.id) && (
                <button
                  onClick={() => assignTo(user.id)}
                  disabled={assignBusy}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300"
                >
                  <UserRound size={15} /> M'assigner ce prospect
                </button>
              )}

            <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {infoRow(
                <Mail size={15} />,
                "Email",
                prospect.email,
                prospect.email ? `mailto:${prospect.email}` : null,
              )}
              {infoRow(
                <Phone size={15} />,
                "Téléphone",
                prospect.phone,
                prospect.phone ? `tel:${prospect.phone}` : null,
              )}
              {infoRow(
                <Linkedin size={15} />,
                "LinkedIn",
                prospect.linkedin,
                prospect.linkedin && !prospect.linkedin.startsWith("http")
                  ? `https://${prospect.linkedin}`
                  : prospect.linkedin,
              )}
              {infoRow(
                <UserRound size={15} />,
                "Source",
                SOURCE_LABEL[prospect.source] || prospect.source,
              )}
              {prospect.secteur &&
                infoRow(<Building2 size={15} />, "Secteur", prospect.secteur)}
              {prospect.adresse &&
                infoRow(<MapPin size={15} />, "Adresse", prospect.adresse)}
              {prospect.latitude != null &&
                prospect.longitude != null &&
                infoRow(
                  <MapPin size={15} />,
                  "Géolocalisation",
                  `${prospect.latitude}, ${prospect.longitude}`,
                  `https://www.google.com/maps?q=${prospect.latitude},${prospect.longitude}`,
                )}
              {infoRow(
                <Euro size={15} />,
                "Valeur estimée",
                prospect.value
                  ? `${prospect.value.toLocaleString("fr-FR")} FCFA`
                  : null,
              )}
              {infoRow(<MapPin size={15} />, "Quartier", prospect.quartier)}
              {infoRow(<FileText size={15} />, "N°", prospect.numero)}
              {infoRow(
                <UserRound size={15} />,
                "Effectif",
                prospect.effectif ? `${prospect.effectif} salarié(s)` : null,
              )}
              {infoRow(
                <UserRound size={15} />,
                "Commercial",
                prospect.assignee_name || null,
              )}
              {infoRow(
                <CalendarClock size={15} />,
                "Prochaine action",
                live.next_action
                  ? `${live.next_action}${live.next_action_date ? ` — le ${formatDate(live.next_action_date)}` : ""}`
                  : null,
              )}
            </div>

            {canWrite && live.next_action && (
              <button
                onClick={markRelanceDone}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                <Check size={16} /> Relance effectuée
              </button>
            )}

            {prospect.note && (
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <FileText size={12} /> Note
                </div>
                {prospect.note}
              </div>
            )}

            {(Boolean(prospect.contrat_depose) ||
              Boolean(prospect.contrat_signe) ||
              Boolean(prospect.option_frais_scolaire)) && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {Boolean(prospect.contrat_depose) && (
                  <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300">
                    Contrat déposé
                  </span>
                )}
                {Boolean(prospect.contrat_signe) && (
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Contrat signé
                  </span>
                )}
                {Boolean(prospect.option_frais_scolaire) && (
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    Option frais scolaire
                  </span>
                )}
              </div>
            )}
            </div>
          )}
        </div>
      </div>

      {devisModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDevisModal(null)}
          />
          <div className="relative z-10 w-full max-w-lg">
            <DevisFormModal
              prospect={prospect}
              devis={devisModal.id ? devisModal : null}
              onClose={() => setDevisModal(null)}
              onSaved={onDevisSaved}
            />
          </div>
        </div>
      )}

      {stepOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setStepOpen(false)}
          />
          <div className="relative z-10 w-full max-w-3xl">
            <StepFormModal
              prospect={prospect}
              onClose={() => setStepOpen(false)}
              onChanged={onChanged}
            />
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmDelete(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-slate-900">
            <h3 className="text-lg font-bold">Supprimer ce prospect ?</h3>
            <p className="mt-1 text-sm text-slate-500">
              Cette action est irréversible et supprimera l'historique des
              interactions.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Annuler
              </button>
              <button
                onClick={removeProspect}
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
