'use client';
import { useEffect, useRef, useState, useCallback, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { saveAsTemplate } from '@/app/actions';
import { regionOf } from '@/components/LibraryClient';
import ImageInput from '@/components/ImageInput';
import RichInput from '@/components/RichInput';
import { mdToHtml } from '@/lib/richtext';

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : 'i' + Math.random().toString(36).slice(2));
const REGIONS = ['Paris', 'French Riviera', 'Provence', 'Normandy', 'Europe', 'Autre'];
const KIND_LABEL = { hotel: 'Hôtels', activity: 'Activités & visites', restaurant: 'Restaurants' };
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const fmtEN = (iso) => { const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' }); };
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
function rangeText(a, b) {
  const da = new Date(a+'T00:00:00'), db = new Date(b+'T00:00:00');
  const mA = MONTHS[da.getMonth()], mB = MONTHS[db.getMonth()];
  if (da.getMonth()===db.getMonth() && da.getFullYear()===db.getFullYear()) return `${mA} ${da.getDate()} – ${db.getDate()}, ${db.getFullYear()}`;
  return `${mA} ${da.getDate()} – ${mB} ${db.getDate()}, ${db.getFullYear()}`;
}
export const fmtAddr = (s) => (s || '').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').replace(/^[\s,]+|[\s,]+$/g, '').trim();
const isPH = (t) => /^(new day|new item|activity|)$/i.test((t || '').trim());

export default function Editor({ initial, library, clients }) {
  const supabase = createClient();
  const [doc, setDoc] = useState({
    title: initial.title || '', city: initial.city || '', guests: initial.guests || '',
    dateRange: initial.date_range || '', startDate: initial.start_date || '', endDate: initial.end_date || '',
    heroImage: initial.hero_image || '', intro: initial.intro || '', clientId: initial.client_id || '',
    status: initial.status || 'draft', days: Array.isArray(initial.days) ? initial.days : [],
  });
  const [picker, setPicker] = useState(null);
  const [itemEdit, setItemEdit] = useState(null);
  const [saved, setSaved] = useState('saved');
  const timer = useRef(null);
  // clients — démarre en mode "nouveau client" si aucun client n'est lié à cet itinéraire
  const [clientList, setClientList] = useState(clients);
  const [clientMode, setClientMode] = useState(initial.client_id ? 'select' : 'new');
  const [newClientName, setNewClientName] = useState('');
  // génération de journées : nombre de jours calendaires (arrivée → départ inclus), éditable
  const calDays = (initial.start_date && initial.end_date) ? Math.round((new Date(initial.end_date) - new Date(initial.start_date)) / 864e5) + 1 : 1;
  const [genCount, setGenCount] = useState(calDays);
  const [tplPending, startTpl] = useTransition();

  const save = useCallback(async (d) => {
    setSaved('saving');
    const payload = {
      title: d.title, city: d.city, guests: d.guests, date_range: d.dateRange,
      start_date: d.startDate || null, end_date: d.endDate || null, hero_image: d.heroImage,
      intro: d.intro, client_id: d.clientId || null, status: d.status, days: d.days,
    };
    const { error } = await supabase.from('itineraries').update(payload).eq('id', initial.id);
    setSaved(error ? 'error' : 'saved');
  }, [supabase, initial.id]);

  useEffect(() => {
    setSaved('dirty');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save(doc), 900);
    return () => clearTimeout(timer.current);
  }, [doc, save]);

  // quand les dates changent, propose par défaut le nombre de jours réels (arrivée → départ inclus)
  useEffect(() => {
    if (doc.startDate && doc.endDate) {
      const n = Math.round((new Date(doc.endDate) - new Date(doc.startDate)) / 864e5) + 1;
      if (n > 0) setGenCount(n);
    }
  }, [doc.startDate, doc.endDate]);

  // Garde-fou : bloque la fermeture d'onglet si une sauvegarde est en attente
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (saved === 'dirty' || saved === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saved]);

  async function createNewClient() {
    const name = newClientName.trim();
    if (!name) return;
    const { data, error } = await supabase.from('clients').insert({ name }).select('id,name').single();
    if (error) { alert('Erreur création client : ' + error.message); return; }
    setClientList((l) => [...l, data].sort((a, b) => a.name.localeCompare(b.name)));
    set({ clientId: data.id });
    setClientMode('select'); setNewClientName('');
  }

  const set = (patch) => setDoc((d) => ({ ...d, ...patch }));
  const setDays = (fn) => setDoc((d) => ({ ...d, days: fn(d.days) })); // sans impact dates
  // ops structurelles : recalcule dates + plage de couverture si une date d'arrivée existe
  const structuralDays = (fn) => setDoc((d) => {
    let days = fn(d.days);
    if (d.startDate) {
      days = days.map((x, i) => ({ ...x, date: fmtEN(addDays(d.startDate, i)) }));
      const end = days.length ? addDays(d.startDate, days.length - 1) : d.startDate;
      return { ...d, days, endDate: end, dateRange: rangeText(d.startDate, end) };
    }
    return { ...d, days };
  });

  // ---- days ----
  function addDay(newDest) {
    structuralDays((days) => {
      const last = days[days.length - 1];
      const dest = newDest ? (prompt('Destination / étape (ex: Paris, French Riviera, Rome) :', '') || '').trim() : (last?.dest || '');
      return [...days, { id: uid(), title: 'New day', date: '', dest, hotel: last?.hotel || '', items: [] }];
    });
  }
  const removeDay = (id) => structuralDays((days) => days.filter((d) => d.id !== id));
  const moveDay = (i, dir) => structuralDays((days) => { const j = i + dir; if (j < 0 || j >= days.length) return days; const a = [...days]; [a[i], a[j]] = [a[j], a[i]]; return a; });
  const setDest = (id) => { const v = prompt('Destination / étape :', ''); if (v !== null) setDays((days) => days.map((d) => d.id === id ? { ...d, dest: v.trim() } : d)); };
  const setHotel = (id) => { const cur = doc.days.find((d) => d.id === id)?.hotel || ''; const v = prompt('Hôtel (nom + adresse). Il s\'applique à partir de ce jour jusqu\'au prochain changement :', cur); if (v !== null) setDays((days) => fillHotelFrom(days, id, v.trim())); };
  function generateDays() {
    const n = Math.max(1, parseInt(genCount, 10) || 0);
    structuralDays((days) => { const a = [...days]; while (a.length < n) { const p = a[a.length - 1]; a.push({ id: uid(), title: 'New day', date: '', dest: p?.dest || '', hotel: p?.hotel || '', items: [] }); } return a; });
  }

  // ---- items ----
  const addItem = (dayId, preset) => setDays((days) => days.map((d) => d.id === dayId ? { ...d, items: [...d.items, { id: uid(), type: 'activity', time: '', title: '', description: '', address: '', image: '', meal: '', width: 100, ...preset, title: preset?.title ?? 'New item' }] } : d));
  const updateItem = (di, ii, patch) => setDays((days) => days.map((d, i) => i === di ? { ...d, items: d.items.map((it, j) => j === ii ? { ...it, ...patch } : it) } : d));
  const removeItem = (di, ii) => setDays((days) => days.map((d, i) => i === di ? { ...d, items: d.items.filter((_, j) => j !== ii) } : d));
  const moveItem = (di, ii, dir) => setDays((days) => days.map((d, i) => { if (i !== di) return d; const j = ii + dir; if (j < 0 || j >= d.items.length) return d; const a = [...d.items]; [a[ii], a[j]] = [a[j], a[ii]]; return { ...d, items: a }; }));

  function insertFromLib(dayId, e) {
    if (e.kind === 'hotel') {
      const v = e.title + (e.address ? ' — ' + fmtAddr(e.address) : '');
      setDays((days) => fillHotelFrom(days, dayId, v));
    } else {
      const t = { Breakfast: '9:00 AM', Lunch: '1:00 PM', Dinner: '7:30 PM' }[e.meal] || '';
      addItem(dayId, { type: 'activity', title: e.title, description: e.description || '', address: fmtAddr(e.address || ''), meal: e.meal || '', time: t });
    }
    setPicker(null);
  }

  const handlers = { moveDay, removeDay, setDest, setHotel, openPicker: (kind, dayId) => setPicker({ kind, dayId }), addItem, openItem: (di, ii) => setItemEdit({ di, ii }), moveItem, removeItem };

  return (
    <div className="itin-layout">
      <div className="editor-side no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Détails</strong>
          <span className="muted" style={{ fontSize: 11 }}>{saved === 'saving' ? 'Enregistrement…' : saved === 'error' ? 'Erreur' : saved === 'dirty' ? '…' : 'Enregistré ✓'}</span>
        </div>
        <div className="field"><label>Client</label>
          {clientMode === 'new' ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={newClientName} autoFocus placeholder="Nom du nouveau client" onChange={(e) => setNewClientName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createNewClient()} />
              <button className="btn ghost" onClick={createNewClient}>Créer</button>
              <button className="btn ghost" title="Annuler" onClick={() => { setClientMode('select'); setNewClientName(''); }}>↩</button>
            </div>
          ) : (
            <select value={doc.clientId} onChange={(e) => { if (e.target.value === '__new') setClientMode('new'); else set({ clientId: e.target.value }); }}>
              <option value="">—</option>
              {clientList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="__new">➕ Nouveau client…</option>
            </select>
          )}
        </div>
        <div className="field"><label>Titre</label><input value={doc.title} onChange={(e) => set({ title: e.target.value })} /></div>
        <div className="row2">
          <div className="field"><label>Destination (couverture)</label><input value={doc.city} onChange={(e) => set({ city: e.target.value })} placeholder="auto si vide" /></div>
          <div className="field"><label>Voyageurs</label><input value={doc.guests} onChange={(e) => set({ guests: e.target.value })} /></div>
        </div>
        <div className="field"><label>Dates (couverture)</label><input value={doc.dateRange} onChange={(e) => set({ dateRange: e.target.value })} placeholder="June 15 – 20, 2026" /></div>
        <div className="row2">
          <div className="field"><label>Arrivée</label><input type="date" value={doc.startDate || ''} onChange={(e) => set({ startDate: e.target.value })} /></div>
          <div className="field"><label>Départ</label><input type="date" value={doc.endDate || ''} onChange={(e) => set({ endDate: e.target.value })} /></div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="number" min="1" value={genCount} onChange={(e) => setGenCount(e.target.value)} style={{ width: 64, textAlign: 'center' }} />
          <button className="btn ghost" style={{ flex: 1 }} onClick={generateDays}>journées — Générer</button>
        </div>
        <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>Pré-rempli au nombre de jours réels (arrivée → départ inclus). Modifiable à la main.</p>
        <div style={{ marginTop: 12 }}><ImageInput label="Image de couverture" value={doc.heroImage} onChange={(url) => set({ heroImage: url })} /></div>
        <div className="field"><label>Introduction</label><RichInput value={doc.intro} onChange={(v) => set({ intro: v })} placeholder="A tailor-made journey…" /></div>
        <div className="daybar"><button onClick={() => addDay(false)}>＋ Journée</button><button onClick={() => addDay(true)}>＋ Destination / étape</button></div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => save(doc)}>Enregistrer</button>
          <a className="btn primary" style={{ flex: 2, textAlign: 'center' }} href={`/api/pdf/${initial.id}`} target="_blank" rel="noreferrer">⬇ Télécharger le PDF</a>
        </div>
        <button className="btn ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => window.print()}>Imprimer (aperçu)</button>
        <button className="btn ghost" style={{ width: '100%', marginTop: 8 }} disabled={tplPending} onClick={() => startTpl(() => saveAsTemplate(initial.id))}>
          {tplPending ? '…' : '★ Enregistrer comme modèle'}
        </button>
        <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>Sauvegarde automatique. « Modèle » crée un itinéraire type réutilisable (sans client ni dates).</p>
      </div>

      <div className="editor-main">
        <div className="doc">
          <div className="cover">
            <div className="kicker">Tailor-made itinerary</div>
            <h1>{doc.title || 'An Exceptional Journey'}</h1>
            <div className="client">{clientName(clients, doc.clientId) || 'Client name'}</div>
            <div className="meta">
              <div><b>Destination</b><span>{doc.city || tripDest(doc.days) || 'Paris'}</span></div>
              <div><b>Dates</b><span>{doc.dateRange || '—'}</span></div>
              <div><b>Guests</b><span>{doc.guests || '—'}</span></div>
            </div>
            <div className="hero" style={doc.heroImage ? { backgroundImage: `url('${doc.heroImage}')` } : undefined}>{doc.heroImage ? '' : 'Cover image'}</div>
          </div>
          <div className="intro" dangerouslySetInnerHTML={{ __html: doc.intro ? mdToHtml(doc.intro) : '<span style="opacity:.45">Introduction — écris-la dans « Détails » à gauche (optionnelle)</span>' }} />
          {renderDays(doc.days, handlers)}
          <div className="footer-doc">
            <div className="fl">JEWISH CONCIERGE — PARIS &amp; KO</div>
            Concierge &amp; exceptional kosher travel · contact@parisandko.com · +33 6 51 23 15 99
          </div>
        </div>
      </div>

      {picker && <Picker library={library} kind={picker.kind} dayId={picker.dayId}
        regionGuess={regionOf((doc.days.find((d) => d.id === picker.dayId) || {}).dest || '')}
        onPick={(e) => insertFromLib(picker.dayId, e)} onClose={() => setPicker(null)} />}
      {itemEdit && <ItemModal it={doc.days[itemEdit.di].items[itemEdit.ii]}
        onSave={(patch) => { updateItem(itemEdit.di, itemEdit.ii, patch); setItemEdit(null); }}
        onRemove={() => { removeItem(itemEdit.di, itemEdit.ii); setItemEdit(null); }}
        onClose={() => setItemEdit(null)} />}
    </div>
  );
}

