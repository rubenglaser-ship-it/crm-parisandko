'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendLink(e) {
    e.preventDefault();
    setLoading(true); setErr('');
    const supabase = createClient();
    const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${site}/auth/callback` },
    });
    setLoading(false);
    if (error) setErr(error.message); else setSent(true);
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">JEWISH CONCIERGE<span>PARIS &amp; KO</span></div>
        {sent ? (
          <p className="login-msg">Lien de connexion envoyé à <b>{email}</b>.<br />Ouvre ton mail pour entrer.</p>
        ) : (
          <form onSubmit={sendLink}>
            <label>Email professionnel</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@parisandko.com" />
            <button className="btn primary" disabled={loading}>{loading ? 'Envoi…' : 'Recevoir le lien de connexion'}</button>
            {err && <p className="login-err">{err}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
