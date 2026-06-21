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
- `SUPABASE_SERVICE_ROLE_KEY` (secrète — utile seulement pour le PDF serveur, Phase 3)
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000`

### 3) Mise en ligne (Vercel)
1. Pousse le dossier `parisko-app` sur un dépôt GitHub.
2. vercel.com → **New Project** → importe le dépôt.
3. **Environment Variables** : mêmes clés, avec `NEXT_PUBLIC_SITE_URL=https://ton-app.vercel.app`.
4. Déploie, puis ajoute `https://ton-app.vercel.app/auth/callback` dans les *Redirect URLs* Supabase.
5. Connecte-toi sur l'URL Vercel → opérationnel partout.

## Phase 3 — Génération PDF serveur (à venir)
Bouton « Télécharger PDF » renvoyant un PDF parfait **sans aucun réglage navigateur**.
Route `app/api/pdf/[id]/route.js` → rend l'itinéraire → Chrome headless :
- local/worker : `puppeteer` (cf. `../export-pdf.js`)
- Vercel : `puppeteer-core` + `@sparticuz/chromium`
En attendant, « Exporter / Imprimer » fait déjà un PDF propre (coche « Graphiques d'arrière-plan », décoche « En-têtes et pieds de page »).

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
