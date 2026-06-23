/**
 * Lance une seule fois depuis la racine du projet :
 *   node scripts/download-fonts.js
 *
 * Télécharge Cormorant Garamond + Inter (woff2) dans lib/fonts/
 * pour que la route PDF les embarque en base64 (pas de dépendance réseau dans Puppeteer).
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'lib', 'fonts');
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

const FONTS = [
  // Cormorant Garamond
  {
    file: 'CG-400.woff2',
    url: 'https://fonts.gstatic.com/s/cormorantgaramond/v22/co3YmX5slCNuHLi8bLeY9MK7whWMhyjornFLsS6V7w.woff2',
  },
  {
    file: 'CG-400i.woff2',
    url: 'https://fonts.gstatic.com/s/cormorantgaramond/v22/co3WmX5slCNuHLi8bLeY9MK7whWMhyjYqXtKxy2olmvsf6zR.woff2',
  },
  {
    file: 'CG-500.woff2',
    url: 'https://fonts.gstatic.com/s/cormorantgaramond/v22/co3YmX5slCNuHLi8bLeY9MK7whWMhyjYrnFLsS6V7w.woff2',
  },
  {
    file: 'CG-600.woff2',
    url: 'https://fonts.gstatic.com/s/cormorantgaramond/v22/co3YmX5slCNuHLi8bLeY9MK7whWMhyjoXFLsS6V7w.woff2',
  },
  // Inter
  {
    file: 'Inter-300.woff2',
    url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuOKYAZ9hiA.woff2',
  },
  {
    file: 'Inter-400.woff2',
    url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
  },
  {
    file: 'Inter-500.woff2',
    url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiA.woff2',
  },
  {
    file: 'Inter-600.woff2',
    url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2',
  },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) { console.log(`  ✓ ${path.basename(dest)} (déjà présent)`); return resolve(); }
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} pour ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); console.log(`  ↓ ${path.basename(dest)}`); resolve(); });
    }).on('error', (e) => { fs.unlinkSync(dest); reject(e); });
  });
}

(async () => {
  console.log('Téléchargement des fonts dans lib/fonts/ …');
  for (const f of FONTS) await download(f.url, path.join(DIR, f.file));
  console.log('✅ Fonts prêtes. Relance npm run dev.');
})();
