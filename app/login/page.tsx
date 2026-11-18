"use client";

import { useState } from "react";

export default function Login() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const r = await fetch("/api/login", { method: "POST", body: JSON.stringify({ token }) });
    if (r.ok) window.location.href = "/";
    else setError("Jeton incorrect, vérifie-le et réessaie.");
  }

  return (
    <main className="shell login">
      <h1>Pointage</h1>
      <form onSubmit={submit}>
        <label htmlFor="token">Jeton</label>
        <input id="token" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoFocus autoComplete="current-password" />
        <button className="punch" type="submit">Entrer</button>
        {error && <p className="neg">{error}</p>}
      </form>
    </main>
  );
}
