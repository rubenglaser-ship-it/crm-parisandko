import { createClient } from '@/lib/supabase/server';
import TopNav from '@/components/TopNav';
import DiagClient from '@/components/DiagClient';

export const dynamic = 'force-dynamic';

// Page de diagnostic (sans logs Railway) : compare la session côté serveur vs navigateur.
export default async function DiagPage() {
  const supabase = createClient();
  let serverUser = null, err = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    serverUser = data?.user?.email || null;
    err = error?.message || null;
  } catch (e) { err = e?.message || String(e); }

  return (
    <>
      <TopNav />
      <div className="page">
        <h1 className="h-title">Diagnostic</h1>
        <div className="muted">Vérifie l'authentification de bout en bout (serveur + navigateur).</div>
        <div className="card" style={{ marginTop: 16, cursor: 'default' }}>
          <p>Session <b>serveur</b> : <b>{serverUser || 'AUCUNE'}</b>{err ? ` (err: ${err})` : ''}</p>
          <DiagClient />
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
          Lecture seule, aucun effet de bord. Tu peux retirer cette page une fois le problème réglé.
        </p>
      </div>
    </>
  );
}
