// Exotel calls this URL (as a "Passthru" applet in your Call Flow / App
// Bazaar app, or as the Call Flow's callback URL) when a call comes in. It
// sends the customer an SMS with the /request link and logs the event so
// staff can see it worked.
//
// Deploy with: firebase deploy --only functions
// (requires the Firebase CLI: npm install -g firebase-tools, then
// `firebase login` and `firebase use <your-project-id>` once from this
// project's root.)
//
// Configure the secrets it needs (one-time, from the project root):
//   firebase functions:secrets:set EXOTEL_SID
//   firebase functions:secrets:set EXOTEL_API_KEY
//   firebase functions:secrets:set EXOTEL_API_TOKEN
//   firebase functions:secrets:set EXOTEL_SENDER_ID
//   firebase functions:secrets:set WEBHOOK_SHARED_SECRET
//   firebase functions:secrets:set APP_BASE_URL
// See README.md -> "Auto-send on incoming call (Exotel)" for what each one is.

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

const EXOTEL_SID = defineSecret("EXOTEL_SID");
const EXOTEL_API_KEY = defineSecret("EXOTEL_API_KEY");
const EXOTEL_API_TOKEN = defineSecret("EXOTEL_API_TOKEN");
const EXOTEL_SENDER_ID = defineSecret("EXOTEL_SENDER_ID");
const WEBHOOK_SHARED_SECRET = defineSecret("WEBHOOK_SHARED_SECRET");
const APP_BASE_URL = defineSecret("APP_BASE_URL");

function toE164India(raw) {
  let digits = String(raw || "").replace(/[^\d]/g, "");
  if (digits.length === 10) digits = "91" + digits;
  else if (digits.startsWith("0")) digits = "91" + digits.slice(1);
  return digits;
}

export const exotelCallWebhook = onRequest(
  {
    secrets: [
      EXOTEL_SID,
      EXOTEL_API_KEY,
      EXOTEL_API_TOKEN,
      EXOTEL_SENDER_ID,
      WEBHOOK_SHARED_SECRET,
      APP_BASE_URL,
    ],
  },
  async (req, res) => {
    // Shared-secret check — Exotel doesn't sign webhooks, so this is what
    // stops a stranger from finding the URL and triggering SMS sends on
    // your account. Set it as a query param on the URL you give Exotel:
    // https://.../exotelCallWebhook?token=YOUR_SECRET
    if (req.query.token !== WEBHOOK_SHARED_SECRET.value()) {
      res.status(403).send("Forbidden");
      return;
    }

    // Exotel's Passthru applet sends call details as query params or form
    // fields depending on how it's configured — check both.
    const params = { ...req.query, ...req.body };
    const callerRaw = params.CallFrom || params.From || params.CallerNumber || "";
    const callSid = params.CallSid || null;

    if (!callerRaw) {
      res.status(400).send("Missing caller number");
      return;
    }

    const callerDigits = toE164India(callerRaw);
    const requestUrl = `${APP_BASE_URL.value()}#/request`;
    const message = `Hi! Thanks for calling Karaikudi Annalakshmi. Please share your event details here: ${requestUrl}`;

    let smsSent = false;
    let smsError = null;

    try {
      const sid = EXOTEL_SID.value();
      const url = `https://api.exotel.com/v1/Accounts/${sid}/Sms/send.json`;
      const body = new URLSearchParams({
        From: EXOTEL_SENDER_ID.value(),
        To: callerDigits,
        Body: message,
      });
      const auth = Buffer.from(`${EXOTEL_API_KEY.value()}:${EXOTEL_API_TOKEN.value()}`).toString(
        "base64"
      );
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
      smsSent = response.ok;
      if (!response.ok) smsError = `Exotel SMS API returned ${response.status}`;
    } catch (err) {
      console.error(err);
      smsError = err.message;
    }

    try {
      await db.collection("callEvents").add({
        callerPhone: callerDigits,
        callSid,
        smsSent,
        smsError,
        receivedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to log call event:", err);
    }

    res.status(200).json({ ok: true, smsSent });
  }
);
