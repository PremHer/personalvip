'use client';

import { useEffect, useState } from 'react';
import { auditApi } from '@/lib/api';
import { Shield } from 'lucide-react';

export default function AuditPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [entityType, setEntityType] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadLogs(); }, [page, entityType]);

    const loadLogs = async () => {
        setLoading(true);
        try { const res = await auditApi.list({ page, limit: 30, entityType: entityType || undefined }); setLogs(res.data); setTotal(res.total); }
        catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const actionColor = (action: string) => {
        if (action.includes('CREATE') || action === 'POST') return 'var(--color-success)';
        if (action.includes('UPDATE') || action === 'PATCH' || action === 'PUT') return 'var(--color-info)';
        if (action.includes('DELETE')) return 'var(--color-danger)';
        return 'var(--color-text-secondary)';
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={20} color="var(--color-primary-light)" />
                <div><h1>Auditoría</h1><p>{total} registros de actividad</p></div>
            </div>

            {/* Filter */}
            <div style={{ marginBottom: '16px' }}>
                <select className="input-field" value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} style={{ width: '200px' }}>
                    <option value="">Todas las entidades</option>
                    <option value="User">Usuarios</option><option value="Client">Clientes</option>
                    <option value="Membership">Membresías</option><option value="MembershipPlan">Planes</option>
                    <option value="Product">Productos</option><option value="Asset">Activos</option>
                    <option value="Sale">Ventas</option><option value="Attendance">Asistencia</option>
                </select>
            </div>

            {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner spinner-lg" /></div> : (
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>ID</th><th>IP</th></tr></thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id}>
                                    <td style={{ fontSize: '12px', whiteSpace: 'nowrap' as const }}>{new Date(log.timestamp || log.createdAt).toLocaleString('es-ES')}</td>
                                    <td style={{ fontWeight: 500, color: 'var(--color-text)' }}>{log.user?.name || log.userId?.slice(0, 8) || '—'}</td>
                                    <td><span style={{ fontWeight: 700, color: actionColor(log.action), fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>{log.action}</span></td>
                                    <td><span className="badge badge-primary">{log.entityType}</span></td>
                                    <td style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-text-muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{log.entityId?.slice(0, 8) || '—'}</td>
                                    <td style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{log.ipAddress || '—'}</td>
                                </tr>
                            ))}
                            {logs.length === 0 && <tr><td colSpan={6} className="empty-state">No hay registros</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {total > 30 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                    <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ fontSize: '12px', padding: '8px 14px' }}>Anterior</button>
                    <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>Pág. {page}/{Math.ceil(total / 30)}</span>
                    <button className="btn-secondary" disabled={page >= Math.ceil(total / 30)} onClick={() => setPage(page + 1)} style={{ fontSize: '12px', padding: '8px 14px' }}>Siguiente</button>
                </div>
            )}
        </div>
    );
}
