const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Resend lets you send from onboarding@resend.dev with zero setup (good for
// getting started); once you verify your own domain in the Resend
// dashboard, set EMAIL_FROM to an address on that domain instead.
const FROM = process.env.EMAIL_FROM || 'PayFlow <onboarding@resend.dev>';

async function sendVerificationEmail(to, name, verifyUrl) {
  if (!resend) {
    console.warn('RESEND_API_KEY is not set — skipping verification email. Link:', verifyUrl);
    return;
  }
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Verify your PayFlow email',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #241f94;">Verify your email</h2>
          <p>Hi ${name}, confirm this is your email address to finish setting up your PayFlow account.</p>
          <p>
            <a href="${verifyUrl}" style="display:inline-block; background:#3730e0; color:#fff; padding:12px 22px; border-radius:999px; text-decoration:none; font-weight:600;">
              Verify email
            </a>
          </p>
          <p style="color:#676f7d; font-size:13px;">If you didn't create a PayFlow account, you can ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    // Never let a failed email block signup — the account still works,
    // the person just stays unverified until they retry.
    console.error('Sending verification email failed:', err.message);
  }
}

async function sendPasswordResetEmail(to, name, resetUrl) {
  if (!resend) {
    console.warn('RESEND_API_KEY is not set — skipping reset email. Link:', resetUrl);
    return;
  }
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Reset your PayFlow password',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #241f94;">Reset your password</h2>
          <p>Hi ${name}, we got a request to reset your PayFlow password. This link expires in 1 hour.</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block; background:#3730e0; color:#fff; padding:12px 22px; border-radius:999px; text-decoration:none; font-weight:600;">
              Reset password
            </a>
          </p>
          <p style="color:#676f7d; font-size:13px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Sending password reset email failed:', err.message);
  }
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
