/**
 * Modèle de l'entité Modèle de pipeline.
 */
export const PIPELINE_TEMPLATE_FIELDS = {
  id: 'number',
  name: 'string',
  description: 'string|null',
  is_default: 'boolean|number',
  created_at: 'string (date ISO)',
};

/**
 * Fabrique un modèle de pipeline avec des valeurs par défaut.
 * @param {object} data - valeurs initiales (optionnel)
 * @returns {object} une structure modèle de pipeline
 */
export function createPipelineTemplate(data = {}) {
  return {
    id: null,
    name: '',
    description: null,
    is_default: 0,
    created_at: null,
    ...data,
  };
}

export default createPipelineTemplate;
