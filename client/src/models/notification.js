/**
 * Modèle de l'entité Notification.
 */
export const NOTIFICATION_FIELDS = {
  id: 'number',
  user_id: 'number',
  title: 'string',
  message: 'string',
  type: 'string',
  read: 'boolean|number',
  created_at: 'string (date ISO)',
};

/**
 * Fabrique une notification avec des valeurs par défaut.
 * @param {object} data - valeurs initiales (optionnel)
 * @returns {object} une structure notification
 */
export function createNotification(data = {}) {
  return {
    id: null,
    user_id: null,
    title: '',
    message: '',
    type: 'info',
    read: 0,
    created_at: null,
    ...data,
  };
}

export default createNotification;
