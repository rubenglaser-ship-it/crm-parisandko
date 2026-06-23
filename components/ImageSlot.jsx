'use client';
import { useRef, useState } from 'react';
import { uploadImage } from '@/lib/uploadImage';
import MediaPicker from '@/components/MediaPicker';

// Vignette image par item : 1 clic pour téléverser, ou médiathèque.
// Vide → affordance no-print (jamais dans le PDF). Rempli → vraie vignette.
export default function ImageSlot({ value, onChange, w }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState(false);
  const stop = (e) => e.stopPropagation();

  async function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try { const url = await uploadImage(f); onChange(url); }
    catch (ex) { alert(ex.message || 'Échec du téléversement'); }
    finally { setBusy(false); e.target.value = ''; }
  }

  const fileInput = <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />;
  const picker = pick && <MediaPicker onPick={(u) => { onChange(u); setPick(false); }} onClose={() => setPick(false)} />;

  if (value) return (
    <div className="it-imgslot" style={w ? { width: w + '%' } : undefined} onClick={stop}>
      <img src={value} alt="" />
      <div className="slot-actions no-print">
        <button title="Remplacer" onClick={() => fileRef.current?.click()}>⬆</button>
        <button title="Médiathèque" onClick={() => setPick(true)}>▦</button>
        <button title="Retirer" onClick={() => onChange('')}>✕</button>
      </div>
      {fileInput}{picker}
    </div>
  );

  return (
    <div className="it-imgslot empty no-print" onClick={stop}>
      <button className="slot-add" title="Téléverser une image" onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy ? '…' : '＋ image'}
      </button>
      <button className="slot-lib" title="Médiathèque" onClick={() => setPick(true)}>▦</button>
      {fileInput}{picker}
    </div>
  );
}
