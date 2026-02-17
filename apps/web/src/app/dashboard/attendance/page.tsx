'use client';

import { useEffect, useState, useRef } from 'react';
import { attendanceApi } from '@/lib/api';
import { exportToCSV } from '@/lib/export';
import { QrCode, LogOut, Users, CheckCircle, ArrowRight, Scan, Calendar, ChevronLeft, ChevronRight, History, Download } from 'lucide-react';

export default function AttendancePage() {
    const [todayRecords, setTodayRecords] = useState<any[]>([]);
    const [historyRecords, setHistoryRecords] = useState<any[]>([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotalPages, setHistoryTotalPages] = useState(1);
    const [selectedDate, setSelectedDate] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [viewMode, setViewMode] = useState<'today' | 'history'>('today');
    const [qrCode, setQrCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { loadToday(); }, []);

    const loadToday = async () => {
        setLoading(true);
        try { setTodayRecords(await attendanceApi.today()); } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const loadHistory = async (page = 1) => {
        setLoadingHistory(true);
        try {
            const params: any = { page, limit: 30 };
            if (selectedDate) params.date = selectedDate;
            else {
                if (dateFrom) params.from = dateFrom;
                if (dateTo) params.to = dateTo;
            }
            const res = await attendanceApi.history(params);
            setHistoryRecords(res.data);
            setHistoryTotal(res.total);
            setHistoryPage(res.page);
            setHistoryTotalPages(res.totalPages);
        } catch (e) { console.error(e); }
        finally { setLoadingHistory(false); }
    };

    useEffect(() => {
        if (viewMode === 'history') loadHistory(1);
    }, [viewMode, selectedDate, dateFrom, dateTo]);

    const handleCheckIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!qrCode.trim()) return;
        try {
            const result = await attendanceApi.checkIn(qrCode.trim());
            if (result.success === false) {
                setMessage({ type: 'error', text: result.message });
            } else {
                setMessage({ type: 'success', text: result.message || `✅ Check-in: ${result.client?.name || 'Cliente registrado'}` });
                loadToday();
            }
            setQrCode('');
        } catch (e: any) { setMessage({ type: 'error', text: e.message }); }
        setTimeout(() => setMessage(null), 5000);
        inputRef.current?.focus();
    };

    const handleCheckOut = async (clientId: string, name: string) => {
        try { await attendanceApi.checkOut(clientId); setMessage({ type: 'success', text: `👋 Check-out: ${name}` }); loadToday(); }
        catch (e: any) { setMessage({ type: 'error', text: e.message }); }
        setTimeout(() => setMessage(null), 4000);
    };

    const handleAutoCheckout = async () => {
        if (!confirm('¿Cerrar todas las entradas abiertas de días anteriores?')) return;
        try {
            const res = await attendanceApi.autoCheckout();
            setMessage({ type: 'success', text: res.message });
            loadToday();
        } catch (e: any) { setMessage({ type: 'error', text: e.message }); }
        setTimeout(() => setMessage(null), 5000);
    };

    const formatTime = (dateStr: string | null | undefined) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const inGym = todayRecords.filter(r => !r.checkOut);
    const records = viewMode === 'today' ? todayRecords : historyRecords;

    const clearFilters = () => {
        setSelectedDate('');
        setDateFrom('');
        setDateTo('');
    };

    const todayStr = new Date().toISOString().split('T')[0];

    const handleExportCSV = () => {
        const records = viewMode === 'today' ? todayRecords : historyRecords;
        if (!records.length) return;
        const csvData = records.map((r: any) => ({
            Cliente: r.client?.name || '—',
            Fecha: r.checkIn ? new Date(r.checkIn).toLocaleDateString('es-ES') : '',
            Entrada: r.checkIn ? new Date(r.checkIn).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '',
            Salida: r.checkOut ? new Date(r.checkOut).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '',
            Duración: r.checkOut ? `${Math.round((new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 60000)} min` : 'En gym',
            Método: r.method || '',
        }));
        exportToCSV(csvData, viewMode === 'today' ? 'asistencia_hoy' : 'asistencia_historial');
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <div className="page-header" style={{ marginBottom: 0 }}>
                    <h1>Control de Asistencia</h1>
                    <p>{viewMode === 'today' ? `${todayRecords.length} registros hoy` : `${historyTotal} registros encontrados`}</p>
                </div>
                <button className="btn-secondary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    <Download size={14} /> Exportar CSV
                </button>
            </div>

            {/* View mode tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className={viewMode === 'today' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setViewMode('today')}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Users size={14} /> Hoy
                    </button>
                    <button
                        className={viewMode === 'history' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setViewMode('history')}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <History size={14} /> Historial
                    </button>
                </div>
                <button
                    className="btn-secondary"
                    onClick={handleAutoCheckout}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                    title="Cerrar entradas abiertas de días anteriores"
                >
                    <LogOut size={14} /> Auto Check-out
                </button>
            </div>

            {viewMode === 'today' && (
                <>
                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                        {[
                            { label: 'En el Gimnasio', value: inGym.length, icon: Users, color: 'var(--color-secondary)', accent: 'teal' },
                            { label: 'Check-ins Hoy', value: todayRecords.length, icon: CheckCircle, color: 'var(--color-primary)', accent: 'purple' },
                            { label: 'Salidas Registradas', value: todayRecords.filter(r => r.checkOut).length, icon: LogOut, color: 'var(--color-accent)', accent: 'pink' },
                        ].map((s, i) => (
                            <div key={i} className={`stat-card ${s.accent}`}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <s.icon size={18} color={s.color} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '22px', fontWeight: 700 }}>{s.value}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{s.label}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* QR Scanner */}
                    <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <Scan size={18} color="var(--color-primary-light)" />
                            <h2 style={{ fontSize: '14px', fontWeight: 600 }}>Registro de Entrada</h2>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                                Escanea el QR del cliente o ingresa su código
                            </span>
                        </div>
                        <form onSubmit={handleCheckIn} style={{ display: 'flex', gap: '10px' }}>
                            <input ref={inputRef} className="input-field" placeholder="Escanear QR o ingresar código del cliente..." value={qrCode}
                                onChange={(e) => setQrCode(e.target.value)} autoFocus style={{ flex: 1 }} />
                            <button type="submit" className="btn-primary"><ArrowRight size={16} /> Registrar</button>
                        </form>
                        {message && (
                            <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginTop: '12px', fontSize: '13px' }}>
                                {message.text}
                            </div>
                        )}
                    </div>
                </>
            )}

            {viewMode === 'history' && (
                <div className="glass-card" style={{ padding: '16px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Calendar size={16} color="var(--color-primary-light)" />
                        <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Filtrar por Fecha</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'end', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1', minWidth: '150px' }}>
                            <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Fecha específica</label>
                            <input
                                type="date"
                                className="input-field"
                                value={selectedDate}
                                max={todayStr}
                                onChange={(e) => { setSelectedDate(e.target.value); setDateFrom(''); setDateTo(''); }}
                            />
                        </div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '12px', paddingBottom: '8px' }}>ó</div>
                        <div style={{ flex: '1', minWidth: '130px' }}>
                            <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Desde</label>
                            <input
                                type="date"
                                className="input-field"
                                value={dateFrom}
                                max={dateTo || todayStr}
                                onChange={(e) => { setDateFrom(e.target.value); setSelectedDate(''); }}
                            />
                        </div>
                        <div style={{ flex: '1', minWidth: '130px' }}>
                            <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Hasta</label>
                            <input
                                type="date"
                                className="input-field"
                                value={dateTo}
                                max={todayStr}
                                min={dateFrom}
                                onChange={(e) => { setDateTo(e.target.value); setSelectedDate(''); }}
                            />
                        </div>
                        {(selectedDate || dateFrom || dateTo) && (
                            <button className="btn-secondary" onClick={clearFilters} style={{ fontSize: '11px', padding: '8px 12px' }}>
                                ✕ Limpiar
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Table */}
            {(viewMode === 'today' ? loading : loadingHistory) ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner spinner-lg" /></div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr>
                            {viewMode === 'history' && <th>Fecha</th>}
                            <th>Cliente</th><th>Entrada</th><th>Salida</th><th>Método</th><th>Estado</th>
                            {viewMode === 'today' && <th style={{ width: '80px' }}>Acciones</th>}
                        </tr></thead>
                        <tbody>
                            {records.map((r) => (
                                <tr key={r.id}>
                                    {viewMode === 'history' && <td>{formatDate(r.checkIn)}</td>}
                                    <td style={{ fontWeight: 500, color: 'var(--color-text)' }}>{r.client?.name}</td>
                                    <td>{formatTime(r.checkIn)}</td>
                                    <td>{formatTime(r.checkOut)}</td>
                                    <td><span className="badge badge-primary">{r.method}</span></td>
                                    <td>{r.checkOut ? <span className="badge badge-cancelled">Salió</span> : <span className="badge badge-active">En gym</span>}</td>
                                    {viewMode === 'today' && (
                                        <td>
                                            {!r.checkOut && (
                                                <button className="btn-secondary" onClick={() => handleCheckOut(r.clientId, r.client?.name)} style={{ fontSize: '11px', padding: '6px 10px' }}>
                                                    <LogOut size={12} /> Salida
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {records.length === 0 && (
                                <tr><td colSpan={viewMode === 'history' ? 6 : 6} className="empty-state">
                                    {viewMode === 'today' ? 'No hay registros de asistencia hoy' : 'No hay registros para el período seleccionado'}
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination for history */}
            {viewMode === 'history' && historyTotalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                    <button
                        className="btn-secondary"
                        disabled={historyPage <= 1}
                        onClick={() => loadHistory(historyPage - 1)}
                        style={{ padding: '6px 12px' }}
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                        Página {historyPage} de {historyTotalPages} ({historyTotal} registros)
                    </span>
                    <button
                        className="btn-secondary"
                        disabled={historyPage >= historyTotalPages}
                        onClick={() => loadHistory(historyPage + 1)}
                        style={{ padding: '6px 12px' }}
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}
