import { createClient } from '@/lib/supabase/server';
import TopNav from '@/components/TopNav';
import ClientsClient from '@/components/ClientsClient';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const supabase = createClient();
  const { data: clients } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
  return (
    <>
      <TopNav />
      <div className="page">
        <h1 className="h-title">Clients</h1>
        <ClientsClient initial={clients || []} />
      </div>
    </>
  );
}
