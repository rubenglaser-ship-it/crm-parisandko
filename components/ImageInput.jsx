'use client';
import { useState } from 'react';
import { uploadImage } from '@/lib/uploadImage';
import MediaPicker from '@/components/MediaPicker';

// Champ image : aperçu + téléverser (vers Supabase Storage) + médiathèque + URL manuelle.
export default function ImageInput({ value, onChange, label = 'Image' }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [pick, setPick] = useState(false);

  async function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true); setErr('');
    try { const url = await uploadImage(f); onChange(url); }
    catch (ex) { setErr(ex.message || 'Échec du téléversement'); }
    finally { setBusy(false); e.target.value = ''; }
  }

  return (
    <div className="field">
      {label && <label>{label}</label>}
      {value && <img src={value} alt="" style={{ width: '100%', maxHeight: 130, objectFit: 'cover', borderRadius: 8, margin: '2px 0 6px' }} />}
      <div style={{ display: 'flex', gap: 6 }}>
        <input style={{ flex: 1 }} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="URL, téléverse ou médiathèque →" />
        <label className="btn ghost" style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {busy ? '…' : '⬆ Téléverser'}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
        </label>
        <button type="button" className="btn ghost" style={{ whiteSpace: 'nowrap' }} onClick={() => setPick(true)}>Médiathèque</button>
      </div>
      {value && <button type="button" className="btn ghost" style={{ marginTop: 4, color: '#a33' }} onClick={() => onChange('')}>Retirer l'image</button>}
      {err && <div style={{ color: '#a33', fontSize: 11, marginTop: 4 }}>{err}</div>}
      {pick && <MediaPicker onPick={(url) => { onChange(url); setPick(false); }} onClose={() => setPick(false)} />}
    </div>
  );
}
