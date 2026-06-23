// Transforme un itinéraire (ligne DB) en document HTML autonome,
// identique à l'aperçu de l'éditeur. Utilisé par la route PDF serveur.

import fs from 'fs';
import path from 'path';
import { mdToHtml } from './richtext';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const isPH = (t) => /^(new day|new item|activity|)$/i.test((t || '').trim());
const mealCls = (m) => 'm-' + String(m || '').replace(/\s/g, '');

function tripDest(days) {
  const s = [];
  (days || []).forEach((d) => { if (d.dest && !s.includes(d.dest)) s.push(d.dest); });
  return s.join(' · ');
}

// ---- Fonts embarquées en base64 (évite toute requête réseau dans Puppeteer) ----
// Nécessite d'avoir lancé `node scripts/download-fonts.js` une fois.
// Fallback gracieux vers les fonts système si les fichiers sont absents.
function loadFontFaces() {
  const dir = path.join(process.cwd(), 'lib', 'fonts');
  const load = (file) => {
    try {
      const buf = fs.readFileSync(path.join(dir, file));
      return `data:font/woff2;base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  };
  const cg400  = load('CG-400.woff2');
  const cg400i = load('CG-400i.woff2');
  const cg500  = load('CG-500.woff2');
  const cg600  = load('CG-600.woff2');
  const i300   = load('Inter-300.woff2');
  const i400   = load('Inter-400.woff2');
  const i500   = load('Inter-500.woff2');
  const i600   = load('Inter-600.woff2');

  const faceCG = (src, weight, style = 'normal') =>
    src ? `@font-face{font-family:'Cormorant Garamond';src:url('${src}') format('woff2');font-weight:${weight};font-style:${style};font-display:block}` : '';
  const faceI  = (src, weight) =>
    src ? `@font-face{font-family:'Inter';src:url('${src}') format('woff2');font-weight:${weight};font-style:normal;font-display:block}` : '';

  return [
    faceCG(cg400,  400),
    faceCG(cg400i, 400, 'italic'),
    faceCG(cg500,  500),
    faceCG(cg600,  600),
    faceI(i300, 300),
    faceI(i400, 400),
    faceI(i500, 500),
    faceI(i600, 600),
  ].join('\n');
}

// ---- Images → data URI (évite les 401/403 depuis Puppeteer) ----
async function toDataUri(url) {
  if (!url) return null;
  if (url.startsWith('data:')) return url; // déjà une data URI
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${ct};base64,${buf.toString('base64')}`;
  } catch {
    return null; // image absente → omise silencieusement
  }
}

// Collecte toutes les URLs d'images dans l'itinéraire et les convertit en masse
async function resolveImages(itin) {
  const days = Array.isArray(itin.days) ? itin.days : [];
  const urls = new Set();
  if (itin.hero_image) urls.add(itin.hero_image);
  days.forEach((d) => (d.items || []).forEach((it) => { if (it.image) urls.add(it.image); }));

  const map = {};
  await Promise.all([...urls].map(async (u) => { map[u] = await toDataUri(u); }));
  return map;
}

const CSS = `
:root{--ink:#1c1c1a;--ink-soft:#55534d;--line:#e7e2d8;--paper:#fffdf8;--cream:#f7f3ea;--gold:#b08d4f;--gold-soft:#e9dcc2;
--teal:#0f6e63;--teal-deep:#0a3f3a;--amber:#c98a2b;--burgundy:#8a3b52;--blue:#2f5d83;--sky:#dff0ee;
--serif:"Cormorant Garamond",Garamond,serif;--sans:"Inter",-apple-system,Helvetica,Arial,sans-serif;}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:var(--sans);color:var(--ink);font-size:14px}
.doc{width:100%;background:var(--paper);border-top:5px solid var(--teal)}
.cover{padding:60px;text-align:center;background:linear-gradient(165deg,#fbfbf6,var(--sky) 55%,#eef6f2);display:flex;flex-direction:column;justify-content:center;min-height:252mm;page-break-after:always}
.kicker{font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:var(--teal);font-weight:600;margin-bottom:14px}
.cover h1{font-family:var(--serif);font-weight:500;font-size:46px;line-height:1.05;margin:0 0 10px;color:var(--teal-deep)}
.client{font-family:var(--serif);font-style:italic;font-size:22px;color:var(--gold);margin-bottom:18px}
.meta{display:inline-flex;gap:26px;flex-wrap:wrap;justify-content:center;font-size:12.5px;color:var(--ink-soft);border-top:2px solid var(--teal);border-bottom:2px solid var(--teal);padding:12px 0}
.meta b{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--teal);font-weight:700;margin-bottom:3px}
.hero{height:230px;background-size:cover;background-position:center;background:linear-gradient(135deg,#e3f0ec,#f3e7cf);margin-top:30px;border-radius:6px}
.intro{padding:26px 60px 6px;font-family:var(--serif);font-size:18px;line-height:1.6;color:var(--teal-deep);text-align:center;font-style:italic}
.leg{padding:30px 60px 4px;text-align:center;page-break-after:avoid}
.leg .dest{display:inline-block;font-family:var(--serif);font-size:23px;letter-spacing:.2em;text-transform:uppercase;color:var(--teal-deep);padding-bottom:7px;border-bottom:2px solid var(--gold-soft)}
.stay{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin-top:9px}
.stay.stay-line{padding:12px 60px 0;text-align:center}
.stay-lbl{font-weight:700;color:var(--teal);border:1px solid var(--gold-soft);border-radius:20px;padding:1px 8px;margin-right:7px;letter-spacing:.08em}
.day{padding:26px 60px;border-top:1px solid var(--line);page-break-inside:auto}
.day-head{display:flex;align-items:baseline;gap:14px;margin-bottom:16px;padding-bottom:9px;border-bottom:2px solid var(--sky);page-break-after:avoid}
.day-num{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#fff;background:var(--teal);padding:4px 10px;border-radius:20px;align-self:center}
.day-title{font-family:var(--serif);font-size:23px;font-weight:500;margin:0;flex:1;color:var(--teal-deep)}
.day-date{font-size:12px;color:var(--gold);font-weight:600}
.item{display:flex;gap:18px;padding:14px 0;border-bottom:1px dashed var(--line);page-break-inside:avoid}
.item:last-child{border-bottom:none}
.time{width:84px;min-width:84px;font-size:12px;color:var(--teal);font-weight:700;padding-top:3px}
.body{flex:1}
.it-title{font-family:var(--serif);font-size:20px;font-weight:500;margin:0 0 3px;display:flex;align-items:center;gap:8px}
.it-desc{font-size:13px;color:var(--ink-soft);line-height:1.55}
.it-addr{font-size:11.5px;color:var(--gold);margin-top:5px;font-style:italic;padding-left:11px;border-left:2px solid var(--gold-soft)}
.it-img{width:150px;height:104px;object-fit:cover;border-radius:6px;float:right;margin-left:14px}
.note{margin:8px 0;padding:14px 18px;font-family:var(--serif);font-style:italic;font-size:16px;line-height:1.5;color:var(--teal-deep);background:var(--sky);border-left:3px solid var(--teal);border-radius:0 8px 8px 0;page-break-inside:avoid}
.note.f-sans{font-family:var(--sans);font-style:normal}
.note.s-s{font-size:13px}.note.s-m{font-size:16px}.note.s-l{font-size:21px}
.free-img{margin:12px 0;text-align:center;page-break-inside:avoid}
.free-img img{max-width:100%;border-radius:8px;display:inline-block}
.transport{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px dashed var(--line);page-break-inside:avoid}
.tp-tag{font-size:9px;text-transform:uppercase;letter-spacing:.07em;font-weight:700;color:#fff;background:var(--blue);border-radius:20px;padding:3px 10px;white-space:nowrap}
.tp-text{font-size:13.5px;color:var(--blue);font-weight:500}
.badge-meal{font-size:9px;letter-spacing:.06em;text-transform:uppercase;color:#fff;background:var(--gold);border-radius:20px;padding:2px 9px;font-weight:600}
.badge-meal.m-Breakfast{background:var(--amber)}.badge-meal.m-Lunch{background:var(--teal)}
.badge-meal.m-Dinner{background:var(--burgundy)}.badge-meal.m-Shabbat{background:var(--blue)}
.footer-doc{padding:26px 60px 34px;text-align:center;color:#cfe3df;font-size:11.5px;background:var(--teal-deep)}
.footer-doc .fl{font-family:var(--serif);font-size:16px;letter-spacing:.18em;color:#fff;margin-bottom:5px}
`;

function renderItem(it, imgMap) {
  const img = (u) => imgMap[u] || u; // data URI si dispo, URL originale sinon
  if (it.type === 'note') {
    if (!it.description) return '';
    return `<div class="note f-${it.font || 'serif'} s-${it.size || 'm'}">${mdToHtml(it.description)}</div>`;
  }
  if (it.type === 'image') {
    if (!it.image) return '';
    const src = img(it.image);
    if (!src) return '';
    return `<div class="free-img"><img src="${src}" style="width:${Number(it.width) || 100}%"></div>`;
  }
  if (it.type === 'transport') {
    return `<div class="transport"><span class="tp-tag">Transport</span><span class="tp-text">${esc(it.title || 'Private driver')}${it.description ? ' — ' + esc(it.description) : ''}</span></div>`;
  }
  const ml = it.meal || '';
  const badge = (ml && (it.title || '').toLowerCase() !== ml.toLowerCase()) ? `<span class="badge-meal ${mealCls(ml)}">${esc(ml)}</span>` : '';
  const title = isPH(it.title) ? '' : `<span>${esc(it.title)}</span>`;
  const itImg = it.image ? img(it.image) : null;
  return `<div class="item"><div class="time">${esc(it.time) || ''}</div><div class="body">` +
    `<h3 class="it-title">${title}${badge}</h3>` +
    `${it.description ? `<div class="it-desc">${mdToHtml(it.description)}</div>` : ''}` +
    `${itImg ? `<img class="it-img" src="${itImg}">` : ''}` +
    `${it.address ? `<div class="it-addr">${esc(it.address)}</div>` : ''}` +
    `</div></div>`;
}

function itemEmpty(it) {
  if (it.type === 'note') return !it.description;
  if (it.type === 'image') return !it.image;
  if (it.type === 'transport') return false;
  return isPH(it.title) && !it.time && !it.description && !it.address && !it.image;
}

export async function buildItineraryHtml(itin) {
  const days = Array.isArray(itin.days) ? itin.days : [];
  const [imgMap] = await Promise.all([resolveImages(itin)]);
  const fontFaces = loadFontFaces();

  const heroSrc = itin.hero_image ? (imgMap[itin.hero_image] || itin.hero_image) : null;

  let body = '';
  body += `<div class="cover">
    <div class="kicker">Tailor-made itinerary</div>
    <h1>${esc(itin.title) || 'An Exceptional Journey'}</h1>
    <div class="client">${esc(itin.client_name || '') || 'Client'}</div>
    <div class="meta">
      <div><b>Destination</b><span>${esc(itin.city) || esc(tripDest(days)) || 'Paris'}</span></div>
      <div><b>Dates</b><span>${esc(itin.date_range) || '—'}</span></div>
      <div><b>Guests</b><span>${esc(itin.guests) || '—'}</span></div>
    </div>
    ${heroSrc ? `<div class="hero" style="background-image:url('${heroSrc}')"></div>` : ''}
  </div>`;

  if (itin.intro) body += `<div class="intro">${mdToHtml(itin.intro)}</div>`;

  let prevDest = null, prevHotel = null, dayNum = 0;
  days.forEach((day) => {
    const items = (day.items || []).filter((it) => !itemEmpty(it));
    const titlePH = isPH(day.title);
    if (items.length === 0 && titlePH) return;
    dayNum++;

    const legChange = day.dest && day.dest !== prevDest;
    if (legChange) {
      body += `<div class="leg"><div class="dest">${esc(day.dest)}</div>${day.hotel ? `<div class="stay"><span class="stay-lbl">Stay</span> ${esc(day.hotel)}</div>` : ''}</div>`;
    } else if (day.hotel && day.hotel !== prevHotel) {
      body += `<div class="stay stay-line"><span class="stay-lbl">Stay</span> ${esc(day.hotel)}</div>`;
    }
    prevDest = day.dest || prevDest; prevHotel = day.hotel || prevHotel;

    body += `<div class="day"><div class="day-head"><span class="day-num">Day ${dayNum}</span>` +
      `${titlePH ? '' : `<h2 class="day-title">${esc(day.title)}</h2>`}` +
      `<span class="day-date">${esc(day.date) || ''}</span></div>`;
    items.forEach((it) => { body += renderItem(it, imgMap); });
    body += `</div>`;
  });

  body += `<div class="footer-doc"><div class="fl">JEWISH CONCIERGE — PARIS &amp; KO</div>` +
    `Concierge &amp; exceptional kosher travel · contact@parisandko.com · +33 6 51 23 15 99</div>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${fontFaces}\n${CSS}</style></head><body><div class="doc">${body}</div></body></html>`;
}
