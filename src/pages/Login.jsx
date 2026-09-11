import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [signingIn, setSigningIn] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSigningIn(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      console.error(err);
      setError("Could not sign in — check the email and password and try again.");
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--turmeric-dark)" }}>
            KAL Catering
          </div>
          <div style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 4 }}>Staff sign in</div>
        </div>

        <form className="card" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button className="btn-primary" type="submit" disabled={signingIn} style={{ width: "100%" }}>
            {signingIn ? "Signing in..." : "Sign in"}
          </button>
          {error && <div className="notice-error">{error}</div>}
        </form>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--ink-soft)", marginTop: 16 }}>
          New staff accounts are added in the Firebase console — ask a senior executive.
        </p>
      </div>
    </div>
  );
}
