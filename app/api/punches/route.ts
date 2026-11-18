import { isAuthorized, unauthorized } from "@/lib/auth";
import { addPunch, deletePunch } from "@/lib/store";

export const dynamic = "force-dynamic";

const valid = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;

export async function POST(req: Request) {
  if (!isAuthorized(req)) return unauthorized();
  const { ms } = await req.json();
  if (!valid(ms)) return new Response("ms invalide", { status: 400 });
  await addPunch(ms);
  return Response.json({ ok: true });
}

export async function PUT(req: Request) {
  if (!isAuthorized(req)) return unauthorized();
  const { oldMs, ms } = await req.json();
  if (!valid(oldMs) || !valid(ms)) return new Response("ms invalide", { status: 400 });
  await deletePunch(oldMs);
  await addPunch(ms);
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isAuthorized(req)) return unauthorized();
  const ms = Number(new URL(req.url).searchParams.get("ms"));
  if (!valid(ms)) return new Response("ms invalide", { status: 400 });
  await deletePunch(ms);
  return Response.json({ ok: true });
}
