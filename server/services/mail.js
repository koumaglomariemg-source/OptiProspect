import nodemailer from "nodemailer";

const HOST = process.env.SMTP_HOST || "";
const PORT = Number(process.env.SMTP_PORT || 587);
const USER = process.env.SMTP_USER || "";
const PASS = process.env.SMTP_PASS || "";
const FROM = process.env.SMTP_FROM || USER;
const APP_URL = process.env.APP_URL || "http://localhost:4000";
const LOGIN_URL = `${APP_URL}/login?logout=1`;

let transporter = null;

function getTransporter() {
  if (!USER || !PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: HOST || "smtp.gmail.com",
      port: PORT,
      secure: PORT === 465,
      pool: true,
      maxConnections: 2,
      maxMessages: 100,
      auth: { user: USER, pass: PASS },
    });
  }
  return transporter;
}

export function isMailConfigured() {
  return Boolean(USER && PASS);
}

export async function sendMail({ to, subject, text, html }) {
  const tr = getTransporter();
  if (!tr) return { skipped: true, reason: "SMTP non configuré" };
  const info = await tr.sendMail({
    from: FROM ? `"OptiProspect" <${FROM}>` : `"OptiProspect" <${USER}>`,
    to,
    subject,
    text,
    html,
  });
  return { skipped: false, messageId: info.messageId };
}

export async function sendWelcomeEmail({ name, email, password }) {
  const subject = "Vos identifiants de connexion OptiProspect";
  const text = [
    `Bonjour ${name},`,
    "",
    `Votre compte OptiProspect a été créé. Voici vos identifiants :`,
    "",
    `  Email    : ${email}`,
    `  Mot de passe : ${password}`,
    "",
    "Connectez-vous à l'adresse : " + LOGIN_URL,
    "",
    "Une fois connecté, vous pourrez modifier vos informations dans la page Profil.",
    "",
    "Nous vous recommandons de changer votre mot de passe à la première connexion.",
    "",
    "Cordialement,",
    "L'équipe OptiProspect",
  ].join("\n");
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#4f46e5;margin-top:0;">Bienvenue sur OptiProspect</h2>
      <p>Bonjour <strong>${name}</strong>,</p>
      <p>Votre compte a été créé. Voici vos identifiants de connexion :</p>
      <table style="margin:16px 0;border-collapse:collapse;width:100%;">
        <tr>
          <td style="padding:8px 12px;background:#f1f5f9;border-radius:6px 0 0 6px;font-weight:bold;color:#475569;">Email</td>
          <td style="padding:8px 12px;background:#f8fafc;border-radius:0 6px 6px 0;color:#0f172a;">${email}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;background:#f1f5f9;font-weight:bold;color:#475569;">Mot de passe</td>
          <td style="padding:8px 12px;background:#f8fafc;color:#0f172a;"><code>${password}</code></td>
        </tr>
      </table>
      <p style="margin:0 0 16px;">Connectez-vous et pensez à modifier votre mot de passe :</p>
      <a href="${LOGIN_URL}"
         style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:bold;">
        Se connecter
      </a>
      <p style="margin-top:24px;color:#64748b;font-size:13px;">Cordialement,<br/>L'équipe OptiProspect</p>
    </div>
  `;
  return sendMail({ to: email, subject, text, html });
}
