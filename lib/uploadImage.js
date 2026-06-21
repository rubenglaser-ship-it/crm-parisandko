'use client';
import { createClient } from '@/lib/supabase/client';

// Téléverse un fichier image dans le bucket "images" (dossier = user_id)
// et renvoie son URL publique (stockée ensuite dans l'itinéraire).
export async function uploadImage(file) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');
  if (!/^image\//.test(file.type)) throw new Error('Fichier non image');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('images').upload(path, file, {
    cacheControl: '3600', upsert: false, contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('images').getPublicUrl(path);
  const url = data.publicUrl;
  // catalogue l'image dans la médiathèque (réutilisable d'un itinéraire à l'autre)
  await supabase.from('images').insert({ url, label: file.name });
  return url;
}
