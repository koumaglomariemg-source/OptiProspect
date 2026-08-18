import { useEffect, useMemo, useState } from 'react';
import { Search, UserRound, Users } from 'lucide-react';
import { api } from '../api.js';
import { useStages } from '../hooks/useStages.js';
import { formatDate } from '../constants.js';

export default function PortefeuillesPage() {
  const { byKey } = useStages();
  const [users, setUsers] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    Promise.all([api.users(), api.prospects()])
      .then(([u, p]) => {
        setUsers(u.filter((x) => x.role === "commercial"));
        setProspects(p);
      })
      .catch((err) => setError(err.message));
  };
  useEffect(load, []);

  const counts = useMemo(() => {
    const map = {};
    for (const u of users) map[u.id] = 0;
    let unassigned = 0;
    for (const p of prospects) {
      if (p.assigned_to) map[p.assigned_to] = (map[p.assigned_to] || 0) + 1;
      else unassigned += 1;
    }
    return { map, unassigned };
  }, [users, prospects]);

  const reassign = async (p, assigned_to) => {
    setBusyId(p.id);
    setError('');
    try {
      await api.updateProspect(p.id, { assigned_to: assigned_to || null });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    let rows = prospects;
    if (filter === 'unassigned') rows = rows.filter((p) => !p.assigned_to);
    else if (filter) rows = rows.filter((p) => String(p.assigned_to) === String(filter));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((p) =>
        `${p.name} ${p.company || ''} ${p.email || ''}`.toLowerCase().includes(q)
      );
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [prospects, filter, search]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div>
          <h1 className="text-xl font-bold">Portefeuilles</h1>
          <p className="text-sm text-slate-400">Répartissez et réaffectez les prospects entre commerciaux</p>
        </div>

        {error && <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">{error}</div>}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('')}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${filter === '' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800'}`}
          >
            <Users size={13} /> Tous ({prospects.length})
          </button>
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => setFilter(String(u.id))}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${filter === String(u.id) ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800'}`}
            >
              <UserRound size={13} /> {u.name} ({counts.map[u.id] || 0})
            </button>
          ))}
          <button
            onClick={() => setFilter('unassigned')}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${filter === 'unassigned' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800'}`}
          >
            Non assignés ({counts.unassigned})
          </button>
        </div>

        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un prospect…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-100 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800 sm:grid-cols-[1.5fr_1fr_1fr_auto]">
            <span>Prospect</span>
            <span className="hidden sm:block">Étape</span>
            <span className="hidden sm:block">Commercial</span>
            <span>Réaffecter</span>
          </div>
          {filtered.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-400">Aucun prospect ne correspond à ce filtre</div>
          )}
          {filtered.map((p) => (
            <div key={p.id} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-100 px-4 py-3 last:border-0 dark:border-slate-800 sm:grid-cols-[1.5fr_1fr_1fr_auto]">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{p.name}</div>
                <div className="truncate text-xs text-slate-400">
                  {p.company || 'Sans société'} · {formatDate(p.created_at)}
                </div>
              </div>
              <div className="hidden sm:block">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${(byKey[p.stage] || {}).badge || 'bg-slate-400/15 text-slate-500'}`}>
                  {(byKey[p.stage] || {}).label || p.stage}
                </span>
              </div>
              <div className="hidden truncate text-sm text-slate-500 sm:block">{p.assignee_name || '—'}</div>
              <div className="justify-self-end">
                <select
                  value={p.assigned_to ? String(p.assigned_to) : ''}
                  disabled={busyId === p.id}
                  onChange={(e) => reassign(p, e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">Non assigné</option>
                  {users.map((u) => (
                    <option key={u.id} value={String(u.id)}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
