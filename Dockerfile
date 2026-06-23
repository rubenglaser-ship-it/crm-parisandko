# ---- Paris&Ko — image de production pour Railway ----
# Railway construit cette image À DISTANCE : aucun Docker requis sur ta machine.
# Next.js + Chromium système (pour la génération PDF via Puppeteer).

FROM node:20-bookworm-slim

# Chromium + librairies nécessaires à Puppeteer (rendu PDF)
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      ca-certificates fonts-liberation fonts-noto-color-emoji \
      libnss3 libatk-bridge2.0-0 libatk1.0-0 libcups2 libdrm2 \
      libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
      libgbm1 libpango-1.0-0 libcairo2 libasound2 \
  && rm -rf /var/lib/apt/lists/*

# Puppeteer : ne pas télécharger son propre Chromium, utiliser celui du système
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Dépendances (couche cachée tant que package.json ne change pas)
COPY package*.json ./
RUN npm ci

# Code + build
COPY . .
RUN npm run build

ENV NODE_ENV=production
# Railway fournit la variable PORT ; Next.js l'utilise automatiquement.
EXPOSE 3000
CMD ["npm", "start"]
