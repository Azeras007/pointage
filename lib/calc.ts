import { addMinutesHM, daysOfMonth, parisDay, parisMonth, weekdayOf } from "./time";
import type { DayRow, MonthReport, PlanRow, Settings } from "./types";

const MIN = 60_000;

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
  };
}
