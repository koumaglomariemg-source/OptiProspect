-- OptiProspect — Modèle de la base de données MySQL/MariaDB
-- Base : optiprospect
-- Généré le 2026-08-07T09:16:40.964Z
--

CREATE DATABASE IF NOT EXISTS optiprospect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE optiprospect;

CREATE TABLE `audit_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `user_name` varchar(191) DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `details` text DEFAULT NULL,
  `ip` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci


CREATE TABLE `devis` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reference` varchar(191) NOT NULL,
  `prospect_id` int(11) NOT NULL,
  `titre` varchar(191) NOT NULL,
  `description` text DEFAULT NULL,
  `montant` double DEFAULT 0,
  `items` text DEFAULT NULL,
  `statut` varchar(50) NOT NULL DEFAULT 'brouillon',
  `created_by` int(11) DEFAULT NULL,
  `validated_by` int(11) DEFAULT NULL,
  `validation_comment` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_devis_reference` (`reference`),
  KEY `idx_devis_prospect` (`prospect_id`),
  KEY `fk_devis_created` (`created_by`),
  KEY `fk_devis_validated` (`validated_by`),
  CONSTRAINT `fk_devis_created` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_devis_prospect` FOREIGN KEY (`prospect_id`) REFERENCES `prospects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_devis_validated` FOREIGN KEY (`validated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci


CREATE TABLE `interactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `prospect_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'note',
  `content` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_interactions_prospect` (`prospect_id`),
  KEY `fk_interactions_user` (`user_id`),
  CONSTRAINT `fk_interactions_prospect` FOREIGN KEY (`prospect_id`) REFERENCES `prospects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_interactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci


CREATE TABLE `meeting_participants` (
  `meeting_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  PRIMARY KEY (`meeting_id`,`user_id`),
  KEY `fk_mp_user` (`user_id`),
  CONSTRAINT `fk_mp_meeting` FOREIGN KEY (`meeting_id`) REFERENCES `meetings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci


CREATE TABLE `meetings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(191) NOT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'en_ligne',
  `location` text DEFAULT NULL,
  `meeting_link` text DEFAULT NULL,
  `starts_at` datetime DEFAULT NULL,
  `ends_at` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_meetings_created` (`created_by`),
  CONSTRAINT `fk_meetings_created` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci


CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `title` varchar(191) NOT NULL,
  `message` text NOT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'info',
  `read` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user` (`user_id`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci


CREATE TABLE `pipeline_template_steps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `template_id` int(11) NOT NULL,
  `position` int(11) NOT NULL DEFAULT 0,
  `key` varchar(100) DEFAULT NULL,
  `name` varchar(191) NOT NULL,
  `color` varchar(50) DEFAULT 'indigo',
  `form_fields` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_steps_template` (`template_id`),
  CONSTRAINT `fk_steps_template` FOREIGN KEY (`template_id`) REFERENCES `pipeline_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci


CREATE TABLE `pipeline_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `description` text DEFAULT NULL,
  `is_default` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci


CREATE TABLE `prospect_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `prospect_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `user_name` varchar(191) DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  `field` varchar(100) DEFAULT NULL,
  `old_value` text DEFAULT NULL,
  `new_value` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_events_prospect` (`prospect_id`),
  KEY `fk_events_user` (`user_id`),
  CONSTRAINT `fk_events_prospect` FOREIGN KEY (`prospect_id`) REFERENCES `prospects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_events_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci


CREATE TABLE `prospect_steps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `prospect_id` int(11) NOT NULL,
  `step_id` int(11) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `data` text DEFAULT NULL,
  `validated_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_prospect_steps` (`prospect_id`,`step_id`),
  KEY `fk_ps_step` (`step_id`),
  CONSTRAINT `fk_ps_prospect` FOREIGN KEY (`prospect_id`) REFERENCES `prospects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ps_step` FOREIGN KEY (`step_id`) REFERENCES `pipeline_template_steps` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci


CREATE TABLE `prospects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `first_name` varchar(191) DEFAULT NULL,
  `last_name` varchar(191) DEFAULT NULL,
  `company` varchar(191) DEFAULT NULL,
  `email` varchar(191) DEFAULT NULL,
  `phone` varchar(191) DEFAULT NULL,
  `linkedin` varchar(500) DEFAULT NULL,
  `source` varchar(50) DEFAULT 'site',
  `value` double DEFAULT 0,
  `score` int(11) DEFAULT 0,
  `stage` varchar(100) NOT NULL DEFAULT 'nouveau',
  `temperature` varchar(50) DEFAULT 'tiede',
  `secteur` varchar(191) DEFAULT NULL,
  `adresse` text DEFAULT NULL,
  `latitude` double DEFAULT NULL,
  `longitude` double DEFAULT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `next_action` text DEFAULT NULL,
  `next_action_date` date DEFAULT NULL,
  `note` text DEFAULT NULL,
  `contact_token` varchar(64) DEFAULT NULL,
  `converted_at` datetime DEFAULT NULL,
  `template_id` int(11) DEFAULT NULL,
  `numero` varchar(100) DEFAULT NULL,
  `quartier` varchar(191) DEFAULT NULL,
  `effectif` int(11) DEFAULT NULL,
  `contrat_depose` int(11) NOT NULL DEFAULT 0,
  `contrat_signe` int(11) NOT NULL DEFAULT 0,
  `option_frais_scolaire` int(11) NOT NULL DEFAULT 0,
  `archived_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_prospects_stage` (`stage`),
  KEY `idx_prospects_assigned` (`assigned_to`),
  KEY `idx_prospects_updated` (`updated_at`),
  CONSTRAINT `fk_prospects_assigned` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci


CREATE TABLE `reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `period_start` date DEFAULT NULL,
  `period_end` date DEFAULT NULL,
  `content` text NOT NULL,
  `calls` int(11) DEFAULT 0,
  `visits` int(11) DEFAULT 0,
  `emails` int(11) DEFAULT 0,
  `status` varchar(50) NOT NULL DEFAULT 'en_attente',
  `reviewed_by` int(11) DEFAULT NULL,
  `review_comment` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_reports_user` (`user_id`),
  KEY `fk_reports_reviewed` (`reviewed_by`),
  CONSTRAINT `fk_reports_reviewed` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reports_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci


CREATE TABLE `settings` (
  `key` varchar(191) NOT NULL,
  `value` text NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci


CREATE TABLE `user_targets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `year_month` varchar(7) NOT NULL,
  `target_value` double NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_targets_user_ym` (`user_id`,`year_month`),
  CONSTRAINT `fk_targets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci


CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'commercial',
  `manager_id` int(11) DEFAULT NULL,
  `first_name` varchar(191) DEFAULT NULL,
  `last_name` varchar(191) DEFAULT NULL,
  `avatar` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `fk_users_manager` (`manager_id`),
  CONSTRAINT `fk_users_manager` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

