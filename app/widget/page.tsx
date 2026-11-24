import { readFile } from "node:fs/promises";
import path from "node:path";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, tokenMatches } from "@/lib/auth";
import Link from "next/link";
import CopyButton from "./CopyButton";

export const dynamic = "force-dynamic";

export default async function WidgetPage() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!tokenMatches(token)) redirect("/login");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const raw = await readFile(path.join(process.cwd(), "widget", "pointage-widget.js"), "utf8");
  const script = raw
    .replace('"https://<ton-projet>.vercel.app"', JSON.stringify(`${proto}://${host}`))
    .replace('"<ton-jeton>"', JSON.stringify(token));

  return (
    <main className="shell widget-page">
      <Link className="back" href="/">‹ Retour</Link>
      <h1>Widget iPhone</h1>
      <ol className="steps">
        <li>Installe l&apos;app gratuite <strong>Scriptable</strong> depuis l&apos;App Store, puis ouvre-la une fois.</li>
        <li>Touche <strong>Copier le script</strong> ci-dessous.</li>
        <li>Dans Scriptable, touche <strong>+</strong>, colle le script, nomme-le « Pointage », puis touche <strong>Terminé</strong>.</li>
        <li>Sur l&apos;écran d&apos;accueil, appui long sur un espace vide → <strong>Modifier</strong> → <strong>Ajouter un widget</strong>, cherche « Scriptable », choisis la taille petite ou moyenne.</li>
        <li>Touche le widget ajouté (toujours en mode modification) → <strong>Script</strong> : « Pointage ».</li>
      </ol>
      <p className="note">
        Pour actualiser à la main, touche <strong>↻</strong> en haut à droite du widget (sur le petit widget, touche-le n&apos;importe où) :
        Scriptable s&apos;ouvre un instant avec les chiffres à jour, puis le widget se redessine. L&apos;heure à côté de ↻ indique la dernière mise à jour.
      </p>
      <CopyButton text={script} />
      <p className="note">Ce script contient ton jeton : ne le partage pas.</p>
      <pre className="code">{script}</pre>
    </main>
  );
}
