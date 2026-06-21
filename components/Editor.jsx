'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { regionOf } from '@/components/LibraryClient';

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : 'i' + Math.random().toString(36).slice(2));
const REGIONS = ['Paris', 'French Riviera', 'Provence', 'Normandy', 'Europe', 'Autre'];
const KIND_LABEL = { hotel: '🏨 Hôtels', activity: 'Activités & visites', restaurant: 'Restaurants' };
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const fmtEN = (iso) => { const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' }); };
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };

export default function Editor({ initial, library, clients }) {
  const supabase = createClient();
  const [doc, setDoc] = useState({
    title: initial.title || '', city: initial.city || '', guests: initial.guests || '',
    dateRange: initial.date_range || '', startDate: initial.start_date || '', endDate: initial.end_date || '',
    heroImage: initial.hero_image || '', intro: initial.intro || '', clientId: initial.client_id || '',
    status: initial.status || 'draft', days: Array.isArray(initial.days) ? initial.days : [],
  });
  const [picker, setPicker] = useState(null); // {kind, dayId}
  const [itemEdit, setItemEdit] = useState(null); // {di, ii}
  const [saved, setSaved] = useState('saved');
  const timer = useRef(null);

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

  // autosave debounced
  useEffect(() => {
    setSaved('dirty');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save(doc), 900);
    return () => clearTimeout(timer.current);
  }, [doc, save]);

  const set = (patch) => setDoc((d) => ({ ...d, ...patch }));
  const setDays = (fn) => setDoc((d) => ({ ...d, days: fn(d.days) }));

  // ---- days ----
  function addDay(newDest) {
    setDays((days) => {
      const last = days[days.length - 1];
      const dest = newDest ? (prompt('Destination / étape (ex: French Riviera, Rome) :', '') || '').trim() : (last?.dest || '');
      const date = doc.startDate ? fmtEN(addDays(doc.startDate, days.length)) : '';
      return [...days, { id: uid(), title: 'New day', date, dest, hotel: last?.hotel || '', items: [] }];
    });
  }
  const removeDay = (id) => setDays((days) => days.filter((d) => d.id !== id));
  const moveDay = (i, dir) => setDays((days) => { const j = i + dir; if (j < 0 || j >= days.length) return days; const a = [...days]; [a[i], a[j]] = [a[j], a[i]]; return a; });
  const setDest = (id) => { const v = prompt('Destination / étape :', ''); if (v !== null) setDays((days) => days.map((d) => d.id === id ? { ...d, dest: v.trim() } : d)); };
  const setHotel = (id) => { setDays((days) => { const idx = days.findIndex((d) => d.id === id); if (idx < 0) return days; const v = prompt('Hôtel (nom + adresse) :', days[idx].hotel || ''); if (v === null) return days; return fillHotel(days, id, v.trim()); }); };
  function generateDays() {
    if (!doc.startDate || !doc.endDate) { alert('Choisis d\'abord les dates'); return; }
    const n = Math.round((new Date(doc.endDate) - new Date(doc.startDate)) / 864e5) + 1;
    setDays((days) => { const a = [...days]; while (a.length < n) { const p = a[a.length - 1]; a.push({ id: uid(), title: 'New day', date: '', dest: p?.dest || '', hotel: p?.hotel || '', items: [] }); } return a.map((d, i) => i < n ? { ...d, date: fmtEN(addDays(doc.startDate, i)) } : d); });
  }

  // ---- items ----
  const addItem = (dayId, preset) => setDays((days) => days.map((d) => d.id === dayId ? { ...d, items: [...d.items, { id: uid(), time: '', title: 'New item', description: '', address: '', image: '', meal: '', ...preset }] } : d));
  const updateItem = (di, ii, patch) => setDays((days) => days.map((d, i) => i === di ? { ...d, items: d.items.map((it, j) => j === ii ? { ...it, ...patch } : it) } : d));
  const removeItem = (di, ii) => setDays((days) => days.map((d, i) => i === di ? { ...d, items: d.items.filter((_, j) => j !== ii) } : d));
  const moveItem = (di, ii, dir) => setDays((days) => days.map((d, i) => { if (i !== di) return d; const j = ii + dir; if (j < 0 || j >= d.items.length) return d; const a = [...d.items]; [a[ii], a[j]] = [a[j], a[ii]]; return { ...d, items: a }; }));

  function insertFromLib(dayId, e) {
    if (e.kind === 'hotel') {
      const v = e.title + (e.address ? ' — ' + e.address : '');
      setDays((days) => fillHotel(days, dayId, v));
    } else {
      const t = { Breakfast: '9:00 AM', Lunch: '1:00 PM', Dinner: '7:30 PM' }[e.meal] || '';
      addItem(dayId, { title: e.title, description: e.description || '', address: e.address || '', meal: e.meal || '', time: t });
    }
    setPicker(null);
  }

  return (
    <div className="itin-layout">
      {/* SIDE (screen only) */}
      <div className="editor-side no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Détails</strong>
          <span className="muted" style={{ fontSize: 11 }}>{saved === 'saving' ? 'Enregistrement…' : saved === 'error' ? 'Erreur' : saved === 'dirty' ? '…' : 'Enregistré ✓'}</span>
        </div>
        <div className="field"><label>Client</label>
          <select value={doc.clientId} onChange={(e) => set({ clientId: e.target.value })}>
            <option value="">—</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field"><label>Titre</label><input value={doc.title} onChange={(e) => set({ title: e.target.value })} /></div>
        <div className="row2">
          <div className="field"><label>Destination</label><input value={doc.city} onChange={(e) => set({ city: e.target.value })} /></div>
          <div className="field"><label>Voyageurs</label><input value={doc.guests} onChange={(e) => set({ guests: e.target.value })} /></div>
        </div>
        <div className="field"><label>Dates (couverture)</label><input value={doc.dateRange} onChange={(e) => set({ dateRange: e.target.value })} placeholder="June 15 – 20, 2026" /></div>
        <div className="row2">
          <div className="field"><label>Arrivée</label><input type="date" value={doc.startDate || ''} onChange={(e) => set({ startDate: e.target.value })} /></div>
          <div className="field"><label>Départ</label><input type="date" value={doc.endDate || ''} onChange={(e) => set({ endDate: e.target.value })} /></div>
        </div>
        <button className="btn ghost" style={{ width: '100%' }} onClick={generateDays}>＋ Générer une journée par nuit</button>
        <div className="field" style={{ marginTop: 12 }}><label>Image de couverture (URL)</label><input value={doc.heroImage} onChange={(e) => set({ heroImage: e.target.value })} /></div>
        <div className="field"><label>Introduction</label><textarea value={doc.intro} onChange={(e) => set({ intro: e.target.value })} /></div>
        <div className="daybar">
          <button onClick={() => addDay(false)}>＋ Journée</button>
          <button onClick={() => addDay(true)}>＋ Destination</button>
        </div>
        <a className="btn primary" style={{ width: '100%', marginTop: 14, textAlign: 'center' }} href={`/api/pdf/${initial.id}`} target="_blank" rel="noreferrer">⬇ Télécharger le PDF</a>
        <button className="btn ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => window.print()}>⎙ Imprimer (aperçu navigateur)</button>
        <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>« Télécharger le PDF » génère un fichier propre côté serveur (couleurs, sans en-tête). Pense à enregistrer (auto) avant.</p>
      </div>

      {/* PREVIEW (= print) */}
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
          <div className="intro">{doc.intro || 'A warm welcome to your bespoke journey…'}</div>

          {renderDays(doc.days, { moveDay, removeDay, setDest, setHotel, openPicker: (kind, dayId) => setPicker({ kind, dayId }), addItem, openItem: (di, ii) => setItemEdit({ di, ii }), moveItem, removeItem })}

          <div className="daybar no-print" style={{ padding: '18px 60px' }}>
            <button onClick={() => addDay(false)}>＋ Journée</button>
            <button onClick={() => addDay(true)}>＋ Destination / étape</button>
          </div>
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

// remplit l'hôtel sur toute l'étape contiguë (jours adjacents de même destination)
function fillHotel(days, dayId, value) {
  const idx = days.findIndex((d) => d.id === dayId);
  if (idx < 0) return days;
  const dest = days[idx].dest || '';
  let lo = idx, hi = idx;
  while (lo - 1 >= 0 && (days[lo - 1].dest || '') === dest) lo--;
  while (hi + 1 < days.length && (days[hi + 1].dest || '') === dest) hi++;
  return days.map((d, i) => (i >= lo && i <= hi ? { ...d, hotel: value } : d));
}
function clientName(clients, id) { return clients.find((c) => c.id === id)?.name; }
function tripDest(days) { const s = []; days.forEach((d) => { if (d.dest && !s.includes(d.dest)) s.push(d.dest); }); return s.join(' · '); }
const isPH = (t) => /^(new day|new item|activity|)$/i.test((t || '').trim());

function renderDays(days, h) {
  let prevDest = null, prevHotel = null;
  const out = [];
  days.forEach((day, di) => {
    const legChange = day.dest && day.dest !== prevDest;
    if (legChange) out.push(
      <div className="leg" key={'leg' + day.id}><span>{day.dest}</span>{day.hotel && <div className="leg-hotel">🏨 {day.hotel}</div>}</div>
    );
    else if (day.hotel && day.hotel !== prevHotel) out.push(<div className="hotel-line" key={'hl' + day.id}>🏨 Stay: {day.hotel}</div>);
    prevDest = day.dest || prevDest; prevHotel = day.hotel || prevHotel;
    const emptyDay = day.items.length === 0 && isPH(day.title);
    out.push(
      <div className={'day' + (emptyDay ? ' is-empty' : '')} key={day.id}>
        <div className="day-head">
          <span className="day-num">Day {di + 1}</span>
          <h2 className={'day-title' + (isPH(day.title) ? ' ph' : '')}>{day.title || 'New day'}</h2>
          <span className="day-date">{day.date || ''}</span>
          <span className="no-print" style={{ display: 'flex', gap: 4 }}>
            <button className="btn ghost" onClick={() => h.setDest(day.id)}>⚑</button>
            <button className="btn ghost" onClick={() => h.setHotel(day.id)}>🏨</button>
            <button className="btn ghost" onClick={() => h.moveDay(di, -1)}>↑</button>
            <button className="btn ghost" onClick={() => h.moveDay(di, 1)}>↓</button>
            <button className="btn ghost" style={{ color: '#a33' }} onClick={() => h.removeDay(day.id)}>✕</button>
          </span>
        </div>
        {day.items.map((it, ii) => {
          const ml = it.meal || '';
          const emptyItem = isPH(it.title) && !it.time && !it.description && !it.address && !it.image;
          return (
            <div className={'item' + (emptyItem ? ' is-empty' : '')} key={it.id} onClick={() => h.openItem(di, ii)}>
              <div className="time">{it.time || ''}</div>
              <div className="body">
                <h3 className={'it-title' + (isPH(it.title) ? ' ph' : '')}><span>{it.title}</span>{ml && it.title.toLowerCase() !== ml.toLowerCase() && <span className={'badge-meal m-' + ml.replace(/\s/g, '')}>{ml}</span>}</h3>
                {it.description && <div className="it-desc">{it.description}</div>}
                {it.image && <img className="it-img" src={it.image} alt="" style={{ float: 'right', marginLeft: 14 }} />}
                {it.address && <div className="it-addr">📍 <a href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(it.address)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{it.address}</a></div>}
              </div>
              <div className="ctrls no-print" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => h.moveItem(di, ii, -1)}>↑</button>
                <button onClick={() => h.moveItem(di, ii, 1)}>↓</button>
                <button onClick={() => h.removeItem(di, ii)}>✕</button>
              </div>
            </div>
          );
        })}
        <div className="daybar no-print">
          <button onClick={() => h.openPicker('activity', day.id)}>＋ Activité</button>
          <button onClick={() => h.openPicker('restaurant', day.id)}>＋ Restaurant</button>
          <button onClick={() => h.openPicker('hotel', day.id)}>🏨 Hôtel</button>
          <button onClick={() => h.addItem(day.id, {})}>＋ Libre</button>
        </div>
      </div>
    );
  });
  return out;
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
              {e.address && <div className="d" style={{ color: 'var(--gold)' }}>📍 {e.address}</div>}
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
  return (
    <div className="modal-bg" onClick={(e) => e.target.classList.contains('modal-bg') && onClose()}>
      <div className="modal">
        <h3>Modifier l'élément</h3>
        <div className="row2">
          <div className="field"><label>Horaire</label><input value={v.time || ''} onChange={up('time')} placeholder="9:00 AM / 14h30" autoFocus /></div>
          <div className="field"><label>Type / repas</label>
            <select value={v.meal || ''} onChange={up('meal')}>
              <option value="">—</option><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Catering</option><option>Shabbat</option>
            </select>
          </div>
        </div>
        <div className="field"><label>Titre</label><input value={v.title || ''} onChange={up('title')} /></div>
        <div className="field"><label>Description</label><textarea value={v.description || ''} onChange={up('description')} /></div>
        <div className="field"><label>Adresse</label><input value={v.address || ''} onChange={up('address')} /></div>
        <div className="field"><label>Image (URL)</label><input value={v.image || ''} onChange={up('image')} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
          <button className="btn ghost" style={{ color: '#a33' }} onClick={onRemove}>Supprimer</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost" onClick={onClose}>Annuler</button>
            <button className="btn primary" onClick={() => onSave(v)}>Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
