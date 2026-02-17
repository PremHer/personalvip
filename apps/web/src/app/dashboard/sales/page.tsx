'use client';

import { useEffect, useState } from 'react';
import { salesApi, productsApi } from '@/lib/api';
import { Plus, X, DollarSign, Package, ShoppingCart, Minus } from 'lucide-react';

export default function SalesPage() {
    const [sales, setSales] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [saleItems, setSaleItems] = useState<{ productId: string; quantity: number; name: string; price: number }[]>([]);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [clientName, setClientName] = useState('');

    useEffect(() => { loadSales(); }, [page]);

    const loadSales = async () => {
        setLoading(true);
        try { const res = await salesApi.list(page, 20); setSales(res.data); setTotal(res.total); }
        catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const openNewSale = async () => {
        const res = await productsApi.list(1, 100);
        setProducts(res.data.filter((p: any) => p.stock > 0));
        setSaleItems([]); setPaymentMethod('CASH'); setClientName(''); setShowModal(true);
    };

    const addItem = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        const exists = saleItems.find(i => i.productId === productId);
        if (exists) { setSaleItems(saleItems.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i)); }
        else { setSaleItems([...saleItems, { productId, quantity: 1, name: product.name, price: Number(product.salePrice) }]); }
    };

    const saleTotal = saleItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const handleCreateSale = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saleItems.length === 0) return alert('Agrega al menos un producto');
        try {
            await salesApi.create({ items: saleItems.map(i => ({ productId: i.productId, quantity: i.quantity })), paymentMethod, clientName: clientName || undefined });
            setShowModal(false); loadSales();
        } catch (e: any) { alert(e.message); }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div className="page-header" style={{ marginBottom: 0 }}><h1>Ventas</h1><p>{total} ventas registradas</p></div>
                <button className="btn-primary" onClick={openNewSale}><ShoppingCart size={16} /> Nueva Venta</button>
            </div>

            {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner spinner-lg" /></div> : (
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>ID</th><th>Fecha</th><th>Cliente</th><th>Items</th><th>Método</th><th>Total</th></tr></thead>
                        <tbody>
                            {sales.map((s) => (
                                <tr key={s.id}>
                                    <td style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{s.id.slice(0, 8)}</td>
                                    <td>{new Date(s.createdAt).toLocaleDateString('es-ES')} {new Date(s.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td>{s.clientName || '—'}</td>
                                    <td><span className="badge badge-primary">{s.items?.length || 0} items</span></td>
                                    <td><span className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>{s.paymentMethod === 'CASH' ? 'Efectivo' : s.paymentMethod === 'CARD' ? 'Tarjeta' : 'Transf.'}</span></td>
                                    <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>S/{Number(s.total).toFixed(2)}</td>
                                </tr>
                            ))}
                            {sales.length === 0 && <tr><td colSpan={6} className="empty-state">No hay ventas registradas</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {total > 20 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                    <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ fontSize: '12px', padding: '8px 14px' }}>Anterior</button>
                    <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>Pág. {page}/{Math.ceil(total / 20)}</span>
                    <button className="btn-secondary" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(page + 1)} style={{ fontSize: '12px', padding: '8px 14px' }}>Siguiente</button>
                </div>
            )}

            {/* POS Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-card slide-up" style={{ maxWidth: '580px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Nueva Venta</h2>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>

                        {/* Product selector */}
                        <div style={{ marginBottom: '14px' }}>
                            <label className="form-label">Agregar Producto</label>
                            <select className="input-field" onChange={(e) => { if (e.target.value) addItem(e.target.value); e.target.value = ''; }}>
                                <option value="">Seleccionar...</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name} — S/{Number(p.salePrice).toFixed(2)} (Stock: {p.stock})</option>)}
                            </select>
                        </div>

                        {/* Cart Items */}
                        {saleItems.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                                {saleItems.map(item => (
                                    <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: 'var(--color-surface-2)' }}>
                                        <Package size={14} color="var(--color-text-muted)" />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 500, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{item.name}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>S/{item.price.toFixed(2)} c/u</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <button className="btn-icon" style={{ width: '26px', height: '26px' }}
                                                onClick={() => setSaleItems(saleItems.map(i => i.productId === item.productId && i.quantity > 1 ? { ...i, quantity: i.quantity - 1 } : i))}>
                                                <Minus size={12} />
                                            </button>
                                            <span style={{ fontWeight: 700, fontSize: '13px', minWidth: '18px', textAlign: 'center' as const }}>{item.quantity}</span>
                                            <button className="btn-icon" style={{ width: '26px', height: '26px' }}
                                                onClick={() => setSaleItems(saleItems.map(i => i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i))}>
                                                <Plus size={12} />
                                            </button>
                                        </div>
                                        <span style={{ fontWeight: 700, fontSize: '13px', minWidth: '60px', textAlign: 'right' as const }}>S/{(item.price * item.quantity).toFixed(2)}</span>
                                        <button className="btn-icon danger" style={{ width: '26px', height: '26px' }}
                                            onClick={() => setSaleItems(saleItems.filter(i => i.productId !== item.productId))}>
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                            <div><label className="form-label">Cliente (opcional)</label><input className="input-field" value={clientName} onChange={(e) => setClientName(e.target.value)} /></div>
                            <div><label className="form-label">Método de Pago</label>
                                <select className="input-field" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                    <option value="CASH">Efectivo</option><option value="CARD">Tarjeta</option><option value="TRANSFER">Transferencia</option>
                                </select>
                            </div>
                        </div>

                        {/* Total */}
                        <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'var(--color-surface-2)', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, fontSize: '14px' }}>Total:</span>
                            <span style={{ fontWeight: 800, fontSize: '22px', color: 'var(--color-success)', letterSpacing: '-0.02em' }}>S/{saleTotal.toFixed(2)}</span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button className="btn-primary" onClick={handleCreateSale} disabled={saleItems.length === 0}><DollarSign size={14} /> Registrar Venta</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
