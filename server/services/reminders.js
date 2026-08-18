import { db } from '../db.js';
import { sendMail, isMailConfigured } from './mail.js';

export async function scheduleReminder(prospect, actorId) {
  if (!prospect.next_action_date) return;
  if (!prospect.next_action) return;
  const due = new Date(String(prospect.next_action_date).replace("T", " "));
  const now = new Date();
  const diff = Math.round((due - now) / 36e5);
  const target = prospect.assigned_to || actorId;
  if (!target || diff > 24) return;

  const label = diff < 0 ? 'en retard' : diff <= 24 ? 'prévue' : 'demain';
  const title = `Relance ${label}`;
  const action = prospect.next_action || 'une action';
  const dateTime = formatDT(due);
  const message = diff < 0
    ? `« ${action} » pour ${prospect.name} était prévu le ${dateTime}.`
    : `« ${action} » pour ${prospect.name} est prévu le ${dateTime}.`;

  const exists = await db.get(
    'SELECT id FROM notifications WHERE user_id = ? AND title = ? AND message = ?',
    target, title, message,
  );
  if (!exists) {
    await db.run(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)',
      target, title, message, 'tache',
    );
  }

  await sendReminderEmail(prospect, action, due, diff);
}

function formatDT(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} à ${p(d.getHours())}h${p(d.getMinutes())}`;
}

async function sendReminderEmail(prospect, action, due, diff) {
  if (!isMailConfigured() || !prospect.email) return;
  const dueStamp = String(due.getTime());
  const alreadySent = await db.get(
    'SELECT relance_email_sent_date FROM prospects WHERE id = ?',
    prospect.id,
  );
  if (alreadySent?.relance_email_sent_date === dueStamp) return;

  const firstName = (prospect.name || '').split(' ')[0] || prospect.name;
  const company = prospect.company || 'votre entreprise';
  const dateTime = formatDT(due);
  const subject = diff < 0
    ? 'Rappel de notre échange'
    : `Suivi de notre échange — ${company}`;
  const text = [
    `Bonjour ${firstName},`,
    '',
    diff < 0
      ? `Je souhaitais faire le point avec vous concernant « ${action} », prévu le ${dateTime}.`
      : `Je reviens vers vous concernant « ${action} », prévu le ${dateTime}.`,
    '',
    `Disponible pour un rapide échange au sujet de ${company} ?`,
    '',
    'Cordialement,',
    'L\'équipe OptiProspect',
  ].join('\n');

  try {
    const res = await sendMail({ to: prospect.email, subject, text });
    if (!res.skipped) {
      await db.run(
        'UPDATE prospects SET relance_email_sent_date = ?, updated_at = NOW() WHERE id = ?',
        dueStamp,
        prospect.id,
      );
    }
  } catch {
    // l'envoi sera retenté au prochain passage (toutes les 60s)
  }
}

export async function notifyConversion(prospect) {
  const target = prospect.assigned_to;
  if (!target) return;
  const message = `${prospect.name} (${prospect.company || 'sans société'}) est passé en conversion.`;
  const exists = await db.get(
    'SELECT id FROM notifications WHERE user_id = ? AND title = ? AND message = ?',
    target, 'Prospect converti !', message,
  );
  if (exists) return;
  await db.run(
    'INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)',
    target, 'Prospect converti !', message, 'succes',
  );
}

export async function checkAllReminders() {
  const rows = await db.all('SELECT * FROM prospects WHERE next_action_date IS NOT NULL');
  for (const p of rows) {
    try {
      await scheduleReminder(p, null);
    } catch {
      // ne pas interrompre la boucle
    }
  }
}
