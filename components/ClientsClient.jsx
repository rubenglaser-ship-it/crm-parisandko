'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ClientsClient({ initial }) {
  const supabase = createClient();
  const [clients, setClients] = useState(initial);
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [edit, setEdit] = useState(null); // client en cours d'édition
  const up = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function add() {
    if (!form.name.trim()) return;
    const { data } = await supabase.from('clients').insert({ ...form }).select().single();
    if (data) { setClients((xs) => [data, ...xs]); setForm({ name: '', email: '', phone: '', notes: '' }); }
  }
  async function remove(id) {
    if (!confirm('Supprimer ce client ? (les itinéraires liés sont conservés)')) return;
    await supabase.from('clients').delete().eq('id', id);
    setClients((xs) => xs.filter((x) => x.id !== id));
  }
  async function saveEdit(c) {
    const { error } = await supabase.from('clients')
      .update({ name: c.name, email: c.email, phone: c.phone, notes: c.notes }).eq('id', c.id);
    if (error) { alert('Erreur : ' + error.message); return; }
    setClients((xs) => xs.map((x) => (x.id === c.id ? c : x)));
    setEdit(null);
  }

  return (
    <>
      <div className="card" style={{ marginTop: 16, cursor: 'default' }}>
        <div className="row2">
          <div className="field"><label>Nom</label><input value={form.name} onChange={up('name')} placeholder="The Weisman Family" /></div>
          <div className="field"><label>Email</label><input value={form.email} onChange={up('email')} /></div>
        </div>
        <div className="row2">
          <div className="field"><label>Téléphone</label><input value={form.phone} onChange={up('phone')} /></div>
          <div className="field"><label>Notes</label><input value={form.notes} onChange={up('notes')} placeholder="Préférences, allergies…" /></div>
        </div>
        <button className="btn primary" onClick={add}>＋ Ajouter le client</button>
      </div>

      <div className="grid-cards">
        {clients.map((c) => (
          <div key={c.id} className="card" style={{ cursor: 'default' }}>
            <h3>{c.name}</h3>
            <div className="meta">{c.email || '—'}{c.phone ? ' · ' + c.phone : ''}</div>
            {c.notes && <div className="meta" style={{ marginTop: 4 }}>{c.notes}</div>}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button className="btn ghost" onClick={() => setEdit(c)}>Modifier</button>
              <button className="btn ghost" style={{ color: '#a33' }} onClick={() => remove(c.id)}>Supprimer</button>
            </div>
          </div>
        ))}
        {clients.length === 0 && <div className="muted">Aucun client encore.</div>}
      </div>

      {edit && <EditModal client={edit} onClose={() => setEdit(null)} onSave={saveEdit} />}
    </>
  );
}

function EditModal({ client, onClose, onSave }) {
  const [c, setC] = useState({ ...client });
  const up = (k) => (e) => setC({ ...c, [k]: e.target.value });
  return (
    <div className="modal-bg" onClick={(e) => e.target.classList.contains('modal-bg') && onClose()}>
      <div className="modal">
        <h3>Modifier le client</h3>
        <div className="field"><label>Nom</label><input value={c.name || ''} onChange={up('name')} /></div>
        <div className="row2">
          <div className="field"><label>Email</label><input value={c.email || ''} onChange={up('email')} /></div>
          <div className="field"><label>Téléphone</label><input value={c.phone || ''} onChange={up('phone')} /></div>
        </div>
        <div className="field"><label>Notes</label><textarea value={c.notes || ''} onChange={up('notes')} placeholder="Préférences, allergies, historique…" /></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn primary" onClick={() => onSave(c)}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}
