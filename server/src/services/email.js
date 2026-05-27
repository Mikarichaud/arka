const nodemailer = require('nodemailer');

// Service email transactionnel. Utilisé pour le reset de mot de passe pour V1,
// extensible plus tard (notifications, invitations, etc.).
//
// Config SMTP via .env :
//   SMTP_HOST, SMTP_PORT, SMTP_SECURE (true|false), SMTP_USER, SMTP_PASS, SMTP_FROM
//
// Fallback dev : si SMTP_HOST n'est pas configuré, on log le contenu du mail
// dans la console au lieu de l'envoyer. Pratique pour développer sans boîte mail.

const hasSmtpConfig = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!hasSmtpConfig()) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE !== 'false', // true par défaut (port 465)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

function fromAddress() {
  return process.env.SMTP_FROM
    || `La Roulade Marseillaise <${process.env.SMTP_USER || 'noreply@roulademarseillaise.fr'}>`;
}

// ─── Template HTML reset password ──────────────────────────────────────────
// Layout table-based pour compatibilité Gmail/Outlook/Apple Mail.
// Couleurs de la charte : bleu azur, or étoile, blanc vélodrome.
function buildResetHtml({ resetUrl, pseudo }) {
  const safeUrl = resetUrl.replace(/"/g, '&quot;');
  const safePseudo = pseudo ? pseudo.replace(/[<>"&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', '&': '&amp;' }[c])) : '';
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Refais ton mot de passe</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F5F0;font-family:'Helvetica Neue',Arial,sans-serif;color:#0D1117;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F5F0;padding:30px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#0057A8;padding:24px 28px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;letter-spacing:0.04em;text-transform:uppercase;font-weight:800;">La Roulade Marseillaise</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 28px 6px 28px;">
              <h2 style="margin:0 0 18px 0;color:#0D1117;font-size:22px;line-height:1.3;">Té${safePseudo ? ' ' + safePseudo : ''}, t'as paumé ton mot de passe ?</h2>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.55;color:#1a1a2e;">Hé bé, c'est pas grave. Ça arrive même aux meilleurs joueurs de pétanque.</p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.55;color:#1a1a2e;">Clique là-dessous pour en remettre un neuf, on va pas y passer la journée :</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 28px 28px 28px;">
              <a href="${safeUrl}" style="display:inline-block;background-color:#C9A84C;color:#0D1117;font-weight:800;font-size:16px;letter-spacing:0.04em;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:50px;border:2px solid #C9A84C;">Refais ton mot de passe</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px 28px;">
              <p style="margin:0 0 12px 0;font-size:13px;color:#6a7280;line-height:1.5;">Ce lien marche pendant <strong style="color:#0D1117;">1 heure pile</strong>. Après, tu redemandes et puis voilà.</p>
              <p style="margin:0 0 12px 0;font-size:13px;color:#6a7280;line-height:1.5;">Si le bouton fonctionne pas, colle ce lien dans ta barre d'adresse :</p>
              <p style="margin:0 0 18px 0;font-size:12px;color:#0057A8;word-break:break-all;line-height:1.4;"><a href="${safeUrl}" style="color:#0057A8;text-decoration:underline;">${safeUrl}</a></p>
              <p style="margin:0;font-size:13px;color:#6a7280;line-height:1.5;">Si c'est pas toi qui as fait cette demande, balance ce mail à la poubelle et passe à autre chose. Ton compte va bien, té.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#F5F5F0;padding:18px 28px;text-align:center;border-top:1px solid #e8e8df;">
              <p style="margin:0;font-size:12px;color:#6a7280;">Allez santé,<br/><strong style="color:#0057A8;">La Roulade Marseillaise</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildResetText({ resetUrl, pseudo }) {
  return `Hé bé !

Tu m'as dit que t'avais paumé ton mot de passe${pseudo ? ' (' + pseudo + ')' : ''} pour
La Roulade Marseillaise. C'est pas grave, ça arrive même
aux meilleurs joueurs de pétanque.

Clique sur ce lien pour en remettre un neuf, on va pas y
passer la journée :

${resetUrl}

Ce lien marche pendant 1 heure pile. Après, tu redemandes
et puis voilà.

Si c'est pas toi qui as fait cette demande, balance ce mail
à la poubelle et passe à autre chose. Ton compte va bien, té.

Allez santé,
La Roulade Marseillaise
`;
}

// Envoie le mail de reset. Fallback dev = console.log si pas de SMTP configuré.
async function sendPasswordReset({ to, pseudo, resetUrl }) {
  const tx = getTransporter();
  if (!tx) {
    // Dev sans SMTP : on log le lien pour pouvoir tester sans boîte mail
    console.log('\n────── [EMAIL DEV] Password reset ──────');
    console.log(`  to:       ${to}`);
    console.log(`  pseudo:   ${pseudo || '(n/a)'}`);
    console.log(`  resetUrl: ${resetUrl}`);
    console.log('────────────────────────────────────────\n');
    return { dev: true };
  }
  return tx.sendMail({
    from: fromAddress(),
    to,
    subject: 'Té, t\'as paumé ton mot de passe ?',
    text: buildResetText({ resetUrl, pseudo }),
    html: buildResetHtml({ resetUrl, pseudo }),
  });
}

module.exports = { sendPasswordReset, hasSmtpConfig };
