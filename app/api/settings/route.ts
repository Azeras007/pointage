import { isAuthorized, unauthorized } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/store";
import type { Settings } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAuthorized(req)) return unauthorized();
  return Response.json(await getSettings());
}

export async function PUT(req: Request) {
  if (!isAuthorized(req)) return unauthorized();
  const b = (await req.json()) as Partial<Settings>;
  const cur = await getSettings();
  const next: Settings = {
    hourlyRate: Number(b.hourlyRate ?? cur.hourlyRate),
    hoursPerDay: Number(b.hoursPerDay ?? cur.hoursPerDay),
    workDays: Array.isArray(b.workDays) ? b.workDays.map(Number).filter((d) => d >= 0 && d <= 6) : cur.workDays,
    dayEnd: /^\d{2}:\d{2}$/.test(b.dayEnd ?? "") ? b.dayEnd! : cur.dayEnd,
    startDate:
      b.startDate === "" ? undefined : /^\d{4}-\d{2}-\d{2}$/.test(b.startDate ?? "") ? b.startDate : cur.startDate,
  };
  if (!(next.hourlyRate >= 0) || !(next.hoursPerDay > 0 && next.hoursPerDay <= 24)) {
    return new Response("Réglages invalides", { status: 400 });
  }
  await saveSettings(next);
  return Response.json(next);
}
