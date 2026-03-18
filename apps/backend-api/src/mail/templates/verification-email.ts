export function verificationEmailHtml(code: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Verify your email</title></head>
<body style="font-family: system-ui, sans-serif; background: #1A1C1E; color: #E8EAED; padding: 24px;">
  <div style="max-width: 400px; margin: 0 auto;">
    <h1 style="color: #007AFF;">Adrive – Verify your email</h1>
    <p>Use this code to verify your account:</p>
    <p style="font-size: 28px; letter-spacing: 8px; font-weight: bold; color: #007AFF;">${code}</p>
    <p style="color: #9AA0A6;">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
  </div>
</body>
</html>
`.trim();
}
