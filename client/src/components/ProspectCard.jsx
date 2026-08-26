import { CalendarClock, Euro, MapPin, Pencil, Phone, User } from 'lucide-react';
import { formatDateShort, initials, scoreColor, SOURCE_LABEL, STAGE_BY_KEY } from '../constants.js';

export default function ProspectCard({ prospect, onClick, onEdit, stageMeta }) {
  const stage = stageMeta || STAGE_BY_KEY[prospect.stage];
  const dueClass =
    prospect.due_in_days < 0 ? 'text-rose-600 dark:text-rose-400'
      : prospect.due_in_days === 0 ? 'text-amber-600 dark:text-amber-400'
        : 'text-slate-400';

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="truncate text-sm font-semibold">{prospect.name}</div>
            {prospect.numero && (
              <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:bg-slate-700 dark:text-slate-300">
                {prospect.numero}
              </span>
            )}
          </div>
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">{prospect.company || '—'}</div>
          {(prospect.phone || "+228") && (
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <Phone size={11} />
              <span className="truncate">{prospect.phone || "+228"}</span>
            </div>
          )}
        </div>
        {onEdit && (
          <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-500 dark:hover:bg-slate-700"
              title="Modifier"
            >
              <Pencil size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
        {prospect.source && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
            {SOURCE_LABEL[prospect.source] || prospect.source}
          </span>
        )}
        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
          <Euro size={11} />
          {prospect.value !== undefined && prospect.value !== null ? prospect.value.toLocaleString('fr-FR') : ''} FCFA
        </span>
        {prospect.quartier && (
          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
            <MapPin size={11} />
            {prospect.quartier}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${scoreColor(prospect.score)}`}
            title={`Score ${prospect.score}/100`}
          >
            {prospect.score}
          </span>
          <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300`} title={prospect.assignee_name || 'Non assigné'}>
            {initials(prospect.assignee_name || '?')}
          </span>
        </div>
        {prospect.next_action_date && (
          <span className={`flex items-center gap-1 text-[11px] font-medium ${dueClass}`}>
            <CalendarClock size={12} />
            {formatDateShort(prospect.next_action_date)}
          </span>
        )}
        {!prospect.assignee_name && <User size={13} className="text-slate-300 dark:text-slate-600" />}
      </div>
      {stage && <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${stage.badge}`}>{stage.label}</span>}
      {prospect.steps_total > 0 && (
        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${(prospect.steps_done / prospect.steps_total) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold text-slate-400">
            {prospect.steps_done}/{prospect.steps_total}
          </span>
        </div>
      )}
    </div>
  );
}
