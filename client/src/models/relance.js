/**
 * Modèle de la Relance.
 * Les relances ne sont pas stockées dans une table dédiée :
 * elles sont calculées depuis les prospects dont next_action_date
 * est due (≤ 14 jours) — cf. GET /api/reminders.
 */
export const RELANCE_FIELDS = {
  id: 'number (id du prospect)',
  name: 'string',
  company: 'string|null',
  phone: 'string|null',
  email: 'string|null',
  next_action: 'string|null',
  next_action_date: 'string (date ISO)',
  assigned_to: 'number|null',
  assignee_name: 'string|null',
  due_in_days: 'number (jours restants, négatif = en retard)',
};

/**
 * Fabrique une relance avec des valeurs par défaut.
 * @param {object} data - valeurs initiales (optionnel)
 * @returns {object} une structure relance
 */
export function createRelance(data = {}) {
  return {
    id: null,
    name: '',
    company: null,
    phone: null,
    email: null,
    next_action: null,
    next_action_date: null,
    assigned_to: null,
    assignee_name: null,
    due_in_days: 0,
    ...data,
  };
}

export default createRelance;
