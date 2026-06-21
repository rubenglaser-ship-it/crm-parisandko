import { createClient } from '@supabase/supabase-js';

// Client ADMIN (service role) — UNIQUEMENT côté serveur. Contourne la RLS.
// Réservé à la route PDF serveur (Phase 3). Non utilisé en mono-utilisateur.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
