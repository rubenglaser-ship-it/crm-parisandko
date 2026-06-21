import { createClient } from '@/lib/supabase/server';
import TopNav from '@/components/TopNav';
import MediaClient from '@/components/MediaClient';

export const dynamic = 'force-dynamic';

export default async function MediaPage() {
  const supabase = createClient();
  const { data: imgs } = await supabase.from('images').select('id,url,label').order('created_at', { ascending: false });
  return (
    <>
      <TopNav />
      <div className="page">
        <h1 className="h-title">Médiathèque</h1>
        <div className="muted">Tes images téléversées, réutilisables dans tous tes itinéraires.</div>
        <MediaClient initial={imgs || []} />
      </div>
    </>
  );
}
