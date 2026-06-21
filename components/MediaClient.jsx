'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { uploadImage } from '@/lib/uploadImage';

export default function MediaClient({ initial }) {
  const supabase = createClient();
  const [imgs, setImgs] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function onFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true); setErr('');
    try { for (const f of files) await uploadImage(f); }
    catch (ex) { setErr(ex.message || 'Échec'); }
    const { data } = await supabase.from('images').select('id,url,label').order('created_at', { ascending: false });
    setImgs(data || []); setBusy(false); e.target.value = '';
  }

  async function del(im) {
    if (!confirm('Supprimer cette image ?')) return;
    await supabase.from('images').delete().eq('id', im.id);
    const path = (im.url.split('/images/')[1]) || '';
    if (path) await supabase.storage.from('images').remove([path]);
    setImgs((xs) => xs.filter((x) => x.id !== im.id));
  }

  return (
    <>
      <div style={{ margin: '16px 0', display: 'flex', gap: 10, alignItems: 'center' }}>
        <label className="btn primary" style={{ cursor: 'pointer' }}>
          {busy ? 'Téléversement…' : '⬆ Téléverser des images'}
          <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onFiles} />
        </label>
        {err && <span style={{ color: '#a33', fontSize: 12 }}>{err}</span>}
      </div>
      {imgs.length === 0 ? <div className="muted">Aucune image. Téléverse tes premières photos.</div>
        : <div className="media-grid lg">
          {imgs.map((im) => (
            <div key={im.id} className="media-cell">
              <img src={im.url} alt={im.label || ''} />
              <button className="media-del" title="Supprimer" onClick={() => del(im)}>✕</button>
            </div>
          ))}
        </div>}
    </>
  );
}
