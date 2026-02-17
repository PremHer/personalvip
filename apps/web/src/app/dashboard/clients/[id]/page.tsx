'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { clientsApi, attendanceApi, membershipsApi } from '@/lib/api';
import {
    ArrowLeft, User, Mail, Phone, Calendar, Activity,
    Clock, Shield, AlertTriangle, Heart, UserCheck,
    TrendingUp, Star,
} from 'lucide-react';

export default function ClientProfilePage() {
    const params = useParams();
    const router = useRouter();
    const clientId = params.id as string;

    const [client, setClient] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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

    const daysLeft = activeMembership
        ? Math.ceil((new Date(activeMembership.endDate).getTime() - now.getTime()) / 86400000)
        : 0;

    const formatDate = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
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
                                            <span className={`badge ${isActive ? 'badge-active' : m.status === 'EXPIRED' ? 'badge-expired' : 'badge-warning'}`} style={{ fontSize: '10px' }}>
                                                {isActive ? 'Activa' : m.status === 'EXPIRED' ? 'Expirada' : m.status === 'FROZEN' ? 'Congelada' : m.status}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: '30px' }}>Sin membresías</div>
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
        </div>
    );
}
