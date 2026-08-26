import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPinned, RefreshCw, Search, Users } from "lucide-react";
import { api } from "../api.js";
import { useStages } from "../hooks/useStages.js";
import { useRefresh } from "../hooks/useRefresh.js";
import useDarkMode from "../hooks/useDarkMode.js";
import ProspectDrawer from "../components/ProspectDrawer.jsx";
import { initials } from "../constants.js";

const STAGE_HEX = {
  sky: "#0ea5e9",
  amber: "#f59e0b",
  violet: "#8b5cf6",
  emerald: "#10b981",
  rose: "#f43f5e",
  indigo: "#6366f1",
  teal: "#14b8a6",
  orange: "#f97316",
  fuchsia: "#d946ef",
  slate: "#94a3b8",
};

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function CartePage() {
  const dark = useDarkMode();
  const { byKey } = useStages();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);
  const tileRef = useRef(null);
  const prospectsRef = useRef([]);
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [drawerId, setDrawerId] = useState(null);

  const positioned = prospects.filter(
    (p) => p.latitude != null && p.longitude != null,
  );

  const load = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (stage) params.stage = stage;
      const rows = await api.prospects(params);
      prospectsRef.current = rows;
      setProspects(rows);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, stage]);

  useRefresh(() => load(), 30000);

  useEffect(() => {
    const onOpen = (e) => setDrawerId(e.detail);
    window.addEventListener("pf-open-prospect", onOpen);
    return () => window.removeEventListener("pf-open-prospect", onOpen);
  }, []);

  // Quand le drawer se ferme, recalculer la taille Leaflet (PWA standalone)
  useEffect(() => {
    if (!drawerProspect && mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    }
  }, [drawerProspect]);

  // Création de la carte (une seule fois)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [6.1319, 1.2228],
      zoom: 10,
    });
    mapRef.current = map;

    tileRef.current = L.tileLayer("", { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);

    const applyLabelVisibility = () => {
      const show = map.getZoom() >= 7;
      document
        .querySelectorAll(".pf-marker-wrap")
        .forEach((el) => el.classList.toggle("hide-label", !show));
    };
    map.on("zoomend", applyLabelVisibility);
    map.on("layeradd", applyLabelVisibility);

    return () => {
      map.off("zoomend", applyLabelVisibility);
      map.off("layeradd", applyLabelVisibility);
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      tileRef.current = null;
    };
  }, []);

  // Fond de carte selon le thème
  useEffect(() => {
    const url = dark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    if (!tileRef.current) return;
    tileRef.current.setUrl(url, false);
  }, [dark]);

  // Marqueurs
  useEffect(() => {
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    for (const p of positioned) {
      const stageInfo = byKey[p.stage] || {};
      const hex = STAGE_HEX[stageInfo.color] || "#6366f1";
      const label = stageInfo.label || p.stage || "Étape";
      const icon = L.divIcon({
        className: "pf-marker",
        html: `<div class="pf-marker-wrap"><div class="pf-marker-dot" style="background:${hex}">${escapeHtml(initials(p.name))}</div><span class="pf-marker-label">${escapeHtml(p.name)}</span></div>`,
        iconSize: [170, 36],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18],
      });
      const popup = L.popup({
        closeButton: true,
        className: dark ? "leaflet-popup-dark" : "",
        maxWidth: 260,
      }).setContent(`
        <div class="pf-popup">
          <div class="pf-popup-name">${escapeHtml(p.name)}</div>
          ${p.company ? `<div class="pf-popup-sub">${escapeHtml(p.company)}</div>` : ""}
          <div class="pf-popup-badges">
            <span class="pf-popup-badge" style="background:${hex}22;color:${hex};border-color:${hex}55">${escapeHtml(label)}</span>
            ${p.quartier ? `<span class="pf-popup-badge">${escapeHtml(p.quartier)}</span>` : ""}
          </div>
          ${p.adresse ? `<div class="pf-popup-addr">${escapeHtml(p.adresse)}</div>` : ""}
          <button class="pf-popup-btn" onclick="window.dispatchEvent(new CustomEvent('pf-open-prospect',{detail:'${p.id}'}))">Voir le prospect</button>
        </div>
      `);
      L.marker([p.latitude, p.longitude], { icon }).addTo(layer).bindPopup(popup);
    }

    if (positioned.length) {
      const bounds = L.latLngBounds(
        positioned.map((p) => [p.latitude, p.longitude]),
      );
      map.fitBounds(bounds, { padding: [48, 48] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospects, dark, byKey]);

  const drawerProspect = prospects.find((p) => String(p.id) === String(drawerId));

  // En PWA standalone le drawer portaled doit passer au-dessus du stacking context Leaflet (z 700)
  // On désactive l'interaction carte quand le drawer est ouvert pour éviter qu'elle capte les touches
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (drawerProspect) {
      map.dragging?.disable();
      map.scrollWheelZoom?.disable();
      map.doubleClickZoom?.disable();
    } else {
      map.dragging?.enable();
      map.scrollWheelZoom?.enable();
      map.doubleClickZoom?.enable();
      setTimeout(() => map.invalidateSize(), 100);
    }
  }, [drawerProspect]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-3">
        <div>
          <h1 className="text-xl font-bold">Carte des prospects</h1>
          <p className="text-sm text-slate-400">
            Visualisez vos prospects sur la carte
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700"
          >
            <RefreshCw size={14} /> Actualiser
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 px-6 pb-3">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un prospect…"
            className="w-64 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">Toutes les étapes</option>
          {Object.values(byKey).map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="ml-auto flex items-center gap-1.5 text-sm text-slate-400">
          <Users size={14} />
          {positioned.length} positionné(s) / {prospects.length}
        </span>
      </div>

      {error && (
        <div className="mx-6 mb-3 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">
          {error}
        </div>
      )}

      <div className={`relative min-h-0 flex-1 overflow-hidden ${drawerProspect ? 'hidden' : ''}`}>
        <div ref={containerRef} className="absolute inset-0" />
        {!loading && positioned.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <MapPinned className="mx-auto mb-3 text-slate-300" size={40} />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-200">
                Aucun prospect positionné
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Renseignez la latitude / longitude d'un prospect pour le voir
                apparaître ici.
              </p>
            </div>
          </div>
        )}

        {positioned.length > 0 && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-[500] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-md dark:border-slate-700 dark:bg-slate-900">
            {Object.values(byKey)
              .filter((s) => positioned.some((p) => p.stage === s.key))
              .map((s) => (
                <span
                  key={s.key}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: STAGE_HEX[s.color] || "#6366f1" }}
                  />
                  {s.label}
                </span>
              ))}
          </div>
        )}
      </div>

      {drawerProspect && (
        <ProspectDrawer
          prospect={drawerProspect}
          onClose={() => setDrawerId(null)}
          onChanged={() => load()}
        />
      )}
    </div>
  );
}