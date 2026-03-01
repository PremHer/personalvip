'use client';

import { useEffect, useState } from 'react';
import { plansApi, membershipsApi, clientsApi } from '@/lib/api';
import { useUI } from '@/lib/ui-context';
import { CreditCard, Plus, X, Snowflake, Play, Ban, AlertTriangle, DollarSign, Tag, Pencil } from 'lucide-react';

export default function MembershipsPage() {
    const { toast, confirm } = useUI();
    const [plans, setPlans] = useState<any[]>([]);
    const [expiring, setExpiring] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
    const [planForm, setPlanForm] = useState({ name: '', durationDays: 30, price: 0, description: '' });
    const [assignForm, setAssignForm] = useState({ clientId: '', planId: '', amountPaid: 0, paymentMethod: 'CASH' });
    const [clients, setClients] = useState<any[]>([]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [p, e] = await Promise.all([plansApi.list(), membershipsApi.expiring(14)]);
            setPlans(p); setExpiring(e);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const loadClients = async () => {
        const res = await clientsApi.list(1, 100);
        setClients(res.data);
    };

    const openNewPlan = () => {
        setEditingPlanId(null);
        setPlanForm({ name: '', durationDays: 30, price: 0, description: '' });
        setShowPlanModal(true);
    };

    const openEditPlan = (plan: any) => {
        setEditingPlanId(plan.id);
        setPlanForm({ name: plan.name, durationDays: plan.durationDays, price: Number(plan.price), description: plan.description || '' });
        setShowPlanModal(true);
    };

    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = { ...planForm, durationDays: Number(planForm.durationDays), price: Number(planForm.price) };
            if (editingPlanId) {
                await plansApi.update(editingPlanId, data);
                toast('Plan actualizado correctamente');
            } else {
                await plansApi.create(data);
                toast('Plan creado correctamente');
            }
            setShowPlanModal(false); setPlanForm({ name: '', durationDays: 30, price: 0, description: '' }); setEditingPlanId(null); loadData();
        } catch (e: any) { toast(e.message || 'Error al guardar plan', 'error'); }
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await membershipsApi.assign({ ...assignForm, amountPaid: Number(assignForm.amountPaid) });
            setShowAssignModal(false); setAssignForm({ clientId: '', planId: '', amountPaid: 0, paymentMethod: 'CASH' }); loadData();
            toast('Membresía asignada correctamente');
        } catch (e: any) { toast(e.message || 'Error al asignar', 'error'); }
    };

    const handleFreeze = async (id: string) => { const ok = await confirm({ title: '¿Congelar membresía?', message: 'La membresía se pausará temporalmente.', confirmText: 'Congelar' }); if (ok) { await membershipsApi.freeze(id); toast('Membresía congelada'); loadData(); } };
    const handleUnfreeze = async (id: string) => { await membershipsApi.unfreeze(id); toast('Membresía reactivada'); loadData(); };
    const handleCancel = async (id: string) => { const ok = await confirm({ title: '¿Cancelar membresía?', message: 'Esta acción no se puede deshacer.', confirmText: 'Cancelar Membresía', danger: true }); if (ok) { await membershipsApi.cancel(id); toast('Membresía cancelada'); loadData(); } };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><div className="spinner spinner-lg" /></div>;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div className="page-header" style={{ marginBottom: 0 }}><h1>Membresías</h1><p>Planes y asignaciones</p></div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" onClick={openNewPlan}><Plus size={16} /> Nuevo Plan</button>
                    <button className="btn-primary" onClick={() => { loadClients(); setShowAssignModal(true); }}><CreditCard size={16} /> Asignar</button>
                </div>
            </div>

            {/* Plans Grid */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Tag size={16} color="var(--color-primary-light)" />
                <h2 style={{ fontSize: '14px', fontWeight: 600 }}>Planes Disponibles</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', marginBottom: '32px' }}>
                {plans.map((plan, i) => (
                    <div key={plan.id} className="glass-card" style={{ padding: '20px', animationDelay: `${i * 60}ms`, position: 'relative' }}>
                        <button className="btn-icon" onClick={() => openEditPlan(plan)} title="Editar plan" style={{ position: 'absolute', top: '12px', right: '12px', opacity: 0.5 }}><Pencil size={14} /></button>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', paddingRight: '28px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, lineHeight: 1.3 }}>{plan.name}</h3>
                            <span className={`badge ${plan.isActive ? 'badge-active' : 'badge-cancelled'}`}>
                                {plan.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-primary-light)', marginBottom: '2px' }}>
                            S/{Number(plan.price).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>{plan.durationDays} días</div>
                        {plan.description && (
                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5, borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                                {plan.description}
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {/* Expiring memberships */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <AlertTriangle size={16} color="var(--color-warning)" />
                <h2 style={{ fontSize: '14px', fontWeight: 600 }}>Membresías por Vencer (14 días)</h2>
                {expiring.length > 0 && <span className="badge badge-warning">{expiring.length}</span>}
            </div>

            {expiring.length > 0 ? (
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>Cliente</th><th>Plan</th><th>Vence</th><th>Estado</th><th style={{ width: '100px' }}>Acciones</th></tr></thead>
                        <tbody>
                            {expiring.map((m) => (
                                <tr key={m.id}>
                                    <td style={{ fontWeight: 500, color: 'var(--color-text)' }}>{m.client?.name}</td>
                                    <td>{m.plan?.name}</td>
                                    <td style={{ color: 'var(--color-warning)', fontWeight: 500 }}>{new Date(m.endDate).toLocaleDateString('es-ES')}</td>
                                    <td><span className={`badge badge-${m.status === 'ACTIVE' ? 'active' : m.status === 'FROZEN' ? 'frozen' : 'cancelled'}`}>{m.status}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {m.status === 'ACTIVE' && <button className="btn-icon info" onClick={() => handleFreeze(m.id)} title="Congelar"><Snowflake size={14} /></button>}
                                            {m.status === 'FROZEN' && <button className="btn-icon success" onClick={() => handleUnfreeze(m.id)} title="Descongelar"><Play size={14} /></button>}
                                            <button className="btn-icon danger" onClick={() => handleCancel(m.id)} title="Cancelar"><Ban size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="glass-card empty-state">✅ No hay membresías próximas a vencer</div>
            )}

            {/* Create Plan Modal */}
            {showPlanModal && (
                <div className="modal-overlay">
                    <div className="modal-card slide-up">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>{editingPlanId ? 'Editar Plan' : 'Nuevo Plan'}</h2>
                            <button className="btn-icon" onClick={() => setShowPlanModal(false)}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div><label className="form-label">Nombre del plan *</label><input className="input-field" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} required /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div><label className="form-label">Duración (días)</label><input className="input-field" type="number" value={planForm.durationDays} onChange={(e) => setPlanForm({ ...planForm, durationDays: Number(e.target.value) })} min={1} required /></div>
                                <div><label className="form-label">Precio (S/)</label><input className="input-field" type="number" step="0.01" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })} min={0} required /></div>
                            </div>
                            <div><label className="form-label">Descripción</label><textarea className="input-field" rows={2} value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} style={{ resize: 'vertical' }} /></div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowPlanModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary">{editingPlanId ? 'Guardar Cambios' : 'Crear Plan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Modal */}
            {showAssignModal && (
                <div className="modal-overlay">
                    <div className="modal-card slide-up">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Asignar Membresía</h2>
                            <button className="btn-icon" onClick={() => setShowAssignModal(false)}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div><label className="form-label">Cliente *</label>
                                <select className="input-field" value={assignForm.clientId} onChange={(e) => setAssignForm({ ...assignForm, clientId: e.target.value })} required>
                                    <option value="">Seleccionar cliente...</option>
                                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div><label className="form-label">Plan *</label>
                                <select className="input-field" value={assignForm.planId} onChange={(e) => {
                                    const plan = plans.find(p => p.id === e.target.value);
                                    setAssignForm({ ...assignForm, planId: e.target.value, amountPaid: plan ? Number(plan.price) : 0 });
                                }} required>
                                    <option value="">Seleccionar plan...</option>
                                    {plans.filter(p => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name} - S/{Number(p.price).toFixed(2)}</option>)}
                                </select>
                            </div>
                            <div><label className="form-label">Monto Pagado (S/)</label>
                                <input className="input-field" type="number" step="0.01" value={assignForm.amountPaid} onChange={(e) => setAssignForm({ ...assignForm, amountPaid: Number(e.target.value) })} min={0} required />
                            </div>
                            <div><label className="form-label">Método de Pago *</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                    {[{ v: 'CASH', l: '💵 Efectivo' }, { v: 'CARD', l: '💳 Tarjeta' }, { v: 'TRANSFER', l: '🏦 Transfer.' }, { v: 'YAPE_PLIN', l: '📱 Yape/Plin' }].map(m => (
                                        <button key={m.v} type="button" onClick={() => setAssignForm({ ...assignForm, paymentMethod: m.v })}
                                            style={{ padding: '10px 6px', borderRadius: '10px', border: assignForm.paymentMethod === m.v ? '2px solid var(--color-primary-light)' : '1px solid var(--color-border)', backgroundColor: assignForm.paymentMethod === m.v ? 'rgba(124,58,237,0.15)' : 'var(--color-bg-tertiary)', color: assignForm.paymentMethod === m.v ? 'var(--color-primary-light)' : 'var(--color-text-muted)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
                                            {m.l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowAssignModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary"><DollarSign size={14} /> Asignar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
