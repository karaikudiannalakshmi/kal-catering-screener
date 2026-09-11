import { useEffect, useRef, useState } from "react";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  linkWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { db, auth } from "../lib/firebase.js";
import { toE164 } from "../lib/phone.js";
import { phoneToSyntheticEmail } from "../lib/customerAuth.js";
import MenuPicker from "../components/MenuPicker.jsx";

const emptyDetails = {
  customerName: "",
  deliveryAddress: "",
  orderDate: "",
  packCount: "",
  session: "",
  menuTemplateId: "",
  wantsChanges: "",
  changeRequest: "",
  needsLiveCounter: "",
  needsServicePersonnel: "",
};

export default function CustomerRequestForm() {
  // phase: 'checking' -> 'phone' -> 'otp' -> 'password-signin' -> 'form' -> 'submitted'
  const [phase, setPhase] = useState("checking");
  const [phoneInput, setPhoneInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const confirmationRef = useRef(null);
  const recaptchaRef = useRef(null);

  // Post-OTP "set a password" step
  const [offerPassword, setOfferPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const [details, setDetails] = useState(emptyDetails);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState(null);
  const [saving, setSaving] = useState(false);

  const selectedTemplate = templates.find((t) => t.id === details.menuTemplateId);
  const estimatedTotal =
    selectedTemplate?.pricePerPack != null && details.packCount
      ? selectedTemplate.pricePerPack * Number(details.packCount)
      : null;

  useEffect(() => {
    const q = query(collection(db, "menuTemplates"), orderBy("session"), orderBy("name"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setTemplatesLoading(false);
        setTemplatesError(null);
      },
      (err) => {
        console.error("Failed to load menu templates:", err);
        setTemplatesLoading(false);
        setTemplatesError(err.message || String(err));
      }
    );
    return () => unsub();
  }, []);

  // If this device already has a signed-in, phone-verified session (from an
  // earlier visit), skip straight to the form — no OTP or password needed.
  useEffect(() => {
    let handled = false;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (handled) return;
      handled = true;
      if (user?.phoneNumber) {
        setVerifiedPhone(user.phoneNumber);
        const hasPassword = user.providerData.some((p) => p.providerId === "password");
        setOfferPassword(!hasPassword);
        setPhase("form");
      } else {
        setPhase("phone");
      }
    });
    return () => unsub();
  }, []);

  function getRecaptcha() {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
    }
    return recaptchaRef.current;
  }

  async function sendOtp(e) {
    e.preventDefault();
    if (!phoneInput.trim()) return setError("Please enter your phone number.");
    setError(null);
    setSending(true);
    try {
      const e164 = toE164(phoneInput);
      const confirmation = await signInWithPhoneNumber(auth, e164, getRecaptcha());
      confirmationRef.current = confirmation;
      setPhase("otp");
    } catch (err) {
      console.error(err);
      setError("Could not send the code — check the number and try again.");
      // Recaptcha tokens are single-use; drop it so the next attempt gets a fresh one.
      recaptchaRef.current = null;
    } finally {
      setSending(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    if (!otpInput.trim()) return setError("Enter the code we sent you.");
    setError(null);
    setVerifying(true);
    try {
      const result = await confirmationRef.current.confirm(otpInput.trim());
      setVerifiedPhone(result.user.phoneNumber);
      // Only offer to set a password if this account doesn't already have one.
      const hasPassword = result.user.providerData.some((p) => p.providerId === "password");
      setOfferPassword(!hasPassword);
      setPhase("form");
    } catch (err) {
      console.error(err);
      setError("That code didn't match — check it and try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function signInWithPassword(e) {
    e.preventDefault();
    if (!phoneInput.trim() || !passwordInput) return setError("Enter your phone number and password.");
    setError(null);
    setSigningIn(true);
    try {
      const syntheticEmail = phoneToSyntheticEmail(toE164(phoneInput));
      const result = await signInWithEmailAndPassword(auth, syntheticEmail, passwordInput);
      setVerifiedPhone(result.user.phoneNumber || toE164(phoneInput));
      setPhase("form");
    } catch (err) {
      console.error(err);
      setError("That phone number and password don't match — try again, or verify by SMS instead.");
    } finally {
      setSigningIn(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    if (newPassword.length < 6) return setError("Password should be at least 6 characters.");
    if (newPassword !== newPasswordConfirm) return setError("Passwords don't match.");
    setError(null);
    setSavingPassword(true);
    try {
      const syntheticEmail = phoneToSyntheticEmail(verifiedPhone);
      await linkWithCredential(auth.currentUser, EmailAuthProvider.credential(syntheticEmail, newPassword));
      setPasswordSaved(true);
      setOfferPassword(false);
    } catch (err) {
      console.error(err);
      setError("Could not save the password — you can still continue without one.");
    } finally {
      setSavingPassword(false);
    }
  }

  function changeNumber() {
    setPhase("phone");
    setOtpInput("");
    setPasswordInput("");
    setError(null);
    confirmationRef.current = null;
  }

  function updateDetail(field, value) {
    setDetails((d) => ({ ...d, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!details.customerName.trim()) return setError("Please enter your name.");
    if (!details.deliveryAddress.trim()) return setError("Please enter the event address.");
    if (!details.orderDate) return setError("Please choose the date you need the food.");
    if (!details.packCount || Number(details.packCount) <= 0) return setError("Please enter the number of packs (pax count).");
    if (!details.session) return setError("Please choose breakfast, lunch, or dinner.");
    if (!details.menuTemplateId) return setError("Please choose a menu.");
    if (!details.wantsChanges) return setError("Let us know if you'd like any changes to the menu items.");
    if (details.wantsChanges === "yes" && !details.changeRequest.trim()) {
      return setError("Please describe the change you'd like.");
    }
    if (!details.needsLiveCounter) return setError("Please answer whether you'd like a live counter.");
    if (!details.needsServicePersonnel) return setError("Please answer whether you need service staff.");
    setError(null);
    setSaving(true);
    const tpl = templates.find((t) => t.id === details.menuTemplateId);
    try {
      await addDoc(collection(db, "customerSubmissions"), {
        customerName: details.customerName.trim(),
        customerPhone: verifiedPhone,
        phoneVerified: true,
        customerUid: auth.currentUser?.uid || null,
        deliveryAddress: details.deliveryAddress.trim(),
        orderDate: details.orderDate,
        packCount: Number(details.packCount),
        session: details.session,
        menuTemplateId: details.menuTemplateId,
        menuTemplateName: tpl ? tpl.name : "",
        menuTemplateSession: tpl ? tpl.session : "",
        pricePerPack: tpl?.pricePerPack ?? null,
        wantsChanges: details.wantsChanges === "yes",
        changeRequest: details.wantsChanges === "yes" ? details.changeRequest.trim() : "",
        needsLiveCounter: details.needsLiveCounter === "yes",
        needsServicePersonnel: details.needsServicePersonnel === "yes",
        status: "new",
        submittedAt: serverTimestamp(),
      });
      setPhase("submitted");
    } catch (err) {
      console.error(err);
      setError("Could not submit — please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", padding: "40px 16px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--turmeric-dark)" }}>
            Karaikudi Annalakshmi
          </div>
          <div style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 4 }}>Catering event details</div>
        </div>

        <div className="card">
          {phase === "checking" && <div className="loading-state">Loading…</div>}

          {phase === "phone" && (
            <form onSubmit={sendOtp}>
              <p style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 0, marginBottom: 20 }}>
                We'll text a one-time code to confirm it's really you before you fill in your event
                details.
              </p>
              <div className="field">
                <label htmlFor="phoneInput">Your phone number</label>
                <input
                  id="phoneInput"
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="e.g. 98765 43210"
                />
              </div>
              <div id="recaptcha-container" />
              <button className="btn-primary" type="submit" disabled={sending} style={{ width: "100%" }}>
                {sending ? "Sending code..." : "Send code"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: "100%", marginTop: 10 }}
                onClick={() => {
                  setError(null);
                  setPhase("password-signin");
                }}
              >
                I've set a password before — sign in with that instead
              </button>
              {error && <div className="notice-error">{error}</div>}
            </form>
          )}

          {phase === "password-signin" && (
            <form onSubmit={signInWithPassword}>
              <p style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 0, marginBottom: 20 }}>
                Enter your phone number and the password you set on a previous visit.
              </p>
              <div className="field">
                <label htmlFor="phoneInput2">Your phone number</label>
                <input
                  id="phoneInput2"
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="e.g. 98765 43210"
                />
              </div>
              <div className="field">
                <label htmlFor="passwordInput">Password</label>
                <input
                  id="passwordInput"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                />
              </div>
              <button className="btn-primary" type="submit" disabled={signingIn} style={{ width: "100%" }}>
                {signingIn ? "Signing in..." : "Sign in"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: "100%", marginTop: 10 }}
                onClick={changeNumber}
              >
                Use SMS code instead
              </button>
              {error && <div className="notice-error">{error}</div>}
            </form>
          )}

          {phase === "otp" && (
            <form onSubmit={verifyOtp}>
              <p style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 0, marginBottom: 20 }}>
                Enter the code we sent to {phoneInput}.
              </p>
              <div className="field">
                <label htmlFor="otpInput">Verification code</label>
                <input
                  id="otpInput"
                  type="text"
                  inputMode="numeric"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="6-digit code"
                />
              </div>
              <button className="btn-primary" type="submit" disabled={verifying} style={{ width: "100%" }}>
                {verifying ? "Verifying..." : "Verify"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: "100%", marginTop: 10 }}
                onClick={changeNumber}
              >
                Use a different number
              </button>
              {error && <div className="notice-error">{error}</div>}
            </form>
          )}

          {phase === "form" && (
            <>
              {offerPassword && !passwordSaved && (
                <form
                  onSubmit={savePassword}
                  style={{
                    marginBottom: 20,
                    paddingBottom: 20,
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <p style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 0, marginBottom: 12 }}>
                    Number confirmed. Want to set a password so you don't need an SMS code next time you
                    visit from another phone? Optional — you can skip this.
                  </p>
                  <div className="field-row" style={{ marginBottom: 10 }}>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password"
                      />
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <input
                        type="password"
                        value={newPasswordConfirm}
                        onChange={(e) => setNewPasswordConfirm(e.target.value)}
                        placeholder="Confirm password"
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn-secondary" type="submit" disabled={savingPassword}>
                      {savingPassword ? "Saving..." : "Set password"}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setOfferPassword(false)}>
                      Skip
                    </button>
                  </div>
                </form>
              )}
              {passwordSaved && (
                <div className="notice-success" style={{ marginBottom: 20 }}>
                  Password set — next time, sign in with your phone number and this password instead of an
                  SMS code.
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <p style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 0, marginBottom: 20 }}>
                  Number confirmed ({verifiedPhone}). Tell us a bit about your event, pick a menu — you'll
                  see exactly what's in each one — and let us know about any changes or extra help you
                  need. Our executive will call you soon after to confirm everything and finalize the
                  order.
                </p>

                <div className="field">
                  <label htmlFor="customerName">Your name</label>
                  <input
                    id="customerName"
                    type="text"
                    value={details.customerName}
                    onChange={(e) => updateDetail("customerName", e.target.value)}
                    placeholder="e.g. Kalyani Raman"
                  />
                </div>

                <div className="field">
                  <label htmlFor="deliveryAddress">Address where the event will be held</label>
                  <textarea
                    id="deliveryAddress"
                    value={details.deliveryAddress}
                    onChange={(e) => updateDetail("deliveryAddress", e.target.value)}
                    placeholder="Full address, including landmark if useful"
                  />
                </div>

                <div className="field-row">
                  <div className="field">
                    <label htmlFor="orderDate">Date you need the food</label>
                    <input
                      id="orderDate"
                      type="date"
                      value={details.orderDate}
                      onChange={(e) => updateDetail("orderDate", e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="packCount">Number of packs (pax count)</label>
                    <input
                      id="packCount"
                      type="number"
                      min="1"
                      value={details.packCount}
                      onChange={(e) => updateDetail("packCount", e.target.value)}
                      placeholder="e.g. 250"
                    />
                  </div>
                </div>

                {templatesError && (
                  <div className="notice-error">
                    Could not load menus ({templatesError}). Please try refreshing the page — if this
                    keeps happening, let us know when we call you.
                  </div>
                )}

                <MenuPicker
                  templates={templates}
                  templatesLoading={templatesLoading}
                  session={details.session}
                  onSessionChange={(s) =>
                    setDetails((d) => ({
                      ...d,
                      session: s,
                      // Changing the session invalidates a menu picked for a different one
                      menuTemplateId: templates.find((t) => t.id === d.menuTemplateId)?.session === s ? d.menuTemplateId : "",
                    }))
                  }
                  selectedTemplateId={details.menuTemplateId}
                  onSelectTemplate={(id) => updateDetail("menuTemplateId", id)}
                />

                {details.menuTemplateId && (
                  <div className="field">
                    <label>Would you like any changes to the items in this menu?</label>
                    <div className="checkbox-grid">
                      {["yes", "no"].map((v) => (
                        <label key={v} className={`checkbox-chip${details.wantsChanges === v ? " checked" : ""}`}>
                          <input
                            type="radio"
                            name="wantsChanges"
                            checked={details.wantsChanges === v}
                            onChange={() => updateDetail("wantsChanges", v)}
                          />
                          {v === "yes" ? "Yes" : "No"}
                        </label>
                      ))}
                    </div>
                    {details.wantsChanges === "yes" && (
                      <textarea
                        style={{ marginTop: 10 }}
                        value={details.changeRequest}
                        onChange={(e) => updateDetail("changeRequest", e.target.value)}
                        placeholder="Tell us what you'd like changed — an item swapped, something left out, an addition, etc."
                      />
                    )}
                  </div>
                )}

                <div className="field-row">
                  <div className="field">
                    <label>Would you like a live counter?</label>
                    <div className="checkbox-grid">
                      {["yes", "no"].map((v) => (
                        <label key={v} className={`checkbox-chip${details.needsLiveCounter === v ? " checked" : ""}`}>
                          <input
                            type="radio"
                            name="needsLiveCounter"
                            checked={details.needsLiveCounter === v}
                            onChange={() => updateDetail("needsLiveCounter", v)}
                          />
                          {v === "yes" ? "Yes" : "No"}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="field">
                    <label>Do you need service staff at the venue?</label>
                    <div className="checkbox-grid">
                      {["yes", "no"].map((v) => (
                        <label key={v} className={`checkbox-chip${details.needsServicePersonnel === v ? " checked" : ""}`}>
                          <input
                            type="radio"
                            name="needsServicePersonnel"
                            checked={details.needsServicePersonnel === v}
                            onChange={() => updateDetail("needsServicePersonnel", v)}
                          />
                          {v === "yes" ? "Yes" : "No"}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {estimatedTotal != null && (
                  <div className="notice-success" style={{ marginBottom: 16 }}>
                    Estimated total: ₹{estimatedTotal.toLocaleString("en-IN")} ({details.packCount} packs ×
                    ₹{selectedTemplate.pricePerPack}/pack). This is only an estimate — our executive will
                    confirm the final price on the call.
                  </div>
                )}

                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink-soft)",
                    background: "#fff",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    padding: "10px 12px",
                    marginBottom: 16,
                  }}
                >
                  This request will be evaluated against our other orders for the day. Live counters
                  depend on the availability of staff with that skill. Price may change if you request any
                  changes to the menu items — our executive will confirm everything with you on the call.
                </div>

                <button className="btn-primary" type="submit" disabled={saving} style={{ width: "100%" }}>
                  {saving ? "Submitting..." : "Submit"}
                </button>

                {error && <div className="notice-error">{error}</div>}
              </form>
            </>
          )}

          {phase === "submitted" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <h2 style={{ marginBottom: 10 }}>Thank you!</h2>
              <p style={{ color: "var(--ink-soft)" }}>
                We've received your details. Our executive will call you shortly to confirm your order.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
