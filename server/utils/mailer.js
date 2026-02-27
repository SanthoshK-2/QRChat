const nodemailer = require('nodemailer');

async function sendEmail({ to, subject, text, html }) {
  let from = process.env.EMAIL_FROM 
    || (process.env.RESEND_API_KEY ? 'QR Chat <onboarding@resend.dev>' : 'QR Chat <noreply@qrchat.app>');

  // Resend (recommended for Render) via HTTP API — no extra deps
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html: html || `<pre>${text || ''}</pre>`
        })
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        // If domain not verified, retry with onboarding sender automatically
        if (String(body).includes('domain is not verified')) {
          const onboardingFrom = 'QR Chat <onboarding@resend.dev>';
          try {
            const retry = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: onboardingFrom,
                to: [to],
                subject,
                html: html || `<pre>${text || ''}</pre>`
              })
            });
            if (retry.ok) return true;
          } catch (e2) {
            console.error('Resend retry with onboarding failed:', e2.message);
          }
        }
        throw new Error(`Resend error: ${res.status} ${body}`);
      }
      return true;
    } catch (e) {
      console.error('Resend send failed:', e.message);
      // Fall through to other transports
    }
  }

  // Generic SMTP URL
  if (process.env.SMTP_URL) {
    try {
      const transporter = nodemailer.createTransport(process.env.SMTP_URL);
      await transporter.sendMail({ from, to, subject, text, html });
      return true;
    } catch (e) {
      console.error('SMTP_URL send failed:', e.message);
    }
  }

  // Manual SMTP host/port/user/pass
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        secure: String(process.env.EMAIL_SECURE || '').toLowerCase() === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      await transporter.sendMail({ from, to, subject, text, html });
      return true;
    } catch (e) {
      console.error('SMTP host send failed:', e.message);
    }
  }

  // Legacy Gmail (requires App Password)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text, html });
      return true;
    } catch (e) {
      console.error('Gmail send failed:', e.message);
    }
  }

  return false;
}

module.exports = { sendEmail };
