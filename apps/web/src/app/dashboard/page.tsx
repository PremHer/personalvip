'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { financeApi, membershipsApi, productsApi, attendanceApi } from '@/lib/api';
import {
    DollarSign, TrendingUp, Users, AlertTriangle, Clock,
    Calendar, ArrowUpRight, ArrowDownRight, Package, UserPlus,
    Activity,
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
    BarChart, Bar, Legend,
} from 'recharts';

const PIE_COLORS = ['#7C3AED', '#06B6D4', '#F43F5E', '#F59E0B'];
const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function DashboardPage() {
    const [dashboard, setDashboard] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [expiring, setExpiring] = useState<any[]>([]);
    const [lowStock, setLowStock] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | 'year'>('month');
    const [loading, setLoading] = useState(true);
    const [showExpiring, setShowExpiring] = useState(false);
    const router = useRouter();

    useEffect(() => {
        Promise.all([
            financeApi.dashboard(),
            financeApi.incomeChart(chartPeriod),
            membershipsApi.expiring(7),
            productsApi.lowStock(),
            attendanceApi.today(),
        ]).then(([d, c, e, ls, a]) => {
            setDashboard(d);
            setChartData(c);
            setExpiring(e);
            setLowStock(ls);
            setAttendance(a);
        }).catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        financeApi.incomeChart(chartPeriod).then(setChartData).catch(console.error);
    }, [chartPeriod]);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <div className="spinner spinner-lg" />
            </div>
        );
    }

    const inGym = attendance.filter(r => !r.checkOut).length;

    // Build payment pie data
    const paymentData = dashboard?.todayByPaymentMethod
        ? Object.entries(dashboard.todayByPaymentMethod)
            .filter(([, v]: any) => v > 0)
            .map(([name, value]: any) => ({
                name: name === 'CASH' ? 'Efectivo' : name === 'CARD' ? 'Tarjeta' : 'Transf.',
                value: Number(value),
            }))
        : [];

    // Calculate income change vs yesterday
    const incomeChange = dashboard?.yesterdayIncome > 0
        ? ((dashboard.todayIncome - dashboard.yesterdayIncome) / dashboard.yesterdayIncome * 100).toFixed(0)
        : dashboard?.todayIncome > 0 ? '+100' : '0';
    const incomeUp = Number(incomeChange) >= 0;

    // Attendance change vs yesterday
    const attendanceChange = dashboard?.yesterdayAttendance > 0
        ? ((dashboard.todayAttendance - dashboard.yesterdayAttendance) / dashboard.yesterdayAttendance * 100).toFixed(0)
        : dashboard?.todayAttendance > 0 ? '+100' : '0';
    const attendanceUp = Number(attendanceChange) >= 0;

    // Format attendance trend for chart
    const attendanceTrend = (dashboard?.attendanceTrend || []).map((d: any) => ({
        ...d,
        day: DAYS_ES[new Date(d.date + 'T12:00:00').getDay()],
    }));

    return (
        <div>
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>Dashboard</h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '2px' }}>
                        Resumen del día — {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'var(--color-success-bg)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)', animation: 'pulse 2s infinite' }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-success)' }}>{inGym} en gym</span>
                    </div>
                </div>
            </div>

            {/* Expiring Memberships Alert Banner */}
            {expiring.length > 0 && (
                <div style={{
                    background: 'var(--color-warning-bg)', border: '1px solid rgba(245,158,11,0.25)',
                    borderRadius: '14px', padding: '14px 18px', marginBottom: '16px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                        onClick={() => setShowExpiring(!showExpiring)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <AlertTriangle size={18} color="var(--color-warning)" />
                            <div>
                                <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-warning)' }}>
                                    {expiring.length} membresía{expiring.length !== 1 ? 's' : ''} por vencer
                                </span>
                                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: '8px' }}>
                                    en los próximos 7 días
                                </span>
                            </div>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                            {showExpiring ? 'Ocultar ▲' : 'Ver detalle ▼'}
                        </span>
                    </div>
                    {showExpiring && (
                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {expiring.map((m: any) => {
                                const daysLeft = Math.ceil((new Date(m.endDate).getTime() - Date.now()) / 86400000);
                                const isUrgent = daysLeft <= 2;
                                return (
                                    <div key={m.id}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '10px 12px', borderRadius: '10px', background: 'var(--color-surface)',
                                            border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.2)' : 'var(--color-border)'}`,
                                            cursor: 'pointer',
                                        }}
                                        onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/clients/${m.clientId}`); }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '50%',
                                                background: isUrgent ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '13px', fontWeight: 700,
                                                color: isUrgent ? '#EF4444' : '#F59E0B',
                                            }}>
                                                {m.client?.name?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>{m.client?.name}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                                    {m.plan?.name} · Vence: {new Date(m.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                                </div>
                                            </div>
                                        </div>
                                        <span style={{
                                            fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
                                            background: isUrgent ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                            color: isUrgent ? '#EF4444' : '#F59E0B',
                                        }}>
                                            {daysLeft <= 0 ? '¡Hoy!' : daysLeft === 1 ? 'Mañana' : `${daysLeft} días`}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* KPI Cards - Row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                {[
                    {
                        label: 'Ingresos Hoy',
                        value: `S/${(dashboard?.todayIncome || 0).toFixed(2)}`,
                        sub: `${dashboard?.todaySales || 0} transacciones`,
                        icon: DollarSign,
                        color: 'var(--color-primary)',
                        trend: `${incomeUp ? '+' : ''}${incomeChange}% vs ayer`,
                        trendUp: incomeUp,
                        accent: 'purple',
                    },
                    {
                        label: 'Ingresos del Mes',
                        value: `S/${(dashboard?.monthIncome || 0).toFixed(2)}`,
                        sub: 'Acumulado',
                        icon: TrendingUp,
                        color: 'var(--color-secondary)',
                        trend: `Sem: S/${(dashboard?.weekIncome || 0).toFixed(0)}`,
                        trendUp: true,
                        accent: 'teal',
                    },
                    {
                        label: 'Asistencia Hoy',
                        value: dashboard?.todayAttendance || 0,
                        sub: `${inGym} actualmente en gym`,
                        icon: Activity,
                        color: 'var(--color-accent)',
                        trend: `${attendanceUp ? '+' : ''}${attendanceChange}% vs ayer`,
                        trendUp: attendanceUp,
                        accent: 'pink',
                    },
                    {
                        label: 'Membresías Activas',
                        value: dashboard?.activeMembers || 0,
                        sub: `${expiring.length} por vencer`,
                        icon: Calendar,
                        color: 'var(--color-warning)',
                        trend: expiring.length > 0 ? `⚠️ ${expiring.length} alerta${expiring.length > 1 ? 's' : ''}` : '✅ Estable',
                        trendUp: expiring.length === 0,
                        accent: 'orange',
                    },
                ].map((kpi, i) => (
                    <div key={i} className={`stat-card ${kpi.accent}`} style={{ animationDelay: `${i * 80}ms` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '10px',
                                background: `${kpi.color}18`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <kpi.icon size={20} color={kpi.color} />
                            </div>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '3px',
                                fontSize: '11px', fontWeight: 600,
                                color: kpi.trendUp ? 'var(--color-success)' : 'var(--color-warning)',
                            }}>
                                {kpi.trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                {kpi.trend}
                            </div>
                        </div>
                        <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '2px' }}>
                            {kpi.value}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{kpi.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', opacity: 0.7 }}>{kpi.sub}</div>
                    </div>
                ))}
            </div>

            {/* KPI Cards - Row 2: Clients */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div className="stat-card teal" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={22} color="#06B6D4" />
                    </div>
                    <div>
                        <div style={{ fontSize: '28px', fontWeight: 700 }}>{dashboard?.totalClients || 0}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Clientes Totales</div>
                    </div>
                </div>
                <div className="stat-card purple" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <UserPlus size={22} color="#7C3AED" />
                    </div>
                    <div>
                        <div style={{ fontSize: '28px', fontWeight: 700 }}>{dashboard?.newClientsMonth || 0}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Nuevos este Mes</div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {/* Area Chart - Income */}
                <div className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Ingresos</h3>
                            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Tendencia de ingresos por período</p>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', background: 'var(--color-surface-2)', borderRadius: '8px', padding: '2px' }}>
                            {(['week', 'month', 'year'] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setChartPeriod(p)}
                                    style={{
                                        padding: '5px 12px', borderRadius: '6px', border: 'none',
                                        fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                                        background: chartPeriod === p ? 'var(--color-primary)' : 'transparent',
                                        color: chartPeriod === p ? 'white' : 'var(--color-text-muted)',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    {p === 'week' ? '7D' : p === 'month' ? '30D' : '1A'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                            <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false}
                                tickFormatter={(v) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth() + 1}`; }} />
                            <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false}
                                tickFormatter={(v) => `S/${v}`} />
                            <Tooltip
                                contentStyle={{ background: '#1F2937', border: '1px solid rgba(148,163,184,0.12)', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                                formatter={(value: any) => [`S/${Number(value).toFixed(2)}`, 'Ingresos']}
                                labelFormatter={(label) => new Date(label).toLocaleDateString('es-ES')}
                            />
                            <Area type="monotone" dataKey="total" stroke="#7C3AED" strokeWidth={2} fill="url(#colorIncome)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Pie Chart */}
                <div className="glass-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Métodos de Pago</h3>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>Distribución del día</p>
                    {paymentData.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={160}>
                                <PieChart>
                                    <Pie
                                        data={paymentData} cx="50%" cy="50%"
                                        innerRadius={45} outerRadius={70}
                                        dataKey="value" stroke="none"
                                    >
                                        {paymentData.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: '#1F2937', border: '1px solid rgba(148,163,184,0.12)', borderRadius: '10px', fontSize: '12px' }}
                                        formatter={(value: any) => [`S/${Number(value).toFixed(2)}`]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                                {paymentData.map((d, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: PIE_COLORS[i] }} />
                                            <span style={{ color: 'var(--color-text-secondary)' }}>{d.name}</span>
                                        </div>
                                        <span style={{ fontWeight: 600 }}>S/{d.value.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">Sin ventas hoy</div>
                    )}
                </div>
            </div>

            {/* Charts Row 2 - Attendance */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                {/* Attendance Trend 7 days */}
                <div className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Asistencia Semanal</h3>
                        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Últimos 7 días</p>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={attendanceTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                            <XAxis dataKey="day" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{ background: '#1F2937', border: '1px solid rgba(148,163,184,0.12)', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                                formatter={(value: any) => [value, 'Asistencias']}
                                labelFormatter={(label) => label}
                            />
                            <Bar dataKey="count" name="Asistencias" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Peak Hours */}
                <div className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Horas Pico — Hoy</h3>
                        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Distribución de check-ins por hora</p>
                    </div>
                    {(dashboard?.peakHours?.length || 0) > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={dashboard.peakHours}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                                <XAxis dataKey="hour" stroke="#64748B" fontSize={9} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ background: '#1F2937', border: '1px solid rgba(148,163,184,0.12)', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                                    formatter={(value: any) => [value, 'Check-ins']}
                                />
                                <Bar dataKey="count" name="Check-ins" fill="#06B6D4" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty-state" style={{ padding: '60px 20px' }}>Sin check-ins aún hoy</div>
                    )}
                </div>
            </div>

            {/* Alerts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Expiring Memberships */}
                <div className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <AlertTriangle size={16} color="var(--color-warning)" />
                        <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Membresías por Vencer</h3>
                        {expiring.length > 0 && (
                            <span className="badge badge-warning">{expiring.length}</span>
                        )}
                    </div>
                    {expiring.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {expiring.slice(0, 5).map((m) => (
                                <div key={m.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 12px', borderRadius: '10px', background: 'var(--color-surface-2)',
                                }}>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{m.client?.name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{m.plan?.name}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-warning)' }}>
                                            {new Date(m.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                                            {Math.ceil((new Date(m.endDate).getTime() - Date.now()) / 86400000)}d restantes
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state" style={{ padding: '24px' }}>
                            ✅ Sin membresías próximas a vencer
                        </div>
                    )}
                </div>

                {/* Low Stock */}
                <div className="glass-card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Package size={16} color="var(--color-danger)" />
                        <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Stock Bajo</h3>
                        {lowStock.length > 0 && (
                            <span className="badge badge-expired">{lowStock.length}</span>
                        )}
                    </div>
                    {lowStock.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {lowStock.slice(0, 5).map((p) => (
                                <div key={p.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 12px', borderRadius: '10px', background: 'var(--color-surface-2)',
                                }}>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{p.name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{p.category}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-danger)' }}>{p.stock}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>mín: {p.minStock}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state" style={{ padding: '24px' }}>
                            📦 Todo el stock en orden
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
