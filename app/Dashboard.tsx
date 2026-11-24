"use client";

import { useCallback, useEffect, useState } from "react";
import { fmtDuration, parisDay, parisHM, parisMonth, parisToMs } from "@/lib/time";
import type { DayRow, MonthReport, PlanRow, Settings } from "@/lib/types";
import type { TotalReport } from "@/lib/calc";

const DAY_NAMES = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const DAY_FULL = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

const euros = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const dayLabel = (d: { date: string; weekday: number }) => `${DAY_NAMES[d.weekday]} ${Number(d.date.slice(8))}`;
const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`;
const hm = (min: number) => fmtDuration(min).replace("h", " h ");

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

type Mutate = (fn: () => Promise<unknown>) => Promise<void>;

export default function Dashboard() {
  const [month, setMonth] = useState(() => parisMonth(Date.now()));
  const [report, setReport] = useState<MonthReport | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [total, setTotal] = useState<TotalReport | null>(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await (await api(`/api/report?month=${month}`)).json();
    setReport(data.report);
    setSettings(data.settings);
    setTotal(data.total);
  }, [month]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  }

  async function punch() {
    setBusy(true);
    try {
      flash(await (await api("/api/punch", { method: "POST" })).text());
      await load();
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const mutate: Mutate = async (fn) => {
    try {
      await fn();
      await load();
    } catch (e) {
      flash((e as Error).message);
    }
  };

  if (!report || !settings) return <main className="shell"><p className="loading">Chargement</p></main>;

  const isCurrent = month === parisMonth(Date.now());
  const today = report.days.find((d) => d.isToday);
  const todayPlan = report.plan.find((p) => p.date === today?.date);
  const nextPlan = report.plan.find((p) => !todayPlan || p.date !== todayPlan.date);
  const rows = report.days.filter((d) => !d.beforeStart && (d.dueMin > 0 || d.punches.length > 0));
  const missing = report.days.filter((d) => d.missingExit);

  return (
    <main className="shell">
      <header className="bar">
        <button className="nav" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mois précédent">‹</button>
        <span className="month">{monthLabel(month)}</span>
        <button className="nav" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mois suivant" disabled={isCurrent}>›</button>
      </header>

      {isCurrent && today ? (
        <Hero today={today} plan={todayPlan} report={report} busy={busy} onPunch={punch} />
      ) : (
        <section className="hero past">
          <p className="verdict">
            {report.deficitMin > 0 ? `${hm(report.deficitMin)} manquantes` : "Mois complet"}
          </p>
          <p className="sub">
            {report.deficitMin > 0
              ? `${report.retainedHours} h retenues, soit ${euros(report.retainedEuros)}`
              : `${hm(report.workedMonthMin)} faites sur ${hm(report.dueMonthMin)}`}
          </p>
        </section>
      )}

      {total && <BalanceWidget total={total} inProgress={isCurrent && report.inProgress} />}

      {missing.length > 0 && (
        <p className="alert">
          Sortie oubliée {missing.map(dayLabel).join(", ")}. Ajoute-la dans la liste ci-dessous pour un calcul juste.
        </p>
      )}

      {isCurrent && (
        <section className="panel">
          <h2>Bilan du mois</h2>
          {report.deficitMin > 0 ? (
            <>
              <p className="lead neg">{hm(report.deficitMin)} à rattraper</p>
              <p className="note">
                Sans rattrapage : {report.retainedHours} h retenue{report.retainedHours > 1 ? "s" : ""}, soit {euros(report.retainedEuros)} brut.
              </p>
              {report.plan.length > 0 ? (
                <ul className="plan">
                  {report.plan.map((p) => {
                    const d = report.days.find((x) => x.date === p.date)!;
                    return (
                      <li key={p.date} className={d.isToday ? "now" : ""}>
                        <span>{d.isToday ? "Aujourd'hui" : dayLabel(d)}</span>
                        <span className="extra">+{p.extraMin} min</span>
                        <span className="end">sortie {(d.isToday && report.todayEnd) || p.suggestedEnd}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="note">Plus aucun jour travaillé ce mois-ci.</p>
              )}
            </>
          ) : (
            <>
              <p className="lead pos">{report.pastBalanceMin > 0 ? `${hm(report.pastBalanceMin)} d'avance` : "Tu es à jour"}</p>
              <p className="note">
                {todayPlan && report.todayEnd && report.todayEnd !== settings.dayEnd
                  ? `Aujourd'hui, sors à ${report.todayEnd} pour compenser tes pauses et retards.`
                  : nextPlan || todayPlan
                  ? `Horaires normaux, sortie à ${settings.dayEnd}.`
                  : "Plus aucun jour travaillé ce mois-ci."}
              </p>
            </>
          )}
        </section>
      )}

      <section className="panel">
        <h2>Jours</h2>
        {rows.length === 0 ? (
          <p className="note">Aucun jour suivi sur ce mois.</p>
        ) : (
          <ul className="days">
            {rows.map((d) => (
              <DayItem key={d.date} day={d} settings={settings} mutate={mutate} />
            ))}
          </ul>
        )}
      </section>

      <SettingsPanel
        settings={settings}
        onSave={(s) => mutate(() => api("/api/settings", { method: "PUT", body: JSON.stringify(s) })).then(() => flash("Réglages enregistrés"))}
      />

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

