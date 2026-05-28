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
            <td style="background-color:#0057A8;padding:26px 28px 22px 28px;text-align:center;">
              <div style="font-size:34px;line-height:1;margin-bottom:8px;">🐟 ⚓ ☀️</div>
              <h1 style="margin:0;color:#ffffff;font-size:27px;letter-spacing:0.04em;text-transform:uppercase;font-weight:800;">La Roulade Marseillaise</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 28px 6px 28px;">
              <h2 style="margin:0 0 18px 0;color:#0D1117;font-size:22px;line-height:1.3;">Té${safePseudo ? ' ' + safePseudo : ''}, t'as paumé ton mot de passe ? 🐟</h2>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.55;color:#1a1a2e;">Hé bé, c'est pas plus grave que de perdre au tirage à la pétanque. Ça arrive même aux meilleurs pointeurs du Vieux-Port.</p>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.55;color:#1a1a2e;">Clique sur le cochonnet doré là-dessous pour en remettre un neuf — on va pas y passer l'apéro :</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 28px 26px 28px;">
              <a href="${safeUrl}" style="display:inline-block;background-color:#C9A84C;color:#0D1117;font-weight:800;font-size:16px;letter-spacing:0.04em;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:50px;border:2px solid #C9A84C;">🎯 Refais ton mot de passe</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 8px 28px;">
              <div style="background-color:#F5F5F0;border-left:3px solid #C9A84C;border-radius:6px;padding:12px 14px;margin-bottom:18px;">
                <p style="margin:0;font-size:13px;color:#1a1a2e;line-height:1.5;">⏱️ Ce lien tient <strong>1 heure pile</strong>, le temps d'une partie de pétanque. Après il file se baigner aux Calanques et tu redemandes, voilà.</p>
              </div>
              <p style="margin:0 0 8px 0;font-size:13px;color:#6a7280;line-height:1.5;">Si le bouton fait la sieste, colle ce lien dans ta barre d'adresse :</p>
              <p style="margin:0 0 18px 0;font-size:12px;color:#0057A8;word-break:break-all;line-height:1.4;"><a href="${safeUrl}" style="color:#0057A8;text-decoration:underline;">${safeUrl}</a></p>
              <p style="margin:0 0 18px 0;font-size:13px;color:#6a7280;line-height:1.5;">Si c'est pas toi qui as demandé ça, balance ce mail à la poubelle et va te chercher un pastis. Ton compte est bien gardé, té — c'est peut-être un Parisien qui s'est trompé d'adresse. 😏</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0057A8;padding:18px 28px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#ffffff;">Allez, à très vite sur le carreau ! 🟡<br/><strong style="color:#C9A84C;">La Roulade Marseillaise</strong></p>
            </td>
          </tr>
        </table>
        <p style="margin:14px 0 0 0;font-size:11px;color:#9aa0aa;text-align:center;">Fait avec amour entre le Vélodrome et les Calanques. 🌊</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildResetText({ resetUrl, pseudo }) {
  return `Hé bé${pseudo ? ' ' + pseudo : ''} ! 🐟

Tu m'as dit que t'avais paumé ton mot de passe pour
La Roulade Marseillaise. C'est pas plus grave que de
perdre au tirage à la pétanque — ça arrive même aux
meilleurs pointeurs du Vieux-Port.

Clique sur ce lien pour en remettre un neuf, on va pas
y passer l'apéro :

${resetUrl}

⏱️ Ce lien tient 1 heure pile, le temps d'une partie de
pétanque. Après il file se baigner aux Calanques et tu
redemandes, voilà.

Si c'est pas toi qui as demandé ça, balance ce mail à la
poubelle et va te chercher un pastis. Ton compte est bien
gardé, té — c'est peut-être un Parisien qui s'est trompé
d'adresse.

Allez, à très vite sur le carreau !
La Roulade Marseillaise
🌊 Fait avec amour entre le Vélodrome et les Calanques.
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
    subject: '🐟 Té, t\'as paumé ton mot de passe ?',
    text: buildResetText({ resetUrl, pseudo }),
    html: buildResetHtml({ resetUrl, pseudo }),
  });
}

module.exports = { sendPasswordReset, hasSmtpConfig };
