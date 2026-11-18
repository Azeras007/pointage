import { isAuthorized, unauthorized } from "@/lib/auth";
import { DEBOUNCE_MS, duplicateLabel, isDuplicate, punchLabel } from "@/lib/punch";
import { addPunch, listPunches } from "@/lib/store";
import { parisDay, parisToMs } from "@/lib/time";

export const dynamic = "force-dynamic";

const text = (body: string) =>
  new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

async function handle(req: Request) {
  if (!isAuthorized(req)) return unauthorized();
  const now = Date.now();
  const last = (await listPunches(now - DEBOUNCE_MS, now)).at(-1);
  if (isDuplicate(last, now)) return text(duplicateLabel(last!, now));
  await addPunch(now);
  const todays = await listPunches(parisToMs(parisDay(now), "00:00"), now);
  return text(punchLabel(todays.length, now));
}

export const GET = handle;
export const POST = handle;
