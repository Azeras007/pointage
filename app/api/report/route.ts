import { isAuthorized, unauthorized } from "@/lib/auth";
import { computeMonth } from "@/lib/calc";
import { getSettings, listPunches } from "@/lib/store";
import { monthRange, parisMonth } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAuthorized(req)) return unauthorized();
  const now = Date.now();
  const q = new URL(req.url).searchParams.get("month");
  const month = q && /^\d{4}-\d{2}$/.test(q) ? q : parisMonth(now);
  const [from, to] = monthRange(month);
  const [punches, settings] = await Promise.all([listPunches(from, to - 1), getSettings()]);
  return Response.json({ report: computeMonth(punches, settings, now, month), settings });
}
