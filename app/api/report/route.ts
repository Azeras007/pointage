import { isAuthorized, unauthorized } from "@/lib/auth";
import { computeMonth, computeTotal } from "@/lib/calc";
import { getSettings, listPunches } from "@/lib/store";
import { monthRange, parisMonth } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAuthorized(req)) return unauthorized();
  const now = Date.now();
  const q = new URL(req.url).searchParams.get("month");
  const month = q && /^\d{4}-\d{2}$/.test(q) ? q : parisMonth(now);
  const [, to] = monthRange(parisMonth(now));
  const [all, settings] = await Promise.all([listPunches(0, to - 1), getSettings()]);
  return Response.json({ report: computeMonth(all, settings, now, month), total: computeTotal(all, settings, now), settings });
}