function Hero({ today, plan, report, busy, onPunch }: { today: DayRow; plan?: PlanRow; report: MonthReport; busy: boolean; onPunch: () => void }) {
  const target = plan?.targetMin ?? today.dueMin;
  const ratio = target > 0 ? Math.min(1, today.workedMin / target) : 0;
  const R = 108;
  const C = 2 * Math.PI * R;
  const last = today.punches.at(-1);
  const left = Math.max(0, target - today.workedMin);

  const onBreak = !report.inProgress && today.punches.length > 0 && left > 0 && target > 0;

  let caption: string;
  if (report.inProgress && last)
    caption = left > 0 && report.todayEnd ? `En poste depuis ${parisHM(last)}, sortie prévue à ${report.todayEnd}` : "Objectif du jour atteint, tu peux pointer la sortie";
  else if (target === 0) caption = `Pas de travail prévu ce ${DAY_FULL[today.weekday]}`;
  else if (today.punches.length === 0) caption = plan && plan.extraMin > 0 ? `Objectif ${hm(target)} aujourd'hui, sortie ${plan.suggestedEnd}` : `Objectif ${hm(target)} aujourd'hui`;
  else if (onBreak && last) caption = `En pause depuis ${parisHM(last)}, encore ${hm(left)} à faire`;
  else caption = "Objectif du jour atteint";

  const label = report.inProgress ? "Pointer la sortie" : onBreak ? "Pointer le retour" : "Pointer l'entrée";

  return (
    <section className="hero">
      <div className={`ring ${report.inProgress ? "live" : ""}`}>
        <svg viewBox="0 0 240 240" aria-hidden="true">
          <circle cx="120" cy="120" r={R} className="track" />
          <circle
            cx="120"
            cy="120"
            r={R}
            className="arc"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - ratio)}
            transform="rotate(-90 120 120)"
          />
        </svg>
        <div className="ring-text">
          <span className="worked">{fmtDuration(today.workedMin)}</span>
          <span className="of">{target > 0 ? `sur ${fmtDuration(target)}` : "repos"}</span>
        </div>
      </div>
      <p className="caption">{caption}</p>
      <button className={`punch ${report.inProgress ? "out" : "in"}`} onClick={onPunch} disabled={busy}>
        {label}
      </button>
      {today.punches.length > 0 && (
        <ol className="history" aria-label="Pointages du jour">
          {today.punches.map((p, i) => (
            <li key={p}>
              <span className="h-kind">{i % 2 ? "Sortie" : i === 0 ? "Entrée" : "Retour"}</span>
              <span className="h-time">{parisHM(p)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const T0 = 7 * 60;
const T1 = 20 * 60;
const pos = (min: number) => `${Math.max(0, Math.min(100, ((min - T0) / (T1 - T0)) * 100))}%`;
const minOfDay = (ms: number) => {
  const [h, m] = parisHM(ms).split(":").map(Number);
  return h * 60 + m;
};

function Timeline({ day, settings }: { day: DayRow; settings: Settings }) {
  const segs: [number, number][] = [];
  const p = day.punches;
  for (let i = 0; i < p.length; i += 2) {
    const end = p[i + 1] ?? (day.isToday ? Date.now() : undefined);
    if (end !== undefined && parisDay(end) === day.date) segs.push([minOfDay(p[i]), minOfDay(end)]);
  }
  const [eh, em] = settings.dayEnd.split(":").map(Number);
  const endMin = eh * 60 + em;
  const startMin = endMin - settings.hoursPerDay * 60 - 60;
  return (
    <div className="tl" aria-hidden="true">
      {day.dueMin > 0 && <span className="tl-plan" style={{ left: pos(startMin), width: `calc(${pos(endMin)} - ${pos(startMin)})` }} />}
      {segs.map(([a, b], i) => (
        <span key={i} className="tl-seg" style={{ left: pos(a), width: `calc(${pos(b)} - ${pos(a)})` }} />
      ))}
    </div>
  );
}

function DayItem({ day, settings, mutate }: { day: DayRow; settings: Settings; mutate: Mutate }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [value, setValue] = useState("");
  const future = !day.isPast && !day.isToday;
  const running = day.isToday && day.punches.length % 2 === 1;
  const pending = future || (day.isToday && day.balanceMin < 0);
  const pauses: [number, number][] = [];
  for (let i = 1; i + 1 < day.punches.length; i += 2) pauses.push([day.punches[i], day.punches[i + 1]]);

  function save() {
    if (!value) return;
    const ms = parisToMs(day.date, value);
    const body = editing === "new" ? { ms } : { oldMs: editing, ms };
    setEditing(null);
    mutate(() => api("/api/punches", { method: editing === "new" ? "POST" : "PUT", body: JSON.stringify(body) }));
  }

  return (
    <li className={`day ${day.isToday ? "today" : ""} ${future ? "future" : ""} ${day.missingExit ? "missing" : ""}`}>
      <button className="day-row" onClick={() => setOpen(!open)} aria-expanded={open} disabled={future}>
        <span className="d-name">{dayLabel(day)}</span>
        <Timeline day={day} settings={settings} />
        <span className={`d-bal ${pending ? "" : day.balanceMin < 0 ? "neg" : day.balanceMin > 0 ? "pos" : ""}`}>
          {running ? "en cours" : pending ? (future ? "" : fmtDuration(day.workedMin)) : day.missingExit ? "?" : day.balanceMin === 0 ? "✓" : `${day.balanceMin > 0 ? "+" : ""}${fmtDuration(day.balanceMin)}`}
        </span>
        {day.punches.length > 0 && (
          <span className="d-times">
            {Array.from({ length: Math.ceil(day.punches.length / 2) }, (_, k) => {
              const a = day.punches[2 * k];
              const b = day.punches[2 * k + 1];
              return `${parisHM(a)}–${b ? parisHM(b) : day.isToday ? "…" : "?"}`;
            }).join("   ")}
          </span>
        )}
      </button>
      {open && (
        <div className="day-edit">
          <p className="note">{fmtDuration(day.workedMin)} faites sur {fmtDuration(day.dueMin)} prévues</p>
          {pauses.length > 0 && (
            <p className="note">
              Pause{pauses.length > 1 ? "s" : ""} : {pauses.map(([a, b]) => `${parisHM(a)}–${parisHM(b)} (${Math.round((b - a) / 60000)} min)`).join(", ")}
            </p>
          )}
          <div className="chips">
            {day.punches.map((p, i) => (
              <button key={p} className={`chip ${editing === p ? "on" : ""}`} onClick={() => { setEditing(p); setValue(parisHM(p)); }}>
                {i % 2 ? "Sortie" : "Entrée"} {parisHM(p)}
              </button>
            ))}
            <button className={`chip add ${editing === "new" ? "on" : ""}`} onClick={() => { setEditing("new"); setValue(""); }}>
              Ajouter
            </button>
          </div>
          {editing !== null && (
            <div className="editor">
              <input type="time" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Heure" autoFocus />
              <button className="mini primary" onClick={save} disabled={!value}>Enregistrer</button>
              {editing !== "new" && (
                <button
                  className="mini danger"
                  onClick={() => {
                    const ms = editing;
                    setEditing(null);
                    if (confirm(`Supprimer le pointage de ${parisHM(ms)} ?`)) mutate(() => api(`/api/punches?ms=${ms}`, { method: "DELETE" }));
                  }}
                >
                  Supprimer
                </button>
              )}
              <button className="mini" onClick={() => setEditing(null)}>Annuler</button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function SettingsPanel({ settings, onSave }: { settings: Settings; onSave: (s: Settings) => void }) {
  const [s, setS] = useState(settings);
  useEffect(() => setS(settings), [settings]);

  return (
    <details className="panel settings">
      <summary>Réglages</summary>
      <div className="form">
        <label>
          <span>Suivi depuis le</span>
          <input type="date" value={s.startDate ?? ""} onChange={(e) => setS({ ...s, startDate: e.target.value })} />
        </label>
        <label>
          <span>Taux horaire brut</span>
          <input type="number" step="0.01" inputMode="decimal" value={s.hourlyRate} onChange={(e) => setS({ ...s, hourlyRate: Number(e.target.value) })} />
        </label>
        <label>
          <span>Heures par jour</span>
          <input type="number" step="0.25" inputMode="decimal" value={s.hoursPerDay} onChange={(e) => setS({ ...s, hoursPerDay: Number(e.target.value) })} />
        </label>
        <label>
          <span>Fin de journée</span>
          <input type="time" value={s.dayEnd} onChange={(e) => setS({ ...s, dayEnd: e.target.value })} />
        </label>
        <div className="wd" role="group" aria-label="Jours travaillés">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <button
              key={d}
              className={`wd-btn ${s.workDays.includes(d) ? "on" : ""}`}
              aria-pressed={s.workDays.includes(d)}
              onClick={() => setS({ ...s, workDays: s.workDays.includes(d) ? s.workDays.filter((x) => x !== d) : [...s.workDays, d] })}
            >
              {DAY_NAMES[d].slice(0, 2)}
            </button>
          ))}
        </div>
        <button className="mini primary wide" onClick={() => onSave(s)}>Enregistrer les réglages</button>
      </div>
    </details>
  );
}

const MONTH_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function BalanceWidget({ total, inProgress }: { total: TotalReport; inProgress: boolean }) {
  const t = total.totalMin;
  const live = t + total.todayMin;
  const scale = Math.max(8 * 60, Math.abs(t));
  const fill = (Math.abs(t) / scale) * 50;
  const tone = t > 0 ? "pos" : t < 0 ? "neg" : "zero";
  const a = Math.abs(t);
  const maxBar = Math.max(60, ...total.months.map((m) => Math.abs(m.balanceMin)));

  return (
    <section className={`balance ${tone}`} aria-label="Solde cumulé d'heures">
      <div className="b-head">
        <h2>Solde cumulé</h2>
        <span className="b-since">depuis {MONTHS[Number(total.since.slice(5)) - 1]} {total.since.slice(0, 4)}</span>
      </div>
      <p className="b-value">
        <span className="b-sign">{t > 0 ? "+" : t < 0 ? "−" : ""}</span>
        {Math.floor(a / 60)}
        <small>h</small>
        {String(a % 60).padStart(2, "0")}
      </p>
      <p className="b-word">{t > 0 ? "d'avance sur ton planning" : t < 0 ? "de retard à rattraper" : "Pile à l'équilibre"}</p>

      <div className="meter" role="img" aria-label={`${t >= 0 ? "Avance" : "Retard"} de ${hm(a)}`}>
        <span className="m-fill" style={t >= 0 ? { left: "50%", width: `${fill}%` } : { right: "50%", width: `${fill}%` }} />
        <span className="m-zero" />
        <span className="m-tip" style={{ left: `${50 + (t >= 0 ? fill : -fill)}%` }} />
      </div>
      <div className="m-legend">
        <span>retard</span>
        <span>avance</span>
      </div>

      {total.todayMin !== 0 && !inProgress && (
        <p className="b-live">
          <span className="dot" />
          Avec aujourd&apos;hui : <strong className={live >= 0 ? "pos" : "neg"}>{live > 0 ? "+" : ""}{fmtDuration(live)}</strong>
        </p>
      )}

      {total.months.length > 1 && (
        <ol className="b-months" aria-label="Solde par mois">
          {total.months.map((m) => (
            <li key={m.month} title={`${monthLabel(m.month)} : ${fmtDuration(m.balanceMin)}`}>
              <span className="bm-bar">
                <span className={m.balanceMin >= 0 ? "up" : "down"} style={{ height: `${(Math.abs(m.balanceMin) / maxBar) * 50}%` }} />
              </span>
              <span className="bm-label">{MONTH_SHORT[Number(m.month.slice(5)) - 1]}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
