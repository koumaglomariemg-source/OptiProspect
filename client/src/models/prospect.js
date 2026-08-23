/**
 * Modèle de l'entité Prospect.
 */
export const PROSPECT_FIELDS = {
  id: 'number',
  name: 'string',
  company: 'string|null',
  email: 'string|null',
  phone: 'string|null',
  linkedin: 'string|null',
  source: 'string',
  value: 'number',
  score: 'number',
  stage: 'string',
  temperature: 'string (chaud | tiede | froid | converti | abandonne)',
  secteur: 'string|null',
  adresse: 'string|null',
  latitude: 'number|null',
  longitude: 'number|null',
  assigned_to: 'number|null',
  assignee_name: 'string|null',
  next_action: 'string|null',
  next_action_date: 'string (date ISO)|null',
  note: 'string|null',
  contact_token: 'string|null',
  converted_at: 'string (date ISO)|null',
  template_id: 'number|null',
  numero: 'string|null',
  quartier: 'string|null',
  effectif: 'number|null',
  contrat_depose: 'number',
  contrat_signe: 'number',
  option_frais_scolaire: 'number',
  archived_at: 'string (date ISO)|null',
  created_at: 'string (date ISO)',
  updated_at: 'string (date ISO)',
};

/**
 * Fabrique un prospect avec des valeurs par défaut.
 * @param {object} data - valeurs initiales (optionnel)
 * @returns {object} une structure prospect
 */
export function createProspect(data = {}) {
  return {
    id: null,
    name: '',
    company: null,
    email: null,
    phone: null,
    linkedin: null,
    source: '',
    value: 0,
    score: 0,
    stage: 'etablissements_identifies',
    temperature: 'tiede',
    secteur: null,
    adresse: null,
    latitude: null,
    longitude: null,
    assigned_to: null,
    assignee_name: null,
    next_action: null,
    next_action_date: null,
    note: null,
    contact_token: null,
    converted_at: null,
    template_id: null,
    numero: null,
    quartier: null,
    effectif: null,
    contrat_depose: 0,
    contrat_signe: 0,
    option_frais_scolaire: 0,
    archived_at: null,
    created_at: null,
    updated_at: null,
    ...data,
  };
}

export default createProspect;
