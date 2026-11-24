// Widget « Solde » pour l'écran d'accueil de l'iPhone, via l'app Scriptable.
// Mode d'emploi : voir README, section « Widget d'écran d'accueil ».

// ⬇︎ À remplir
const URL_APP = "https://<ton-projet>.vercel.app";
const JETON = "<ton-jeton>";
// ⬆︎

const WHITE = Color.white();
const GREY = new Color("#8a8a8a");
const DARK = new Color("#555555");

function duree(min, signe = true) {
  const s = min > 0 ? (signe ? "+" : "") : min < 0 ? "−" : "";
  const a = Math.abs(Math.round(min));
  return `${s}${Math.floor(a / 60)}h${String(a % 60).padStart(2, "0")}`;
}

// Toucher « ↻ » relance ce script (ouvre Scriptable avec des chiffres à jour)
const ACTUALISER = `scriptable:///run/${encodeURIComponent(Script.name())}`;
const heure = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

function entete(w, taille) {
  const row = w.addStack();
  row.centerAlignContent();
  texte(row, "Solde", taille, GREY, "medium");
  row.addSpacer();
  const btn = row.addStack();
  btn.url = ACTUALISER;
  texte(btn, `↻ ${heure()}`, taille - 1, DARK);
  return row;
}

const solde = (d) => (d.inProgress ? d.totalMin : d.liveMin);

async function charger() {
  const req = new Request(`${URL_APP}/api/total`);
  req.headers = { Authorization: `Bearer ${JETON}` };
  req.timeoutInterval = 15;
  const body = await req.loadString();
  if (req.response.statusCode === 401) throw new Error("Jeton refusé.");
  if (req.response.statusCode !== 200) throw new Error(`Erreur ${req.response.statusCode}.`);
  return JSON.parse(body);
}

function texte(stack, str, size, color, weight = "regular") {
  const t = stack.addText(str);
  t.font = weight === "light" ? Font.lightSystemFont(size) : weight === "medium" ? Font.mediumSystemFont(size) : Font.systemFont(size);
  t.textColor = color;
  t.lineLimit = 1;
  t.minimumScaleFactor = 0.5;
  return t;
}

function jauge(stack, min, largeur) {
  // ligne fine avec un repère au centre : retard à gauche, avance à droite
  const ctx = new DrawContext();
  ctx.size = new Size(largeur, 12);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const mid = largeur / 2;
  const echelle = Math.max(8 * 60, Math.abs(min));
  const x = mid + (min / echelle) * (mid - 5);
  ctx.setFillColor(new Color("#3a3a3a"));
  ctx.fillRect(new Rect(0, 5.5, largeur, 1));
  ctx.setFillColor(WHITE);
  ctx.fillRect(new Rect(Math.min(mid, x), 5, Math.abs(x - mid), 2));
  ctx.setFillColor(GREY);
  ctx.fillRect(new Rect(mid - 0.5, 1, 1, 10));
  ctx.setFillColor(WHITE);
  ctx.fillEllipse(new Rect(x - 4, 2, 8, 8));
  const img = stack.addImage(ctx.getImage());
  img.imageSize = new Size(largeur, 12);
}

function widgetEcran(d, famille) {
  const w = new ListWidget();
  w.backgroundColor = Color.black();
  w.setPadding(14, 16, 14, 16);
  // petit widget : une seule zone touchable, toucher = actualiser
  w.url = famille === "small" ? ACTUALISER : URL_APP;
  w.refreshAfterDate = new Date(Date.now() + 5 * 60 * 1000);

  // en poste : la journée n'est pas finie, on montre le solde des jours terminés
  const total = solde(d);
  entete(w, 12);
  w.addSpacer(2);
  texte(w, duree(total), famille === "small" ? 38 : 44, WHITE, "light");
  texte(w, total > 0 ? "d'avance" : total < 0 ? "de retard" : "à l'équilibre", 12, GREY);
  w.addSpacer();

  if (famille === "small") {
    jauge(w, total, 120);
    w.addSpacer(6);
    texte(w, d.inProgress && d.todayEnd ? `Sortie ${d.todayEnd}` : `Mois ${duree(d.monthMin)}`, 11, DARK);
  } else {
    jauge(w, total, 290);
    w.addSpacer(8);
    const row = w.addStack();
    texte(row, `Mois ${duree(d.monthMin)}`, 12, GREY);
    row.addSpacer();
    if (d.todayMin !== 0) texte(row, `Aujourd'hui ${duree(d.todayMin)}`, 12, GREY);
    row.addSpacer();
    texte(row, d.inProgress && d.todayEnd ? `Sortie ${d.todayEnd}` : "Hors poste", 12, d.inProgress ? WHITE : DARK);
  }
  return w;
}

function widgetVerrouillage(d, famille) {
  const w = new ListWidget();
  w.url = ACTUALISER;
  w.refreshAfterDate = new Date(Date.now() + 5 * 60 * 1000);
  if (famille === "accessoryInline") {
    texte(w, `Solde ${duree(solde(d))}`, 12, WHITE);
  } else {
    texte(w, "Solde", 11, WHITE, "medium");
    texte(w, duree(solde(d)), 22, WHITE, "light");
    if (d.inProgress && d.todayEnd) texte(w, `Sortie ${d.todayEnd}`, 11, WHITE);
  }
  return w;
}

function widgetErreur(msg) {
  const w = new ListWidget();
  w.backgroundColor = Color.black();
  w.url = ACTUALISER;
  texte(w, "Pointage", 12, GREY, "medium");
  w.addSpacer(4);
  const t = w.addText(msg);
  t.font = Font.systemFont(12);
  t.textColor = WHITE;
  return w;
}

const famille = config.widgetFamily ?? "medium";
let widget;
try {
  const d = await charger();
  widget = famille.startsWith("accessory") ? widgetVerrouillage(d, famille) : widgetEcran(d, famille);
} catch (e) {
  widget = widgetErreur(`Pas de connexion à l'app. ${e.message ?? ""} Touche pour réessayer.`);
}

if (config.runsInWidget) Script.setWidget(widget);
else if (famille === "small") await widget.presentSmall();
else await widget.presentMedium();
Script.complete();
