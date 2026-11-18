import { parisHM } from "./time";

export const DEBOUNCE_MS = 15_000;

/** Pointage à moins de DEBOUNCE_MS du précédent → doublon (double appui). */
export function isDuplicate(lastMs: number | undefined, now: number): boolean {
  return lastMs !== undefined && now >= lastMs && now - lastMs < DEBOUNCE_MS;
}

/** Message renvoyé au Raccourci après ajout ; `count` = pointages du jour, celui-ci inclus. */
export function punchLabel(count: number, ms: number): string {
  const hm = parisHM(ms);
  if (count % 2 === 0) return `Sortie ${hm}`;
  return count === 1 ? `Entrée ${hm}` : `Retour ${hm}`;
}

export function duplicateLabel(lastMs: number, now: number): string {
  return `Déjà pointé il y a ${Math.round((now - lastMs) / 1000)} s, appui ignoré`;
}
