# Déploiement sur Railway — pas à pas

Railway **construit l'image à distance** : tu n'as **pas besoin de Docker** sur ton ordinateur.
Le `Dockerfile` fourni installe Next.js + Chromium (pour la génération PDF).

## 1) Pré-requis (déjà fait normalement)
- Le code est poussé sur GitHub (`git push`).
- Supabase est configuré : `schema.sql`, `seed-library.sql`, `storage.sql`, `migration-templates.sql` exécutés,
  bucket `images` créé, et l'utilisateur fixe `contact@parisandko.com` créé (Auth → Users, Auto Confirm).

## 2) Créer le projet Railway
1. Va sur railway.app → **New Project** → **Deploy from GitHub repo** → choisis `crm-parisandko`.
2. Railway détecte le **Dockerfile** et lance le build (3–5 min la première fois).

## 3) Variables d'environnement (Railway → service → Variables)
Colle ces clés (mêmes valeurs que ton `.env.local`, sauf l'URL du site) :

```
NEXT_PUBLIC_SUPABASE_URL=https://VOTRE-PROJET.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...            # régénérée si exposée
APP_USER_EMAIL=contact@parisandko.com
APP_USER_PASSWORD=ton-mot-de-passe
NEXT_PUBLIC_SITE_URL=https://<ton-app>.up.railway.app
```
> `PUPPETEER_EXECUTABLE_PATH` et `PUPPETEER_SKIP_DOWNLOAD` sont déjà définis dans le Dockerfile — rien à ajouter.
> `PORT` est fourni automatiquement par Railway.

## 4) Domaine public
- Railway → **Settings → Networking → Generate Domain** (ou ajoute ton domaine).
- Mets cette URL dans `NEXT_PUBLIC_SITE_URL` puis **redeploy**.

## 5) Vérifs après déploiement
- `https://<ton-app>.up.railway.app/api/health` → doit afficher **ok** (healthcheck).
- La home → connexion auto → liste d'itinéraires.
- Ouvre un itinéraire → **Télécharger le PDF** → le PDF se génère (Chromium système).

## Génération PDF — comment ça marche ici
- Railway est un **conteneur long-running** (pas du serverless). La route `/api/pdf/[id]` utilise
  `puppeteer-core` + le **Chromium système** (`/usr/bin/chromium`) via `PUPPETEER_EXECUTABLE_PATH`.
- Le code détecte automatiquement l'environnement (Railway / Vercel / local) — aucune action de ta part.

## Dépannage
- **Crash-loop « Ready » puis « Stopping / SIGTERM » en boucle** : c'est le **healthcheck** qui échoue → Railway tue le conteneur et recommence.
  - Le healthcheck doit pointer sur **`/api/health`** (Settings → Deploy → *Health Check Path*). Cette route renvoie « ok » **sans passer par le middleware ni Supabase** (exclue volontairement).
  - Vérifie aussi *Health Check Timeout* (≥ 100 s) et que `PORT` n'est pas surchargé manuellement (Railway le fournit).
  - Si après ça l'app reste up mais les pages renvoient 500 → ce sont les **variables Supabase** : regarde les logs (un message `✗ ABSENTE` s'affiche si une clé manque).

- **PDF en erreur 500** : vérifie les logs Railway. Souvent une lib Chromium manquante →
  le Dockerfile les installe déjà ; si un message cite une `.so` manquante, ajoute le paquet `apt` correspondant.
- **Build qui télécharge un gros Chromium** : c'est évité par `PUPPETEER_SKIP_DOWNLOAD=true` (déjà dans le Dockerfile).
- **Redirection en boucle au démarrage** : vérifie que `APP_USER_EMAIL` / `APP_USER_PASSWORD` correspondent
  bien à l'utilisateur créé dans Supabase (et qu'il est *confirmé*).
- **Mémoire** : si le PDF plante sous charge, augmente la RAM du service (Railway → Settings → Resources).
