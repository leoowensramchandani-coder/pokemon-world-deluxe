"use client";
import { useEffect, useState } from "react";

export default function FamilyLogin({ accessToken, onLogin, onLogout }: { accessToken: string; onLogin: (token: string) => void; onLogout: () => void }) {
  const [open, setOpen] = useState(false); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState(""); const [setupToken, setSetupToken] = useState(""); const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = params.get("access_token");
    const type = params.get("type");
    if (token && (type === "invite" || type === "recovery")) {
      setSetupToken(token);
      setOpen(true);
      setMessage("Choose your new Family Password.");
    }
  }, []);

  async function login(event: React.FormEvent) { event.preventDefault(); setMessage("Checking your Trainer Pass…"); const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }); const body = await response.json(); if (!response.ok) setMessage(body.error ?? "Login failed."); else { onLogin(body.accessToken); setOpen(false); setPassword(""); } }
  async function createPassword(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) return setMessage("Please use at least 8 characters.");
    if (password !== confirmPassword) return setMessage("Those passwords do not match yet.");
    setMessage("Creating your Family Password…");
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, { method: "PUT", headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "", Authorization: `Bearer ${setupToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (!response.ok) return setMessage("That link has expired. Please request a new password email.");
    window.history.replaceState({}, "", window.location.pathname);
    onLogin(setupToken);
    setOpen(false);
    setPassword("");
    setConfirmPassword("");
    setSetupToken("");
  }
  if (accessToken) return <button className="family-login signed-in" onClick={onLogout}>🔓 Family editing on</button>;
  return <>{<button className="family-login" onClick={() => setOpen(true)}>🔒 Family Sign In</button>}{open && <div className="modal-backdrop login-layer" role="dialog" aria-modal="true"><form className="login-card" onSubmit={setupToken ? createPassword : login}><button type="button" className="close-button" onClick={() => setOpen(false)}>×</button><p className="eyebrow">Trainer Pass</p><h2>{setupToken ? "Create Family Password" : "Family Sign In"}</h2><p>{setupToken ? "Choose a password that only the grown-ups know." : "Visitors can look. Family members sign in to add, scan, or remove cards."}</p>{!setupToken && <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required/></label>}<label>{setupToken ? "New password" : "Password"}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required/></label>{setupToken && <label>Type it again<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required/></label>}{message && <p className="search-message">{message}</p>}<button className="primary-button">{setupToken ? "Create Password" : "Sign In"}</button></form></div>}</>;
}
