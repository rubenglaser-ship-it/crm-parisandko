// Route de diagnostic — À SUPPRIMER après debug
// Accès : https://ton-app.railway.app/api/debug
export const dynamic = 'force-dynamic';

export async function GET() {
  const vars = {
    NEXT_PUBLIC_SUPABASE_URL:       process.env.NEXT_PUBLIC_SUPABASE_URL       ? '✓ ' + process.env.NEXT_PUBLIC_SUPABASE_URL.slice(0, 30) + '…' : '✗ ABSENTE',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY  ? '✓ ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 20) + '…' : '✗ ABSENTE',
    APP_USER_EMAIL:                 process.env.APP_USER_EMAIL                  ? '✓ ' + process.env.APP_USER_EMAIL : '✗ ABSENTE',
    APP_USER_PASSWORD:              process.env.APP_USER_PASSWORD               ? '✓ [défini, masqué]' : '✗ ABSENTE',
    NEXT_PUBLIC_SITE_URL:           process.env.NEXT_PUBLIC_SITE_URL            ? '✓ ' + process.env.NEXT_PUBLIC_SITE_URL : '✗ ABSENTE',
    NODE_ENV:                       process.env.NODE_ENV || '—',
  };
  return Response.json(vars);
}
