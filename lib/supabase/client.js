'use client';
import { createBrowserClient } from '@supabase/ssr';

// Client Supabase pour les composants côté navigateur (lecture/écriture, RLS appliquée).
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Diagnostic : les NEXT_PUBLIC_* sont inlinées AU BUILD. Si elles manquaient au build
  // (ex. ajoutées sur Railway après le build sans rebuild), elles sont `undefined` ici
  // → le client n'est pas authentifié → la RLS bloque silencieusement TOUTES les écritures.
  if (typeof window !== 'undefined' && (!url || !key)) {
    console.error(
      '[Supabase client] Variables NEXT_PUBLIC absentes du bundle navigateur.\n' +
      'Cause probable : build effectué sans NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.\n' +
      'Solution : définir ces variables dans Railway PUIS relancer un build (Redeploy).',
      { url: !!url, key: !!key }
    );
  }
  return createBrowserClient(url, key);
}
