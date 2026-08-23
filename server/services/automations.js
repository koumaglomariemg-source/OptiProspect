import { db } from "../db.js";
import { sendMail, isMailConfigured } from "./mail.js";

const DAY_MS = 86_400_000;

function fmt(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

function dateKey(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function parseDT(v) {
  const d = new Date(String(v).replace("T", " "));
  return Number.isNaN(d.getTime()) ? null : d;
}

async function getSetting(key, fallback) {
  const s = await db.get("SELECT value FROM settings WHERE `key` = ?", key);
  return s ? s.value : fallback;
}

async function isEnabled() {
  return (await getSetting("automations_enabled", "1")) === "1";
}

async function already(prospectId, key) {
  const r = await db.get(
    "SELECT id FROM automation_log WHERE prospect_id = ? AND `key` = ?",
    prospectId,
    key,
  );
  return Boolean(r);
}

async function mark(prospectId, key) {
  await db.run(
    "INSERT IGNORE INTO automation_log (prospect_id, `key`) VALUES (?, ?)",
    prospectId,
    key,
  );
}

async function createRelance({ prospect, key, action, dueInDays, title, message, emailSubject, emailText }) {
  if (await already(prospect.id, key)) return false;
  const due = new Date(Date.now() + dueInDays * DAY_MS);
  await db.run(
    "UPDATE prospects SET next_action = ?, next_action_date = ?, updated_at = NOW() WHERE id = ?",
    action,
    fmt(due),
    prospect.id,
  );
  if (prospect.assigned_to) {
    await db.run(
      "INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)",
      prospect.assigned_to,
      title,
      message,
      "tache",
    );
  }
  await db.run(
    "INSERT INTO prospect_events (prospect_id, user_name, type, new_value) VALUES (?,?,?,?)",
    prospect.id,
    "Automatisation",
    "relance_auto",
    action,
  );
  if (isMailConfigured() && prospect.email) {
    try {
      const res = await sendMail({ to: prospect.email, subject: emailSubject, text: emailText });
      if (!res.skipped) {
        await db.run(
          "UPDATE prospects SET relance_email_sent_date = ?, updated_at = NOW() WHERE id = ?",
          String(due.getTime()),
          prospect.id,
        );
      }
    } catch {
      // l'envoi sera retenté au prochain passage
    }
  }
  await mark(prospect.id, key);
  return true;
}

export async function runFollowUpSequences() {
  if (!(await isEnabled())) return;
  let days = [3, 7, 14];
  try {
    days = JSON.parse(await getSetting("automation_relance_days", JSON.stringify(days)));
  } catch {
    /* valeur par défaut */
  }
  days = (Array.isArray(days) ? days : [3, 7, 14]).map(Number).filter((d) => d > 0);
  if (!days.length) days = [3, 7, 14];
  const inactiveDays = Number(await getSetting("automation_inactive_days", "21")) || 21;

  const now = Date.now();
  const active = await db.all(`
    SELECT p.id, p.name, p.company, p.email, p.assigned_to, p.created_at,
      (SELECT MAX(i.interaction_date) FROM interactions i
        WHERE i.prospect_id = p.id AND i.archived_at IS NULL) AS last_interaction
    FROM prospects p
    WHERE p.archived_at IS NULL
      AND p.temperature NOT IN ('converti', 'abandonne')
  `);

  const windows = days.map((d, i) => ({
    d,
    next: i + 1 < days.length ? days[i + 1] : d + 7,
  }));

  for (const p of active) {
    try {
      const created = parseDT(p.created_at);
      if (!created) continue;
      const ageDays = (now - created.getTime()) / DAY_MS;
      const last = p.last_interaction ? parseDT(p.last_interaction) : null;
      const idleDays = last ? (now - last.getTime()) / DAY_MS : ageDays;
      const firstName = (p.name || "").split(" ")[0] || p.name;
      const company = p.company || "votre entreprise";

      // Séquences de relance après création : J+X sans aucun contact.
      for (const w of windows) {
        if (ageDays < w.d || ageDays >= w.next) continue;
        if (last) continue;
        const daysInt = Math.round(ageDays);
        await createRelance({
          prospect: p,
          key: `creation_${w.d}`,
          action: `Relance automatique J+${w.d} — ${p.name}`,
          dueInDays: 1,
          title: `Relance automatique J+${w.d}`,
          message: `« ${p.name} » (${company}) est suivi depuis ${daysInt} jours sans contact. Pensez à le relancer.`,
          emailSubject: `Suivi de notre échange — ${company}`,
          emailText: [
            `Bonjour ${firstName},`,
            "",
            `Nous n'avons pas eu de nouvelles de ${company} depuis un moment.`,
            "Souhaitez-vous faire le point sur votre projet ?",
            "",
            "Disponible pour un rapide échange si le sujet est toujours d'actualité.",
            "",
            "Cordialement,",
            "L'équipe OptiProspect",
          ].join("\n"),
        });
      }

      // Relance d'inactivité : sans contact depuis plus de N jours (au plus une fois par semaine).
      if (idleDays >= inactiveDays) {
        const weekKey = dateKey(new Date(now - 6 * DAY_MS));
        const daysInt = Math.round(idleDays);
        await createRelance({
          prospect: p,
          key: `inactive_${weekKey}`,
          action: `Relance d'inactivité — ${p.name}`,
          dueInDays: 1,
          title: "Prospect inactif",
          message: `« ${p.name} » (${company}) est sans contact depuis ${daysInt} jours. Reprenez contact avant qu'il ne refroidisse.`,
          emailSubject: `Reprenons contact — ${company}`,
          emailText: [
            `Bonjour ${firstName},`,
            "",
            `Cela fait un moment que nous n'avons pas échangé à propos de ${company}.`,
            "Avez-vous encore un besoin sur ce sujet ?",
            "",
            "Je reste à votre disposition pour en discuter.",
            "",
            "Cordialement,",
            "L'équipe OptiProspect",
          ].join("\n"),
        });
      }
    } catch {
      // ne pas interrompre la boucle
    }
  }
}