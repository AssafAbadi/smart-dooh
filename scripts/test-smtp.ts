/**
 * Test SMTP (Gmail) from project root. Run: npx ts-node scripts/test-smtp.ts
 * Uses .env from project root. Prints the exact error if send fails.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as nodemailer from 'nodemailer';

// Load .env from project root (parent of scripts/)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const host = process.env.SMTP_HOST;
const port = process.env.SMTP_PORT;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM || user;

console.log('SMTP config:', {
  host,
  port,
  user,
  passSet: !!pass,
  passLength: pass?.length ?? 0,
});

if (!host || !port || !user || !pass) {
  console.error('Missing SMTP_* in .env. Need SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port: Number(port),
  secure: port === '465',
  auth: { user, pass },
});

async function main() {
  try {
    await transporter.sendMail({
      from: from || user,
      to: user!,
      subject: 'Adrive SMTP test',
      text: 'If you see this, SMTP is working.',
    });
    console.log('OK – Test email sent to', user);
  } catch (err: any) {
    console.error('Send failed:');
    console.error(err?.message ?? err);
    if (err?.response) console.error('Response:', err.response);
    if (err?.responseCode) console.error('Code:', err.responseCode);
    process.exit(1);
  }
}

main();
