import { isAuthorized, unauthorized } from "@/lib/auth";
import { computeMonth, computeTotal } from "@/lib/calc";
import { getSettings, listPunches } from "@/lib/store";
import { monthRange, parisMonth } from "@/lib/time";

export const dynamic = "force-dynamic";

/** Résumé compact pour le widget d'écran d'accueil (Scriptable). */
export async function GET(req: Request) {
  if (!isAuthorized(req)) return unauthorized();
  const now = Date.now();
  const [, to] = monthRange(parisMonth(now));
  const [all, settings] = await Promise.all([listPunches(0, to - 1), getSettings()]);
  const total = computeTotal(all, settings, now);
  const month = computeMonth(all, settings, now);
  return Response.json({
    totalMin: total.totalMin,
    todayMin: total.todayMin,
    liveMin: total.totalMin + total.todayMin,
    monthMin: month.pastBalanceMin,
    since: total.since,
    inProgress: month.inProgress,
    todayEnd: month.todayEnd ?? null,
    updatedAt: now,
  });
}
