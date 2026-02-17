'use client';

import { useEffect, useState } from 'react';
import { plansApi, membershipsApi, clientsApi } from '@/lib/api';
import { CreditCard, Plus, X, Snowflake, Play, Ban, AlertTriangle, DollarSign, Tag } from 'lucide-react';

export default function MembershipsPage() {
    const [plans, setPlans] = useState<any[]>([]);
    const [expiring, setExpiring] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [planForm, setPlanForm] = useState({ name: '', durationDays: 30, price: 0, description: '' });
    const [assignForm, setAssignForm] = useState({ clientId: '', planId: '', amountPaid: 0 });
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

    const handleCreatePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await plansApi.create({ ...planForm, durationDays: Number(planForm.durationDays), price: Number(planForm.price) });
            setShowPlanModal(false); setPlanForm({ name: '', durationDays: 30, price: 0, description: '' }); loadData();
        } catch (e: any) { alert(e.message); }
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await membershipsApi.assign({ ...assignForm, amountPaid: Number(assignForm.amountPaid) });
            setShowAssignModal(false); setAssignForm({ clientId: '', planId: '', amountPaid: 0 }); loadData();
        } catch (e: any) { alert(e.message); }
    };

    const handleFreeze = async (id: string) => { if (confirm('¿Congelar esta membresía?')) { await membershipsApi.freeze(id); loadData(); } };
    const handleUnfreeze = async (id: string) => { await membershipsApi.unfreeze(id); loadData(); };
    const handleCancel = async (id: string) => { if (confirm('¿Cancelar esta membresía?')) { await membershipsApi.cancel(id); loadData(); } };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><div className="spinner spinner-lg" /></div>;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div className="page-header" style={{ marginBottom: 0 }}><h1>Membresías</h1><p>Planes y asignaciones</p></div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" onClick={() => setShowPlanModal(true)}><Plus size={16} /> Nuevo Plan</button>
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
                    <div key={plan.id} className="glass-card" style={{ padding: '20px', animationDelay: `${i * 60}ms` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
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
                            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Nuevo Plan</h2>
                            <button className="btn-icon" onClick={() => setShowPlanModal(false)}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleCreatePlan} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div><label className="form-label">Nombre del plan *</label><input className="input-field" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} required /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div><label className="form-label">Duración (días)</label><input className="input-field" type="number" value={planForm.durationDays} onChange={(e) => setPlanForm({ ...planForm, durationDays: Number(e.target.value) })} min={1} required /></div>
                                <div><label className="form-label">Precio (S/)</label><input className="input-field" type="number" step="0.01" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })} min={0} required /></div>
                            </div>
                            <div><label className="form-label">Descripción</label><textarea className="input-field" rows={2} value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} style={{ resize: 'vertical' }} /></div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowPlanModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary">Crear Plan</button>
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
