/**
 * Modèle de l'entité Devis.
 */
export const DEVIS_FIELDS = {
  id: 'number',
  reference: 'string',
  prospect_id: 'number',
  prospect_name: 'string|null',
  prospect_company: 'string|null',
  titre: 'string',
  description: 'string|null',
  montant: 'number',
  arr: 'number (récurrent annuel, 0 si aucun abonnement)',
  renewal_date: 'string|null (date de renouvellement)',
  items: 'string (JSON: {name, qty, price, period|null})',
  statut: 'string (brouillon | soumis | valide | refuse)',
  created_by: 'number',
  validated_by: 'number|null',
  validation_comment: 'string|null',
  created_at: 'string (date ISO)',
  archived_at: 'string|null (devis archivé)',
  updated_at: 'string (date ISO)',
};

/**
 * Fabrique un devis avec des valeurs par défaut.
 * @param {object} data - valeurs initiales (optionnel)
 * @returns {object} une structure devis
 */
export function createDevis(data = {}) {
  return {
    id: null,
    reference: '',
    prospect_id: null,
    prospect_name: null,
    prospect_company: null,
    titre: '',
    description: null,
    montant: 0,
    arr: 0,
    renewal_date: null,
    items: null,
    statut: 'brouillon',
    created_by: null,
    validated_by: null,
    validation_comment: null,
    created_at: null,
    updated_at: null,
    archived_at: null,
    ...data,
  };
}

export default createDevis;
