'use client';

import { useEffect, useState } from 'react';
import { assetsApi } from '@/lib/api';
import { Plus, Edit, Trash2, X, Wrench } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    ACTIVE: { label: 'Activo', cls: 'badge-active' },
    MAINTENANCE: { label: 'Mantenimiento', cls: 'badge-frozen' },
    RETIRED: { label: 'Retirado', cls: 'badge-cancelled' },
};

export default function AssetsPage() {
    const [assets, setAssets] = useState<any[]>([]);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({ name: '', category: '', purchaseDate: '', purchasePrice: 0, status: 'ACTIVE', notes: '' });

    useEffect(() => { loadAssets(); }, [filter]);

    const loadAssets = async () => {
        setLoading(true);
        try { setAssets(await assetsApi.list(filter || undefined)); }
        catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = { ...form, purchasePrice: Number(form.purchasePrice), purchaseDate: form.purchaseDate ? new Date(form.purchaseDate).toISOString() : undefined };
            if (editing) { await assetsApi.update(editing.id, data); } else { await assetsApi.create(data); }
            setShowModal(false); setEditing(null); loadAssets();
        } catch (e: any) { alert(e.message); }
    };

    const openEdit = (a: any) => {
        setEditing(a);
        setForm({ name: a.name, category: a.category || '', purchaseDate: a.purchaseDate ? a.purchaseDate.slice(0, 10) : '', purchasePrice: Number(a.purchasePrice), status: a.status, notes: a.notes || '' });
        setShowModal(true);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div className="page-header" style={{ marginBottom: 0 }}>
                    <h1>Activos Fijos</h1><p>Equipamiento y mobiliario</p>
                </div>
                <button className="btn-primary" onClick={() => { setEditing(null); setForm({ name: '', category: '', purchaseDate: '', purchasePrice: 0, status: 'ACTIVE', notes: '' }); setShowModal(true); }}>
                    <Plus size={16} /> Nuevo Activo
                </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: 'var(--color-surface)', borderRadius: '10px', padding: '3px', border: '1px solid var(--color-border)', width: 'fit-content' }}>
                {[{ val: '', label: 'Todos' }, { val: 'ACTIVE', label: 'Activos' }, { val: 'MAINTENANCE', label: 'Mantenimiento' }, { val: 'RETIRED', label: 'Retirados' }].map(f => (
                    <button key={f.val} onClick={() => setFilter(f.val)} style={{
                        padding: '6px 14px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                        background: filter === f.val ? 'var(--color-primary)' : 'transparent',
                        color: filter === f.val ? 'white' : 'var(--color-text-muted)',
                        transition: 'all 0.15s',
                    }}>{f.label}</button>
                ))}
            </div>

            {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner spinner-lg" /></div> : (
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>Equipo</th><th>Categoría</th><th>Fecha Compra</th><th>Valor</th><th>Estado</th><th style={{ width: '80px' }}>Acciones</th></tr></thead>
                        <tbody>
                            {assets.map((a) => (
                                <tr key={a.id}>
                                    <td style={{ fontWeight: 500, color: 'var(--color-text)' }}>{a.name}</td>
                                    <td>{a.category || '—'}</td>
                                    <td>{a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString('es-ES') : '—'}</td>
                                    <td style={{ fontWeight: 600 }}>S/{Number(a.purchasePrice || 0).toFixed(2)}</td>
                                    <td><span className={`badge ${STATUS_MAP[a.status]?.cls || ''}`}>{STATUS_MAP[a.status]?.label || a.status}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button className="btn-icon" onClick={() => openEdit(a)} title="Editar"><Edit size={14} /></button>
                                            <button className="btn-icon danger" onClick={async () => { if (confirm(`¿Eliminar ${a.name}?`)) { await assetsApi.delete(a.id); loadAssets(); } }} title="Eliminar"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {assets.length === 0 && <tr><td colSpan={6} className="empty-state">No hay activos</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-card slide-up">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>{editing ? 'Editar Activo' : 'Nuevo Activo'}</h2>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div><label className="form-label">Nombre *</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div><label className="form-label">Categoría</label><input className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                                <div><label className="form-label">Estado</label><select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="ACTIVE">Activo</option><option value="MAINTENANCE">Mantenimiento</option><option value="RETIRED">Retirado</option></select></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div><label className="form-label">Fecha Compra</label><input className="input-field" type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></div>
                                <div><label className="form-label">Valor (S/)</label><input className="input-field" type="number" step="0.01" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })} min={0} /></div>
                            </div>
                            <div><label className="form-label">Notas</label><textarea className="input-field" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ resize: 'vertical' }} /></div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary">{editing ? 'Guardar' : 'Crear Activo'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
