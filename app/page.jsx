import { createClient } from '@/lib/supabase/server';
import TopNav from '@/components/TopNav';
import { createItinerary } from '@/app/actions';
import ItinCard from '@/components/ItinCard';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const supabase = createClient();
  const { data: itineraries } = await supabase
    .from('itineraries')
    .select('id,title,city,date_range,status,updated_at,days')
    .order('updated_at', { ascending: false });

  const dests = (it) => {
    const s = [];
    (Array.isArray(it.days) ? it.days : []).forEach((d) => { if (d.dest && !s.includes(d.dest)) s.push(d.dest); });
    return s.join(' · ') || it.city || '—';
  };

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
            <ItinCard key={it.id} it={it} dests={dests(it)} />
          ))}
          {(!itineraries || itineraries.length === 0) && (
            <div className="muted">Aucun itinéraire pour l'instant. Clique « Nouvel itinéraire ».</div>
          )}
        </div>
      </div>
    </>
  );
}
