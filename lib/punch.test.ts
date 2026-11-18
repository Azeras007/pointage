import { describe, expect, it } from "vitest";
import { duplicateLabel, isDuplicate, punchLabel } from "./punch";
import { parisToMs } from "./time";

const at = (hm: string) => parisToMs("2026-11-18", hm);

describe("punch", () => {
  it("sortie puis retour une minute après : pas un doublon", () => {
    expect(isDuplicate(at("11:21"), at("11:22"))).toBe(false);
  });

  it("double appui à 5 s : doublon", () => {
    expect(isDuplicate(at("11:21"), at("11:21") + 5_000)).toBe(true);
  });

  it("pointage futur saisi à la main : pas un doublon", () => {
    expect(isDuplicate(at("14:00"), at("11:00"))).toBe(false);
  });

  it("libellés entrée / sortie / retour", () => {
    expect(punchLabel(1, at("08:58"))).toBe("Entrée 08:58");
    expect(punchLabel(2, at("11:21"))).toBe("Sortie 11:21");
    expect(punchLabel(3, at("11:28"))).toBe("Retour 11:28");
  });

  it("message de doublon", () => {
    expect(duplicateLabel(at("11:21"), at("11:21") + 6_000)).toBe("Déjà pointé il y a 6 s, appui ignoré");
  });
});
