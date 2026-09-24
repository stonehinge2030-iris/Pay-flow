const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Resend lets you send from onboarding@resend.dev with zero setup (good for
// getting started); once you verify your own domain in the Resend
// dashboard, set EMAIL_FROM to an address on that domain instead. Until
// then, sends are restricted to your own Resend account email, and are
// more likely to land in spam since the shared address has no domain
// reputation of its own.
const FROM = process.env.EMAIL_FROM || 'PayFlow <onboarding@resend.dev>';

// Shared visual shell for every email — table-based layout (not flex/grid)
// because that's what actually renders consistently across email clients,
// Outlook especially. Matches the app's indigo/paper/Fraunces look as
// closely as email clients allow.
function emailShell({ heading, bodyHtml, footerNote }) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f9; padding:32px 16px; font-family: Georgia, 'Times New Roman', serif;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e4e5ec;">
          <tr>
            <td style="background:#3730e0; padding:22px 32px;">
              <span style="font-family: Georgia, 'Times New Roman', serif; font-style:italic; font-size:20px; font-weight:bold; color:#ffffff;">PayFlow</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
              <h1 style="margin:0 0 14px; font-family: Georgia, 'Times New Roman', serif; font-size:21px; font-weight:normal; color:#15171f;">${heading}</h1>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 26px; border-top:1px solid #e4e5ec; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
              <p style="margin:0; font-size:12px; color:#676f7d; line-height:1.6;">${footerNote}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  `;
}

function buttonHtml(url, label) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 6px 0 20px;">
      <tr>
        <td style="border-radius:999px; background:#3730e0;">
          <a href="${url}" style="display:inline-block; padding:13px 28px; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:999px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>
  `;
}

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
      html: emailShell({
        heading: 'Verify your email',
        bodyHtml: `
          <p style="margin:0 0 20px; font-size:15px; color:#15171f; line-height:1.6; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
            Hi ${name}, confirm this is your email address to finish setting up your PayFlow account.
          </p>
          ${buttonHtml(verifyUrl, 'Verify email')}
          <p style="margin:0; font-size:12px; color:#676f7d; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
            Or paste this link into your browser:<br>
            <a href="${verifyUrl}" style="color:#3730e0; word-break:break-all;">${verifyUrl}</a>
          </p>
        `,
        footerNote: "If you didn't create a PayFlow account, you can safely ignore this email.",
      }),
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
      html: emailShell({
        heading: 'Reset your password',
        bodyHtml: `
          <p style="margin:0 0 20px; font-size:15px; color:#15171f; line-height:1.6; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
            Hi ${name}, we got a request to reset your PayFlow password. This link expires in 1 hour.
          </p>
          ${buttonHtml(resetUrl, 'Reset password')}
          <p style="margin:0; font-size:12px; color:#676f7d; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
            Or paste this link into your browser:<br>
            <a href="${resetUrl}" style="color:#3730e0; word-break:break-all;">${resetUrl}</a>
          </p>
        `,
        footerNote: "If you didn't request this, you can safely ignore this email — your password won't change.",
      }),
    });
  } catch (err) {
    console.error('Sending password reset email failed:', err.message);
  }
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
