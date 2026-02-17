'use client';

import { useEffect, useState } from 'react';
import { financeApi } from '@/lib/api';
import { exportToCSV } from '@/lib/export';
import { DollarSign, TrendingUp, Calendar, Wallet, Download, FileText, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function FinancePage() {
    const [dashboard, setDashboard] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [dailyReport, setDailyReport] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [loading, setLoading] = useState(true);

    // Sales report state
    const [reportFrom, setReportFrom] = useState(new Date().toISOString().slice(0, 10));
    const [reportTo, setReportTo] = useState(new Date().toISOString().slice(0, 10));
    const [salesReport, setSalesReport] = useState<any>(null);
    const [loadingReport, setLoadingReport] = useState(false);

    useEffect(() => { loadData(); }, []);
    useEffect(() => { financeApi.dailyReport(selectedDate).then(setDailyReport).catch(console.error); }, [selectedDate]);

    const loadData = async () => {
        try {
            const [d, c, r] = await Promise.all([financeApi.dashboard(), financeApi.incomeChart('month'), financeApi.dailyReport()]);
            setDashboard(d); setChartData(c); setDailyReport(r);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const loadSalesReport = async () => {
        setLoadingReport(true);
        try {
            const res = await financeApi.salesReport(reportFrom, reportTo);
            setSalesReport(res);
        } catch (e) { console.error(e); }
        finally { setLoadingReport(false); }
    };

    const handleExportSalesCSV = () => {
        if (!salesReport?.sales?.length) return;
        const csvData = salesReport.sales.map((s: any) => ({
            Fecha: new Date(s.date).toLocaleDateString('es-ES'),
            Hora: new Date(s.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            Cliente: s.client,
            Cajero: s.cashier,
            Productos: s.items.map((i: any) => `${i.product} x${i.quantity}`).join(', '),
            Descuento: `S/${s.discount.toFixed(2)}`,
            Total: `S/${s.total.toFixed(2)}`,
            'Método de Pago': s.paymentMethod === 'CASH' ? 'Efectivo' : s.paymentMethod === 'CARD' ? 'Tarjeta' : 'Transferencia',
        }));
        exportToCSV(csvData, `ventas_${reportFrom}_${reportTo}`);
    };

    const handleExportDailyCSV = () => {
        if (!dailyReport) return;
        const data = [{
            Fecha: dailyReport.date,
            'Total Ingresos': `S/${dailyReport.totalIncome.toFixed(2)}`,
            'Total Ventas': dailyReport.totalSales,
            'Asistencia': dailyReport.totalAttendance,
            'Efectivo': `S/${dailyReport.cashAmount.toFixed(2)}`,
            'Tarjeta': `S/${dailyReport.cardAmount.toFixed(2)}`,
            'Transferencia': `S/${dailyReport.transferAmount.toFixed(2)}`,
        }];
        exportToCSV(data, `reporte_diario_${selectedDate}`);
    };

    // Quick range presets
    const setPreset = (type: 'today' | 'week' | 'month') => {
        const now = new Date();
        const to = now.toISOString().slice(0, 10);
        let from = to;
        if (type === 'week') {
            const d = new Date(now); d.setDate(d.getDate() - 7);
            from = d.toISOString().slice(0, 10);
        } else if (type === 'month') {
            from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        }
        setReportFrom(from);
        setReportTo(to);
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><div className="spinner spinner-lg" /></div>;

    const methodLabel = (m: string) => m === 'CASH' ? 'Efectivo' : m === 'CARD' ? 'Tarjeta' : 'Transferencia';

    return (
        <div>
            <div className="page-header"><h1>Finanzas</h1><p>Análisis financiero y reportes</p></div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                    { label: 'Hoy', value: `S/${(dashboard?.todayIncome || 0).toFixed(2)}`, icon: DollarSign, color: 'var(--color-primary)', accent: 'purple' },
                    { label: 'Esta Semana', value: `S/${(dashboard?.weekIncome || 0).toFixed(2)}`, icon: TrendingUp, color: 'var(--color-secondary)', accent: 'teal' },
                    { label: 'Este Mes', value: `S/${(dashboard?.monthIncome || 0).toFixed(2)}`, icon: Calendar, color: 'var(--color-accent)', accent: 'pink' },
                    { label: 'Miembros Activos', value: dashboard?.activeMembers || 0, icon: Wallet, color: 'var(--color-warning)', accent: 'orange' },
                ].map((s, i) => (
                    <div key={i} className={`stat-card ${s.accent}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <s.icon size={18} color={s.color} />
                            </div>
                            <div>
                                <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>{s.value}</div>
                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{s.label}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Income Chart */}
            <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Ingresos Mensuales</h3>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>Membresías vs Ventas de productos</p>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                        <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)} />
                        <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `S/${v}`} />
                        <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid rgba(148,163,184,0.12)', borderRadius: '10px', fontSize: '12px' }} formatter={(value: any) => [`S/${Number(value).toFixed(2)}`]} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Bar dataKey="memberships" name="Membresías" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="sales" name="Ventas" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Daily Report */}
            <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Reporte Diario</h3>
                        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Desglose por fuente y método de pago</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input type="date" className="input-field" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: 'auto' }} />
                        <button className="btn-secondary" onClick={handleExportDailyCSV} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '6px 10px' }}>
                            <Download size={12} /> CSV
                        </button>
                    </div>
                </div>
                {dailyReport ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                        {[
                            { label: 'Total Ingresos', value: dailyReport.totalIncome, color: 'var(--color-success)' },
                            { label: 'Total Ventas', value: dailyReport.totalSales, color: 'var(--color-primary-light)', isCurrency: false },
                            { label: 'Asistencia', value: dailyReport.totalAttendance, color: 'var(--color-secondary)', isCurrency: false },
                        ].map((item, i) => (
                            <div key={i} style={{ padding: '14px', borderRadius: '10px', background: 'var(--color-surface-2)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{item.label}</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: item.color }}>
                                    {item.isCurrency !== false ? `S/${Number(item.value || 0).toFixed(2)}` : item.value}
                                </div>
                            </div>
                        ))}
                        {[
                            { label: 'Efectivo', value: dailyReport.cashAmount },
                            { label: 'Tarjeta', value: dailyReport.cardAmount },
                            { label: 'Transferencia', value: dailyReport.transferAmount },
                        ].map((item, i) => (
                            <div key={i} style={{ padding: '14px', borderRadius: '10px', background: 'var(--color-surface-2)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{item.label}</div>
                                <div style={{ fontSize: '18px', fontWeight: 600 }}>S/{Number(item.value || 0).toFixed(2)}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">Sin datos para esta fecha</div>
                )}
            </div>

            {/* Sales Report — Exportable */}
            <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={18} color="var(--color-primary)" />
                        <div>
                            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Reporte de Ventas</h3>
                            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Detalle individual de ventas para exportar</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {[
                            { label: 'Hoy', preset: 'today' as const },
                            { label: 'Última Semana', preset: 'week' as const },
                            { label: 'Este Mes', preset: 'month' as const },
                        ].map((p) => (
                            <button key={p.preset} className="btn-secondary" onClick={() => setPreset(p.preset)} style={{ fontSize: '11px', padding: '5px 10px' }}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <Filter size={13} color="var(--color-text-muted)" />
                        <input type="date" className="input-field" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} style={{ width: 'auto', fontSize: '12px' }} />
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>—</span>
                        <input type="date" className="input-field" value={reportTo} onChange={(e) => setReportTo(e.target.value)} style={{ width: 'auto', fontSize: '12px' }} />
                    </div>
                    <button className="btn-primary" onClick={loadSalesReport} style={{ fontSize: '12px', padding: '7px 14px' }}>
                        Generar Reporte
                    </button>
                    {salesReport?.sales?.length > 0 && (
                        <button className="btn-secondary" onClick={handleExportSalesCSV} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                            <Download size={13} /> Exportar CSV
                        </button>
                    )}
                </div>

                {/* Report Content */}
                {loadingReport ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>
                ) : salesReport ? (
                    <>
                        {/* Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--color-surface-2)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Total Ventas</div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-primary)' }}>{salesReport.summary.totalSales}</div>
                            </div>
                            <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--color-surface-2)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Monto Total</div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981' }}>S/{salesReport.summary.totalAmount.toFixed(2)}</div>
                            </div>
                            {Object.entries(salesReport.summary.byMethod || {}).map(([method, amount]: any) => (
                                <div key={method} style={{ padding: '14px', borderRadius: '10px', background: 'var(--color-surface-2)' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>{methodLabel(method)}</div>
                                    <div style={{ fontSize: '18px', fontWeight: 700 }}>S/{Number(amount).toFixed(2)}</div>
                                </div>
                            ))}
                        </div>

                        {/* Sales Table */}
                        {salesReport.sales.length > 0 ? (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Hora</th>
                                            <th>Cliente</th>
                                            <th>Cajero</th>
                                            <th>Productos</th>
                                            <th>Descuento</th>
                                            <th>Total</th>
                                            <th>Pago</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {salesReport.sales.map((s: any) => (
                                            <tr key={s.id}>
                                                <td style={{ whiteSpace: 'nowrap' }}>{new Date(s.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</td>
                                                <td>{new Date(s.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</td>
                                                <td style={{ fontWeight: 500 }}>{s.client}</td>
                                                <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{s.cashier}</td>
                                                <td style={{ fontSize: '12px', maxWidth: '200px' }}>
                                                    {s.items.map((i: any, idx: number) => (
                                                        <span key={idx}>
                                                            {i.product} <span style={{ color: 'var(--color-text-muted)' }}>x{i.quantity}</span>
                                                            {idx < s.items.length - 1 ? ', ' : ''}
                                                        </span>
                                                    ))}
                                                </td>
                                                <td style={{ color: s.discount > 0 ? '#F59E0B' : 'var(--color-text-muted)', fontSize: '12px' }}>
                                                    {s.discount > 0 ? `-S/${s.discount.toFixed(2)}` : '—'}
                                                </td>
                                                <td style={{ fontWeight: 600, color: '#10B981' }}>S/{s.total.toFixed(2)}</td>
                                                <td>
                                                    <span style={{
                                                        fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px',
                                                        background: s.paymentMethod === 'CASH' ? 'rgba(16,185,129,0.1)' : s.paymentMethod === 'CARD' ? 'rgba(124,58,237,0.1)' : 'rgba(6,182,212,0.1)',
                                                        color: s.paymentMethod === 'CASH' ? '#10B981' : s.paymentMethod === 'CARD' ? '#7C3AED' : '#06B6D4',
                                                    }}>
                                                        {methodLabel(s.paymentMethod)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: '30px' }}>Sin ventas en el rango seleccionado</div>
                        )}
                    </>
                ) : (
                    <div className="empty-state" style={{ padding: '40px' }}>
                        <FileText size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                        Selecciona un rango de fechas y genera el reporte
                    </div>
                )}
            </div>
        </div>
    );
}
