'use client';

import { useEffect, useState } from 'react';
import { productsApi } from '@/lib/api';
import { Search, Plus, Edit, Trash2, AlertTriangle, X, Package } from 'lucide-react';

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [lowStock, setLowStock] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({ name: '', category: '', barcode: '', costPrice: 0, salePrice: 0, stock: 0, minStock: 5 });

    useEffect(() => { loadProducts(); }, [page, search]);
    useEffect(() => { productsApi.lowStock().then(setLowStock).catch(console.error); }, []);

    const loadProducts = async () => {
        setLoading(true);
        try { const res = await productsApi.list(page, 20, search || undefined); setProducts(res.data); setTotal(res.total); }
        catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = { ...form, costPrice: Number(form.costPrice), salePrice: Number(form.salePrice), stock: Number(form.stock), minStock: Number(form.minStock) };
            if (editing) { await productsApi.update(editing.id, data); } else { await productsApi.create(data); }
            setShowModal(false); setEditing(null); loadProducts();
        } catch (e: any) { alert(e.message); }
    };

    const openEdit = (p: any) => {
        setEditing(p);
        setForm({ name: p.name, category: p.category || '', barcode: p.barcode || '', costPrice: Number(p.costPrice), salePrice: Number(p.salePrice), stock: p.stock, minStock: p.minStock });
        setShowModal(true);
    };

    const openNew = () => {
        setEditing(null);
        setForm({ name: '', category: '', barcode: '', costPrice: 0, salePrice: 0, stock: 0, minStock: 5 });
        setShowModal(true);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div className="page-header" style={{ marginBottom: 0 }}><h1>Inventario</h1><p>{total} productos</p></div>
                <button className="btn-primary" onClick={openNew}><Plus size={16} /> Nuevo Producto</button>
            </div>

            {lowStock.length > 0 && (
                <div className="alert alert-warning" style={{ marginBottom: '16px' }}>
                    <AlertTriangle size={16} />
                    <strong>{lowStock.length}</strong> productos con stock bajo: {lowStock.map(p => p.name).join(', ')}
                </div>
            )}

            <div style={{ marginBottom: '16px', position: 'relative', maxWidth: '380px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input className="input-field" placeholder="Buscar producto..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: '38px' }} />
            </div>

            {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner spinner-lg" /></div> : (
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>Producto</th><th>Categoría</th><th>Costo</th><th>Precio</th><th>Stock</th><th style={{ width: '80px' }}>Acciones</th></tr></thead>
                        <tbody>
                            {products.map((p) => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 500, color: 'var(--color-text)' }}>{p.name}</td>
                                    <td>{p.category || '—'}</td>
                                    <td>S/{Number(p.costPrice).toFixed(2)}</td>
                                    <td style={{ fontWeight: 600 }}>S/{Number(p.salePrice).toFixed(2)}</td>
                                    <td>
                                        <span style={{ fontWeight: 600, color: p.stock <= p.minStock ? 'var(--color-danger)' : 'var(--color-success)' }}>{p.stock}</span>
                                        {p.stock <= p.minStock && <AlertTriangle size={12} color="var(--color-danger)" style={{ marginLeft: '4px', verticalAlign: 'middle' }} />}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button className="btn-icon" onClick={() => openEdit(p)} title="Editar"><Edit size={14} /></button>
                                            <button className="btn-icon danger" onClick={async () => { if (confirm(`¿Eliminar ${p.name}?`)) { await productsApi.delete(p.id); loadProducts(); } }} title="Eliminar"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {products.length === 0 && <tr><td colSpan={6} className="empty-state">No hay productos</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-card slide-up">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>{editing ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div><label className="form-label">Nombre *</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div><label className="form-label">Categoría</label><input className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                                <div><label className="form-label">Código de barras</label><input className="input-field" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div><label className="form-label">Precio Costo (S/)</label><input className="input-field" type="number" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })} min={0} /></div>
                                <div><label className="form-label">Precio Venta (S/)</label><input className="input-field" type="number" step="0.01" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })} min={0} /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div><label className="form-label">Stock</label><input className="input-field" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} min={0} /></div>
                                <div><label className="form-label">Stock Mínimo</label><input className="input-field" type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} min={0} /></div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary">{editing ? 'Guardar' : 'Crear Producto'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
