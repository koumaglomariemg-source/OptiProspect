/**
 * Modèle de l'entité Réunion (meeting).
 */
export const MEETING_FIELDS = {
  id: 'number',
  title: 'string',
  type: 'string (en_ligne | presentiel)',
  location: 'string|null',
  meeting_link: 'string|null',
  starts_at: 'string (date ISO)',
  ends_at: 'string (date ISO)',
  notes: 'string|null',
  created_by: 'number',
  created_by_name: 'string|null',
  created_at: 'string (date ISO)',
  archived_at: 'string|null (réunion archivée)',
};

/**
 * Fabrique une réunion avec des valeurs par défaut.
 * @param {object} data - valeurs initiales (optionnel)
 * @returns {object} une structure réunion
 */
export function createMeeting(data = {}) {
  return {
    id: null,
    title: '',
    type: 'en_ligne',
    location: null,
    meeting_link: null,
    starts_at: null,
    ends_at: null,
    notes: null,
    created_by: null,
    created_by_name: null,
    created_at: null,
    archived_at: null,
    ...data,
  };
}

export default createMeeting;
