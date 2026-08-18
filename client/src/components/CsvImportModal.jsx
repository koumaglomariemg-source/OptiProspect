import { useState } from "react";
import { api } from "../api.js";
import { csvParse } from "../utils/csv.js";
import { SOURCES } from "../constants.js";
import Modal from "./Modal.jsx";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800";

const COLUMNS = [
  { key: "name", label: "name", required: true },
  { key: "product", label: "product", required: true },
  { key: "company", label: "company" },
  { key: "email", label: "email" },
  { key: "phone", label: "phone" },
  { key: "secteur", label: "secteur" },
  { key: "product", label: "product" },
  { key: "source", label: "source" },
  { key: "value", label: "value" },
  { key: "next_action", label: "next_action" },
  { key: "note", label: "note" },
];

export default function CsvImportModal({ onClose, onDone }) {
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [preview, setPreview] = useState([]);
  const [step, setStep] = useState("upload");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = csvParse(text);
    if (parsed.length < 2) {
      setError("Fichier vide ou illisible");
      return;
    }
    setHeaders(parsed[0]);
    setRows(parsed.slice(1));
    setPreview(parsed.slice(1, 6));
    const auto = {};
    for (const c of COLUMNS) {
      const idx = parsed[0].findIndex(
        (h) => h.trim().toLowerCase() === c.key.toLowerCase(),
      );
      if (idx >= 0) auto[c.key] = idx;
    }
    setMapping(auto);
    setError("");
    setStep("map");
  };

  const doImport = async () => {
    setBusy(true);
    setError("");
    const validRows = rows.filter((r) => (r[mapping.name] || "").trim());
    const sourceSet = new Set(SOURCES.map((s) => s.key));
    let created = 0;
    let skipped = 0;
    for (const r of validRows) {
      const get = (k) =>
        mapping[k] === undefined ? "" : (r[mapping[k]] || "").trim();
      const source = sourceSet.has(get("source")) ? get("source") : "site";
      const value = Number(get("value")) || 0;
      try {
        await api.createProspect({
          name: get("name"),
          company: get("company") || null,
          email: get("email") || null,
          phone: get("phone") || null,
          secteur: get("secteur") || null,
          product: get("product") || null,
          source,
          value,
          next_action: get("next_action") || null,
          note: get("note") || null,
        });
        created++;
      } catch {
        skipped++;
      }
    }
    setResult({ created, skipped, total: validRows.length });
    setStep("done");
    setBusy(false);
    if (onDone) onDone();
  };

  return (
    <Modal
      title="Importer des prospects (CSV)"
      onClose={onClose}
      width="max-w-2xl"
      fullScreenMobile
    >
      {step === "upload" && (
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center dark:border-slate-700">
            <label className="cursor-pointer text-sm font-semibold text-indigo-500 hover:underline">
              Choisir un fichier .csv
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={onFile}
                className="hidden"
              />
            </label>
            <p className="mt-2 text-xs text-slate-400">
              Colonnes attendues (séparées par « ; » ou « , ») :{" "}
              <code>name</code> (requis), <code>company</code>,{" "}
              <code>email</code>, <code>phone</code>, <code>secteur</code>,{" "}
              <code>source</code>, <code>value</code>, <code>next_action</code>,{" "}
              <code>note</code>.
            </p>
          </div>
          {error && (
            <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">
              {error}
            </div>
          )}
        </div>
      )}

      {step === "map" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">
              {rows.length} lignes détectées
            </span>
            <button
              onClick={() => setStep("upload")}
              className="text-xs font-semibold text-indigo-500 hover:underline"
            >
              Changer de fichier
            </button>
          </div>

          <div className="space-y-2">
            {COLUMNS.map((c) => (
              <div
                key={c.key}
                className="grid grid-cols-[1fr_1fr] items-center gap-3"
              >
                <label className="text-xs font-semibold text-slate-500">
                  {c.label}{" "}
                  {c.required && <span className="text-rose-500">*</span>}
                </label>
                <select
                  value={mapping[c.key] ?? ""}
                  onChange={(e) =>
                    setMapping((m) => ({
                      ...m,
                      [c.key]:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    }))
                  }
                  className={inputCls}
                >
                  <option value="">— Ne pas importer —</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:bg-slate-800">
              Aperçu
            </div>
            {preview.map((r, i) => (
              <div
                key={i}
                className="truncate border-t border-slate-100 px-3 py-1.5 text-xs dark:border-slate-800"
              >
                {(r[mapping.name] ?? "—").trim() || (
                  <span className="text-rose-400">Nom manquant</span>
                )}
                {mapping.company !== undefined && r[mapping.company] && (
                  <span className="text-slate-400">
                    {" "}
                    · {r[mapping.company].trim()}
                  </span>
                )}
                {mapping.email !== undefined && r[mapping.email] && (
                  <span className="text-slate-400">
                    {" "}
                    · {r[mapping.email].trim()}
                  </span>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Annuler
            </button>
            <button
              onClick={doImport}
              disabled={busy || mapping.name === undefined || mapping.product === undefined}
              className="rounded-xl bg-indigo-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-60"
            >
              {busy ? `Import en cours…` : `Importer ${rows.length} prospects`}
            </button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="space-y-4 text-center">
          <div className="text-3xl font-bold text-emerald-500">
            {result.created}
          </div>
          <p className="text-sm text-slate-500">prospects créés avec succès</p>
          {result.skipped > 0 && (
            <p className="text-xs text-amber-500">
              {result.skipped} ligne(s) ignorée(s) (erreur ou doublon)
            </p>
          )}
          <button
            onClick={onClose}
            className="rounded-xl bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-600"
          >
            Terminé
          </button>
        </div>
      )}
    </Modal>
  );
}
