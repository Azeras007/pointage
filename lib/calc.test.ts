import { describe, expect, it } from "vitest";
import { computeMonth } from "./calc";
import { parisDay, parisToMs } from "./time";
import { DEFAULT_SETTINGS } from "./types";

const at = (d: string, hm: string) => parisToMs(d, hm);
const fullDay = (d: string) => [at(d, "09:00"), at(d, "13:00"), at(d, "14:00"), at(d, "18:00")];
const NOW = at("2026-11-18", "15:00");
// jours travaillés passés de novembre 2026 (avant le 18)
const PAST = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-16", "2026-11-17"];

function perfectExcept(date: string, punches: number[]) {
  return PAST.flatMap((d) => (d === date ? punches : fullDay(d)));
}

describe("computeMonth", () => {
  it("compte 13 jours lun–mer en novembre 2026", () => {
    const r = computeMonth([], DEFAULT_SETTINGS, NOW);
    expect(r.dueMonthMin).toBe(13 * 480);
  });

  it("parti 1h plus tôt → 60 min de manque, 1h retenue", () => {
    const d = "2026-11-09";
    const r = computeMonth(perfectExcept(d, [at(d, "09:00"), at(d, "13:00"), at(d, "14:00"), at(d, "17:00")]), DEFAULT_SETTINGS, NOW);
    expect(r.pastBalanceMin).toBe(-60);
    expect(r.deficitMin).toBe(60);
    expect(r.retainedHours).toBe(1);
    expect(r.retainedEuros).toBe(12.02);
  });

  it("heure entamée = heure due", () => {
    const d = "2026-11-09";
    const r20 = computeMonth(perfectExcept(d, [at(d, "09:20"), at(d, "13:00"), at(d, "14:00"), at(d, "18:00")]), DEFAULT_SETTINGS, NOW);
    expect(r20.retainedHours).toBe(1);
    const r65 = computeMonth(perfectExcept(d, [at(d, "10:05"), at(d, "13:00"), at(d, "14:00"), at(d, "18:00")]), DEFAULT_SETTINGS, NOW);
    expect(r65.retainedHours).toBe(2);
  });

  it("lisse le manque sur les jours restants", () => {
    const d = "2026-11-09";
    const r = computeMonth(perfectExcept(d, [at(d, "09:00"), at(d, "13:00"), at(d, "14:00"), at(d, "17:00")]), DEFAULT_SETTINGS, NOW);
    expect(r.plan.map((p) => p.date)).toEqual(["2026-11-18", "2026-11-23", "2026-11-24", "2026-11-25", "2026-11-30"]);
    expect(r.plan[0].extraMin).toBe(12);
    expect(r.plan[0].targetMin).toBe(492);
    expect(r.plan[0].suggestedEnd).toBe("18:12");
  });

  it("les heures en plus compensent", () => {
    const d = "2026-11-09";
    const r = computeMonth(perfectExcept(d, [at(d, "08:00"), at(d, "13:00"), at(d, "14:00"), at(d, "18:00")]), DEFAULT_SETTINGS, NOW);
    expect(r.pastBalanceMin).toBe(60);
    expect(r.deficitMin).toBe(0);
    expect(r.retainedHours).toBe(0);
    expect(r.plan[0].extraMin).toBe(0);
  });

  it("sortie oubliée un jour passé", () => {
    const d = "2026-11-09";
    const r = computeMonth(perfectExcept(d, [at(d, "09:00"), at(d, "13:00"), at(d, "14:00")]), DEFAULT_SETTINGS, NOW);
    const day = r.days.find((x) => x.date === d)!;
    expect(day.missingExit).toBe(true);
    expect(day.workedMin).toBe(240);
  });

  it("pointage en cours aujourd'hui compté jusqu'à maintenant", () => {
    const r = computeMonth([...perfectExcept("", []), at("2026-11-18", "09:00")], DEFAULT_SETTINGS, NOW);
    const today = r.days.find((x) => x.isToday)!;
    expect(today.workedMin).toBe(360);
    expect(today.missingExit).toBe(false);
    expect(r.inProgress).toBe(true);
  });

  it("fin de mois : plus de jours restants", () => {
    const now = at("2026-11-30", "20:00");
    const r = computeMonth([], DEFAULT_SETTINGS, now);
    // le 30 est aujourd'hui → encore dans le plan ; on se place au 1er déc pour novembre
    expect(r.plan.length).toBe(1);
    const r2 = computeMonth([], DEFAULT_SETTINGS, at("2026-12-01", "10:00"), "2026-11");
    expect(r2.plan).toEqual([]);
    expect(r2.deficitMin).toBe(13 * 480);
  });

  it("découpe en heure de Paris au changement d'heure", () => {
    expect(parisDay(at("2026-10-25", "23:30"))).toBe("2026-10-25");
    expect(parisDay(at("2026-03-29", "00:30"))).toBe("2026-03-29");
  });
});
