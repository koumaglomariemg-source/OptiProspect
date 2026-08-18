import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { csvSerialize } from '../utils/csv.js';
import { exportExcel, exportPdf } from '../utils/export.js';

const OPTIONS = [
  { kind: 'csv', label: 'CSV', hint: 'Tableur brut (.csv)', icon: FileText },
  { kind: 'xlsx', label: 'Excel', hint: 'Tableau Excel (.xlsx)', icon: FileSpreadsheet },
  { kind: 'pdf', label: 'PDF', hint: 'Tableau PDF (.pdf)', icon: FileText },
];

export default function ExportMenu({ columns, rows, baseName, sheetTitle = 'Prospects', getRows, disabled }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const doExport = async (kind) => {
    if (busy) return;
    setBusy(true);
    try {
      const data = getRows ? await getRows() : rows;
      const base = `${baseName}-${new Date().toISOString().slice(0, 10)}`;
      if (kind === 'csv') {
        const blob = new Blob([csvSerialize(data, columns)], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${base}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (kind === 'xlsx') {
        exportExcel(`${base}.xlsx`, columns, data);
      } else {
        exportPdf(`${base}.pdf`, columns, data, sheetTitle);
      }
      setOpen(false);
    } catch (e) {
      alert(e.message || 'Erreur lors de l\'export');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || busy}
        className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 dark:border-slate-700"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        Export
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {OPTIONS.map(({ kind, label, hint, icon: Icon }) => (
            <button
              key={kind}
              onClick={() => doExport(kind)}
              disabled={busy}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-indigo-50 dark:hover:bg-slate-800"
            >
              <Icon size={16} className="shrink-0 text-indigo-500" />
              <span className="min-w-0">
                <span className="block font-semibold">{label}</span>
                <span className="block text-[11px] text-slate-400">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
