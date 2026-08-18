/**
 * Modèle de l'entité Étape de pipeline.
 */
export const PIPELINE_STEP_FIELDS = {
  id: 'number',
  template_id: 'number',
  position: 'number',
  key: 'string',
  name: 'string',
  color: 'string',
  form_fields: 'string (JSON)',
  created_at: 'string (date ISO)',
};

/**
 * Fabrique une étape de pipeline avec des valeurs par défaut.
 * @param {object} data - valeurs initiales (optionnel)
 * @returns {object} une structure étape de pipeline
 */
export function createPipelineStep(data = {}) {
  return {
    id: null,
    template_id: null,
    position: 0,
    key: '',
    name: '',
    color: '#6366f1',
    form_fields: null,
    created_at: null,
    ...data,
  };
}

export default createPipelineStep;
