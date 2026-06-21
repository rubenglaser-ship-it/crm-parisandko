'use client';
import { useRef } from 'react';

// Zone de texte avec barre d'outils gras / italique / souligné (markdown léger).
export default function RichInput({ value, onChange, placeholder, minHeight = 80 }) {
  const ref = useRef(null);
  function wrap(mark) {
    const t = ref.current; if (!t) return;
    const s = t.selectionStart, e = t.selectionEnd, v = value || '';
    const sel = v.slice(s, e) || 'texte';
    const nv = v.slice(0, s) + mark + sel + mark + v.slice(e);
    onChange(nv);
    setTimeout(() => { t.focus(); t.selectionStart = s + mark.length; t.selectionEnd = s + mark.length + sel.length; }, 0);
  }
  return (
    <div>
      <div className="rt-toolbar">
        <button type="button" title="Gras" onMouseDown={(e) => { e.preventDefault(); wrap('**'); }}><b>B</b></button>
        <button type="button" title="Italique" onMouseDown={(e) => { e.preventDefault(); wrap('*'); }}><i>I</i></button>
        <button type="button" title="Souligné" onMouseDown={(e) => { e.preventDefault(); wrap('__'); }}><u>U</u></button>
        <span className="muted" style={{ fontSize: 10, marginLeft: 6 }}>**gras** · *italique* · __souligné__</span>
      </div>
      <textarea ref={ref} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ minHeight }} />
    </div>
  );
}
