'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DiagClient() {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    (async () => {
      const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      let browserUser = null, err = null;
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();
        browserUser = data?.user?.email || null;
        err = error?.message || null;
      } catch (e) { err = e?.message || String(e); }
      setInfo({ hasUrl, hasKey, browserUser, err });
    })();
  }, []);

  if (!info) return <p className="muted">Analyse côté navigateur…</p>;
  const envKO = !info.hasUrl || !info.hasKey;
  return (
    <div style={{ lineHeight: 1.9, marginTop: 8 }}>
      <p>NEXT_PUBLIC_SUPABASE_URL (bundle) : <b>{info.hasUrl ? '✓ présente' : '✗ ABSENTE'}</b></p>
      <p>NEXT_PUBLIC_SUPABASE_ANON_KEY (bundle) : <b>{info.hasKey ? '✓ présente' : '✗ ABSENTE'}</b></p>
      <p>Session navigateur : <b>{info.browserUser || 'AUCUNE'}</b>{info.err ? ` (err: ${info.err})` : ''}</p>
      <p style={{ marginTop: 12, color: (envKO || !info.browserUser) ? '#a33' : 'var(--teal)', fontWeight: 600 }}>
        {envKO
          ? '→ Variables NEXT_PUBLIC absentes AU BUILD : c\'est la cause des écritures qui échouent. Définis-les sur Railway, puis Redeploy (REBUILD).'
          : !info.browserUser
            ? '→ Variables présentes mais pas de session navigateur : problème de cookies / auto-login.'
            : '→ Auth navigateur OK. Si une écriture échoue quand même, regarde le message d\'erreur affiché.'}
      </p>
    </div>
  );
}
