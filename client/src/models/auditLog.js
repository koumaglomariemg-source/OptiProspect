/**
 * Modèle de l'entité Journal d'audit.
 */
export const AUDIT_LOG_FIELDS = {
  id: 'number',
  user_id: 'number|null',
  user_name: 'string|null',
  role: 'string|null',
  action: 'string',
  details: 'string|null',
  ip: 'string|null',
  created_at: 'string (date ISO)',
};

/**
 * Fabrique une entrée de journal d'audit avec des valeurs par défaut.
 * @param {object} data - valeurs initiales (optionnel)
 * @returns {object} une structure entrée d'audit
 */
export function createAuditLog(data = {}) {
  return {
    id: null,
    user_id: null,
    user_name: null,
    role: null,
    action: '',
    details: null,
    ip: null,
    created_at: null,
    ...data,
  };
}

export default createAuditLog;
