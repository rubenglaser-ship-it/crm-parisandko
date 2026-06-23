import { createClient } from '@/lib/supabase/server';
import TopNav from '@/components/TopNav';
import TemplatesClient from '@/components/TemplatesClient';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('itineraries')
    .select('id,title,city,days,updated_at')
    .eq('is_template', true)
    .order('updated_at', { ascending: false });

  const items = (data || []).map((it) => {
    const s = [];
    (Array.isArray(it.days) ? it.days : []).forEach((d) => { if (d.dest && !s.includes(d.dest)) s.push(d.dest); });
    return { ...it, dests: s.join(' · ') || it.city || '—', dayCount: (it.days || []).length };
  });

  return (
    <>
      <TopNav />
      <div className="page">
        <h1 className="h-title">Modèles</h1>
        <div className="muted">Tes itinéraires types, réutilisables pour démarrer un nouveau séjour en un clic.</div>
        <TemplatesClient initial={items} />
      </div>
    </>
  );
}
