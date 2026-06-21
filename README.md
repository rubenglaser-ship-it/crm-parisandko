# Paris&Ko — Application web (Next.js + Supabase)

Plateforme cloud **mono-utilisateur** pour créer, stocker et exporter tes itinéraires clients.
Accessible depuis n'importe quel ordinateur ou téléphone, avec sauvegarde automatique.

## Ce qu'elle fait
- Connexion par lien magique (email) — **un seul compte, le tien**.
- **Itinéraires** : liste, création, éditeur complet (couverture, journées, activités, multi-destinations, hôtel par étape), **sauvegarde automatique** en base.
- **Bibliothèque** (hôtels / activités / restaurants), filtrable par type et région, modifiable.
- **Clients** : carnet d'adresses.
- **Export PDF** : impression navigateur (mise en page couleur soignée). *(PDF serveur = Phase 3, voir plus bas.)*
- **Sécurité** : tes données sont privées à ton compte (Row-Level Security sur `auth.uid()`).

## Prérequis
- Node.js 18+ (https://nodejs.org)
- Un compte **Supabase** (gratuit) et un compte **Vercel** (gratuit)

## Déploiement — marche à suivre

### 1) Base de données (Supabase)
1. Crée un projet sur supabase.com.
2. **SQL Editor** → colle `../schema.sql` → **Run**. (C'est tout, aucune équipe à configurer.)
3. **Authentication → URL Configuration → Redirect URLs** : ajoute
   `http://localhost:3000/auth/callback` (et plus tard ton URL Vercel + `/auth/callback`).

### 2) Lancer en local
```bash
cd parisko-app
npm install
cp .env.local.example .env.local      # puis remplis les clés (Supabase → Settings → API)
npm run dev
```
- Ouvre http://localhost:3000 → connecte-toi par email (lien magique) → tu es dans l'app.
- **Charge ta bibliothèque** : Supabase → SQL Editor → colle `../seed-library.sql` → **Run**
  (à faire après ta 1re connexion, pour que ton compte existe). Recharge la page Bibliothèque.

`.env.local` à remplir :
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (secrète)
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000`

> ⚠️ **Sécurité** : mets tes vraies clés UNIQUEMENT dans `.env.local` (ignoré par Git).
> Ne mets jamais de vraie clé dans `.env.local.example` (lui est versionné → la clé `service_role` fuirait sur GitHub).
> Si tu l'as déjà fait, régénère la clé dans Supabase → Settings → API.

### 3) Mise en ligne (Vercel)
1. Pousse le dossier `parisko-app` sur un dépôt GitHub.
2. vercel.com → **New Project** → importe le dépôt.
3. **Environment Variables** : mêmes clés, avec `NEXT_PUBLIC_SITE_URL=https://ton-app.vercel.app`.
4. Déploie, puis ajoute `https://ton-app.vercel.app/auth/callback` dans les *Redirect URLs* Supabase.
5. Connecte-toi sur l'URL Vercel → opérationnel partout.

## Génération PDF serveur (Phase 3 — FAIT ✓)
Bouton **« Télécharger le PDF »** dans l'éditeur → route `app/api/pdf/[id]/route.js` → Chrome headless →
PDF parfait **sans aucun réglage navigateur** (couleurs, multi-pages, pas d'en-tête/URL, texte sélectionnable).
- **En local** : utilise `puppeteer` (Chromium embarqué, installé via `npm install`).
- **Sur Vercel** : utilise `puppeteer-core` + `@sparticuz/chromium` (détection automatique).

**Réglage Vercel pour la route PDF :**
- Variables d'env : ajoute `PUPPETEER_SKIP_DOWNLOAD=true` (évite que Vercel télécharge le gros Chromium de `puppeteer` au build ; en prod c'est `@sparticuz/chromium` qui sert).
- Si la route renvoie une erreur de mémoire, augmente la mémoire de la fonction (Project Settings → Functions).

Le bouton « Imprimer (aperçu navigateur) » reste disponible en secours.

## Structure
```
app/            pages (dashboard, login, clients, library, itineraries/[id])
components/     TopNav, Editor, LibraryClient, ClientsClient
lib/supabase/   clients browser / server / admin
middleware.js   protège les pages, rafraîchit la session
```

> Note : cet outil est en **mono-utilisateur**. Le passage en mode équipe (plusieurs comptes,
> bibliothèque partagée) reste possible plus tard — l'archi le permet, il suffira de rétablir
> les tables `teams`/`profiles` et la RLS par équipe.
