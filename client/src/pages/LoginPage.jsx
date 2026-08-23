import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { Logo } from "../components/Logo.jsx";

const HIGHLIGHTS = [
  {
    icon: Target,
    title: "Pipeline structuré",
    desc: "Suivez chaque prospect, de la prise de contact à la signature.",
  },
  {
    icon: TrendingUp,
    title: "Décisions pilotées",
    desc: "Objectifs, prévisions et rapports en temps réel.",
  },
  {
    icon: ShieldCheck,
    title: "Données maîtrisées",
    desc: "Accès par rôle et journal d’audit sur les actions sensibles.",
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panneau de marque */}
      <aside className="hidden flex-col justify-between bg-slate-950 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <Logo size={40} variant="mark" />
          <div>
            <div className="text-base font-bold leading-tight">
              OptiProspect
            </div>
            <div className="text-xs text-slate-400">Gestion de prospection</div>
          </div>
        </div>

        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Transformez vos prospects en clients.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            La plateforme qui centralise votre prospection commerciale :
            pipeline, relances, devis et pilotage de la performance.
          </p>

          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex gap-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-indigo-300">
                  <Icon size={17} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">
                    {desc}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-500">
          
        </p>
      </aside>

      {/* Panneau de connexion */}
      <main className="flex items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-sm pf-rise">
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <Logo size={40} variant="mark" />
            <span className="text-lg font-bold tracking-tight">
              OptiProspect
            </span>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Bienvenue
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Connectez-vous pour accéder à votre espace de travail.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-3 text-slate-400"
                />
                <input
                  id="email"
                  className={inputCls}
                  type="email"
                  autoComplete="email"
                  placeholder="vous@entreprise.tg"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700"
                >
                  Mot de passe
                </label>
                <span className="text-xs font-medium text-slate-400">
                  Min. 6 caractères
                </span>
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-3 text-slate-400"
                />
                <input
                  id="password"
                  className={`${inputCls} pr-10`}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  className="absolute right-2 top-1.5 rounded-md p-1.5 text-slate-400 transition hover:text-slate-600 "
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 ">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
            >
              <Lock size={16} />
              {busy ? "Chargement…" : "Se connecter"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
