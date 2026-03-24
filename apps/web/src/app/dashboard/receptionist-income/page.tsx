'use client';

import React, { useState, useEffect } from 'react';
import { financeApi, usersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Search, Calendar, User as UserIcon, Receipt, CreditCard, Banknote, History, Download } from 'lucide-react';
import { exportToCSV } from '@/lib/export';

export default function ReceptionistIncomePage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    
    const [filters, setFilters] = useState({
        cashierId: isAdmin ? '' : user?.id,
        period: 'today' as 'today' | 'week' | 'month' | 'year' | 'all' | 'custom',
        from: '',
        to: '',
    });

    useEffect(() => {
        if (isAdmin) {
            loadUsers();
        }
    }, [isAdmin]);

    useEffect(() => {
        loadData();
    }, [filters.cashierId, filters.period, filters.from, filters.to]);

    const loadUsers = async () => {
        try {
            const res = await usersApi.list(1, 100);
            setUsers(res.data.filter(u => u.role === 'RECEPTIONIST' || u.role === 'ADMIN' || u.role === 'OWNER'));
        } catch (e) {
            console.error('Error loading users', e);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filters.cashierId) params.cashierId = filters.cashierId;
            
            if (filters.period === 'custom') {
                if (filters.from) params.from = filters.from;
                if (filters.to) params.to = filters.to;
            } else {
                params.period = filters.period;
            }

            const res = await financeApi.receptionistIncome(params);
            setData(res);
        } catch (e) {
            console.error('Error loading receptionist income', e);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!data || data.length === 0) return;
        
        const allTransactions = data.flatMap(cashier => 
            cashier.transactions.map((t: any) => ({
                Recepcionista: cashier.name,
                Fecha: new Date(t.date).toLocaleDateString('es-ES'),
                Hora: new Date(t.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                Cliente: t.clientName,
                Tipo: t.type,
                Descripción: t.description || '—',
                Monto: Number(t.amount).toFixed(2),
                Método: t.method === 'CASH' ? 'Efectivo' :
                        t.method === 'CARD' ? 'Tarjeta' :
                        t.method === 'TRANSFER' ? 'Transferencia' : 'Yape/Plin',
            }))
        );

        exportToCSV(allTransactions, `ingresos_${filters.period}`);
    };

    const todayStr = new Date().toISOString().split('T')[0];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div className="page-header" style={{ marginBottom: 0 }}>
                    <h1>Ingresos por Recepcionista</h1>
                    <p>Monitoreo de ingresos de turno y cobros {isAdmin ? 'globales' : 'personales'}</p>
                </div>
                <button className="btn-secondary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Download size={14} /> Exportar CSV
                </button>
            </div>

            {/* Filters */}
            <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    {isAdmin && (
                        <div style={{ flex: '1', minWidth: '200px' }}>
                            <label className="form-label" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <UserIcon size={14} /> Filtrar por Recepcionista
                            </label>
                            <select 
                                className="input-field" 
                                value={filters.cashierId || ''} 
                                onChange={e => setFilters({ ...filters, cashierId: e.target.value })}
                            >
                                <option value="">Todos los recepcionistas / usuarios</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div style={{ flex: '1', minWidth: '150px' }}>
                        <label className="form-label" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <Calendar size={14} /> Período
                        </label>
                        <select 
                            className="input-field" 
                            value={filters.period} 
                            onChange={e => setFilters({ ...filters, period: e.target.value as any, from: '', to: '' })}
                        >
                            <option value="today">Hoy</option>
                            <option value="week">Últimos 7 días</option>
                            <option value="month">Este Mes</option>
                            <option value="year">Este Año</option>
                            <option value="all">Todo Histórico</option>
                            <option value="custom">Rango Personalizado...</option>
                        </select>
                    </div>

                    {filters.period === 'custom' && (
                        <>
                            <div style={{ flex: '1', minWidth: '130px' }}>
                                <label className="form-label">Desde</label>
                                <input 
                                    type="date" 
                                    className="input-field" 
                                    value={filters.from} 
                                    max={filters.to || todayStr}
                                    onChange={e => setFilters({ ...filters, from: e.target.value })}
                                />
                            </div>
                            <div style={{ flex: '1', minWidth: '130px' }}>
                                <label className="form-label">Hasta</label>
                                <input 
                                    type="date" 
                                    className="input-field" 
                                    value={filters.to} 
                                    max={todayStr}
                                    min={filters.from}
                                    onChange={e => setFilters({ ...filters, to: e.target.value })}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><div className="spinner spinner-lg"></div></div>
            ) : data.length === 0 ? (
                <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    <Receipt size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                    <h3>No se encontraron ingresos</h3>
                    <p>Intenta cambiar los filtros de fecha {isAdmin && 'o recepcionista'}</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {data.map(cashier => (
                        <div key={cashier.id} className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                            <div style={{ background: 'var(--color-bg-tertiary)', padding: '20px', borderBottom: '1px solid var(--color-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <div>
                                        <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <UserIcon size={20} color="var(--color-primary-light)" /> 
                                            {cashier.name}
                                        </h2>
                                        <span className="badge badge-primary" style={{ marginTop: '4px' }}>{cashier.role}</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                                            Total Recaudado
                                        </div>
                                        <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-success)' }}>
                                            S/{Number(cashier.totalIncome).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Membresías</div>
                                        <div style={{ fontSize: '16px', fontWeight: 700 }}>S/{Number(cashier.membershipIncome).toFixed(2)}</div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Ventas POS</div>
                                        <div style={{ fontSize: '16px', fontWeight: 700 }}>S/{Number(cashier.posIncome).toFixed(2)}</div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Pases Diarios</div>
                                        <div style={{ fontSize: '16px', fontWeight: 700 }}>S/{Number(cashier.dailyPassIncome).toFixed(2)}</div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Métodos de Pago</div>
                                        <div style={{ display: 'flex', gap: '8px', fontSize: '11px', marginTop: '4px' }}>
                                            <span style={{ color: '#22c55e' }}>💵 S/{Number(cashier.byMethod.CASH || 0).toFixed(2)}</span>
                                            <span style={{ color: '#3b82f6' }}>💳 S/{Number(cashier.byMethod.CARD || 0).toFixed(2)}</span>
                                            <span style={{ color: '#a855f7' }}>📱 S/{Number((cashier.byMethod.YAPE_PLIN || 0) + (cashier.byMethod.TRANSFER || 0)).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha y Hora</th>
                                            <th>Cliente</th>
                                            <th>Tipo</th>
                                            <th>Descripción</th>
                                            <th>Método</th>
                                            <th style={{ textAlign: 'right' }}>Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cashier.transactions.length === 0 ? (
                                            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No hay transacciones individuales</td></tr>
                                        ) : (
                                            cashier.transactions.map((t: any) => (
                                                <tr key={t.id}>
                                                    <td style={{ fontSize: '13px' }}>
                                                        <span style={{ fontWeight: 600 }}>{new Date(t.date).toLocaleDateString('es-ES')}</span>{' '}
                                                        <span style={{ color: 'var(--color-text-muted)' }}>{new Date(t.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </td>
                                                    <td style={{ fontWeight: 500 }}>{t.clientName}</td>
                                                    <td>
                                                        <span className={`badge ${
                                                            t.type === 'MEMBRESÍA' ? 'badge-primary' : 
                                                            t.type === 'PASE DIARIO' ? 'badge-cancelled' : 'badge-active'
                                                        }`}>
                                                            {t.type}
                                                        </span>
                                                    </td>
                                                    <td>{t.description || '—'}</td>
                                                    <td>
                                                        <span style={{ 
                                                            fontSize: '12px', fontWeight: 600, padding: '4px 8px', borderRadius: '6px',
                                                            background: t.method === 'CASH' ? 'rgba(34,197,94,0.1)' : 'rgba(168,85,247,0.1)',
                                                            color: t.method === 'CASH' ? '#22c55e' : '#a855f7'
                                                        }}>
                                                            {t.method === 'CASH' ? 'EFECTIVO' : 
                                                             t.method === 'CARD' ? 'TARJETA' : 
                                                             t.method === 'TRANSFER' ? 'TRANSFER' : 'YAPE/PLIN'}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                                                        S/{Number(t.amount).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
