import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  Briefcase,
  CalendarDays,
  ClipboardList,
  Columns3,
  Database,
  FileSignature,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Search,
  Settings2,
  Sun,
  UserRoundCheck,
  UserRound,
  Users,
  WifiOff,
  Wifi,
  X,
  CalendarClock,
  Clock,
  MapPinned,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";
import NotificationsDropdown from "./NotificationsDropdown.jsx";
import { initials, ROLE_LABEL } from "../constants.js";
import { flushQueue, getPendingOps, isOnline } from "../offline.js";
import useIsMobile from "../hooks/useIsMobile.js";
import { Logo } from "./Logo.jsx";

function useTheme() {
  const [dark, setDark] = useState(
    () => localStorage.getItem("pf_theme") === "dark",
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("pf_theme", dark ? "dark" : "light");
  }, [dark]);
  return [dark, setDark];
}

// Avatar utilisateur : image uploadée si présente, sinon initiales.
function Avatar({ user, size = 36, className = "" }) {
  const style = { width: size, height: size };
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user?.name || "Avatar"}
        style={style}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      style={style}
      className={`flex shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 ${className}`}
    >
      {initials(user?.name)}
    </span>
  );
}

const NAV = [
  {
    to: "/",
    label: "Tableau",
    icon: Columns3,
    end: true,
    roles: ["commercial", "manager"],
  },
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["commercial", "manager", "admin"],
  },
  {
    to: "/journee",
    label: "Ma journée",
    icon: CalendarDays,
    roles: ["commercial", "manager"],
  },
  {
    to: "/prospection",
    label: "Prospection",
    icon: ClipboardList,
    roles: ["commercial", "manager"],
  },
  {
    to: "/recherche",
    label: "Recherche",
    icon: Search,
    roles: ["commercial", "manager"],
  },
  {
    to: "/carte",
    label: "Carte",
    icon: MapPinned,
    roles: ["commercial", "manager"],
  },
  {
    to: "/devis",
    label: "Devis",
    icon: FileSignature,
    roles: ["commercial", "manager"],
  },
  {
    to: "/clients",
    label: "Clients",
    icon: UserRoundCheck,
    roles: ["commercial", "manager"],
  },
  {
    to: "/portefeuilles",
    label: "Portefeuilles",
    icon: Briefcase,
    roles: ["manager"],
  },
  {
    to: "/rapports",
    label: "Rapports",
    icon: FileText,
    roles: ["commercial", "manager"],
  },
  {
    to: "/reunions",
    label: "Réunions",
    icon: CalendarClock,
    roles: ["commercial", "manager"],
  },
  { to: "/team", label: "Équipe", icon: Users, roles: ["admin"] },
  {
    to: "/referentiels",
    label: "Référentiels",
    icon: Database,
    roles: ["admin"],
  },
  {
    to: "/pipeline-templates",
    label: "Modèles de pipeline",
    icon: Settings2,
    roles: ["admin"],
  },
  {
    to: "/profil",
    label: "Profil",
    icon: UserRound,
    roles: ["commercial", "manager", "admin"],
  },
];