// hôtel : applique à partir de ce jour, en avant, tant que même destination
// et tant que les jours partageaient l'ancien hôtel (permet de changer en cours de ville)
function fillHotelFrom(days, dayId, value) {
  const idx = days.findIndex((d) => d.id === dayId); if (idx < 0) return days;
  const dest = days[idx].dest || ''; const old = days[idx].hotel || '';
  const out = [...days];
  for (let i = idx; i < out.length; i++) {
    if ((out[i].dest || '') !== dest) break;
    if (i > idx && (out[i].hotel || '') !== old) break;
    out[i] = { ...out[i], hotel: value };
  }
  return out;
}
function clientName(clients, id) { return clients.find((c) => c.id === id)?.name; }
function tripDest(days) { const s = []; (days || []).forEach((d) => { if (d.dest && !s.includes(d.dest)) s.push(d.dest); }); return s.join(' · '); }

function renderDays(days, h) {
  let prevDest = null, prevHotel = null, dayNum = 0;
  const out = [];
  days.forEach((day, di) => {
    const legChange = day.dest && day.dest !== prevDest;
    if (legChange) out.push(
      <div className="leg" key={'leg' + day.id}>
        <div className="dest">{day.dest}</div>
        {day.hotel && <div className="stay"><span className="stay-lbl">Stay</span> {day.hotel}</div>}
      </div>
    );
    else if (day.hotel && day.hotel !== prevHotel) out.push(
      <div className="stay stay-line" key={'hl' + day.id}><span className="stay-lbl">Stay</span> {day.hotel}</div>
    );
    prevDest = day.dest || prevDest; prevHotel = day.hotel || prevHotel;
    dayNum++;
    out.push(
      <div className={'day' + (day.items.length === 0 && isPH(day.title) ? ' is-empty' : '')} key={day.id}>
        <div className="day-head">
          <span className="day-num">Day {dayNum}</span>
          <h2 className={'day-title' + (isPH(day.title) ? ' ph' : '')}>{day.title || 'New day'}</h2>
          <span className="day-date">{day.date || ''}</span>
          <span className="no-print" style={{ display: 'flex', gap: 4 }}>
            <button className="btn ghost" title="Destination" onClick={() => h.setDest(day.id)}>⚑</button>
            <button className="btn ghost" title="Hôtel" onClick={() => h.setHotel(day.id)}>Hôtel</button>
            <button className="btn ghost" onClick={() => h.moveDay(di, -1)}>↑</button>
            <button className="btn ghost" onClick={() => h.moveDay(di, 1)}>↓</button>
            <button className="btn ghost" style={{ color: '#a33' }} onClick={() => h.removeDay(day.id)}>✕</button>
          </span>
        </div>
        {day.items.map((it, ii) => <ItemRow key={it.id} it={it} di={di} ii={ii} h={h} />)}
        <div className="daybar no-print">
          <button onClick={() => h.openPicker('activity', day.id)}>＋ Activité</button>
          <button onClick={() => h.openPicker('restaurant', day.id)}>＋ Restaurant</button>
          <button onClick={() => h.openPicker('hotel', day.id)}>＋ Hôtel</button>
          <button onClick={() => h.addItem(day.id, { type: 'activity', title: 'New item', time: '' })}>＋ Activité libre</button>
          <button onClick={() => h.addItem(day.id, { type: 'transport', title: 'Private driver — full day' })}>＋ Driver</button>
          <button onClick={() => h.addItem(day.id, { type: 'note', title: '', description: '' })}>＋ Texte</button>
          <button onClick={() => h.addItem(day.id, { type: 'image', title: '', image: '', width: 100 })}>＋ Image</button>
        </div>
      </div>
    );
  });
  return out;
}

