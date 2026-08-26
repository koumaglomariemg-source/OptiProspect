import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { SOURCES } from "../constants.js";
import Modal from "./Modal.jsx";

const pad = (n) => String(n).padStart(2, "0");
const nowStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
};

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800";

export default function ProspectFormModal({ prospect, onClose, onSaved }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [zones, setZones] = useState([]);
  const [products, setProducts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [busy, setBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoCoding, setGeoCoding] = useState(false);
  const firstGeocode = useRef(
    Boolean(
      prospect &&
      (Number.parseFloat(prospect.latitude) ||
        Number.parseFloat(prospect.longitude)),
    ),
  );
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: prospect?.name || "",
    first_name: prospect?.first_name || "",
    last_name: prospect?.last_name || "",
    company: prospect?.company || "",
    email: prospect?.email || "",
    phone: prospect?.phone || "",
    linkedin: prospect?.linkedin || "",
    source: prospect?.source || "site",
    value: prospect?.value || 0,
    stage: prospect?.stage || "etablissements_identifies",
    secteur: prospect?.secteur || "",
    product: prospect?.product || "",
    adresse: prospect?.adresse || "",
    latitude: prospect?.latitude || "",
    longitude: prospect?.longitude || "",
    assigned_to: prospect?.assigned_to || "",
    next_action: prospect?.next_action || "",
    next_action_date: prospect?.next_action_date || (prospect ? "" : nowStr()),
    note: prospect?.note || "",
    template_id: prospect?.template_id || "",
    numero: prospect?.numero || "",
    quartier: prospect?.quartier || "",
    effectif: prospect?.effectif || "",
    option_frais_scolaire: !!prospect?.option_frais_scolaire,
  });

  useEffect(() => {
    if (currentUser?.role !== "commercial") {
      api
        .users()
        .then((rows) => setUsers(rows.filter((u) => u.role === "commercial")))
        .catch(() => {});
    }
    api
      .settings()
      .then((s) => {
        if (Array.isArray(s.zones)) setZones(s.zones);
        if (Array.isArray(s.products)) setProducts(s.products);
      })
      .catch(() => {});
    api
      .pipelineTemplates()
      .then((t) => {
        setTemplates(t);
        if (!prospect && t.length)
          setForm((f) => ({
            ...f,
            template_id:
              f.template_id || t.find((x) => x.is_default)?.id || t[0].id,
          }));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!prospect && currentUser?.role === "commercial") {
      setForm((f) => ({
        ...f,
        assigned_to: f.assigned_to || String(currentUser.id),
      }));
    }
  }, [currentUser, prospect]);

  useEffect(() => {
    const lat = Number.parseFloat(form.latitude);
    const lon = Number.parseFloat(form.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    if (firstGeocode.current) {
      firstGeocode.current = false;
      return;
    }
    const id = setTimeout(async () => {
      setGeoCoding(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=fr&lat=${lat}&lon=${lon}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        const a = data?.address || {};
        const voie = [a.house_number, a.road].filter(Boolean).join(" ");
        const ville = a.city || a.town || a.village || a.municipality || "";
        const quartier =
          a.suburb ||
          a.neighbourhood ||
          a.quarter ||
          a.city_district ||
          a.hamlet ||
          "";
        setForm((f) => ({
          ...f,
          adresse: [voie, ville].filter(Boolean).join(", ") || f.adresse,
          quartier: quartier || f.quartier,
        }));
      } catch {
        /* API indisponible : on garde les valeurs saisies */
      } finally {
        setGeoCoding(false);
      }
    }, 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.latitude, form.longitude]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Géolocalisation non supportée par ce navigateur");
      return;
    }
    setGeoBusy(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setGeoBusy(false);
      },
      () => {
        setError(
          "Position introuvable (vérifiez la permission de localisation)",
        );
        setGeoBusy(false);
      },
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...form,
        name:
          [form.first_name, form.last_name].filter(Boolean).join(" ").trim() ||
          form.name,
        assigned_to: form.assigned_to || null,
        value: Number(form.value) || 0,
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
        template_id: form.template_id ? Number(form.template_id) : null,
        effectif: form.effectif === "" ? null : Number(form.effectif),
        option_frais_scolaire: form.option_frais_scolaire,
      };
      delete payload.stage;
      const saved = prospect
        ? await api.updateProspect(prospect.id, payload)
        : await api.createProspect(payload);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={prospect ? "Modifier le prospect" : "Nouveau prospect"}
      onClose={onClose}
      fullScreenMobile
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Nom *
            </label>
            <input
              className={inputCls}
              required
              value={form.last_name}
              onChange={(e) => set("last_name", e.target.value)}
              placeholder="Adjovi"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Prénom *
            </label>
            <input
              className={inputCls}
              required
              value={form.first_name}
              onChange={(e) => set("first_name", e.target.value)}
              placeholder="Kossi"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Société
            </label>
            <input
              className={inputCls}
              value={form.company}
              onChange={(e) => set("company", e.target.value)}
              placeholder="Ets Kekeli"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Email
            </label>
            <input
              className={inputCls}
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="kossi@exemple.tg"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Téléphone
            </label>
            <input
              className={inputCls}
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+228 90 12 34 56"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              LinkedIn
            </label>
            <input
              className={inputCls}
              value={form.linkedin}
              onChange={(e) => set("linkedin", e.target.value)}
              placeholder="linkedin.com/in/kossi"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Source
            </label>
            <select
              className={inputCls}
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
            >
              {SOURCES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Valeur estimée (FCFA)
            </label>
            <input
              className={inputCls}
              type="number"
              min="0"
              value={form.value}
              onChange={(e) => set("value", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Secteur d'activité
            </label>
            <input
              className={inputCls}
              list="optiprospect-zones"
              value={form.secteur}
              onChange={(e) => set("secteur", e.target.value)}
              placeholder="Tech, BTP, Santé…"
            />
            <datalist id="optiprospect-zones">
              {zones.map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Produit à proposer *
            </label>
            <input
              className={inputCls}
              required={!prospect}
              list="optiprospect-products"
              value={form.product}
              onChange={(e) => set("product", e.target.value)}
              placeholder="Sélectionnez ou saisissez un produit"
            />
            <datalist id="optiprospect-products">
              {products.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Adresse
            </label>
            <input
              className={inputCls}
              value={form.adresse}
              onChange={(e) => set("adresse", e.target.value)}
              placeholder="Bd du Mono, Tokoin, Lomé"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Latitude
            </label>
            <input
              className={inputCls}
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => set("latitude", e.target.value)}
              placeholder="6.137194"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Longitude
            </label>
            <input
              className={inputCls}
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => set("longitude", e.target.value)}
              placeholder="1.212339"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={useMyLocation}
              disabled={geoBusy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-60 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400"
            >
              <MapPin size={15} />
              {geoBusy ? "Localisation…" : "Utiliser ma position"}
            </button>
            {geoCoding && (
              <span className="ml-2 text-xs font-medium text-indigo-500 dark:text-indigo-400">
                Localisation de l'adresse…
              </span>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Modèle de pipeline
            </label>
            <select
              className={inputCls}
              value={form.template_id}
              onChange={(e) => set("template_id", e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.is_default ? " (par défaut)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              N°
            </label>
            {prospect ? (
              <input
                className={inputCls}
                value={form.numero}
                onChange={(e) => set("numero", e.target.value)}
                placeholder="N-001"
              />
            ) : (
              <input
                className={`${inputCls} bg-slate-50 dark:bg-slate-800`}
                value="Généré automatiquement"
                readOnly
                disabled
                title="Le numéro sera attribué automatiquement"
              />
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Quartier
            </label>
            <input
              className={inputCls}
              value={form.quartier}
              onChange={(e) => set("quartier", e.target.value)}
              placeholder="Tokoin, Bè, Agoè…"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Effectif
            </label>
            <input
              className={inputCls}
              type="number"
              min="0"
              value={form.effectif}
              onChange={(e) => set("effectif", e.target.value)}
              placeholder="250"
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="optiprospect-option-frais"
              type="checkbox"
              checked={form.option_frais_scolaire}
              onChange={(e) => set("option_frais_scolaire", e.target.checked)}
              className="h-4 w-4 accent-indigo-500"
            />
            <label
              htmlFor="optiprospect-option-frais"
              className="text-sm font-medium text-slate-600 dark:text-slate-300"
            >
              Option « frais scolaire » à souscrire
            </label>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Commercial
            </label>
            {currentUser?.role === "commercial" ? (
              <input
                className={`${inputCls} cursor-not-allowed opacity-70`}
                value={currentUser.name}
                readOnly
                disabled
                title="Vous êtes automatiquement assigné à vos prospects"
              />
            ) : (
              <select
                className={inputCls}
                value={form.assigned_to}
                onChange={(e) => set("assigned_to", e.target.value)}
              >
                <option value="">Non assigné</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Prochaine action
            </label>
            <input
              className={inputCls}
              value={form.next_action}
              onChange={(e) => set("next_action", e.target.value)}
              placeholder="Relancer par téléphone"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Date et heure de l'action
            </label>
            <input
              className={inputCls}
              type="datetime-local"
              min={nowStr()}
              value={form.next_action_date}
              onChange={(e) => set("next_action_date", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Note
            </label>
            <textarea
              className={inputCls}
              rows="3"
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="Contexte, besoins, objections…"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
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
            {busy
              ? "Enregistrement…"
              : prospect
                ? "Enregistrer"
                : "Créer le prospect"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
