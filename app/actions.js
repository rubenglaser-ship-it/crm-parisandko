'use server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

// Crée un itinéraire vide et ouvre l'éditeur.
// user_id est rempli automatiquement (default auth.uid() + RLS).
export async function createItinerary() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/api/auth/auto');
  const { data, error } = await supabase
    .from('itineraries')
    .insert({ title: 'New itinerary', days: [] })
    .select('id').single();
  if (error) throw error;
  redirect(`/itineraries/${data.id}`);
}