function ItemRow({ it, di, ii, h }) {
  const ctrls = (
    <div className="ctrls no-print" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => h.moveItem(di, ii, -1)}>↑</button>
      <button onClick={() => h.moveItem(di, ii, 1)}>↓</button>
      <button onClick={() => h.removeItem(di, ii)}>✕</button>
    </div>
  );
  if (it.type === 'note') return (
    <div className={'note f-' + (it.font || 'serif') + ' s-' + (it.size || 'm')} onClick={() => h.openItem(di, ii)}>
      <span dangerouslySetInnerHTML={{ __html: it.description ? mdToHtml(it.description) : 'Texte libre…' }} />{ctrls}
    </div>
  );
  if (it.type === 'image') return (
    <div className="free-img" onClick={() => h.openItem(di, ii)} style={{ position: 'relative' }}>
      {it.image ? <img src={it.image} alt="" style={{ width: (it.width || 100) + '%' }} /> : <div className="img-ph">Image (clique pour ajouter une URL)</div>}{ctrls}
    </div>
  );
  if (it.type === 'transport') return (
    <div className="transport" onClick={() => h.openItem(di, ii)}>
      <span className="tp-tag">Transport</span>
      <span className="tp-text">{it.title || 'Private driver'}{it.description ? ' — ' + it.description : ''}</span>{ctrls}
    </div>
  );
  const ml = it.meal || '';
  return (
    <div className="item" onClick={() => h.openItem(di, ii)}>
      <div className="time">{it.time || ''}</div>
      <div className="body">
        <h3 className={'it-title' + (isPH(it.title) ? ' ph' : '')}><span>{it.title}</span>{ml && (it.title || '').toLowerCase() !== ml.toLowerCase() && <span className={'badge-meal m-' + ml.replace(/\s/g, '')}>{ml}</span>}</h3>
        {it.description && <div className="it-desc" dangerouslySetInnerHTML={{ __html: mdToHtml(it.description) }} />}
        {it.image && <img className="it-img" src={it.image} alt="" />}
        {it.address && <div className="it-addr"><a href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(it.address)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{it.address}</a></div>}
      </div>
      {ctrls}
    </div>
  );
}

