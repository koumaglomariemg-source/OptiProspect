/**
 * Modèle de l'entité Utilisateur.
 */
export const USER_FIELDS = {
  id: 'number',
  name: 'string',
  first_name: 'string',
  last_name: 'string',
  email: 'string',
  role: 'string (admin | manager | commercial)',
  manager_id: 'number|null',
  avatar: 'string|null',
  created_at: 'string (date ISO)',
  archived_at: 'string|null (compte archivé)',
  manager_name: 'string|null',
};

/**
 * Fabrique un utilisateur avec des valeurs par défaut.
 * @param {object} data - valeurs initiales (optionnel)
 * @returns {object} une structure utilisateur
 */
export function createUser(data = {}) {
  return {
    id: null,
    name: '',
    first_name: '',
    last_name: '',
    email: '',
    role: 'commercial',
    manager_id: null,
    avatar: null,
    created_at: null,
    archived_at: null,
    manager_name: null,
    ...data,
  };
}

export default createUser;
