import { useEffect } from 'react';
import { X } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile.js';

export default function Modal({ title, onClose, children, width = 'max-w-2xl', fullScreenMobile = false }) {
  const isMobile = useIsMobile();
  const isFullScreen = fullScreenMobile && isMobile;

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={`fixed inset-0 z-50 ${isFullScreen ? '' : 'flex items-center justify-center'} p-4`}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full ${isFullScreen ? 'h-full max-h-full rounded-none' : `${width} rounded-2xl`} bg-white shadow-2xl dark:bg-slate-900 ${isFullScreen ? 'flex flex-col' : ''}`}>
        <div className={`flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800 ${isFullScreen ? 'sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur' : ''}`}>
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>
        <div className={`overflow-y-auto ${isFullScreen ? 'flex-1' : 'max-h-[80vh]'} px-6 py-5`}>{children}</div>
      </div>
    </div>
  );
}
