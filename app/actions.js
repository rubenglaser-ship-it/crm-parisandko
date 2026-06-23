'use server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Crée un itinéraire vide et ouvre l'éditeur.
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

// Duplique un itinéraire existant → copie tous les champs sauf client_id et statut.
// Ouvre directement le nouvel itinéraire dans l'éditeur.
export async function duplicateItinerary(id) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/api/auth/auto');

  const { data: src, error: fetchErr } = await supabase
    .from('itineraries')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchErr || !src) throw new Error('Itinéraire introuvable');

  const { data: copy, error: insertErr } = await supabase
    .from('itineraries')
    .insert({
      title:      `${src.title || 'Itinéraire'} (copie)`,
      city:       src.city,
      guests:     src.guests,
      date_range: src.date_range,
      start_date: src.start_date,
      end_date:   src.end_date,
      hero_image: src.hero_image,
      intro:      src.intro,
      days:       src.days,
      // client_id remis à null + statut draft volontairement
      status: 'draft',
    })
    .select('id')
    .single();
  if (insertErr) throw insertErr;
  redirect(`/itineraries/${copy.id}`);
}

// Enregistre un itinéraire comme MODÈLE réutilisable (générique : sans client ni dates).
export async function saveAsTemplate(id) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/api/auth/auto');
  const { data: src, error } = await supabase.from('itineraries').select('*').eq('id', id).single();
  if (error || !src) throw new Error('Itinéraire introuvable');
  const base = (src.title || 'Itinéraire').replace(/^\[Modèle\]\s*/i, '').replace(/\s*\(copie\)$/i, '');
  const days = (Array.isArray(src.days) ? src.days : []).map((d) => ({ ...d, date: '' })); // dates retirées
  const { error: insErr } = await supabase.from('itineraries').insert({
    title: `[Modèle] ${base}`, city: src.city, guests: src.guests,
    hero_image: src.hero_image, intro: src.intro, days, status: 'draft', is_template: true,
    // pas de client ni de dates pour un modèle
  });
  if (insErr) throw insErr;
  redirect('/templates');
}

// Crée un nouvel itinéraire (brouillon) À PARTIR d'un modèle, puis l'ouvre.
export async function useTemplate(id) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/api/auth/auto');
  const { data: src, error } = await supabase.from('itineraries').select('*').eq('id', id).single();
  if (error || !src) throw new Error('Modèle introuvable');
  const base = (src.title || 'Itinéraire').replace(/^\[Modèle\]\s*/i, '');
  const { data: copy, error: insErr } = await supabase.from('itineraries').insert({
    title: base, city: src.city, guests: src.guests, hero_image: src.hero_image,
    intro: src.intro, days: src.days, status: 'draft', is_template: false,
  }).select('id').single();
  if (insErr) throw insErr;
  redirect(`/itineraries/${copy.id}`);
}
