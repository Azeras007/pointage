import { isAuthorized, unauthorized } from "@/lib/auth";
import { addPunch, lastPunch, listPunches } from "@/lib/store";
import { parisDay, parisHM, parisToMs } from "@/lib/time";

export const dynamic = "force-dynamic";

const DEBOUNCE_MS = 60_000;

async function handle(req: Request) {
  if (!isAuthorized(req)) return unauthorized();
  const now = Date.now();
  const last = await lastPunch();
  if (last !== null && now - last < DEBOUNCE_MS) {
    return new Response("Ignoré (doublon)", { headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  await addPunch(now);
  const day = parisDay(now);
  const todays = await listPunches(parisToMs(day, "00:00"), now);
  const label = todays.length % 2 === 1 ? "Entrée" : "Sortie";
  return new Response(`${label} ${parisHM(now)}`, { headers: { "content-type": "text/plain; charset=utf-8" } });
}

export const GET = handle;
export const POST = handle;
