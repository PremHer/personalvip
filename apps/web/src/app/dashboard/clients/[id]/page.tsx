'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { clientsApi, attendanceApi, membershipsApi } from '@/lib/api';
import {
    ArrowLeft, User, Mail, Phone, Calendar, Activity,
    Clock, Shield, AlertTriangle, Heart, UserCheck,
    TrendingUp, Star, DollarSign, X, Trash2, Download
} from 'lucide-react';
import MembershipCalendar from '@/components/MembershipCalendar';
import PaymentReceipt from '@/components/PaymentReceipt';

export default function ClientProfilePage() {
    const params = useParams();
    const router = useRouter();
    const clientId = params.id as string;

    const [client, setClient] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
    const [receiptData, setReceiptData] = useState<any>(null);

    useEffect(() => {
        if (!clientId) return;
        Promise.all([
            clientsApi.get(clientId),
            attendanceApi.clientStats(clientId),
        ]).then(([c, s]) => {
            setClient(c);
            setStats(s);
        }).catch(console.error)
            .finally(() => setLoading(false));
    }, [clientId]);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <div className="spinner spinner-lg" />
            </div>
        );
    }

    if (!client) {
        return (
            <div style={{ textAlign: 'center', padding: '60px' }}>
                <p style={{ color: 'var(--color-text-muted)' }}>Cliente no encontrado</p>
                <button className="btn-primary" style={{ marginTop: '16px' }} onClick={() => router.push('/dashboard/clients')}>
                    Volver
                </button>
            </div>
        );
    }

    const now = new Date();
    const activeMembership = client.memberships?.find((m: any) => {
        const start = new Date(m.startDate);
        const end = new Date(m.endDate);
        return m.status === 'ACTIVE' && start <= now && end >= now;
    });

    const targetMembership = client.memberships?.filter((m: any) => {
        const totalPaid = m.payments?.length > 0
            ? m.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
            : Number(m.amountPaid || 0);
        return m.status === 'ACTIVE' && totalPaid < Number(m.plan?.price || 0);
    }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || activeMembership;

    const daysLeft = activeMembership
        ? Math.ceil((new Date(activeMembership.endDate).getTime() - now.getTime()) / 86400000)
        : 0;

    const totalPlanPrice = targetMembership ? Number(targetMembership.plan?.price || 0) : 0;
    const payments = targetMembership?.payments || [];
    const totalPaidAmount = payments.length > 0
        ? payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
        : targetMembership ? Number(targetMembership.amountPaid || 0) : 0;

    const totalDiscount = targetMembership ? Number(targetMembership.discount || 0) : 0;
    const effectiveTotal = Math.max(0, totalPlanPrice - totalDiscount);

    const pendingAmount = Math.max(0, effectiveTotal - totalPaidAmount);
    const isPaidInFull = pendingAmount <= 0;
    const progressPercent = effectiveTotal > 0 ? Math.min(100, Math.round((totalPaidAmount / effectiveTotal) * 100)) : 100;

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetMembership || !paymentAmount) return;
        setIsSubmittingPayment(true);
        try {
            await membershipsApi.addPayment(targetMembership.id, {
                amountPaid: Number(paymentAmount),
                paymentMethod,
            });
            setShowPaymentModal(false);
            setPaymentAmount('');
            const c = await clientsApi.get(clientId);
            setClient(c);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    const handleDeleteMembership = async (membershipId: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta membresía? Esta acción no se puede deshacer y borrará los pagos asociados.')) return;
        try {
            await membershipsApi.delete(membershipId);
            const c = await clientsApi.get(clientId);
            setClient(c);
        } catch (error: any) {
            alert(error.message || 'Error eliminando membresía');
        }
    };

    const formatDate = (d: string) => {
        const parts = d.split('T')[0].split('-');
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    };
    const formatTime = (d: string) => new Date(d).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes} min`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m}m`;
    };

    const memberSince = client.createdAt
        ? Math.ceil((now.getTime() - new Date(client.createdAt).getTime()) / 86400000)
        : 0;

    return (
        <div>
            {/* Back button */}
            <button
                onClick={() => router.push('/dashboard/clients')}
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px', border: 'none',
                    background: 'none', color: 'var(--color-text-muted)', cursor: 'pointer',
                    fontSize: '13px', padding: '4px 0', marginBottom: '16px',
                }}
            >
                <ArrowLeft size={16} /> Volver a Clientes
            </button>

            {/* Profile Header */}
            <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '32px', fontWeight: 800, color: 'white',
                        boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
                    }}>
                        {client.name?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>{client.name}</h1>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                            {client.email && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                                    <Mail size={14} /> {client.email}
                                </div>
                            )}
                            {client.phone && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                                    <Phone size={14} /> {client.phone}
                                </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                                <Calendar size={14} /> Miembro hace {memberSince} días
                            </div>
                        </div>
                    </div>
                    <div>
                        {activeMembership ? (
                            <div style={{
                                padding: '10px 16px', borderRadius: '12px',
                                background: daysLeft <= 7 ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                                border: `1px solid ${daysLeft <= 7 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
                                textAlign: 'center',
                            }}>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: daysLeft <= 7 ? '#F59E0B' : '#10B981', textTransform: 'uppercase' }}>
                                    {activeMembership.plan?.name}
                                </div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: daysLeft <= 7 ? '#F59E0B' : '#10B981' }}>
                                    {daysLeft}d
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>restantes</div>
                            </div>
                        ) : (
                            <span className="badge badge-expired" style={{ padding: '8px 14px' }}>Sin Membresía</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
                {[
                    { label: 'Visitas Totales', value: stats?.totalVisits || 0, icon: Activity, color: '#7C3AED' },
                    { label: 'Este Mes', value: stats?.monthVisits || 0, icon: TrendingUp, color: '#06B6D4' },
                    { label: 'Esta Semana', value: stats?.weekVisits || 0, icon: Star, color: '#F59E0B' },
                    { label: 'Duración Prom.', value: formatDuration(stats?.avgDurationMinutes || 0), icon: Clock, color: '#10B981' },
                ].map((s, i) => (
                    <div key={i} className="glass-card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <s.icon size={20} color={s.color} />
                        </div>
                        <div>
                            <div style={{ fontSize: '22px', fontWeight: 700 }}>{s.value}</div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Recent Attendance */}
                <div className="glass-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserCheck size={16} color="#7C3AED" /> Últimas Visitas
                    </h3>
                    {(stats?.recentVisits?.length || 0) > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {stats.recentVisits.map((v: any) => {
                                const duration = v.checkOut
                                    ? Math.round((new Date(v.checkOut).getTime() - new Date(v.checkIn).getTime()) / 60000)
                                    : null;
                                return (
                                    <div key={v.id} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '10px 12px', borderRadius: '8px', background: 'var(--color-surface-2)',
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 500 }}>{formatDate(v.checkIn)}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                                {formatTime(v.checkIn)} → {v.checkOut ? formatTime(v.checkOut) : '—'}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            {v.checkOut ? (
                                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#10B981' }}>
                                                    {formatDuration(duration!)}
                                                </span>
                                            ) : (
                                                <span className="badge badge-active" style={{ fontSize: '10px' }}>En Gym</span>
                                            )}
                                            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                                {v.method}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="empty-state" style={{ padding: '30px' }}>Sin visitas registradas</div>
                    )}
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Active Membership Calendar */}
                    {activeMembership && (
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={16} color="#F59E0B" /> Días de Membresía
                            </h3>
                            <div style={{ pointerEvents: 'none', zoom: 0.9 }}>
                                <MembershipCalendar
                                    startDate={activeMembership.startDate}
                                    endDate={activeMembership.endDate}
                                    durationDays={activeMembership.plan?.durationDays || 30}
                                    readOnly={true}
                                    memberships={client.memberships || []}
                                />
                            </div>
                        </div>
                    )}

                    {/* Pagos y Deuda */}
                    {targetMembership && (
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <DollarSign size={16} color="#10B981" /> Estado de Pago
                                    {targetMembership !== activeMembership && <span style={{ fontSize: '10px', color: '#F59E0B', fontWeight: 700, background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '4px' }}>EN COLA</span>}
                                </h3>
                                {!isPaidInFull && (
                                    <button
                                        className="btn-primary"
                                        style={{ padding: '6px 12px', fontSize: '12px' }}
                                        onClick={() => setShowPaymentModal(true)}
                                    >
                                        Abonar Pago
                                    </button>
                                )}
                            </div>

                            <div style={{ background: 'var(--color-surface-2)', padding: '16px', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Monto Pagado</span>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#10B981' }}>S/ {totalPaidAmount.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Monto Pendiente</span>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: pendingAmount > 0 ? '#F43F5E' : 'var(--color-text)' }}>S/ {pendingAmount.toFixed(2)}</span>
                                </div>
                                {totalDiscount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', padding: '6px 10px', background: 'rgba(244, 63, 94, 0.08)', borderRadius: '6px', border: '1px dashed rgba(244, 63, 94, 0.2)' }}>
                                        <span style={{ fontSize: '12px', color: '#F43F5E', fontWeight: 600 }}>Descuento Aplicado</span>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#F43F5E' }}>S/ {totalDiscount.toFixed(2)}</span>
                                    </div>
                                )}

                                <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${progressPercent}%`,
                                        background: progressPercent === 100 ? '#10B981' : 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
                                        borderRadius: '4px',
                                        transition: 'width 0.5s ease-out'
                                    }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                    <span>{progressPercent}% Pagado</span>
                                    <span>Total (c/desc): S/ {effectiveTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            {(payments?.length || 0) > 0 && (
                                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px' }}>Abonos Realizados</span>
                                    {payments.map((p: any) => (
                                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                                            <div>
                                                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{formatDate(p.createdAt)}</div>
                                                {p.notes && <div style={{ fontSize: '10px', color: '#F59E0B', marginTop: '2px', maxWidth: '160px', fontStyle: 'italic', lineHeight: 1.2 }}>{p.notes}</div>}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>
                                                    {p.paymentMethod}
                                                </span>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#10B981', marginRight: '8px' }}>+ S/ {Number(p.amount).toFixed(2)}</span>
                                                <button
                                                    onClick={() => setReceiptData({
                                                        type: 'MEMBRESÍA',
                                                        clientName: client.name,
                                                        planName: targetMembership.plan?.name || '',
                                                        amount: Number(p.amount),
                                                        paymentMethod: p.paymentMethod,
                                                        date: new Date(p.createdAt),
                                                        cashierName: p.cashier?.name || 'Caja'
                                                    })}
                                                    style={{ background: 'var(--color-primary-light)', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', color: '#fff', opacity: 0.9 }}
                                                    title="Ver Comprobante"
                                                >
                                                    <Download size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Memberships History */}
                    <div className="glass-card" style={{ padding: '20px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Shield size={16} color="#06B6D4" /> Historial de Membresías
                        </h3>
                        {(client.memberships?.length || 0) > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {client.memberships.map((m: any) => {
                                    const isActive = m.status === 'ACTIVE' && new Date(m.startDate) <= now && new Date(m.endDate) >= now;
                                    return (
                                        <div key={m.id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '10px 12px', borderRadius: '8px', background: 'var(--color-surface-2)',
                                            borderLeft: `3px solid ${isActive ? '#10B981' : m.status === 'EXPIRED' ? '#64748b' : '#F59E0B'}`,
                                        }}>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 600 }}>{m.plan?.name}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                                    {formatDate(m.startDate)} — {formatDate(m.endDate)}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span className={`badge ${isActive ? 'badge-active' : m.status === 'EXPIRED' ? 'badge-expired' : 'badge-warning'}`} style={{ fontSize: '10px' }}>
                                                    {isActive ? 'Activa' : m.status === 'EXPIRED' ? 'Expirada' : m.status === 'FROZEN' ? 'Congelada' : m.status}
                                                </span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteMembership(m.id); }}
                                                    className="btn-icon danger"
                                                    title="Eliminar Membresía"
                                                    style={{ padding: '4px', background: 'rgba(244,63,94,0.1)', color: '#F43F5E', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: '30px' }}>Sin membresías</div>
                        )}
                    </div>

                    {/* Payment History */}
                    <div className="glass-card" style={{ padding: '20px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <DollarSign size={16} color="#10B981" /> Historial de Pagos
                            {(client.sales?.length || 0) > 0 && (
                                <span className="badge badge-active" style={{ fontSize: '10px' }}>{client.sales.length}</span>
                            )}
                        </h3>
                        {(client.sales?.length || 0) > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {client.sales.map((s: any) => (
                                    <div key={s.id} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '10px 12px', borderRadius: '8px', background: 'var(--color-surface-2)',
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 500 }}>
                                                {s.items?.map((i: any) => i.product?.name || 'Producto').join(', ') || 'Venta'}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                                {formatDate(s.createdAt)} · {s.cashier?.name || '—'}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#10B981' }}>
                                                    S/{Number(s.total).toFixed(2)}
                                                </div>
                                                <button
                                                    onClick={() => setReceiptData({
                                                        type: s.items?.some((i: any) => i.product?.name?.toLowerCase().includes('pase')) ? 'PASE DIARIO' : 'VENTA',
                                                        clientName: client.name,
                                                        planName: s.items?.map((i: any) => i.product?.name || 'Producto').join(', ') || 'Venta',
                                                        amount: Number(s.total),
                                                        paymentMethod: s.paymentMethod,
                                                        date: new Date(s.createdAt),
                                                        cashierName: s.cashier?.name || 'Caja'
                                                    })}
                                                    style={{ background: 'var(--color-primary-light)', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', color: '#fff', opacity: 0.9 }}
                                                    title="Ver Comprobante"
                                                >
                                                    <Download size={13} />
                                                </button>
                                            </div>
                                            <span style={{
                                                fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px',
                                                background: s.paymentMethod === 'CASH' ? 'rgba(16,185,129,0.1)' : s.paymentMethod === 'CARD' ? 'rgba(124,58,237,0.1)' : 'rgba(6,182,212,0.1)',
                                                color: s.paymentMethod === 'CASH' ? '#10B981' : s.paymentMethod === 'CARD' ? '#7C3AED' : '#06B6D4',
                                            }}>
                                                {s.paymentMethod === 'CASH' ? 'Efectivo' : s.paymentMethod === 'CARD' ? 'Tarjeta' : 'Transf.'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: '30px' }}>Sin compras registradas</div>
                        )}
                    </div>

                    {/* Medical Notes / Emergency */}
                    <div className="glass-card" style={{ padding: '20px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Heart size={16} color="#F43F5E" /> Información Médica
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Notas Médicas</div>
                                <div style={{
                                    fontSize: '13px', padding: '10px 12px', borderRadius: '8px', background: 'var(--color-surface-2)',
                                    color: client.medicalNotes ? 'var(--color-text)' : 'var(--color-text-muted)',
                                    minHeight: '40px',
                                }}>
                                    {client.medicalNotes || 'Sin notas médicas'}
                                </div>
                            </div>
                            {client.emergencyContact && (
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                        <AlertTriangle size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                        Contacto de Emergencia
                                    </div>
                                    <div style={{ fontSize: '13px', padding: '10px 12px', borderRadius: '8px', background: 'var(--color-surface-2)' }}>
                                        {client.emergencyContact}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Payment Modal */}
            {showPaymentModal && (
                <div className="modal-overlay">
                    <div className="modal-card slide-up" style={{ maxWidth: '420px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Abonar a la Deuda</h2>
                            <button className="btn-icon" onClick={() => setShowPaymentModal(false)}><X size={16} /></button>
                        </div>
                        <div style={{ padding: '12px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', marginBottom: '20px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--color-warning)', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>Deuda Total</div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-warning)' }}>S/ {pendingAmount.toFixed(2)}</div>
                        </div>
                        <form onSubmit={handleAddPayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label className="form-label">Monto a Abonar (S/) *</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    min="1"
                                    max={pendingAmount}
                                    step="0.10"
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                    required
                                    placeholder={`Ej. ${pendingAmount.toFixed(2)}`}
                                    style={{ fontSize: '16px', fontWeight: 600, padding: '12px' }}
                                />
                            </div>
                            <div>
                                <label className="form-label" style={{ marginBottom: '8px' }}>Método de Pago *</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                                    {[
                                        { v: 'CASH', l: '💵 Efectivo' },
                                        { v: 'CARD', l: '💳 Tarjeta' },
                                        { v: 'TRANSFER', l: '🏦 Transferencia' },
                                        { v: 'YAPE_PLIN', l: '📱 Yape/Plin' }
                                    ].map(m => (
                                        <button key={m.v} type="button" onClick={() => setPaymentMethod(m.v)}
                                            style={{
                                                padding: '12px 8px', borderRadius: '10px',
                                                border: paymentMethod === m.v ? '2px solid var(--color-primary-light)' : '1px solid var(--color-border)',
                                                backgroundColor: paymentMethod === m.v ? 'rgba(124,58,237,0.15)' : 'var(--color-bg-tertiary)',
                                                color: paymentMethod === m.v ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                                                fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                                            }}>
                                            {m.l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowPaymentModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={isSubmittingPayment}>
                                    {isSubmittingPayment ? <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> : 'Registrar Abono'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Receipt Modal */}
            {receiptData && (
                <PaymentReceipt data={receiptData} onClose={() => setReceiptData(null)} />
            )}
        </div>
    );
}
