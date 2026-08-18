import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../api.js";
import Modal from "./Modal.jsx";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800";

const PERIODS = [
  { key: "", label: "Ponctuel" },
  { key: "mensuel", label: "Mensuel" },
  { key: "trimestriel", label: "Trimestriel" },
  { key: "annuel", label: "Annuel" },
];
const PERIOD_MULT = { mensuel: 12, trimestriel: 4, annuel: 1 };

function normalizeItems(items) {
  return items && items.length
    ? items
    : [{ name: "", qty: 1, price: 0, period: "" }];
}

export default function DevisFormModal({ prospect, devis, onClose, onSaved }) {
  const defaultItems = normalizeItems(devis?.items);
  if (
    !devis &&
    prospect?.product &&
    defaultItems.length === 1 &&
    !defaultItems[0].name
  ) {
    defaultItems[0].name = prospect.product;
  }
  const [products, setProducts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    titre: devis?.titre || "",
    description: devis?.description || "",
    renewal_date: devis?.renewal_date || "",
    items: defaultItems,
  });

  useEffect(() => {
    api
      .settings()
      .then((s) => {
        if (Array.isArray(s.products)) setProducts(s.products);
      })
      .catch(() => {});
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setItem = (i, k, v) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)),
    }));
  const addItem = () =>
    setForm((f) => ({
      ...f,
      items: [...f.items, { name: "", qty: 1, price: 0, period: "" }],
    }));
  const removeItem = (i) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const montant = form.items.reduce(
    (s, it) => s + (Number(it.qty) || 1) * (Number(it.price) || 0),
    0,
  );
  const arr = form.items.reduce((s, it) => {
    const mult = PERIOD_MULT[it.period];
    return mult ? s + (Number(it.qty) || 1) * (Number(it.price) || 0) * mult : s;
  }, 0);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const items = form.items.filter((it) => String(it.name || "").trim());
      const payload = {
        titre: form.titre,
        description: form.description,
        renewal_date: form.renewal_date,
        items,
        montant,
      };
      const saved = devis
        ? await api.updateDevis(devis.id, payload)
        : await api.createDevis({ prospect_id: prospect.id, ...payload });
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={devis ? `Modifier ${devis.reference}` : "Nouveau devis"}
      onClose={onClose}
      fullScreenMobile
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Titre *
          </label>
          <input
            className={inputCls}
            required
            value={form.titre}
            onChange={(e) => set("titre", e.target.value)}
            placeholder="Prestation d'accompagnement — phase 1"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Description
          </label>
          <textarea
            className={inputCls}
            rows="3"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Détail des prestations, livrables, délais…"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-500">
              Lignes de devis
            </label>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:underline"
            >
              <Plus size={13} /> Ajouter une ligne
            </button>
          </div>
          <div className="space-y-2">
            {form.items.map((it, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_64px_90px_auto_auto] items-center gap-2"
              >
                <input
                  list="optiprospect-products"
                  className={inputCls}
                  value={it.name}
                  onChange={(e) => setItem(i, "name", e.target.value)}
                  placeholder="Produit / prestation"
                />
                <input
                  className={inputCls}
                  type="number"
                  min="1"
                  value={it.qty}
                  onChange={(e) => setItem(i, "qty", e.target.value)}
                  title="Quantité"
                />
                <input
                  className={inputCls}
                  type="number"
                  min="0"
                  step="0.01"
                  value={it.price}
                  onChange={(e) => setItem(i, "price", e.target.value)}
                  placeholder="P.U. FCFA"
                  title="Prix unitaire"
                />
                <select
                  className={inputCls}
                  value={it.period || ""}
                  onChange={(e) => setItem(i, "period", e.target.value)}
                  title="Période"
                >
                  {PERIODS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  disabled={form.items.length === 1}
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-500/10"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <datalist id="optiprospect-products">
              {products.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Date de renouvellement (abonnement)
          </label>
          <input
            className={inputCls}
            type="date"
            value={form.renewal_date}
            onChange={(e) => set("renewal_date", e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
          <span className="text-sm font-semibold text-slate-500">Total HT</span>
          <span className="text-lg font-bold text-indigo-500">
            {montant.toLocaleString("fr-FR")} FCFA
          </span>
        </div>
        {arr > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-indigo-50 px-4 py-2.5 dark:bg-indigo-500/15">
            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">
              Récurrent annuel (ARR)
            </span>
            <span className="text-base font-bold text-indigo-600 dark:text-indigo-300">
              {arr.toLocaleString("fr-FR")} FCFA / an
            </span>
          </div>
        )}

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
              : devis
                ? "Enregistrer"
                : "Créer le devis"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
