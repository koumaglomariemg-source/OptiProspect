import { useEffect, useState } from 'react';
import { Building2, CheckCircle2, FileSignature, Mail, MessageSquare, Phone, Search, UserRound } from 'lucide-react';
import { api } from '../api.js';
import { useRefresh } from '../hooks/useRefresh.js';
import { formatDate, initials } from '../constants.js';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);

  const load = () => {
    setError('');
    api.clients().then(setClients).catch((err) => setError(err.message));
  };
  useEffect(load, []);
  useRefresh(() => load(), 30000);

  const total = clients.reduce((s, c) => s + Number(c.total_valide || 0), 0);

  const filtered = clients.filter((c) =>
    !search.trim() || `${c.name} ${c.company || ''} ${c.email || ''}`.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Clients</h1>
            <p className="text-sm text-slate-400">Prospects convertis et leur historique</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">{clients.length} client(s)</span>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-600 dark:bg-emerald-500/10">
              <CheckCircle2 size={14} /> {total.toLocaleString('fr-FR')} FCFA de devis validés
            </span>
          </div>
        </div>

        {error && <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">{error}</div>}

        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            Aucun client converti pour le moment
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                  {initials(c.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{c.name}</span>
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Client</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                    <Building2 size={13} /> {c.company || 'Sans société'}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-bold text-emerald-500">{c.value != null ? Number(c.value).toLocaleString('fr-FR') : ''} FCFA</div>
                  <div className="text-[11px] text-slate-400">client depuis le {formatDate(c.converted_at)}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800">
                  <div className="flex items-center justify-center gap-1 text-lg font-bold text-indigo-500">
                    <FileSignature size={14} /> {c.valid_devis || 0}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">devis validés</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800">
                  <div className="text-lg font-bold text-slate-700 dark:text-slate-200">{c.interactions || 0}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">interactions</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800">
                  <div className="text-lg font-bold text-slate-700 dark:text-slate-200">{formatDate(c.last_interaction)}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">dernier contact</div>
                </div>
              </div>

              <button onClick={() => setOpenId(openId === c.id ? null : c.id)} className="mt-3 w-full rounded-xl bg-slate-100 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">
                {openId === c.id ? 'Masquer le détail' : 'Voir le détail'}
              </button>

              {openId === c.id && (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Mail size={14} className="shrink-0" /> {c.email || '—'}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Phone size={14} className="shrink-0" /> {c.phone || '—'}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <UserRound size={14} className="shrink-0" /> Commercial : {c.assignee_name || '—'}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <MessageSquare size={14} className="shrink-0" /> Dernière interaction : {formatDate(c.last_interaction)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
