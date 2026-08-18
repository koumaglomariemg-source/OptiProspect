/**
 * Point d'entrée des modèles de données de l'application.
 * Chaque modèle expose : *FIELDS (description des champs) et createXxx (fabrique de structure).
 */
export { default as createUser, USER_FIELDS } from './user.js';
export { default as createProspect, PROSPECT_FIELDS } from './prospect.js';
export { default as createDevis, DEVIS_FIELDS } from './devis.js';
export { default as createMeeting, MEETING_FIELDS } from './meeting.js';
export { default as createInteraction, INTERACTION_FIELDS } from './interaction.js';
export { default as createNotification, NOTIFICATION_FIELDS } from './notification.js';
export { default as createPipelineTemplate, PIPELINE_TEMPLATE_FIELDS } from './pipelineTemplate.js';
export { default as createPipelineStep, PIPELINE_STEP_FIELDS } from './pipelineStep.js';
export { default as createReport, REPORT_FIELDS } from './report.js';
export { default as createUserTarget, USER_TARGET_FIELDS } from './userTarget.js';
export { default as createAuditLog, AUDIT_LOG_FIELDS } from './auditLog.js';
export { default as createRelance, RELANCE_FIELDS } from './relance.js';
