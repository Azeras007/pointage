import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, tokenMatches } from "@/lib/auth";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

export default async function Page() {
  const jar = await cookies();
  if (!tokenMatches(jar.get(COOKIE)?.value)) redirect("/login");
  return <Dashboard />;
}
