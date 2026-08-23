const API = '/api';

import { cacheProspects, enqueueOp, getCachedProspects, isOnline } from './offline.js';

let token = localStorage.getItem('pf_token') || null;

export function setToken(t) {
  token = t;
  if (t) localStorage.setItem('pf_token', t);
  else localStorage.removeItem('pf_token');
}

export function getToken() {
  return token;
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const method = options.method || 'GET';

  if (!isOnline()) {
    if (method !== 'GET') {
      enqueueOp({ path, method, body: options.body ? JSON.parse(options.body) : {}, token });
      return { ok: true, queued: true, offline: true };
    }
    if (path.startsWith('/prospects')) {
      const cached = getCachedProspects();
      if (cached) return cached;
    }
  }

  let res;
  try {
    res = await fetch(API + path, { ...options, headers });
  } catch {
    if (method !== 'GET') {
      enqueueOp({ path, method, body: options.body ? JSON.parse(options.body) : {}, token });
      return { ok: true, queued: true, offline: true };
    }
    if (path.startsWith('/prospects')) {
      const cached = getCachedProspects();
      if (cached) return cached;
    }
    throw new Error('Pas de connexion réseau');
  }

  if (res.status === 401) {
    setToken(null);
    if (!path.includes('/auth/')) window.location.href = '/login';
    throw new Error('Non authentifié');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),
  profile: () => request('/users/me'),
  updateProfile: (data) => request('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),

  publicProspectInfo: (id, token) => request(`/public/prospects/${id}/info?token=${encodeURIComponent(token || '')}`),
  publicRespond: (id, data) => request(`/public/prospects/${id}/respond`, { method: 'POST', body: JSON.stringify(data) }),
  publicContact: (data) => request('/public/contact', { method: 'POST', body: JSON.stringify(data) }),

  prospects: async (params = {}) => {
    const rows = await request('/prospects?' + new URLSearchParams(params));
    const arr = Array.isArray(rows) ? rows : rows.data || [];
    cacheProspects(arr);
    return rows;
  },
  prospect: (id) => request(`/prospects/${id}`),
  createProspect: (data) => request('/prospects', { method: 'POST', body: JSON.stringify(data) }),
  updateProspect: (id, data) => request(`/prospects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProspect: (id) => request(`/prospects/${id}`, { method: 'DELETE' }),
  markRelanceDone: (id) => request(`/prospects/${id}/relance-done`, { method: 'POST' }),
  steps: (prospectId) => request(`/prospects/${prospectId}/steps`),
  saveStep: (progressId, data) => request(`/steps/${progressId}`, { method: 'PUT', body: JSON.stringify({ data }) }),
  validateStep: (progressId) => request(`/steps/${progressId}/validate`, { method: 'POST' }),
  unvalidateStep: (progressId) => request(`/steps/${progressId}/unvalidate`, { method: 'POST' }),

  pipelineTemplates: () => request('/pipeline-templates'),
  createPipelineTemplate: (data) => request('/pipeline-templates', { method: 'POST', body: JSON.stringify(data) }),
  updatePipelineTemplate: (id, data) => request(`/pipeline-templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  setDefaultPipelineTemplate: (id) => request(`/pipeline-templates/${id}/default`, { method: 'POST' }),
  deletePipelineTemplate: (id) => request(`/pipeline-templates/${id}`, { method: 'DELETE' }),

  meetings: () => request('/meetings'),
  createMeeting: (data) => request('/meetings', { method: 'POST', body: JSON.stringify(data) }),
  updateMeeting: (id, data) => request(`/meetings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMeeting: (id) => request(`/meetings/${id}`, { method: 'DELETE' }),
  suggestMessage: (id) => request(`/prospects/${id}/suggest-message`),
  sendMessage: (id, data) => request(`/prospects/${id}/send-message`, { method: 'POST', body: JSON.stringify(data) }),
  importProspects: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/prospects/import', { method: 'POST', body: formData, headers: {} });
  },
  interactions: (prospectId) => request(`/prospects/${prospectId}/interactions`),
  addInteraction: (prospectId, data) => request(`/prospects/${prospectId}/interactions`, { method: 'POST', body: JSON.stringify(data) }),
  deleteInteraction: (id) => request(`/interactions/${id}`, { method: 'DELETE' }),
  events: (prospectId) => request(`/prospects/${prospectId}/events`),

  reminders: () => request('/reminders'),
  day: () => request('/day'),

  notifications: () => request('/notifications'),
  unreadCount: () => request('/notifications/unread-count'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  readAllNotifications: () => request('/notifications/read-all', { method: 'POST' }),
  deleteNotification: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),

  statsOverview: (params = {}) => request('/stats/overview?' + new URLSearchParams(params)),
  statsByUser: (params = {}) => request('/stats/by-user?' + new URLSearchParams(params)),
  statsTimeline: (days = 30, params = {}) => request(`/stats/timeline?days=${days}&` + new URLSearchParams(params)),
  statsForecast: (params = {}) => request('/stats/forecast?' + new URLSearchParams(params)),
  statsTargets: (yearMonth, params = {}) => request(`/stats/targets?year_month=${yearMonth}&` + new URLSearchParams(params)),
  statsCounts: () => request('/stats/counts'),
  statsProspection: (days = 30, params = {}) => request(`/stats/prospection?days=${days}&` + new URLSearchParams(params)),
  statsAtRisk: (params = {}) => request('/stats/at-risk?' + new URLSearchParams(params)),
  statsAging: (params = {}) => request('/stats/aging?' + new URLSearchParams(params)),
  clients: (params = {}) => request('/stats/clients?' + new URLSearchParams(params)),

  setTarget: (userId, yearMonth, targetValue) => request(`/users/${userId}/target`, { method: 'PUT', body: JSON.stringify({ year_month: yearMonth, target_value: targetValue }) }),
  deleteTarget: (userId, yearMonth) => request(`/users/${userId}/target/${yearMonth}`, { method: 'DELETE' }),

  devis: (params = {}) => request('/devis?' + new URLSearchParams(params)),
  createDevis: (data) => request('/devis', { method: 'POST', body: JSON.stringify(data) }),
  updateDevis: (id, data) => request(`/devis/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  submitDevis: (id) => request(`/devis/${id}/submit`, { method: 'POST' }),
  validateDevis: (id, comment = '') => request(`/devis/${id}/validate`, { method: 'POST', body: JSON.stringify({ comment }) }),
  refuseDevis: (id, comment = '') => request(`/devis/${id}/refuse`, { method: 'POST', body: JSON.stringify({ comment }) }),
  deleteDevis: (id) => request(`/devis/${id}`, { method: 'DELETE' }),

  reports: (params = {}) => request('/reports?' + new URLSearchParams(params)),
  createReport: (data) => request('/reports', { method: 'POST', body: JSON.stringify(data) }),
  reviewReport: (id, decision, comment = '') => request(`/reports/${id}/review`, { method: 'POST', body: JSON.stringify({ decision, comment }) }),

  settings: () => request('/settings'),
  stages: () => request('/settings/stages'),
  updateSetting: (key, value) => request(`/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  auditLog: () => request('/settings/audit'),
  backup: () => request('/settings/backup'),

  users: () => request('/users'),
  userDetail: (id) => request(`/users/${id}`),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
};
