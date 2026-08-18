/**
 * Modèle de l'entité Rapport (rapport d'activité).
 */
export const REPORT_FIELDS = {
  id: 'number',
  user_id: 'number',
  period_start: 'string (date ISO)',
  period_end: 'string (date ISO)',
  content: 'string',
  calls: 'number',
  visits: 'number',
  emails: 'number',
  status: 'string (brouillon | soumis | valide)',
  reviewed_by: 'number|null',
  review_comment: 'string|null',
  created_at: 'string (date ISO)',
  updated_at: 'string (date ISO)',
};

/**
 * Fabrique un rapport avec des valeurs par défaut.
 * @param {object} data - valeurs initiales (optionnel)
 * @returns {object} une structure rapport
 */
export function createReport(data = {}) {
  return {
    id: null,
    user_id: null,
    period_start: null,
    period_end: null,
    content: '',
    calls: 0,
    visits: 0,
    emails: 0,
    status: 'brouillon',
    reviewed_by: null,
    review_comment: null,
    created_at: null,
    updated_at: null,
    ...data,
  };
}

export default createReport;
