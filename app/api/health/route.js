// Healthcheck Railway — réponse 200 publique, sans authentification.
export const dynamic = 'force-dynamic';
export function GET() {
  return new Response('ok', { status: 200, headers: { 'Content-Type': 'text/plain' } });
}
