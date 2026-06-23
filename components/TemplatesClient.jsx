'use client';
import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTemplate } from '@/app/actions';

export default function TemplatesClient({ initial }) {
  const supabase = createClient();
  const [list, setList] = useState(initial);
  const [pending, start] = useTransition();

  async function del(id) {
    if (!confirm('Supprimer ce modèle ?')) return;
    const { error } = await supabase.from('itineraries').delete().eq('id', id);
    if (error) { alert('Erreur : ' + error.message); return; }
    setList((xs) => xs.filter((x) => x.id !== id));
  }

  if (list.length === 0) return (
    <div className="muted" style={{ marginTop: 18 }}>
      Aucun modèle. Ouvre un itinéraire et clique « Enregistrer comme modèle » pour en créer un.
    </div>
  );

  return (
    <div className="grid-cards">
      {list.map((t) => (
        <div key={t.id} className="card" style={{ cursor: 'default' }}>
          <span className="tag-pill">Modèle</span>
          <h3 style={{ marginTop: 8 }}>{(t.title || 'Modèle').replace(/^\[Modèle\]\s*/i, '')}</h3>
          <div className="meta">{t.dests} · {t.dayCount} jour(s)</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button className="btn primary" disabled={pending} onClick={() => start(() => useTemplate(t.id))}>
              {pending ? '…' : 'Utiliser ce modèle'}
            </button>
            <button className="btn ghost" style={{ color: '#a33' }} onClick={() => del(t.id)}>Supprimer</button>
          </div>
        </div>
      ))}
    </div>
  );
}
