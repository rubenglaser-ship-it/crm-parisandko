import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Connexion automatique au compte fixe.
// IMPORTANT : la response redirect est créée avant le sign-in pour que
// Supabase écrive les cookies de session directement dessus — sinon la
// session se perd au moment du redirect et le dashboard reste vide.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  let next = searchParams.get('next') || '/';
  if (!next.startsWith('/')) next = '/';

  const email    = process.env.APP_USER_EMAIL;
  const password = process.env.APP_USER_PASSWORD;
  if (!email || !password) {
    return new NextResponse('Configuration manquante : APP_USER_EMAIL / APP_USER_PASSWORD', { status: 500 });
  }

  // Créer le redirect AVANT le sign-in pour y attacher les cookies de session
  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return new NextResponse('Connexion automatique échouée : ' + error.message, { status: 500 });
  }

  return response; // cookies de session inclus → dashboard charge correctement
}
