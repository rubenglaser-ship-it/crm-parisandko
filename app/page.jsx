import { createClient } from '@/lib/supabase/server';
import TopNav from '@/components/TopNav';
import ItinDashboard from '@/components/ItinDashboard';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const supabase = createClient();
  const { data: itineraries } = await supabase
    .from('itineraries')
    .select('id,title,city,date_range,status,updated_at,days,client_id,is_template')
    .or('is_template.is.null,is_template.eq.false')
    .order('updated_at', { ascending: false });

  const items = (itineraries || []).map((it) => {
    const s = [];
    (Array.isArray(it.days) ? it.days : []).forEach((d) => { if (d.dest && !s.includes(d.dest)) s.push(d.dest); });
    return { ...it, dests: s.join(' · ') || it.city || '—' };
  });

  return (
    <>
      <TopNav />
      <ItinDashboard initial={items} />
    </>
  );
}
