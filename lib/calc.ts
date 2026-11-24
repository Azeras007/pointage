import { addMinutesHM, daysOfMonth, parisDay, parisHM, parisMonth, weekdayOf } from "./time";
import type { DayRow, MonthReport, PlanRow, Settings } from "./types";

const MIN = 60_000;
/** Pause déjeuner : 1 h, finie à 14:00 ; un écart ≥ 30 min compte comme déjeuner pris. */
const LUNCH_MIN = 60;
const LUNCH_END_MIN = 14 * 60;
const LUNCH_GAP_MIN = 30;

/**
 * Calcule le bilan d'un mois (par défaut le mois courant de `now`).
 * Les pointages sont pris par paires (entrée, sortie) par jour.
 */
export function computeMonth(punches: number[], settings: Settings, now: number, month = parisMonth(now)): MonthReport {
  const today = parisDay(now);
  const byDay = new Map<string, number[]>();
  for (const p of [...punches].sort((a, b) => a - b)) {
    const d = parisDay(p);
    if (!d.startsWith(month)) continue;
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(p);
  }

  const dayMin = settings.hoursPerDay * 60;
  let inProgress = false;

  const days: DayRow[] = daysOfMonth(month).map((date) => {
    const weekday = weekdayOf(date);
    const beforeStart = !!settings.startDate && date < settings.startDate;
    const list = beforeStart ? [] : (byDay.get(date) ?? []);
    const isToday = date === today;
    const isPast = date < today;
    let workedMs = 0;
    for (let i = 0; i + 1 < list.length; i += 2) workedMs += list[i + 1] - list[i];
    const open = list.length % 2 === 1;
    let missingExit = false;
    if (open) {
      if (isToday) {
        workedMs += Math.max(0, now - list[list.length - 1]);
        inProgress = true;
      } else if (isPast) {
        missingExit = true;
      }
    }
    const dueMin = !beforeStart && settings.workDays.includes(weekday) ? dayMin : 0;
    const workedMin = Math.floor(workedMs / MIN);
    return { date, weekday, dueMin, workedMin, balanceMin: workedMin - dueMin, punches: list, missingExit, isToday, isPast, beforeStart };
  });

  const pastBalanceMin = days.filter((d) => d.isPast).reduce((s, d) => s + d.balanceMin, 0);
  const deficitMin = Math.max(0, -pastBalanceMin);
  const remaining = days.filter((d) => !d.isPast && d.dueMin > 0);
  const extraMin = remaining.length ? Math.ceil(deficitMin / remaining.length) : 0;

  const plan: PlanRow[] = remaining.map((d) => ({
    date: d.date,
    targetMin: d.dueMin + extraMin,
    extraMin,
    suggestedEnd: addMinutesHM(settings.dayEnd, extraMin),
  }));

  const retainedHours = Math.ceil(deficitMin / 60);

  // Heure de fin projetée pour aujourd'hui, pauses déjà prises incluses.
  let todayEnd: string | undefined;
  const todayRow = days.find((d) => d.isToday);
  if (todayRow && inProgress) {
    const target = plan.find((p) => p.date === today)?.targetMin ?? todayRow.dueMin;
    if (target > 0) {
      const remaining = Math.max(0, target - todayRow.workedMin);
      const p = todayRow.punches;
      let lunchTaken = false;
      for (let i = 1; i + 1 < p.length; i += 2) if (p[i + 1] - p[i] >= LUNCH_GAP_MIN * MIN) lunchTaken = true;
      const [h, m] = parisHM(now).split(":").map(Number);
      const lunchPending = !lunchTaken && h * 60 + m < LUNCH_END_MIN;
      todayEnd = parisHM(now + (remaining + (lunchPending ? LUNCH_MIN : 0)) * MIN);
    }
  }

  return {
    month,
    days,
    pastBalanceMin,
    deficitMin,
    retainedHours,
    retainedEuros: Math.round(retainedHours * settings.hourlyRate * 100) / 100,
    plan,
    dueMonthMin: days.reduce((s, d) => s + d.dueMin, 0),
    workedMonthMin: days.reduce((s, d) => s + d.workedMin, 0),
    inProgress,
    todayEnd,
  };
}

export type TotalReport = {
  /** solde cumulé des jours passés depuis le début du suivi (min) */
  totalMin: number;
  /** solde d'aujourd'hui en temps réel (min), 0 si rien pointé */
  todayMin: number;
  /** premier mois pris en compte "YYYY-MM" */
  since: string;
  months: { month: string; balanceMin: number }[];
};

/** Cumule l'avance ou le retard de tous les mois, du début du suivi jusqu'à `now`. */
export function computeTotal(punches: number[], settings: Settings, now: number): TotalReport {
  const current = parisMonth(now);
  const first = settings.startDate?.slice(0, 7) ?? (punches.length ? parisMonth(Math.min(...punches)) : current);
  const months: { month: string; balanceMin: number }[] = [];
  let todayMin = 0;
  let m = first <= current ? first : current;
  while (m <= current) {
    const r = computeMonth(punches, settings, now, m);
    months.push({ month: m, balanceMin: r.pastBalanceMin });
    const t = r.days.find((d) => d.isToday);
    if (t && t.punches.length > 0) todayMin = t.balanceMin;
    const [y, mo] = m.split("-").map(Number);
    m = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
  }
  return { totalMin: months.reduce((s, x) => s + x.balanceMin, 0), todayMin, since: first, months };
}
