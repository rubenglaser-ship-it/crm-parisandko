'use client';
import { useState, useMemo } from 'react';
import { createItinerary } from '@/app/actions';
import ItinCard from '@/components/ItinCard';

export default function ItinDashboard({ initial }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all'); // 'all' | 'draft' | 'sent'

  const filtered = useMemo(() => {
    const qLow = q.toLowerCase().trim();
    return initial.filter((it) => {
      if (status !== 'all' && it.status !== status) return false;
      if (!qLow) return true;
      return (
        (it.title || '').toLowerCase().includes(qLow) ||
        (it.dests || '').toLowerCase().includes(qLow) ||
        (it.date_range || '').toLowerCase().includes(qLow)
      );
    });
  }, [initial, q, status]);

  return (
    <div className="page">
      <div className="toolbar" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h1 className="h-title">Itinéraires</h1>
          <div className="muted">Crée, modifie et exporte tes parcours clients.</div>
        </div>
        <form action={createItinerary}><button className="btn primary">＋ Nouvel itinéraire</button></form>
      </div>

      {initial.length > 0 && (
        <div className="toolbar" style={{ gap: 8, marginBottom: 4 }}>
          <input
            className="field"
            style={{ flex: 1, margin: 0, maxWidth: 320 }}
            placeholder="Rechercher par nom, destination, dates…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="field"
            style={{ width: 140, margin: 0 }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Tous ({initial.length})</option>
            <option value="draft">Brouillons ({initial.filter((i) => i.status !== 'sent').length})</option>
            <option value="sent">Envoyés ({initial.filter((i) => i.status === 'sent').length})</option>
          </select>
          {(q || status !== 'all') && (
            <button className="btn ghost" onClick={() => { setQ(''); setStatus('all'); }}>
              Réinitialiser
            </button>
          )}
        </div>
      )}

      <div className="grid-cards">
        {filtered.map((it) => (
          <ItinCard key={it.id} it={it} dests={it.dests} />
        ))}
        {initial.length === 0 && (
          <div className="muted">Aucun itinéraire pour l'instant. Clique « Nouvel itinéraire ».</div>
        )}
        {initial.length > 0 && filtered.length === 0 && (
          <div className="muted">Aucun résultat pour « {q} »{status !== 'all' ? ` (filtre : ${status})` : ''}.</div>
        )}
      </div>
    </div>
  );
}
