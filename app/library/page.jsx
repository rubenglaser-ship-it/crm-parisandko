import { createClient } from '@/lib/supabase/server';
import TopNav from '@/components/TopNav';
import LibraryClient from '@/components/LibraryClient';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const supabase = createClient();
  const { data: items } = await supabase
    .from('library_items')
    .select('*')
    .order('kind', { ascending: true })
    .order('title', { ascending: true });
  return (
    <>
      <TopNav />
      <div className="page">
        <h1 className="h-title">Bibliothèque</h1>
        <div className="muted">Hôtels, activités et restaurants réutilisables — filtrables par type et région.</div>
        <LibraryClient initial={items || []} />
      </div>
    </>
  );
}
