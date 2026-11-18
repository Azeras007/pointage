import { timingSafeEqual } from "node:crypto";

export const COOKIE = "pt";

export function tokenMatches(candidate: string | null | undefined): boolean {
  const secret = process.env.PUNCH_TOKEN;
  if (!secret || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isAuthorized(req: Request): boolean {
  const url = new URL(req.url);
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const cookie = req.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  return [url.searchParams.get("token"), bearer, cookie && decodeURIComponent(cookie)].some(tokenMatches);
}

export function unauthorized(): Response {
  return new Response("Non autorisé", { status: 401 });
}
