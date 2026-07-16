"use client";
import { useState } from "react";

export default function FamilyLogin({ accessToken, onLogin, onLogout }: { accessToken: string; onLogin: (token: string) => void; onLogout: () => void }) {
  const [open, setOpen] = useState(false); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [message, setMessage] = useState("");
  async function login(event: React.FormEvent) { event.preventDefault(); setMessage("Checking your Trainer Pass…"); const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }); const body = await response.json(); if (!response.ok) setMessage(body.error ?? "Login failed."); else { onLogin(body.accessToken); setOpen(false); setPassword(""); } }
  if (accessToken) return <button className="family-login signed-in" onClick={onLogout}>🔓 Family editing on</button>;
  return <>{<button className="family-login" onClick={() => setOpen(true)}>🔒 Family Sign In</button>}{open && <div className="modal-backdrop login-layer" role="dialog" aria-modal="true"><form className="login-card" onSubmit={login}><button type="button" className="close-button" onClick={() => setOpen(false)}>×</button><p className="eyebrow">Trainer Pass</p><h2>Family Sign In</h2><p>Visitors can look. Family members sign in to add, scan, or remove cards.</p><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required/></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required/></label>{message && <p className="search-message">{message}</p>}<button className="primary-button">Sign In</button></form></div>}</>;
}
