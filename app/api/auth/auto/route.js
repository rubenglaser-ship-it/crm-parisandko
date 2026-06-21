import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Connexion automatique au compte fixe (mot de passe côté serveur, jamais exposé).
// Évite l'écran de login et la limite d'emails des liens magiques.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  let next = searchParams.get('next') || '/';
  if (!next.startsWith('/')) next = '/';

  const email = process.env.APP_USER_EMAIL;
  const password = process.env.APP_USER_PASSWORD;
  if (!email || !password) {
    return new NextResponse('Configuration manquante : APP_USER_EMAIL / APP_USER_PASSWORD dans .env.local', { status: 500 });
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return new NextResponse('Connexion automatique échouée : ' + error.message, { status: 500 });
  }
  return NextResponse.redirect(`${origin}${next}`);
}
