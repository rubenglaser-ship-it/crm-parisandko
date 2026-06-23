'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ItinCard({ it, dests }) {
  const supabase = createClient();
  const router = useRouter();
  const [gone, setGone] = useState(false);

  async function del(e) {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('Supprimer cet itinéraire ? (définitif)')) return;
    setGone(true);
    const { error } = await supabase.from('itineraries').delete().eq('id', it.id);
    if (error) { setGone(false); alert('Erreur : ' + error.message); return; }
    router.refresh();
  }
  if (gone) return null;

  return (
    <div className="card-wrap">
      <Link className="card" href={`/itineraries/${it.id}`}>
        <span className="tag-pill">{it.status === 'sent' ? 'Envoyé' : 'Brouillon'}</span>
        <h3 style={{ marginTop: 8 }}>{it.title || 'Sans titre'}</h3>
        <div className="meta">{dests}</div>
        <div className="meta" style={{ marginTop: 2 }}>{it.date_range || 'dates à définir'}</div>
      </Link>
      <button className="card-del" title="Supprimer" onClick={del}>✕</button>
    </div>
  );
}
