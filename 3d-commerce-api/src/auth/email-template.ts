export function renderVerificationEmail(input: {
  frontendUrl: string;
  name: string;
  token: string;
}) {
  const verificationUrl = `${input.frontendUrl}/verify-email?token=${encodeURIComponent(input.token)}`;
  const safeName = escapeHtml(input.name || 'there');
  const safeUrl = escapeHtml(verificationUrl);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Verify your 3D Commerce account</title>
  </head>
  <body style="margin:0;background:#090909;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:48px 24px;">
      <div style="border:1px solid #292929;border-radius:20px;background:#111;padding:36px;">
        <p style="margin:0 0 10px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#a3a3a3;">3D Commerce</p>
        <h1 style="margin:0 0 18px;font-size:30px;line-height:1.2;color:#fff;">Verify your email</h1>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#cfcfcf;">Hello ${safeName}, please verify your email address to activate your account.</p>
        <a href="${safeUrl}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:#fff;color:#111;text-decoration:none;font-size:14px;font-weight:700;">Verify email</a>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#8f8f8f;">This verification link expires in 24 hours. If you did not create this account, you can ignore this email.</p>
      </div>
    </div>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
