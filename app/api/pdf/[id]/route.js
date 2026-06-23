import { createClient } from '@/lib/supabase/server';
import { buildItineraryHtml } from '@/lib/docHtml';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function getBrowser() {
  const onVercel = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_VERSION;
  if (onVercel) {
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteer = await import('puppeteer-core');
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }
  // local : puppeteer complet (Chromium embarqué)
  const puppeteer = await import('puppeteer');
  return puppeteer.launch({ headless: 'new' });
}

export async function GET(_req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  // RLS garantit que l'itinéraire appartient à l'utilisateur
  const { data: itin, error } = await supabase.from('itineraries').select('*').eq('id', params.id).single();
  if (error || !itin) return new Response('Not found', { status: 404 });

  if (itin.client_id) {
    const { data: c } = await supabase.from('clients').select('name').eq('id', itin.client_id).single();
    itin.client_name = c?.name || '';
  }

  // buildItineraryHtml est async : résout les images en data URI + embarque les fonts locales
  const html = await buildItineraryHtml(itin);

  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();

    // Timeout global : 45s (sous le maxDuration: 60 de la fonction Vercel)
    page.setDefaultNavigationTimeout(45_000);
    page.setDefaultTimeout(45_000);

    // Tout le contenu est inline (fonts base64, images data URI) → pas de réseau nécessaire.
    // 'domcontentloaded' évite les blocages sur les ressources externes résiduelles.
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
      preferCSSPageSize: false,
    });

    // Nom de fichier UTF-8 via RFC 5987 — préserve accents et caractères français
    const rawName = (itin.client_name || itin.title || 'itineraire').trim() || 'itineraire';
    const safeName = rawName.replace(/[/\\:*?"<>|]/g, '-');
    const fullName = `${safeName} - Paris&Ko.pdf`;
    const encoded  = encodeURIComponent(fullName);

    return new Response(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fullName}"; filename*=UTF-8''${encoded}`,
      },
    });
  } catch (e) {
    console.error('[PDF] Puppeteer error:', e);
    return new Response('PDF error: ' + (e?.message || e), { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
