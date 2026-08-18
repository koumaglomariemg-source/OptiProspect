const QUEUE_KEY = 'optiprospect_offline_queue';
const CACHE_KEY = 'optiprospect_cache_prospects';

export function isOnline() {
  return navigator.onLine !== false;
}

function loadQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}

function saveQueue(q) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function enqueueOp(op) {
  const q = loadQueue();
  q.push({ id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, ...op });
  saveQueue(q);
  window.dispatchEvent(new CustomEvent('pf-sync'));
}

export function getPendingOps() {
  return loadQueue();
}

export function removeOp(id) {
  saveQueue(loadQueue().filter((o) => o.id !== id));
  window.dispatchEvent(new CustomEvent('pf-sync'));
}

export function cacheProspects(rows) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(rows)); } catch { /* stockage plein */ }
}

export function getCachedProspects() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
}

export async function flushQueue() {
  const ops = loadQueue();
  if (!ops.length) return 0;
  let synced = 0;
  for (const op of ops) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (op.token) headers.Authorization = `Bearer ${op.token}`;
      const res = await fetch('/api' + op.path, {
        method: op.method,
        headers,
        body: op.body ? JSON.stringify(op.body) : undefined,
      });
      if (res.status === 401) {
        removeOp(op.id);
        continue;
      }
      if (!res.ok) continue;
      removeOp(op.id);
      synced++;
    } catch {
      break;
    }
  }
  return synced;
}
