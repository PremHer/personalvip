'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientsApi, plansApi, membershipsApi, attendanceApi } from '@/lib/api';
import { useUI } from '@/lib/ui-context';
import { SkeletonTable } from '@/lib/skeleton';
import { exportToCSV } from '@/lib/export';
import { Search, Plus, Edit, Trash2, X, UserPlus, Users, CreditCard, Eye, QrCode, Download, Printer, Zap } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function ClientsPage() {
    const router = useRouter();
    const { toast, confirm } = useUI();
    const [clients, setClients] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [memberFilter, setMemberFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState<any>(null);
    const [form, setForm] = useState({ name: '', email: '', phone: '', dni: '', emergencyContact: '', medicalNotes: '' });

    // Assign membership modal
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignClient, setAssignClient] = useState<any>(null);
    const [plans, setPlans] = useState<any[]>([]);
    const [assignForm, setAssignForm] = useState({ planId: '', amountPaid: 0, mode: 'replace' as 'replace' | 'queue' });
    const [assigning, setAssigning] = useState(false);

    // Detail modal
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailClient, setDetailClient] = useState<any>(null);

    // QR modal
    const [showQrModal, setShowQrModal] = useState(false);
    const [qrClient, setQrClient] = useState<any>(null);

    // Daily pass modal
    const [showDailyPassModal, setShowDailyPassModal] = useState(false);
    const [dpStep, setDpStep] = useState<'search' | 'form' | 'result'>('search');
    const [dpDni, setDpDni] = useState('');
    const [dpFound, setDpFound] = useState<any>(null);
    const [dpSearching, setDpSearching] = useState(false);
    const [dpForm, setDpForm] = useState({ name: '', phone: '', amountPaid: 10 });
    const [dpSaving, setDpSaving] = useState(false);
    const [dpResult, setDpResult] = useState<any>(null);

    const openQr = (client: any) => {
        setQrClient(client);
        setShowQrModal(true);
    };

    const downloadQr = () => {
        if (!qrClient) return;
        const svg = document.getElementById('client-qr-svg');
        if (!svg) return;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        canvas.width = 400; canvas.height = 400;
        const ctx = canvas.getContext('2d')!;
        const img = new Image();
        img.onload = () => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 400, 400);
            ctx.drawImage(img, 0, 0, 400, 400);
            const link = document.createElement('a');
            link.download = `QR-${qrClient.name.replace(/\s+/g, '_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    const printQr = () => {
        const svgEl = document.getElementById('client-qr-svg');
        if (!svgEl || !qrClient) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const svgData = new XMLSerializer().serializeToString(svgEl);
        printWindow.document.write(`
            <html><head><title>QR - ${qrClient.name}</title>
            <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;}
            h2{margin-bottom:8px;}p{color:#666;margin:4px 0;}</style></head>
            <body><h2>${qrClient.name}</h2><p>Código: ${qrClient.qrCode}</p>
            <div style="margin:20px 0">${svgData}</div>
            <p style="font-size:12px;color:#999">Personal VIP — Membresía</p>
            <script>setTimeout(()=>window.print(),300)</script></body></html>
        `);
        printWindow.document.close();
    };

    useEffect(() => { loadClients(); }, [page, search]);

    const loadClients = async () => {
        setLoading(true);
        try {
            const res = await clientsApi.list(page, 20, search || undefined);
            setClients(res.data);
            setTotal(res.total);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dataToSave = {
                ...form,
                email: form.email?.trim() || undefined,
                phone: form.phone?.trim() || undefined,
                emergencyContact: form.emergencyContact?.trim() || undefined,
                medicalNotes: form.medicalNotes?.trim() || undefined,
            };
            if (editingClient) { await clientsApi.update(editingClient.id, dataToSave); toast('Cliente actualizado correctamente'); }
            else { await clientsApi.create(dataToSave); toast('Cliente creado correctamente'); }
            setShowModal(false); setEditingClient(null);
            setForm({ name: '', email: '', phone: '', dni: '', emergencyContact: '', medicalNotes: '' });
            loadClients();
        } catch (e: any) { toast(e.message || 'Error al guardar', 'error'); }
    };

    const handleDelete = async (id: string, name: string) => {
        const ok = await confirm({ title: '¿Eliminar cliente?', message: `Se eliminará permanentemente a "${name}" y todos sus datos asociados.`, confirmText: 'Eliminar', danger: true });
        if (ok) { await clientsApi.delete(id); toast('Cliente eliminado'); loadClients(); }
    };

    const openEdit = (c: any) => {
        setEditingClient(c);
        setForm({ name: c.name, email: c.email || '', phone: c.phone || '', dni: c.dni || '', emergencyContact: c.emergencyContact || '', medicalNotes: c.medicalNotes || '' });
        setShowModal(true);
    };

    const openNew = () => {
        setEditingClient(null);
        setForm({ name: '', email: '', phone: '', dni: '', emergencyContact: '', medicalNotes: '' });
        setShowModal(true);
    };

    const openAssign = async (client: any) => {
        setAssignClient(client);
        setAssignForm({ planId: '', amountPaid: 0, mode: 'replace' });
        try {
            const p = await plansApi.list();
            setPlans(p.filter((pl: any) => pl.isActive));
        } catch (e) { console.error(e); }
        setShowAssignModal(true);
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignForm.planId) return;
        setAssigning(true);
        try {
            await membershipsApi.assign({
                clientId: assignClient.id,
                planId: assignForm.planId,
                amountPaid: Number(assignForm.amountPaid),
                mode: assignClient.activeMembership?.status === 'ACTIVE' ? assignForm.mode : 'replace',
            });
            setShowAssignModal(false);
            setAssignClient(null);
            loadClients();
            toast('Membresía asignada correctamente');
        } catch (e: any) { toast(e.message || 'Error al asignar membresía', 'error'); }
        finally { setAssigning(false); }
    };

    const openDetail = async (c: any) => {
        try {
            const detail = await clientsApi.get(c.id);
            setDetailClient(detail);
            setShowDetailModal(true);
        } catch (e) { console.error(e); }
    };

    const handleDniSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dpDni.trim()) return;
        setDpSearching(true);
        try {
            const found = await clientsApi.searchByDni(dpDni.trim());
            if (found) {
                setDpFound(found);
                setDpStep('form');
            } else {
                setDpFound(null);
                setDpForm({ ...dpForm, name: '', phone: '' });
                setDpStep('form');
            }
        } catch {
            setDpFound(null);
            setDpForm({ ...dpForm, name: '', phone: '' });
            setDpStep('form');
        }
        setDpSearching(false);
    };

    const handleDailyPass = async (e: React.FormEvent) => {
        e.preventDefault();
        setDpSaving(true);
        try {
            if (dpFound?.activeMembership) {
                const res = await attendanceApi.checkIn(dpFound.id, 'MANUAL');
                if (res.success) {
                    toast('✅ Asistencia registrada exitosamente');
                    setShowDailyPassModal(false);
                    setDpStep('search'); setDpDni(''); setDpFound(null);
                    loadClients();
                } else {
                    toast(res.message || 'Error al registrar asistencia', 'error');
                }
            } else {
                let clientId: string;
                if (dpFound) {
                    clientId = dpFound.id;
                } else {
                    const newClient = await clientsApi.create({ name: dpForm.name.trim(), phone: dpForm.phone.trim() || undefined, dni: dpDni.trim() || undefined });
                    clientId = newClient.id;
                }
                await membershipsApi.dailyPass({ clientId, amountPaid: Number(dpForm.amountPaid) });
                const fullClient = await clientsApi.get(clientId);
                setDpResult(fullClient);
                setDpStep('result');
                toast('✅ Pase Diario asignado correctamente');
                loadClients();
            }
        } catch (e: any) { toast(e.message || 'Error', 'error'); }
        finally { setDpSaving(false); }
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div className="page-header" style={{ marginBottom: 0 }}>
                    <h1>Clientes</h1>
                    <p>{total} clientes registrados</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" onClick={() => {
                        if (!clients.length) return;
                        const csvData = clients.map((c: any) => ({
                            Nombre: c.name || '',
                            Email: c.email || '',
                            Teléfono: c.phone || '',
                            Membresía: c.activeMembership?.plan?.name || 'Sin membresía',
                            Vence: c.activeMembership?.endDate ? new Date(c.activeMembership.endDate).toLocaleDateString('es-ES') : '',
                            Estado: c.activeMembership?.status === 'ACTIVE' ? 'Activo' : 'Inactivo',
                        }));
                        exportToCSV(csvData, 'clientes');
                    }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                        <Download size={14} /> Exportar CSV
                    </button>
                    <button className="btn-primary" onClick={openNew}>
                        <UserPlus size={16} /> Nuevo Cliente
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div className="stat-card purple">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={18} color="var(--color-primary)" />
                        </div>
                        <div>
                            <div style={{ fontSize: '20px', fontWeight: 700 }}>{total}</div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Total Clientes</div>
                        </div>
                    </div>
                </div>
                <div className="stat-card teal">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={18} color="var(--color-secondary)" />
                        </div>
                        <div>
                            <div style={{ fontSize: '20px', fontWeight: 700 }}>{clients.filter(c => c.activeMembership?.status === 'ACTIVE').length}</div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Con Membresía</div>
                        </div>
                    </div>
                </div>
                <div className="stat-card orange">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={18} color="var(--color-warning)" />
                        </div>
                        <div>
                            <div style={{ fontSize: '20px', fontWeight: 700 }}>{clients.filter(c => !c.activeMembership || c.activeMembership.status !== 'ACTIVE').length}</div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Sin Membresía</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div style={{ marginBottom: '16px', position: 'relative', maxWidth: '380px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input className="input-field" placeholder="Buscar por nombre, email o teléfono..." value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: '38px' }} />
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '4px', background: 'var(--color-surface)', borderRadius: '10px', padding: '3px', border: '1px solid var(--color-border)' }}>
                    {[{ val: '', label: 'Todos' }, { val: 'active', label: 'Con Membresía' }, { val: 'expired', label: 'Vencida' }, { val: 'none', label: 'Sin Membresía' }].map(f => (
                        <button key={f.val} onClick={() => setMemberFilter(f.val)} style={{
                            padding: '5px 12px', borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                            background: memberFilter === f.val ? 'var(--color-primary)' : 'transparent',
                            color: memberFilter === f.val ? 'white' : 'var(--color-text-muted)',
                            transition: 'all 0.15s',
                        }}>{f.label}</button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <SkeletonTable rows={8} cols={5} />
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr><th>Nombre</th><th>DNI</th><th>Email</th><th>Teléfono</th><th>Membresía</th><th>Vence</th><th>Estado</th><th style={{ width: '120px' }}>Acciones</th></tr>
                        </thead>
                        <tbody>
                            {clients.filter(c => {
                                if (!memberFilter) return true;
                                if (memberFilter === 'active') return c.activeMembership?.status === 'ACTIVE';
                                if (memberFilter === 'expired') return c.activeMembership && c.activeMembership.status !== 'ACTIVE';
                                if (memberFilter === 'none') return !c.activeMembership;
                                return true;
                            }).map((c) => (
                                <tr key={c.id}>
                                    <td style={{ fontWeight: 500, color: 'var(--color-text)' }}>{c.name}</td>
                                    <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>{c.dni || '—'}</td>
                                    <td>{c.email || '—'}</td>
                                    <td>{c.phone || '—'}</td>
                                    <td>{c.activeMembership?.plan?.name || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</td>
                                    <td>
                                        {c.activeMembership?.endDate ? (
                                            <span style={{ fontSize: '12px', color: new Date(c.activeMembership.endDate) < new Date() ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
                                                {new Date(c.activeMembership.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td>
                                        {c.activeMembership?.status === 'ACTIVE' ? (
                                            <span className="badge badge-active">Activo</span>
                                        ) : c.activeMembership?.status === 'FROZEN' ? (
                                            <span className="badge badge-frozen">Congelado</span>
                                        ) : (
                                            <span className="badge badge-cancelled">Inactivo</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button className="btn-icon info" onClick={() => router.push(`/dashboard/clients/${c.id}`)} title="Ver perfil"><Eye size={14} /></button>
                                            <button className="btn-icon" onClick={() => openQr(c)} title="Ver QR" style={{ color: 'var(--color-primary)' }}><QrCode size={14} /></button>
                                            <button className="btn-icon success" onClick={() => openAssign(c)} title="Asignar membresía"><CreditCard size={14} /></button>
                                            <button className="btn-icon" onClick={() => openEdit(c)} title="Editar"><Edit size={14} /></button>
                                            <button className="btn-icon danger" onClick={() => handleDelete(c.id, c.name)} title="Eliminar"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {clients.length === 0 && (
                                <tr><td colSpan={8} className="empty-state">No se encontraron clientes</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {total > 20 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                    <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ fontSize: '12px', padding: '8px 14px' }}>Anterior</button>
                    <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        Página {page} de {Math.ceil(total / 20)}
                    </span>
                    <button className="btn-secondary" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(page + 1)} style={{ fontSize: '12px', padding: '8px 14px' }}>Siguiente</button>
                </div>
            )}

            {/* Create/Edit Client Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-card slide-up">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label className="form-label">Nombre *</label>
                                <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div><label className="form-label">Email</label><input className="input-field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                                <div><label className="form-label">DNI *</label><input className="input-field" placeholder="12345678" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} required /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div><label className="form-label">Teléfono</label><input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                                <div><label className="form-label">Contacto de Emergencia</label><input className="input-field" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} /></div>
                            </div>
                            <div><label className="form-label">Notas Médicas</label><textarea className="input-field" rows={2} value={form.medicalNotes} onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })} style={{ resize: 'vertical' }} /></div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary">{editingClient ? 'Guardar' : 'Crear Cliente'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Membership Modal */}
            {showAssignModal && assignClient && (() => {
                const hasActive = assignClient.activeMembership?.status === 'ACTIVE';
                const currentMem = assignClient.activeMembership;
                const selectedPlan = plans.find(p => p.id === assignForm.planId);
                const currentEndDate = currentMem ? new Date(currentMem.endDate) : null;
                const daysRemaining = currentEndDate ? Math.max(0, Math.ceil((currentEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

                // Calculate new membership dates based on mode
                let newStartDate = new Date();
                if (hasActive && assignForm.mode === 'queue' && currentEndDate) {
                    newStartDate = currentEndDate;
                }
                const newEndDate = selectedPlan ? new Date(newStartDate.getTime() + selectedPlan.durationDays * 24 * 60 * 60 * 1000) : null;

                return (
                    <div className="modal-overlay">
                        <div className="modal-card slide-up" style={{ maxWidth: '520px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div>
                                    <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Asignar Membresía</h2>
                                    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                        Cliente: <strong style={{ color: 'var(--color-text)' }}>{assignClient.name}</strong>
                                    </p>
                                </div>
                                <button className="btn-icon" onClick={() => setShowAssignModal(false)}><X size={16} /></button>
                            </div>

                            {/* Current membership info */}
                            {hasActive && currentMem && (
                                <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--color-surface-2)', marginBottom: '16px', border: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Membresía Actual</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-primary)' }}>{currentMem.plan?.name}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                                {new Date(currentMem.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} → {currentEndDate!.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '18px', fontWeight: 700, color: daysRemaining <= 7 ? 'var(--color-warning)' : 'var(--color-success)' }}>{daysRemaining}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>días restantes</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label className="form-label">Nuevo Plan *</label>
                                    <select className="input-field" value={assignForm.planId} onChange={(e) => {
                                        const plan = plans.find(p => p.id === e.target.value);
                                        setAssignForm({
                                            ...assignForm,
                                            planId: e.target.value,
                                            amountPaid: plan ? Number(plan.price) : 0,
                                        });
                                    }} required>
                                        <option value="">Seleccionar plan...</option>
                                        {plans.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} — S/{Number(p.price).toFixed(2)} ({p.durationDays} días)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Mode selection - only if has active membership */}
                                {hasActive && (
                                    <div>
                                        <label className="form-label">¿Cuándo inicia la nueva?</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            <button
                                                type="button"
                                                onClick={() => setAssignForm({ ...assignForm, mode: 'replace' })}
                                                style={{
                                                    padding: '10px 12px', borderRadius: '10px', border: '2px solid',
                                                    borderColor: assignForm.mode === 'replace' ? 'var(--color-primary)' : 'var(--color-border)',
                                                    background: assignForm.mode === 'replace' ? 'rgba(124,58,237,0.08)' : 'var(--color-surface-2)',
                                                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                                                }}
                                            >
                                                <div style={{ fontWeight: 600, fontSize: '12px', color: assignForm.mode === 'replace' ? 'var(--color-primary)' : 'var(--color-text)' }}>🔄 Reemplazar ahora</div>
                                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Expira la actual e inicia la nueva hoy</div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAssignForm({ ...assignForm, mode: 'queue' })}
                                                style={{
                                                    padding: '10px 12px', borderRadius: '10px', border: '2px solid',
                                                    borderColor: assignForm.mode === 'queue' ? 'var(--color-secondary)' : 'var(--color-border)',
                                                    background: assignForm.mode === 'queue' ? 'rgba(6,182,212,0.08)' : 'var(--color-surface-2)',
                                                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                                                }}
                                            >
                                                <div style={{ fontWeight: 600, fontSize: '12px', color: assignForm.mode === 'queue' ? 'var(--color-secondary)' : 'var(--color-text)' }}>📅 Encolar</div>
                                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Inicia al terminar la actual</div>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="form-label">Monto Pagado (S/)</label>
                                    <input className="input-field" type="number" step="0.01" value={assignForm.amountPaid}
                                        onChange={(e) => setAssignForm({ ...assignForm, amountPaid: Number(e.target.value) })} min={0} required />
                                </div>

                                {/* New membership preview */}
                                {selectedPlan && (
                                    <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.15)' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Nueva Membresía</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '14px' }}>{selectedPlan.name}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                                    {newStartDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} → {newEndDate!.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                                {hasActive && assignForm.mode === 'queue' && (
                                                    <div style={{ fontSize: '11px', color: 'var(--color-secondary)', marginTop: '4px', fontWeight: 500 }}>
                                                        ⏳ Inicia en {daysRemaining} días
                                                    </div>
                                                )}
                                            </div>
                                            <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-success)' }}>S/{assignForm.amountPaid.toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                                    <button type="button" className="btn-secondary" onClick={() => setShowAssignModal(false)}>Cancelar</button>
                                    <button type="submit" className="btn-primary" disabled={assigning || !assignForm.planId}>
                                        {assigning ? <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> : <><CreditCard size={14} /> {hasActive && assignForm.mode === 'queue' ? 'Encolar' : 'Asignar'}</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}

            {/* Client Detail Modal */}
            {showDetailModal && detailClient && (
                <div className="modal-overlay">
                    <div className="modal-card slide-up" style={{ maxWidth: '560px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>{detailClient.name}</h2>
                            <button className="btn-icon" onClick={() => setShowDetailModal(false)}><X size={16} /></button>
                        </div>

                        {/* Client info + QR */}
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {[
                                    { label: 'Email', value: detailClient.email },
                                    { label: 'Teléfono', value: detailClient.phone },
                                    { label: 'Emergencia', value: detailClient.emergencyContact },
                                    { label: 'Código QR', value: detailClient.qrCode },
                                ].map((item, i) => (
                                    <div key={i} style={{ padding: '10px', borderRadius: '8px', background: 'var(--color-surface-2)' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                                        <div style={{ fontSize: '13px', marginTop: '2px', color: item.value ? 'var(--color-text)' : 'var(--color-text-muted)' }}>{item.value || '—'}</div>
                                    </div>
                                ))}
                            </div>
                            {detailClient.qrCode && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ padding: '12px', borderRadius: '12px', background: '#fff', cursor: 'pointer' }}
                                        onClick={() => { setShowDetailModal(false); openQr(detailClient); }}>
                                        <QRCodeSVG value={detailClient.qrCode} size={100} fgColor="#7c3aed" />
                                    </div>
                                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Clic para ampliar</span>
                                </div>
                            )}
                        </div>

                        {detailClient.medicalNotes && (
                            <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--color-warning-bg)', marginBottom: '16px', border: '1px solid rgba(245,158,11,0.2)' }}>
                                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Notas Médicas</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{detailClient.medicalNotes}</div>
                            </div>
                        )}

                        {/* Membership history */}
                        <div style={{ marginBottom: '12px' }}>
                            <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Historial de Membresías</h3>
                            {detailClient.memberships?.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {detailClient.memberships.map((m: any) => (
                                        <div key={m.id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '10px 12px', borderRadius: '8px', background: 'var(--color-surface-2)',
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 500, fontSize: '13px' }}>{m.plan?.name}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                                    {new Date(m.startDate).toLocaleDateString('es-ES')} → {new Date(m.endDate).toLocaleDateString('es-ES')}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span className={`badge badge-${m.status === 'ACTIVE' ? 'active' : m.status === 'FROZEN' ? 'frozen' : 'cancelled'}`}>
                                                    {m.status === 'ACTIVE' ? 'Activo' : m.status === 'EXPIRED' ? 'Expirado' : m.status === 'FROZEN' ? 'Congelado' : 'Cancelado'}
                                                </span>
                                                <div style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 600, marginTop: '2px' }}>S/{Number(m.amountPaid).toFixed(2)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px', background: 'var(--color-surface-2)', borderRadius: '8px' }}>
                                    Sin membresías registradas
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn-secondary" onClick={() => setShowDetailModal(false)}>Cerrar</button>
                            <button className="btn-primary" onClick={() => { setShowDetailModal(false); openAssign(detailClient); }}>
                                <CreditCard size={14} /> Asignar Membresía
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {showQrModal && qrClient && (
                <div className="modal-overlay">
                    <div className="modal-card slide-up" style={{ maxWidth: '380px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', textAlign: 'left' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>QR del Cliente</h2>
                            <button className="btn-icon" onClick={() => setShowQrModal(false)}><X size={16} /></button>
                        </div>

                        <div style={{ padding: '24px', background: '#fff', borderRadius: '16px', display: 'inline-block', marginBottom: '16px' }}>
                            <QRCodeSVG
                                id="client-qr-svg"
                                value={qrClient.qrCode}
                                size={220}
                                fgColor="#7c3aed"
                                level="H"
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '16px', fontWeight: 700 }}>{qrClient.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px', fontFamily: 'monospace' }}>{qrClient.qrCode}</div>
                            {qrClient.activeMembership?.status === 'ACTIVE' ? (
                                <div style={{ marginTop: '8px' }}>
                                    <span className="badge badge-active">Membresía Activa</span>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                        {qrClient.activeMembership.plan?.name} — vence {new Date(qrClient.activeMembership.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ marginTop: '8px' }}>
                                    <span className="badge badge-cancelled">Sin Membresía Activa</span>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button className="btn-secondary" onClick={downloadQr}><Download size={14} /> Descargar</button>
                            <button className="btn-secondary" onClick={printQr}><Printer size={14} /> Imprimir</button>
                            <button className="btn-primary" onClick={() => setShowQrModal(false)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Daily Pass Modal */}
            {showDailyPassModal && (
                <div className="modal-overlay">
                    <div className="modal-card slide-up" style={{ maxWidth: '420px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h2 style={{ fontSize: '16px', fontWeight: 700 }}>⚡ Pase Diario</h2>
                                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                    {dpStep === 'search' ? 'Buscar cliente por DNI' : dpStep === 'form' ? (dpFound ? 'Cliente encontrado' : 'Registrar nuevo cliente') : 'Pase asignado'}
                                </p>
                            </div>
                            <button className="btn-icon" onClick={() => setShowDailyPassModal(false)}><X size={16} /></button>
                        </div>

                        {/* Step 1: DNI Search */}
                        {dpStep === 'search' && (
                            <form onSubmit={handleDniSearch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label className="form-label">DNI del Cliente *</label>
                                    <input className="input-field" placeholder="Ej: 12345678" value={dpDni}
                                        onChange={(e) => setDpDni(e.target.value)} required autoFocus
                                        style={{ fontSize: '18px', textAlign: 'center', letterSpacing: '2px', fontWeight: 600 }} />
                                </div>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    <button type="button" className="btn-secondary" onClick={() => setShowDailyPassModal(false)}>Cancelar</button>
                                    <button type="submit" className="btn-primary" disabled={dpSearching || !dpDni.trim()}>
                                        {dpSearching ? <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> : <><Search size={14} /> Buscar</>}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Step 2: Found or Create */}
                        {dpStep === 'form' && (
                            <form onSubmit={handleDailyPass} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {dpFound ? (
                                    /* Existing client found */
                                    <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>✅ Cliente Registrado</div>
                                        <div style={{ fontWeight: 600, fontSize: '15px' }}>{dpFound.name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                            DNI: {dpFound.dni} {dpFound.phone ? `• Tel: ${dpFound.phone}` : ''}
                                        </div>
                                        {dpFound.activeMembership && (
                                            <div style={{ marginTop: '8px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(245,158,11,0.1)', fontSize: '11px', color: '#F59E0B', fontWeight: 600 }}>
                                                ⚠️ Ya tiene membresía activa: {dpFound.activeMembership.plan?.name}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* New client form */
                                    <>
                                        <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                            🆕 No se encontró cliente con DNI <strong style={{ color: 'var(--color-text)' }}>{dpDni}</strong>. Completa los datos:
                                        </div>
                                        <div>
                                            <label className="form-label">Nombre Completo *</label>
                                            <input className="input-field" placeholder="Ej: Juan Pérez" value={dpForm.name}
                                                onChange={(e) => setDpForm({ ...dpForm, name: e.target.value })} required autoFocus />
                                        </div>
                                        <div>
                                            <label className="form-label">Teléfono</label>
                                            <input className="input-field" placeholder="Opcional" value={dpForm.phone}
                                                onChange={(e) => setDpForm({ ...dpForm, phone: e.target.value })} />
                                        </div>
                                    </>
                                )}
                                {!dpFound?.activeMembership && (
                                    <div>
                                        <label className="form-label">Monto del Pase (S/) *</label>
                                        <input className="input-field" type="number" step="0.01" min={0} value={dpForm.amountPaid}
                                            onChange={(e) => setDpForm({ ...dpForm, amountPaid: Number(e.target.value) })} required />
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: dpFound?.activeMembership ? '16px' : '0' }}>
                                    <button type="button" className="btn-secondary" onClick={() => setDpStep('search')}>← Cambiar DNI</button>
                                    <button type="submit" className="btn-primary" disabled={dpSaving || (!dpFound && !dpForm.name.trim())} style={{ background: dpFound?.activeMembership ? '#22c55e' : '#F59E0B' }}>
                                        {dpSaving ? <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> : dpFound?.activeMembership ? '✅ Registrar Asistencia' : <><Zap size={14} /> {dpFound ? 'Asignar Pase' : 'Crear y Asignar'}</>}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Step 3: Result */}
                        {dpStep === 'result' && dpResult && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '48px', marginBottom: '8px' }}>✅</div>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{dpResult.name}</h3>
                                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>DNI: {dpResult.dni || dpDni}</p>
                                <span className="badge badge-active" style={{ marginBottom: '16px', display: 'inline-block' }}>Pase Diario Activo</span>
                                {dpResult.qrCode && (
                                    <div style={{ padding: '16px', background: '#fff', borderRadius: '12px', display: 'inline-block', marginBottom: '16px' }}>
                                        <QRCodeSVG value={dpResult.qrCode} size={160} fgColor="#7c3aed" level="H" />
                                    </div>
                                )}
                                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                                    QR: <code style={{ background: 'var(--color-surface-2)', padding: '2px 6px', borderRadius: '4px' }}>{dpResult.qrCode}</code>
                                </p>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                    <button className="btn-secondary" onClick={() => { setShowDailyPassModal(false); openQr(dpResult); }}>🖨️ Imprimir QR</button>
                                    <button className="btn-primary" onClick={() => setShowDailyPassModal(false)}>Listo</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
