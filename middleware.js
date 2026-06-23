import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Mono-utilisateur sans page de login : si aucune session, on déclenche
// la connexion automatique au compte fixe (/api/auth/auto), puis on revient.
export async function middleware(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const path = request.nextUrl.pathname;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    // ne pas boucler sur la route d'auto-login ; laisser passer le healthcheck Railway
    if (!user && !path.startsWith('/api/auth/auto') && !path.startsWith('/api/health')) {
      const url = request.nextUrl.clone();
      url.pathname = '/api/auth/auto';
      url.searchParams.set('next', path + (request.nextUrl.search || ''));
      return NextResponse.redirect(url);
    }
  } catch (e) {
    // le middleware ne doit JAMAIS faire tomber une requête : on laisse passer.
    console.error('[middleware] auth check error:', e?.message || e);
  }
  return response;
}

export const config = {
  // /api/health est exclu : le healthcheck Railway ne dépend ni du middleware ni de Supabase.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
