'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { plansApi, membershipsApi, clientsApi } from '@/lib/api';
import { useUI } from '@/lib/ui-context';
import MembershipCalendar from '@/components/MembershipCalendar';
import { format } from 'date-fns';
import { CreditCard, Plus, X, Snowflake, Play, Ban, AlertTriangle, DollarSign, Tag, Pencil } from 'lucide-react';

const calculateExpiryDate = (startStr: string, durationDays: number): string | undefined => {
    if (!startStr) return undefined;
    const parts = startStr.split('T')[0].split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));

    // Use literal day addition for non-monthly granular plans (e.g., 15 days fortnight or weekly)
    if (durationDays === 15 || durationDays < 28) {
        d.setDate(d.getDate() + durationDays);
    } else {
        // Enforce month-to-month calendar expiration format for 1M, 2M, 3M, 6M, 12M plans.
        let months = Math.round(durationDays / 30);
        if (durationDays >= 360) months = 12;

        const expectedMonth = d.getMonth() + months;
        d.setMonth(expectedMonth);

        // Correct for Month overflows (e.g., matching Feb 31st down to Feb 28th max)
        if (d.getMonth() !== expectedMonth % 12) {
            d.setDate(0); 
        }
    }

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export default function MembershipsPage() {
    const { user } = useAuth();
    const canEditPlans = user?.role === 'ADMIN' || user?.role === 'OWNER';
    const { toast, confirm } = useUI();
    const [plans, setPlans] = useState<any[]>([]);
    const [expiring, setExpiring] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
    const [planForm, setPlanForm] = useState({ name: '', durationDays: 30, price: 0, description: '' });
    const [assignForm, setAssignForm] = useState({ clientId: '', planId: '', amountPaid: 0, paymentMethod: 'CASH', receiptUrl: '', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: undefined as string | undefined });
    const [assignMode, setAssignMode] = useState<'replace' | 'queue'>('queue');
    const [activeClientMembership, setActiveClientMembership] = useState<any>(null);
    const [extraClients, setExtraClients] = useState<string[]>([]);
    const [extraAmounts, setExtraAmounts] = useState<number[]>([]);
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
        const res = await clientsApi.list(1, 200);
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

    // Check active membership when client is selected
    const handleClientSelect = async (clientId: string) => {
        setAssignForm(prev => ({ ...prev, clientId }));
        setActiveClientMembership(null);
        if (clientId) {
            try {
                const client = await clientsApi.get(clientId);
                const active = client.memberships?.find((m: any) => m.status === 'ACTIVE');
                if (active) { setActiveClientMembership(active); setAssignMode('queue'); }
            } catch { /* ignore */ }
        }
    };

    // Detect duo/trio plan (accent-insensitive)
    const selectedPlan = plans.find(p => p.id === assignForm.planId);
    const normName = (selectedPlan?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const isDuoPlan = normName.includes('duo');
    const isTrioPlan = normName.includes('trio');
    const extraSlotsNeeded = isTrioPlan ? 2 : isDuoPlan ? 1 : 0;

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const baseData = { ...assignForm, amountPaid: Number(assignForm.amountPaid), mode: activeClientMembership ? assignMode : 'replace' };
            // Assign to primary client
            await membershipsApi.assign(baseData);
            // Assign to extra clients (duo/trio) with their individual amounts
            for (let i = 0; i < extraClients.length; i++) {
                const cId = extraClients[i];
                if (!cId) continue;
                const extraAmt = extraAmounts[i] || 0;
                await membershipsApi.assign({ ...baseData, clientId: cId, amountPaid: extraAmt });
            }
            setShowAssignModal(false);
            setAssignForm({ clientId: '', planId: '', amountPaid: 0, paymentMethod: 'CASH', receiptUrl: '', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: undefined });
            setActiveClientMembership(null); setExtraClients([]); setExtraAmounts([]); loadData();
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
                    {canEditPlans && <button className="btn-secondary" onClick={openNewPlan}><Plus size={16} /> Nuevo Plan</button>}
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
                        {canEditPlans && <button className="btn-icon" onClick={() => openEditPlan(plan)} title="Editar plan" style={{ position: 'absolute', top: '12px', right: '12px', opacity: 0.5 }}><Pencil size={14} /></button>}
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
                    <div className="modal-card slide-up" style={{ maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Asignar Membresía</h2>
                            <button className="btn-icon" onClick={() => { setShowAssignModal(false); setActiveClientMembership(null); setExtraClients([]); }}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div><label className="form-label">Cliente Principal *</label>
                                <select className="input-field" value={assignForm.clientId} onChange={(e) => handleClientSelect(e.target.value)} required>
                                    <option value="">Seleccionar cliente...</option>
                                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name} {c.dni ? `(${c.dni})` : ''}</option>)}
                                </select>
                            </div>

                            {/* Active membership warning */}
                            {activeClientMembership && (
                                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                        <AlertTriangle size={14} color="#F59E0B" />
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase' }}>Membresía activa</span>
                                    </div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{activeClientMembership.plan?.name}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                        Vence: {new Date(activeClientMembership.endDate).toLocaleDateString('es-PE')}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                                        <button type="button" onClick={() => setAssignMode('queue')}
                                            style={{ padding: '8px', borderRadius: '8px', border: assignMode === 'queue' ? '2px solid #22c55e' : '1px solid var(--color-border)', backgroundColor: assignMode === 'queue' ? 'rgba(34,197,94,0.1)' : 'var(--color-bg-tertiary)', color: assignMode === 'queue' ? '#22c55e' : 'var(--color-text-muted)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}>
                                            📅 Encolar (inicia al vencer)
                                        </button>
                                        <button type="button" onClick={() => setAssignMode('replace')}
                                            style={{ padding: '8px', borderRadius: '8px', border: assignMode === 'replace' ? '2px solid #ef4444' : '1px solid var(--color-border)', backgroundColor: assignMode === 'replace' ? 'rgba(239,68,68,0.1)' : 'var(--color-bg-tertiary)', color: assignMode === 'replace' ? '#ef4444' : 'var(--color-text-muted)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}>
                                            🔄 Reemplazar (cancela actual)
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div><label className="form-label">Plan *</label>
                                <select className="input-field" value={assignForm.planId} onChange={(e) => {
                                    const plan = plans.find(p => p.id === e.target.value);
                                    const pName = (plan?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                                    const slots = pName.includes('trio') ? 2 : pName.includes('duo') ? 1 : 0;
                                    let endStr = assignForm.endDate;
                                    if (plan && assignForm.startDate) endStr = calculateExpiryDate(assignForm.startDate, plan.durationDays) || endStr;
                                    setAssignForm({ ...assignForm, planId: e.target.value, amountPaid: plan ? Number(plan.price) : 0, endDate: endStr });
                                    setExtraClients(Array(slots).fill(''));
                                    setExtraAmounts(Array(slots).fill(plan ? Number(plan.price) : 0));
                                }} required>
                                    <option value="">Seleccionar plan...</option>
                                    {plans.filter(p => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name} - S/{Number(p.price).toFixed(2)}</option>)}
                                </select>
                            </div>

                            {/* Extra clients for Duo/Trio */}
                            {extraSlotsNeeded > 0 && (
                                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary-light)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                        👥 Clientes adicionales ({isTrioPlan ? 'Trío: 2 más' : 'Dúo: 1 más'})
                                    </div>
                                    {Array.from({ length: extraSlotsNeeded }).map((_, i) => (
                                        <div key={i} style={{ marginBottom: i < extraSlotsNeeded - 1 ? '8px' : 0 }}>
                                            <label className="form-label" style={{ marginTop: 0 }}>Cliente {i + 2} *</label>
                                            <select className="input-field" value={extraClients[i] || ''} onChange={(e) => {
                                                const updated = [...extraClients]; updated[i] = e.target.value; setExtraClients(updated);
                                            }} required>
                                                <option value="">Seleccionar cliente...</option>
                                                {clients.filter(c => c.id !== assignForm.clientId && (c.id === extraClients[i] || !extraClients.includes(c.id))).map(c =>
                                                    <option key={c.id} value={c.id}>{c.name} {c.dni ? `(${c.dni})` : ''}</option>
                                                )}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ marginBottom: '16px' }}>
                                <label className="form-label" style={{ marginBottom: '8px' }}>Periodo de Entrenamiento (Fechas)</label>
                                <MembershipCalendar
                                    startDate={assignForm.startDate
                                        ? new Date(`${assignForm.startDate}T00:00:00`)
                                        : (assignMode === 'queue' && activeClientMembership)
                                            ? (() => { const d = new Date(activeClientMembership.endDate); d.setDate(d.getDate() + 1); return d; })()
                                            : undefined}
                                    endDate={assignForm.endDate ? new Date(`${assignForm.endDate}T00:00:00`) : undefined}
                                    durationDays={plans.find(p => p.id === assignForm.planId)?.durationDays || 0}
                                    onChange={(date) => {
                                        const plan = plans.find(p => p.id === assignForm.planId);
                                        const startStr = format(date, 'yyyy-MM-dd');
                                        const endStr = plan ? calculateExpiryDate(startStr, plan.durationDays) : undefined;
                                        setAssignForm({
                                            ...assignForm,
                                            startDate: startStr,
                                            endDate: endStr
                                        });
                                    }}
                                />
                                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                                    Toque cualquier día para cambiar la fecha de inicio.
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {/* Resumen de precio total para Duo/Trio */}
                                {extraSlotsNeeded > 0 && selectedPlan && (
                                    <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', fontSize: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: 'var(--color-text-muted)' }}>Precio por persona: <strong style={{ color: 'var(--color-text)' }}>S/{Number(selectedPlan.price).toFixed(2)}</strong></span>
                                            <span style={{ fontWeight: 700, color: 'var(--color-secondary)' }}>Total: S/{(Number(selectedPlan.price) * (extraSlotsNeeded + 1)).toFixed(2)}</span>
                                        </div>
                                        {(() => {
                                            const totalAllPaid = Number(assignForm.amountPaid) + extraAmounts.reduce((s, a) => s + (a || 0), 0);
                                            const totalAllPrice = Number(selectedPlan.price) * (extraSlotsNeeded + 1);
                                            const totalDebt = totalAllPrice - totalAllPaid;
                                            return totalDebt > 0 ? (
                                                <div style={{ marginTop: '4px', color: '#F59E0B', fontWeight: 600 }}>Deuda total: S/ {totalDebt.toFixed(2)}</div>
                                            ) : null;
                                        })()}
                                    </div>
                                )}

                                {/* Monto cliente principal */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <label className="form-label" style={{ marginBottom: 0 }}>
                                            {extraSlotsNeeded > 0 ? `💰 Pago Cliente 1 (${clients.find(c => c.id === assignForm.clientId)?.name || 'Principal'})` : 'Monto Pagado Hoy (S/)'}
                                        </label>
                                        {selectedPlan && assignForm.amountPaid < Number(selectedPlan.price) && (
                                            <span className="badge badge-warning" style={{ fontSize: '10px' }}>
                                                Deuda: S/ {(Number(selectedPlan.price) - assignForm.amountPaid).toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                    <input className="input-field" type="number" step="0.10" value={assignForm.amountPaid}
                                        onChange={(e) => setAssignForm({ ...assignForm, amountPaid: Number(e.target.value) })}
                                        min={0} max={selectedPlan ? Number(selectedPlan.price) : undefined} required
                                    />
                                </div>

                                {/* Montos por cada cliente extra (Duo/Trio) */}
                                {extraSlotsNeeded > 0 && extraClients.map((cId, i) => {
                                    const clientName = clients.find(c => c.id === cId)?.name || `Cliente ${i + 2}`;
                                    const extraAmt = extraAmounts[i] || 0;
                                    const planPrice = selectedPlan ? Number(selectedPlan.price) : 0;
                                    return (
                                        <div key={i}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                <label className="form-label" style={{ marginBottom: 0 }}>💰 Pago Cliente {i + 2} ({clientName})</label>
                                                {planPrice > 0 && extraAmt < planPrice && (
                                                    <span className="badge badge-warning" style={{ fontSize: '10px' }}>
                                                        Deuda: S/ {(planPrice - extraAmt).toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                            <input className="input-field" type="number" step="0.10" value={extraAmt}
                                                onChange={(e) => {
                                                    const updated = [...extraAmounts];
                                                    updated[i] = Number(e.target.value);
                                                    setExtraAmounts(updated);
                                                }}
                                                min={0} max={planPrice || undefined}
                                            />
                                        </div>
                                    );
                                })}
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
                            <div><label className="form-label">Comprobante de Pago (opcional)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <label style={{ padding: '8px 14px', borderRadius: '8px', border: '1px dashed var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        📷 Subir imagen
                                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = () => setAssignForm(prev => ({ ...prev, receiptUrl: reader.result as string }));
                                                reader.readAsDataURL(file);
                                            }
                                        }} />
                                    </label>
                                    {assignForm.receiptUrl && (
                                        <div style={{ position: 'relative' }}>
                                            <img src={assignForm.receiptUrl} alt="Comprobante" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
                                            <button type="button" onClick={() => setAssignForm(prev => ({ ...prev, receiptUrl: '' }))} style={{ position: 'absolute', top: '-6px', right: '-6px', width: '16px', height: '16px', borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <button type="button" className="btn-secondary" onClick={() => { setShowAssignModal(false); setActiveClientMembership(null); setExtraClients([]); }}>Cancelar</button>
                                <button type="submit" className="btn-primary"><DollarSign size={14} /> Asignar{extraSlotsNeeded > 0 ? ` (${extraSlotsNeeded + 1} clientes)` : ''}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
