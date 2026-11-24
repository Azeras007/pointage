# Pointage

Pointe tes entrées et sorties avec le bouton Action de l'iPhone. L'app calcule ce qu'il te manque sur le mois et la retenue estimée, et répartit le rattrapage sur tes jours restants.

## 1. Générer ton jeton secret

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Garde-le : il sert à te connecter à l'app et à pointer depuis l'iPhone.

## 2. Déployer sur Vercel

```bash
npx vercel login
```

```bash
npx vercel link
```

Ensuite, sur vercel.com, dans le projet :

1. **Storage → Create Database → Upstash for Redis** (offre gratuite), puis **Connect** au projet. Vercel ajoute automatiquement `KV_REST_API_URL` et `KV_REST_API_TOKEN`.
2. **Settings → Environment Variables** : ajoute `PUNCH_TOKEN` = ton jeton (environnement Production).

Puis :

```bash
npx vercel --prod
```

Ouvre l'URL `https://<ton-projet>.vercel.app`, colle ton jeton, puis dans Safari choisis Partager → **Sur l'écran d'accueil**.

## 3. Raccourci iPhone et bouton Action

1. App **Raccourcis** → **+** → nouveau raccourci « Pointer ».
2. Ajoute l'action **Obtenir le contenu de l'URL** :
   - URL : `https://<ton-projet>.vercel.app/api/punch?token=<ton-jeton>`
   - Méthode : `POST`
3. Ajoute l'action **Afficher la notification** avec comme texte le **Contenu de l'URL**. Tu verras « Entrée 08:58 » ou « Sortie 18:02 ».
4. **Réglages → Bouton Action** → **Raccourci** → choisis « Pointer ».

Deux appuis à moins d'une minute d'écart : le second est ignoré (« Ignoré (doublon) »).

## 4. Widget d'écran d'accueil

Le widget affiche ton solde cumulé d'avance ou de retard, en noir et blanc. Il se met à jour environ toutes les 15 minutes, selon le rythme fixé par iOS.

1. Installe l'app gratuite **Scriptable** depuis l'App Store.
2. Dans Scriptable, touche **+**, colle le contenu de [`widget/pointage-widget.js`](widget/pointage-widget.js), puis remplace `URL_APP` et `JETON` en haut du script. Nomme le script « Pointage ».
3. Touche ▶︎ pour tester : un aperçu du widget s'affiche.
4. Sur l'écran d'accueil, appui long → **+** → **Scriptable** → choisis la taille petite ou moyenne → **Ajouter**.
5. Appui long sur le widget → **Modifier le widget** → **Script** : « Pointage ».

Ça marche aussi sur l'écran verrouillé : ajoute un widget Scriptable rectangulaire ou en ligne et choisis le même script.

Le widget lit `GET /api/total`, qui renvoie le solde au format JSON.

## Règles de calcul

- Prévu : 8 h par lundi, mardi et mercredi (modifiable dans **Réglages**).
- Manque : somme des écarts des jours passés ; les heures en plus compensent les heures en moins.
- Retenue : manque arrondi à l'heure supérieure (heure entamée = heure due) × taux horaire brut (12,31 € par défaut, SMIC au 1er juin 2026, à vérifier dans Réglages).
- Rattrapage : manque ÷ jours travaillés restants (aujourd'hui inclus), ajouté à l'heure de fin (18:00).
- Un jour passé avec un nombre impair de pointages est signalé « sortie manquante » : ajoute la sortie en touchant **+** sur ce jour, ou corrige un pointage en le touchant.

## Développement

```bash
npm install
```

```bash
npm test
```

Sans Redis configuré, l'app garde les données en mémoire. Crée `.env.local` avec `PUNCH_TOKEN=...` puis lance `npm run dev`.