function Picker({ library, kind, regionGuess, onPick, onClose }) {
  const [region, setRegion] = useState(REGIONS.includes(regionGuess) ? regionGuess : 'all');
  const [q, setQ] = useState('');
  const list = library.filter((e) => e.kind === kind
    && (region === 'all' || (e.region || regionOf(e.city)) === region)
    && (!q || (e.title + ' ' + (e.description || '') + ' ' + (e.city || '')).toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="modal-bg" onClick={(e) => e.target.classList.contains('modal-bg') && onClose()}>
      <div className="modal">
        <h3>Ajouter — {KIND_LABEL[kind]}</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <select className="field" style={{ margin: 0, width: 150 }} value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="all">Toutes régions</option>{REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <input className="field" style={{ margin: 0, flex: 1 }} placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        </div>
        <div style={{ maxHeight: '52vh', overflow: 'auto' }}>
          {list.map((e) => (
            <div className="lib-item" key={e.id} onClick={() => onPick(e)}>
              <div className="t"><span>{e.title}</span><span style={{ color: '#9b8a63', fontSize: 10 }}>{e.city}</span></div>
              <div className="d">{e.description}</div>
              {e.address && <div className="d" style={{ color: 'var(--gold)' }}>{e.address}</div>}
            </div>
          ))}
          {list.length === 0 && <div className="muted">Aucun résultat.</div>}
        </div>
      </div>
    </div>
  );
}

function ItemModal({ it, onSave, onRemove, onClose }) {
  const [v, setV] = useState({ ...it });
  const up = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const type = v.type || 'activity';
  return (
    <div className="modal-bg" onClick={(e) => e.target.classList.contains('modal-bg') && onClose()}>
      <div className="modal">
        <h3>{type === 'note' ? 'Texte libre' : type === 'image' ? 'Image' : type === 'transport' ? 'Transport / chauffeur' : 'Modifier l\'élément'}</h3>

        {type === 'note' && (<>
          <div className="field"><label>Message</label><RichInput value={v.description || ''} onChange={(t) => setV({ ...v, description: t })} minHeight={100} /></div>
          <div className="row2">
            <div className="field"><label>Police</label>
              <select value={v.font || 'serif'} onChange={up('font')}><option value="serif">Élégante (serif)</option><option value="sans">Moderne (sans)</option></select>
            </div>
            <div className="field"><label>Taille</label>
              <select value={v.size || 'm'} onChange={up('size')}><option value="s">Petite</option><option value="m">Normale</option><option value="l">Grande</option></select>
            </div>
          </div>
        </>)}

        {type === 'image' && (<>
          <ImageInput label="Image" value={v.image || ''} onChange={(url) => setV({ ...v, image: url })} />
          <div className="field"><label>Largeur : {v.width || 100}%</label>
            <input type="range" min="25" max="100" step="5" value={v.width || 100} onChange={(e) => setV({ ...v, width: Number(e.target.value) })} style={{ width: '100%' }} />
          </div>
        </>)}

        {type === 'transport' && (<>
          <div className="field"><label>Service</label><input value={v.title || ''} onChange={up('title')} placeholder="Private driver — full day" autoFocus /></div>
          <div className="field"><label>Détail (optionnel)</label><input value={v.description || ''} onChange={up('description')} placeholder="Mercedes Classe V, chauffeur francophone…" /></div>
        </>)}

        {type === 'activity' && (<>
          <div className="row2">
            <div className="field"><label>Horaire</label><input value={v.time || ''} onChange={up('time')} placeholder="9:00 AM / 14h30" autoFocus /></div>
            <div className="field"><label>Type / repas</label>
              <select value={v.meal || ''} onChange={up('meal')}>
                <option value="">—</option><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Catering</option><option>Shabbat</option>
              </select>
            </div>
          </div>
          <div className="field"><label>Titre</label><input value={v.title || ''} onChange={up('title')} /></div>
          <div className="field"><label>Description</label><RichInput value={v.description || ''} onChange={(t) => setV({ ...v, description: t })} /></div>
          <div className="field"><label>Adresse</label><input value={v.address || ''} onChange={up('address')} onBlur={(e) => setV({ ...v, address: fmtAddr(e.target.value) })} /></div>
          <ImageInput label="Image (optionnel)" value={v.image || ''} onChange={(url) => setV({ ...v, image: url })} />
        </>)}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
          <button className="btn ghost" style={{ color: '#a33' }} onClick={onRemove}>Supprimer</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost" onClick={onClose}>Annuler</button>
            <button className="btn primary" onClick={() => onSave({ ...v, address: fmtAddr(v.address || '') })}>Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
