import { createClient } from '@/lib/supabase/server';
import TopNav from '@/components/TopNav';
import Editor from '@/components/Editor';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ItineraryPage({ params }) {
  const supabase = createClient();
  const { data: itin } = await supabase.from('itineraries').select('*').eq('id', params.id).single();
  if (!itin) notFound();
  const { data: library } = await supabase.from('library_items').select('*');
  const { data: clients } = await supabase.from('clients').select('id,name').order('name');
  return (
    <>
      <TopNav />
      <Editor initial={itin} library={library || []} clients={clients || []} />
    </>
  );
}
