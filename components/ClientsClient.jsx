'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ClientsClient({ initial }) {
  const supabase = createClient();
  const [clients, setClients] = useState(initial);
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const up = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function add() {
    if (!form.name.trim()) return;
    const { data } = await supabase.from('clients').insert({ ...form }).select().single();
    if (data) { setClients((xs) => [data, ...xs]); setForm({ name: '', email: '', phone: '', notes: '' }); }
  }
  async function remove(id) {
    if (!confirm('Supprimer ce client ?')) return;
    await supabase.from('clients').delete().eq('id', id);
    setClients((xs) => xs.filter((x) => x.id !== id));
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
            <button className="btn ghost" style={{ color: '#a33', marginTop: 8 }} onClick={() => remove(c.id)}>Supprimer</button>
          </div>
        ))}
        {clients.length === 0 && <div className="muted">Aucun client encore.</div>}
      </div>
    </>
  );
}
