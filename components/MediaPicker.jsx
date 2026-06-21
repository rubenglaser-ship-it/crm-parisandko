'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Sélecteur d'image depuis la médiathèque (images déjà téléversées).
export default function MediaPicker({ onPick, onClose }) {
  const supabase = createClient();
  const [imgs, setImgs] = useState(null);
  useEffect(() => {
    supabase.from('images').select('id,url,label').order('created_at', { ascending: false })
      .then(({ data }) => setImgs(data || []));
  }, []); // eslint-disable-line

  return (
    <div className="modal-bg" onClick={(e) => e.target.classList.contains('modal-bg') && onClose()}>
      <div className="modal" style={{ width: 560 }}>
        <h3>Médiathèque</h3>
        {imgs === null ? <div className="muted">Chargement…</div>
          : imgs.length === 0 ? <div className="muted">Aucune image téléversée pour l'instant.</div>
            : <div className="media-grid">
              {imgs.map((im) => (
                <div key={im.id} className="media-cell" title={im.label || ''} onClick={() => onPick(im.url)}>
                  <img src={im.url} alt="" />
                </div>
              ))}
            </div>}
        <div style={{ textAlign: 'right', marginTop: 12 }}><button className="btn ghost" onClick={onClose}>Fermer</button></div>
      </div>
    </div>
  );
}
