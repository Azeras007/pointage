export const TZ = "Europe/Paris";

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

type Parts = { y: number; m: number; d: number; hh: number; mm: number; ss: number };

function parts(ms: number): Parts {
  const p: Record<string, string> = {};
  for (const { type, value } of fmt.formatToParts(new Date(ms))) p[type] = value;
  return { y: +p.year, m: +p.month, d: +p.day, hh: +p.hour, mm: +p.minute, ss: +p.second };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" en heure de Paris */
export function parisDay(ms: number): string {
  const p = parts(ms);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** "YYYY-MM" en heure de Paris */
export function parisMonth(ms: number): string {
  return parisDay(ms).slice(0, 7);
}

/** "HH:MM" en heure de Paris */
export function parisHM(ms: number): string {
  const p = parts(ms);
  return `${pad(p.hh)}:${pad(p.mm)}`;
}

/** Convertit une date + heure locales Paris en timestamp ms. */
export function parisToMs(date: string, hm: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = hm.split(":").map(Number);
  const target = Date.UTC(y, m - 1, d, hh, mm);
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const p = parts(guess);
    const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss);
    guess += target - asUtc;
  }
  return guess;
}

/** Jour de la semaine (0 = dimanche) d'une date "YYYY-MM-DD" */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Toutes les dates "YYYY-MM-DD" d'un mois "YYYY-MM" */
export function daysOfMonth(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${month}-${pad(i + 1)}`);
}

/** Bornes [début, fin) en ms d'un mois Paris */
export function monthRange(month: string): [number, number] {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
  return [parisToMs(`${month}-01`, "00:00"), parisToMs(`${next}-01`, "00:00")];
}

/** "HH:MM" + minutes → "HH:MM" */
export function addMinutesHM(hm: string, min: number): string {
  const [h, m] = hm.split(":").map(Number);
  const t = h * 60 + m + min;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

export function fmtDuration(min: number): string {
  const sign = min < 0 ? "−" : "";
  const a = Math.abs(Math.round(min));
  return `${sign}${Math.floor(a / 60)}h${pad(a % 60)}`;
}
