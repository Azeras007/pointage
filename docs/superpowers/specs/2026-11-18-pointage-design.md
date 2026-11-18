# Pointage — design

## Intention
Pointer ses entrées/sorties d'un appui sur le bouton Action de l'iPhone, et savoir à tout moment combien d'heures rattraper avant la fin du mois pour éviter une retenue sur salaire.

## Contexte
- Contrat : 24 h/semaine, lundi/mardi/mercredi, 9h–13h et 14h–18h (8 h/jour).
- Payé au SMIC horaire.
- Le manque d'heures se cumule sur le mois ; en fin de mois chaque heure entamée manquante est retenue comme 1 h entière (20 min de manque = 1 h retenue).

## Objectifs
- Un appui sur le bouton Action (Raccourci iOS → URL) enregistre l'heure ; chaque appui alterne entrée/sortie.
- Tableau du mois : jour par jour, heures prévues / faites / écart.
- Indicateurs : manque cumulé, heures retenues (arrondi supérieur), retenue estimée en €.
- Suggestion de rattrapage lissée sur les jours travaillés restants, avec heure de sortie conseillée.
- Corriger les pointages à la main (ajout, modification, suppression).

## Non-objectifs
- Multi-utilisateurs, comptes, heures sup' majorées, congés/absences gérés automatiquement (v1).

## Anti-objectifs
- Perdre un pointage, ou que quelqu'un d'autre puisse pointer à ma place.

## Approches envisagées
1. **Next.js sur Vercel + Upstash Redis (Marketplace Vercel)** — retenue. Fiable, gratuit, tout chez Vercel.
2. React statique + Vercel Blob (JSON) — plus simple mais fragile en écritures concurrentes.
3. Supabase — trop lourd pour un seul utilisateur.

## Décisions
- **API** : `POST/GET /api/punch?token=SECRET` ajoute un pointage à l'heure serveur (fuseau Europe/Paris) et renvoie un texte court (« Entrée 8h58 ») que le Raccourci peut afficher. Jeton dans la variable d'env `PUNCH_TOKEN`.
- **App web** : protégée par le même secret (saisi une fois, gardé en cookie).
- **Stockage** : un sorted set Redis des timestamps (une seule source de vérité) + une clé de réglages.
- **Appariement** : pointages du jour triés, pris par paires (entrée, sortie). Un pointage impair = en cours (compté jusqu'à maintenant pour aujourd'hui, signalé « sortie manquante » pour un jour passé).
- **Calcul** (mes choix, corrigeables) :
  - Dû du mois = 8 h × lundis/mardis/mercredis du mois (jours configurables).
  - Écart = fait − dû, sur les jours écoulés ; les heures en plus compensent les heures en moins.
  - Retenue = ceil(manque final en heures) × taux horaire brut.
  - Rattrapage = manque actuel ÷ jours travaillés restants (aujourd'hui inclus s'il n'est pas fini), arrondi à la minute supérieure, affiché en « sortie à 18h20 ».
- **Réglages** : taux horaire brut SMIC (modifiable), heures par jour, jours travaillés.
- **Interface** : mobile d'abord, en français, ajoutable à l'écran d'accueil.

## Laissé au constructeur
- Style visuel, structure des fichiers, bibliothèque de dates.
