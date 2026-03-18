# Sign up, verify email, and log in

This guide gets you from zero to logged in with your own account and real OTP emails to **assaf022@gmail.com**.

---

## 0. Prisma (one-time, if you haven’t already)

If this is the first time you’re running the app after the auth changes (or you see errors about `DriverAuth` / `OtpCode`), run from the **project root**:

```bash
npx prisma migrate deploy
npx prisma generate
```

Then start (or restart) the backend. You do **not** need to run these again for normal restarts or `.env` changes.

---

## 1. Gmail App Password (so the backend can send emails)

The backend sends OTP emails via Gmail. Gmail does not accept your normal password for SMTP when 2-Step Verification is on; you must use an **App Password**.

1. Open [Google Account → Security](https://myaccount.google.com/security).
2. Turn on **2-Step Verification** if it is not already on.
3. Under "2-Step Verification", open **App passwords**.
4. Create an app password:
   - App: **Mail**
   - Device: **Other** → name it e.g. "Adrive backend"
5. Copy the **16-character password** (no spaces).

Then in the project root `.env` set:

```env
SMTP_PASS=xxxx xxxx xxxx xxxx
```

Paste the 16-character app password; you can keep or remove the spaces.

Restart the backend after changing `.env` so it picks up the new SMTP settings.

---

## 2. Run backend and mobile

- **Backend:** `npx nx serve backend-api` (from project root).  
  If you just added or changed SMTP in `.env`, restart this process.
- **Mobile:** Start the Expo app and point it at your backend (e.g. set `EXPO_PUBLIC_API_URL` in `apps/mobile-driver/.env` to your machine’s IP or ngrok URL if on a device).

---

## 3. In the app: sign up → verify → log in

1. **Open the app**  
   You should see the **Sign in** screen.

2. **Create account**  
   Tap **Create account**.  
   Enter:
   - **Email:** `assaf022@gmail.com`
   - **Password:** at least 8 characters  
   Tap **Sign up**.

3. **Check your email**  
   An email is sent to **assaf022@gmail.com** with subject **"Adrive – Verify your email"** and a **6-digit code**.  
   If you don’t see it, check Spam. It can take a minute.

4. **Verify**  
   You’ll be taken to the **Verify your email** screen (email field may already be filled).  
   Enter the **6-digit code** from the email and tap **Verify**.  
   On success you’re taken to the main app (drawer).

5. **Next time: sign in**  
   After you sign out (Settings → Sign out) or restart the app, use **Sign in**:  
   - Email: `assaf022@gmail.com`  
   - Password: the one you chose  
   You’ll go straight to the drawer (no OTP again).

---

## If something goes wrong

- **“Mail not configured”** when signing up  
  Backend is missing or misreading SMTP. Check `.env` has `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and restart the backend.

- **No email**  
  - Confirm `SMTP_PASS` is the Gmail **App Password**, not your normal Gmail password.  
  - Check Spam.  
  - In Gmail, check that "Less secure app access" is not required (use App Passwords instead).

- **“Invalid or expired code”**  
  Codes expire after 10 minutes. On the verification screen tap **Resend code** and use the new code from the latest email.

- **“Email not verified” when signing in**  
  You tried to sign in before verifying. Go to the verification screen (the app should send you there), enter the 6-digit code from the email, then sign in again.

Once `SMTP_PASS` is set correctly and the backend is restarted, signing up with **assaf022@gmail.com** will send the OTP to that inbox so you can verify and log in.
