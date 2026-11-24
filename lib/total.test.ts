import { describe, expect, it } from "vitest";
import { computeTotal } from "./calc";
import { parisToMs } from "./time";
import { DEFAULT_SETTINGS } from "./types";

const at = (d: string, hm: string) => parisToMs(d, hm);
const NOW = at("2026-11-18", "15:00");

describe("computeTotal", () => {
  it("cumule le solde sur plusieurs mois depuis la date de début", () => {
    const settings = { ...DEFAULT_SETTINGS, workDays: [1], startDate: "2026-10-26" };
    // lundi 26 oct : 9 h (+1 h) ; lundis 2, 9, 16 nov : 8 h, 8 h, 7 h30 (−30 min)
    const punches = [
      at("2026-10-26", "08:00"), at("2026-10-26", "17:00"),
      at("2026-11-02", "09:00"), at("2026-11-02", "17:00"),
      at("2026-11-09", "09:00"), at("2026-11-09", "17:00"),
      at("2026-11-16", "09:30"), at("2026-11-16", "17:00"),
    ];
    const t = computeTotal(punches, settings, NOW);
    expect(t.since).toBe("2026-10");
    expect(t.months).toEqual([
      { month: "2026-10", balanceMin: 60 },
      { month: "2026-11", balanceMin: -30 },
    ]);
    expect(t.totalMin).toBe(30);
  });

  it("donne le solde en direct d'aujourd'hui", () => {
    const settings = { ...DEFAULT_SETTINGS, startDate: "2026-11-18" };
    const t = computeTotal([at("2026-11-18", "09:00")], settings, NOW);
    expect(t.totalMin).toBe(0);
    expect(t.todayMin).toBe(6 * 60 - 480);
  });
});
