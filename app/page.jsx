import { createClient } from '@/lib/supabase/server';
import TopNav from '@/components/TopNav';
import { createItinerary } from '@/app/actions';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const supabase = createClient();
  const { data: itineraries } = await supabase
    .from('itineraries')
    .select('id,title,city,date_range,status,updated_at')
    .order('updated_at', { ascending: false });

  return (
    <>
      <TopNav />
      <div className="page">
        <div className="toolbar" style={{ justifyContent: 'space-between' }}>
          <div>
            <h1 className="h-title">Itinéraires</h1>
            <div className="muted">Crée, modifie et exporte tes parcours clients.</div>
          </div>
          <form action={createItinerary}><button className="btn primary">＋ Nouvel itinéraire</button></form>
        </div>

        <div className="grid-cards">
          {(itineraries || []).map((it) => (
            <Link key={it.id} className="card" href={`/itineraries/${it.id}`}>
              <span className="tag-pill">{it.status === 'sent' ? 'Envoyé' : 'Brouillon'}</span>
              <h3 style={{ marginTop: 8 }}>{it.title || 'Sans titre'}</h3>
              <div className="meta">{it.city || '—'} · {it.date_range || 'dates à définir'}</div>
            </Link>
          ))}
          {(!itineraries || itineraries.length === 0) && (
            <div className="muted">Aucun itinéraire pour l'instant. Clique « Nouvel itinéraire ».</div>
          )}
        </div>
      </div>
    </>
  );
}
