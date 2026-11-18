export type Settings = {
  hourlyRate: number;
  hoursPerDay: number;
  /** 0 = dimanche … 6 = samedi */
  workDays: number[];
  dayEnd: string;
  /** "YYYY-MM-DD" : jours antérieurs ignorés */
  startDate?: string;
};

export const DEFAULT_SETTINGS: Settings = {
  hourlyRate: 12.31,
  hoursPerDay: 8,
  workDays: [1, 2, 3],
  dayEnd: "18:00",
};

export type DayRow = {
  date: string;
  weekday: number;
  dueMin: number;
  workedMin: number;
  balanceMin: number;
  punches: number[];
  missingExit: boolean;
  isToday: boolean;
  isPast: boolean;
  beforeStart: boolean;
};

export type PlanRow = {
  date: string;
  targetMin: number;
  extraMin: number;
  suggestedEnd: string;
};

export type MonthReport = {
  month: string;
  days: DayRow[];
  pastBalanceMin: number;
  deficitMin: number;
  retainedHours: number;
  retainedEuros: number;
  plan: PlanRow[];
  dueMonthMin: number;
  workedMonthMin: number;
  /** pointage ouvert en ce moment (entrée sans sortie aujourd'hui) */
  inProgress: boolean;
};
