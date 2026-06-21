// Mini rich-text : markdown léger -> HTML (gras / italique / souligné / retours ligne).
// Partagé entre l'aperçu (React) et le rendu PDF (serveur).
export function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
export function mdToHtml(s) {
  let h = escapeHtml(s);
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); // **gras**
  h = h.replace(/__([^_]+)__/g, '<u>$1</u>');               // __souligné__
  h = h.replace(/\*([^*]+)\*/g, '<em>$1</em>');             // *italique*
  h = h.replace(/\n/g, '<br>');
  return h;
}
