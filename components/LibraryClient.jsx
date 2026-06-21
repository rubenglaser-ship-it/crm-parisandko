'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const REGIONS = ['Paris', 'French Riviera', 'Provence', 'Normandy', 'Europe', 'Autre'];
const KIND_LABEL = { hotel: '🏨 Hôtels', activity: 'Activités & visites', restaurant: 'Restaurants' };

export function regionOf(city) {
  const c = (city || '').toLowerCase();
  if (/paris|levallois|boulogne|versailles/.test(c)) return 'Paris';
  if (/cannes|nice|antibes|juan|monaco|riviera|côte|cote|tropez|èze|eze/.test(c)) return 'French Riviera';
  if (/aix|marseille|provence|avignon|arles|cassis|luberon|gordes/.test(c)) return 'Provence';
  if (/deauville|normand|honfleur|étretat|etretat/.test(c)) return 'Normandy';
  if (/europe|rome|london|amsterdam|geneva|brussels|italy/.test(c)) return 'Europe';
  return 'Autre';
}

export default function LibraryClient({ initial }) {
  const supabase = createClient();
  const [items, setItems] = useState(initial);
  const [type, setType] = useState('all');
  const [region, setRegion] = useState('all');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null); // entry being edited or {} for new

  const blank = { kind: 'activity', title: '', description: '', city: '', address: '', meal: '' };

  async function save(e) {
    const payload = { ...e, region: regionOf(e.city) };
    if (e.id) {
      await supabase.from('library_items').update(payload).eq('id', e.id);
      setItems((xs) => xs.map((x) => (x.id === e.id ? { ...x, ...payload } : x)));
    } else {
      const { data } = await supabase.from('library_items').insert(payload).select().single();
      if (data) setItems((xs) => [data, ...xs]);
    }
    setEdit(null);
  }
  async function remove(id) {
    if (!confirm('Supprimer cet élément ?')) return;
    await supabase.from('library_items').delete().eq('id', id);
    setItems((xs) => xs.filter((x) => x.id !== id));
  }

  const kinds = type === 'all' ? ['hotel', 'activity', 'restaurant'] : [type];
  const filtered = (kind) => items.filter((e) =>
    e.kind === kind &&
    (region === 'all' || (e.region || regionOf(e.city)) === region) &&
    (!q || (e.title + ' ' + (e.description || '') + ' ' + (e.city || '')).toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <>
      <div className="toolbar" style={{ marginTop: 16 }}>
        <select className="field" style={{ width: 160, margin: 0 }} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">Tous types</option><option value="hotel">Hôtels</option>
          <option value="activity">Activités</option><option value="restaurant">Restaurants</option>
        </select>
        <select className="field" style={{ width: 160, margin: 0 }} value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="all">Toutes régions</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <input className="field" style={{ flex: 1, margin: 0 }} placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn primary" onClick={() => setEdit({ ...blank })}>＋ Ajouter</button>
      </div>

      {kinds.map((kind) => {
        const list = filtered(kind);
        if (!list.length) return null;
        return (
          <div key={kind} style={{ marginTop: 18 }}>
            <h3 style={{ color: 'var(--gold)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '.06em' }}>{KIND_LABEL[kind]}</h3>
            <div className="grid-cards">
              {list.map((e) => (
                <div key={e.id} className="card" style={{ cursor: 'default' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong>{e.title}</strong>
                    <span className="tag-pill">{e.region || regionOf(e.city)}</span>
                  </div>
                  <div className="meta" style={{ margin: '4px 0' }}>{e.description}</div>
                  {e.address && <div style={{ fontSize: 11.5, color: 'var(--gold)' }}>📍 {e.address}</div>}
                  <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                    <button className="btn ghost" onClick={() => setEdit(e)}>Modifier</button>
                    <button className="btn ghost" style={{ color: '#a33' }} onClick={() => remove(e.id)}>Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {edit && <EditModal entry={edit} cities={[...new Set(items.map((i) => i.city).filter(Boolean))].sort((a, b) => a.localeCompare(b))} onClose={() => setEdit(null)} onSave={save} />}
    </>
  );
}

function EditModal({ entry, cities, onClose, onSave }) {
  const [e, setE] = useState(entry);
  // si la ville de l'élément n'est pas dans la liste connue, on démarre en mode "nouvelle ville"
  const [newCity, setNewCity] = useState(!!entry.city && !cities.includes(entry.city));
  const up = (k) => (ev) => setE({ ...e, [k]: ev.target.value });
  return (
    <div className="modal-bg" onClick={(ev) => ev.target.classList.contains('modal-bg') && onClose()}>
      <div className="modal">
        <h3>{e.id ? 'Modifier' : 'Nouvel élément'}</h3>
        <div className="field"><label>Type</label>
          <select value={e.kind} onChange={up('kind')}>
            <option value="hotel">Hôtel</option><option value="activity">Activité</option><option value="restaurant">Restaurant</option>
          </select>
        </div>
        <div className="field"><label>Nom</label><input value={e.title || ''} onChange={up('title')} /></div>
        <div className="field"><label>Description (s'affiche sous l'activité)</label><textarea value={e.description || ''} onChange={up('description')} /></div>
        <div className="row2">
          <div className="field"><label>Ville</label>
            {newCity ? (
              <input value={e.city || ''} autoFocus placeholder="Nouvelle ville (ex: Rome)" onChange={up('city')} />
            ) : (
              <select value={e.city || ''} onChange={(ev) => { if (ev.target.value === '__new') { setNewCity(true); setE({ ...e, city: '' }); } else setE({ ...e, city: ev.target.value }); }}>
                <option value="">— choisir —</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__new">➕ Nouvelle ville…</option>
              </select>
            )}
          </div>
          <div className="field"><label>Adresse</label><input value={e.address || ''} onChange={up('address')} /></div>
        </div>
        {e.kind === 'restaurant' && (
          <div className="field"><label>Repas</label>
            <select value={e.meal || ''} onChange={up('meal')}>
              <option value="">—</option><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Catering</option><option>Shabbat</option>
            </select>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary" onClick={() => onSave(e)}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}
