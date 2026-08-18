import { useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { formatDate } from '../constants.js';

const TYPE_STYLES = {
  tache: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  succes: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  info: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
};

export default function NotificationsDropdown({ unread, setUnread }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef(null);

  const load = () => {
    api.notifications().then((rows) => {
      setItems(rows);
      setUnread(rows.filter((n) => !n.read).length);
    }).catch(() => {});
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markAll = async () => {
    await api.readAllNotifications();
    load();
  };

  const markOne = async (id) => {
    await api.markNotificationRead(id);
    load();
  };

  const remove = async (id) => {
    await api.deleteNotification(id);
    load();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        title="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="text-sm font-semibold">Notifications</div>
            {items.some((n) => !n.read) && (
              <button
                onClick={markAll}
                className="flex items-center gap-1 text-xs font-medium text-indigo-500 hover:text-indigo-600"
              >
                <CheckCheck size={14} /> Tout lire
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-slate-400">Aucune notification</div>
            )}
            {items.map((n) => (
              <div
                key={n.id}
                className={`group flex items-start gap-3 border-b border-slate-50 px-4 py-3 last:border-0 dark:border-slate-800/50 ${n.read ? 'opacity-60' : ''}`}
              >
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TYPE_STYLES[n.type] || TYPE_STYLES.info}`}>
                  <Bell size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{n.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{n.message}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">{formatDate(n.created_at)}</div>
                </div>
                <div className="flex flex-col gap-1 opacity-0 transition group-hover:opacity-100">
                  {!n.read && (
                    <button onClick={() => markOne(n.id)} className="rounded p-1 text-slate-400 hover:text-indigo-500" title="Marquer lu">
                      <Check size={14} />
                    </button>
                  )}
                  <button onClick={() => remove(n.id)} className="rounded p-1 text-slate-400 hover:text-rose-500" title="Supprimer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
