/**
 * Modèle de l'entité Objectif mensuel (user_targets).
 */
export const USER_TARGET_FIELDS = {
  id: 'number',
  user_id: 'number',
  year_month: 'string (YYYY-MM)',
  target_value: 'number',
};

/**
 * Fabrique un objectif mensuel avec des valeurs par défaut.
 * @param {object} data - valeurs initiales (optionnel)
 * @returns {object} une structure objectif
 */
export function createUserTarget(data = {}) {
  return {
    id: null,
    user_id: null,
    year_month: '',
    target_value: 0,
    ...data,
  };
}

export default createUserTarget;
