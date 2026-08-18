/**
 * Modèle de l'entité Interaction (échange avec un prospect).
 */
export const INTERACTION_FIELDS = {
  id: 'number',
  prospect_id: 'number',
  user_id: 'number',
  type: 'string (email | whatsapp | linkedin | appel | visite | rendezvous | note)',
  content: 'string',
  interaction_date: 'string (date de l\'échange, défaut : aujourd\'hui)',
  created_at: 'string (date ISO)',
};

/**
 * Fabrique une interaction avec des valeurs par défaut.
 * @param {object} data - valeurs initiales (optionnel)
 * @returns {object} une structure interaction
 */
export function createInteraction(data = {}) {
  return {
    id: null,
    prospect_id: null,
    user_id: null,
    type: 'note',
    content: '',
    interaction_date: null,
    created_at: null,
    ...data,
  };
}

export default createInteraction;
