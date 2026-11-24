import { isAuthorized, unauthorized } from "@/lib/auth";
import { getRev } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Révision des données : change à chaque pointage ou réglage. */
export async function GET(req: Request) {
  if (!isAuthorized(req)) return unauthorized();
  return Response.json({ rev: await getRev() }, { headers: { "cache-control": "no-store" } });
}