// Onglets principaux visibles dans la barre du bas sur mobile.
function mobileTabs(role) {
  const tabs = [
    {
      to: role === "admin" ? "/dashboard" : "/",
      label: "Tableau",
      icon: role === "admin" ? LayoutDashboard : Columns3,
      end: true,
      roles: ["commercial", "manager", "admin"],
    },
    {
      to: "/prospection",
      label: "Prospection",
      icon: ClipboardList,
      roles: ["commercial", "manager"],
    },
    {
      to: "/recherche",
      label: "Recherche",
      icon: Search,
      roles: ["commercial", "manager"],
    },
    {
      to: "/carte",
      label: "Carte",
      icon: MapPinned,
      roles: ["commercial", "manager"],
    },
    {
      to: "/devis",
      label: "Devis",
      icon: FileSignature,
      roles: ["commercial", "manager"],
    },
    {
      to: "/clients",
      label: "Clients",
      icon: UserRoundCheck,
      roles: ["commercial", "manager"],
    },
  ];
  if (role === "admin") {
    return [
      { ...tabs[0], to: "/dashboard", label: "Dashboard" },
      { to: "/referentiels", label: "Référentiels", icon: Database, roles: ["admin"] },
      { to: "/team", label: "Équipe", icon: Users, roles: ["admin"] },
      { to: "/pipeline-templates", label: "Modèles", icon: Settings2, roles: ["admin"] },
    ];
  }
  return tabs.filter((t) => t.roles.includes(role));
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [dark, setDark] = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [offline, setOffline] = useState(!isOnline());
  const [pending, setPending] = useState(getPendingOps().length);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const refresh = () => setPending(getPendingOps().length);
    const onOnline = async () => {
      setOffline(false);
      const n = await flushQueue();
      if (n > 0) refresh();
      window.dispatchEvent(new CustomEvent("pf-sync"));
      window.dispatchEvent(new CustomEvent("pf-refresh"));
    };
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("pf-sync", refresh);
    const id = setInterval(refresh, 4000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("pf-sync", refresh);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const load = () =>
      api
        .unreadCount()
        .then((r) => setUnread(r.count))
        .catch(() => {});
    load();
    const id = setInterval(load, 15000);
    const poll = setInterval(
      () => window.dispatchEvent(new CustomEvent("pf-refresh")),
      30000,
    );
    return () => {
      clearInterval(id);
      clearInterval(poll);
    };
  }, []);

  const handleLogout = () => {
    if (confirm("Êtes-vous sûr de vouloir vous déconnecter ?")) {
      logout();
      navigate("/login");
    }
  };

  const navContent = (
    <>
      <div className="flex items-center gap-3 px-5 py-5">
        <Logo size={36} variant="mark" />
        {!sidebarCollapsed && (
          <div>
            <div className="text-base font-bold leading-tight text-white">OptiProspect</div>
            <div className="text-xs text-slate-400">Gestion de prospection</div>
          </div>
        )}
        {!sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(true)}
            title="Réduire la barre latérale"
            className="ml-auto hidden rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white lg:block"
          >
            <X size={18} />
          </button>
        )}
      </div>
      <nav className="mt-2 flex flex-col gap-1 px-3">
        {NAV.filter((n) => n.roles.includes(user?.role)).map(
          ({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800"
                }`
              }
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon size={18} />
              {!sidebarCollapsed && <span>{label}</span>}
            </NavLink>
          ),
        )}
      </nav>
      <div className="mt-auto px-3 pb-4">
        <div className="rounded-xl bg-slate-800/60 p-3">
          <div className="flex items-center gap-3">
            <Avatar user={user} size={36} />
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-100">{user?.name}</div>
                <div className="text-xs text-slate-400">
                  {ROLE_LABEL[user?.role] || user?.role}
                </div>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-400"
          title={sidebarCollapsed ? "Déconnexion" : undefined}
        >
          <LogOut size={18} />
          {!sidebarCollapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={`hidden shrink-0 flex-col border-r border-slate-800 bg-slate-900 transition-all duration-300 lg:flex ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {navContent}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-slate-900 shadow-xl">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800"
            >
              <X size={18} />
            </button>
            {navContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Menu size={20} />
          </button>
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              title="Étendre la barre latérale"
              className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:flex dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Menu size={20} />
            </button>
          )}
          {user?.role !== "admin" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = e.currentTarget.q.value.trim();
                navigate("/recherche", { state: { q } });
              }}
              className="relative hidden max-w-md flex-1 sm:block"
            >
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-2.5 text-slate-400"
              />
              <input
                name="q"
                type="search"
                placeholder="Rechercher un prospect, une entreprise…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:focus:bg-slate-900"
              />
            </form>
          )}
          <div className="hidden ml-4 items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 lg:flex">
            <Clock size={14} />
            <span>{now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">{now.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })}</span>
          </div>
          <button
            onClick={() => setDark(!dark)}
            title="Basculer le thème"
            className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <NotificationsDropdown unread={unread} setUnread={setUnread} />
          <button
            onClick={() => navigate("/profil")}
            title="Mon profil"
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 text-left transition hover:bg-slate-100 sm:pr-3 dark:hover:bg-slate-800"
          >
            <Avatar user={user} size={36} />
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-[9rem] truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                {user?.name}
              </span>
              <span className="block text-[11px] text-slate-400">
                {ROLE_LABEL[user?.role] || user?.role}
              </span>
            </span>
          </button>
        </header>
        {offline && (
          <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            <WifiOff size={15} />
            Mode hors-ligne — vos saisies sont enregistrées localement et seront
            synchronisées à la reconnexion.
          </div>
        )}
        {!offline && pending > 0 && (
          <div className="flex items-center gap-2 border-b border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
            <Wifi size={15} />
            {pending} opération(s) en attente de synchronisation…
          </div>
        )}
        <main className="min-h-0 flex-1 overflow-hidden pb-20 lg:pb-0">{children}</main>
      </div>

      {isMobile && (
        <>
          <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900 lg:hidden">
            {mobileTabs(user?.role).map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center gap-1 py-3 px-2 text-[10px] font-semibold transition min-h-[60px] ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  }`
                }
              >
                <Icon size={22} />
                {label}
              </NavLink>
            ))}
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className={`flex flex-1 flex-col items-center gap-1 py-3 px-2 text-[10px] font-semibold transition min-h-[60px] ${
                moreOpen
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <MoreHorizontal size={22} />
              Plus
            </button>
          </nav>

          {moreOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setMoreOpen(false)}
              />
              <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-[env(safe-area-inset-bottom)] shadow-2xl dark:bg-slate-900">
                <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-sm font-bold">Tout le menu</span>
                  <button
                    onClick={() => setMoreOpen(false)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {NAV.filter((n) =>
                    n.roles.includes(user?.role),
                  ).map(({ to, label, icon: Icon, end }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        `flex flex-col items-center gap-2 rounded-2xl border p-4 text-center text-[11px] font-semibold transition min-h-[80px] ${
                          isActive
                            ? "border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300"
                            : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                        }`
                      }
                    >
                      <Icon size={22} />
                      {label}
                    </NavLink>
                  ))}
                </div>
                <button
                  onClick={handleLogout}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
                >
                  <LogOut size={16} /> Déconnexion
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
