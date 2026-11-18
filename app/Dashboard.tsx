"use client";

import { useCallback, useEffect, useState } from "react";
import { fmtDuration, parisHM, parisMonth, parisToMs } from "@/lib/time";
import type { DayRow, MonthReport, Settings } from "@/lib/types";

const DAY_NAMES = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

const euros = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const dayLabel = (date: string, wd: number) => `${DAY_NAMES[wd]} ${Number(date.slice(8))}`;
const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`;

function shiftMonth(m: string, delta: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, { ...init, headers: { "content-type": "application/json" } });
  if (r.status === 401) window.location.href = "/login";
  if (!r.ok) throw new Error(await r.text());
  return r;
}

export default function Dashboard() {
  const [month, setMonth] = useState(() => parisMonth(Date.now()));
  const [report, setReport] = useState<MonthReport | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await api(`/api/report?month=${month}`);
    const data = await r.json();
    setReport(data.report);
    setSettings(data.settings);
  }, [month]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function punch() {
    setBusy(true);
    try {
      const r = await api("/api/punch", { method: "POST" });
      flash(await r.text());
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function mutate(fn: () => Promise<unknown>) {
    try {
      await fn();
      await load();
    } catch (e) {
      flash(String((e as Error).message));
    }
  }

  if (!report || !settings) return <main className="wrap"><p className="muted">Chargement…</p></main>;

  const isCurrent = month === parisMonth(Date.now());
  const today = report.days.find((d) => d.isToday);
  const lastToday = today?.punches.at(-1);
  const rows = report.days.filter((d) => d.dueMin > 0 || d.punches.length > 0);
  const missing = report.days.filter((d) => d.missingExit);

  return (
    <main className="wrap">
      <header className="top">
        <button className="ghost" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mois précédent">‹</button>
        <h1>{monthLabel(month)}</h1>
        <button className="ghost" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mois suivant">›</button>
      </header>

      {isCurrent && (
        <section className="punch">
          <button className={`btn big ${report.inProgress ? "out" : "in"}`} onClick={punch} disabled={busy}>
            {report.inProgress ? "Pointer la sortie" : "Pointer l'entrée"}
          </button>
          <p className="muted">
            {report.inProgress && lastToday
              ? `En poste depuis ${parisHM(lastToday)} · ${fmtDuration(today!.workedMin)} aujourd'hui`
              : today && today.workedMin > 0
                ? `${fmtDuration(today.workedMin)} faites aujourd'hui`
                : "Pas encore pointé aujourd'hui"}
          </p>
        </section>
      )}

      <section className="stats">
        <div className="stat">
          <span className="label">{isCurrent ? "Manque à ce jour" : "Manque du mois"}</span>
          <strong className={report.deficitMin > 0 ? "neg" : "pos"}>
            {report.deficitMin > 0 ? fmtDuration(report.deficitMin) : report.pastBalanceMin > 0 ? `+${fmtDuration(report.pastBalanceMin)}` : "0h00"}
          </strong>
        </div>
        <div className="stat">
          <span className="label">Retenue {isCurrent ? "si rien n'est rattrapé" : ""}</span>
          <strong className={report.retainedHours > 0 ? "neg" : "pos"}>{euros(report.retainedEuros)}</strong>
          <span className="sub">{report.retainedHours} h brutes</span>
        </div>
        <div className="stat">
          <span className="label">Fait / prévu</span>
          <strong>{fmtDuration(report.workedMonthMin)}</strong>
          <span className="sub">sur {fmtDuration(report.dueMonthMin)}</span>
        </div>
      </section>

      {missing.length > 0 && (
        <p className="warn">Sortie manquante : {missing.map((d) => dayLabel(d.date, d.weekday)).join(", ")}. Corrige ci-dessous.</p>
      )}

      {report.plan.length > 0 && (
        <section className="card">
          <h2>Plan de rattrapage</h2>
          {report.deficitMin === 0 ? (
            <p className="pos">Rien à rattraper, continue comme ça.</p>
          ) : (
            <>
              <p className="muted">
                {fmtDuration(report.deficitMin)} réparties sur {report.plan.length} jour{report.plan.length > 1 ? "s" : ""} : +{report.plan[0].extraMin} min par jour.
              </p>
              <table>
                <thead>
                  <tr><th>Jour</th><th>Objectif</th><th>En plus</th><th>Sortie</th></tr>
                </thead>
                <tbody>
                  {report.plan.map((p) => {
                    const d = report.days.find((x) => x.date === p.date)!;
                    return (
                      <tr key={p.date} className={d.isToday ? "today" : ""}>
                        <td>{dayLabel(p.date, d.weekday)}</td>
                        <td>{fmtDuration(p.targetMin)}</td>
                        <td>+{p.extraMin} min</td>
                        <td><strong>{p.suggestedEnd}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </section>
      )}

      <section className="card">
        <h2>Détail du mois</h2>
        <div className="days">
          {rows.map((d) => (
            <DayItem key={d.date} day={d} mutate={mutate} />
          ))}
        </div>
      </section>

      <SettingsPanel settings={settings} onSave={(s) => mutate(() => api("/api/settings", { method: "PUT", body: JSON.stringify(s) }))} />

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function DayItem({ day, mutate }: { day: DayRow; mutate: (fn: () => Promise<unknown>) => Promise<void> }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [value, setValue] = useState("");
  const [adding, setAdding] = useState(false);
  const future = !day.isPast && !day.isToday;

  return (
    <div className={`day ${day.isToday ? "today" : ""} ${day.missingExit ? "missing" : ""}`}>
      <div className="dayhead">
        <span className="dname">{dayLabel(day.date, day.weekday)}</span>
        <span className="muted">{fmtDuration(day.workedMin)} / {fmtDuration(day.dueMin)}</span>
        {!future && (
          <span className={day.balanceMin < 0 ? "neg" : day.balanceMin > 0 ? "pos" : "muted"}>
            {day.balanceMin > 0 ? "+" : ""}{fmtDuration(day.balanceMin)}
          </span>
        )}
      </div>
      <div className="chips">
        {day.punches.map((p, i) =>
          editing === p ? (
            <span key={p} className="edit">
              <input type="time" value={value} onChange={(e) => setValue(e.target.value)} />
              <button onClick={() => { setEditing(null); mutate(() => api("/api/punches", { method: "PUT", body: JSON.stringify({ oldMs: p, ms: parisToMs(day.date, value) }) })); }}>OK</button>
              <button className="neg" onClick={() => { setEditing(null); if (confirm("Supprimer ce pointage ?")) mutate(() => api(`/api/punches?ms=${p}`, { method: "DELETE" })); }}>Suppr.</button>
              <button onClick={() => setEditing(null)}>×</button>
            </span>
          ) : (
            <button key={p} className={`chip ${i % 2 ? "o" : "i"}`} onClick={() => { setEditing(p); setValue(parisHM(p)); }}>
              {i % 2 ? "↑" : "↓"} {parisHM(p)}
            </button>
          ),
        )}
        {adding ? (
          <span className="edit">
            <input type="time" value={value} onChange={(e) => setValue(e.target.value)} />
            <button disabled={!value} onClick={() => { setAdding(false); mutate(() => api("/api/punches", { method: "POST", body: JSON.stringify({ ms: parisToMs(day.date, value) }) })); }}>Ajouter</button>
            <button onClick={() => setAdding(false)}>×</button>
          </span>
        ) : (
          !future && <button className="chip add" onClick={() => { setAdding(true); setValue(""); }}>+</button>
        )}
      </div>
    </div>
  );
}

function SettingsPanel({ settings, onSave }: { settings: Settings; onSave: (s: Settings) => void }) {
  const [s, setS] = useState(settings);
  useEffect(() => setS(settings), [settings]);

  return (
    <details className="card">
      <summary>Réglages</summary>
      <div className="form">
        <label>Taux horaire brut (€)
          <input type="number" step="0.01" value={s.hourlyRate} onChange={(e) => setS({ ...s, hourlyRate: Number(e.target.value) })} />
        </label>
        <label>Heures par jour
          <input type="number" step="0.25" value={s.hoursPerDay} onChange={(e) => setS({ ...s, hoursPerDay: Number(e.target.value) })} />
        </label>
        <label>Heure de fin normale
          <input type="time" value={s.dayEnd} onChange={(e) => setS({ ...s, dayEnd: e.target.value })} />
        </label>
        <div className="wd">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <label key={d} className="check">
              <input
                type="checkbox"
                checked={s.workDays.includes(d)}
                onChange={(e) => setS({ ...s, workDays: e.target.checked ? [...s.workDays, d] : s.workDays.filter((x) => x !== d) })}
              />
              {DAY_NAMES[d]}
            </label>
          ))}
        </div>
        <button className="btn primary" onClick={() => onSave(s)}>Enregistrer</button>
      </div>
    </details>
  );
}
