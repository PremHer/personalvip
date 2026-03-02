'use client';

import { useEffect, useState } from 'react';
import { usersApi } from '@/lib/api';
import { useUI } from '@/lib/ui-context';
import { Search, Plus, Edit, X, UserCog, Shield, ShieldCheck, Eye, EyeOff } from 'lucide-react';

const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    OWNER: 'Propietario',
    TRAINER: 'Entrenador',
    RECEPTIONIST: 'Recepcionista',
    CLIENT: 'Cliente',
};

const roleBadgeColors: Record<string, string> = {
    ADMIN: '#7C3AED',
    OWNER: '#06B6D4',
    TRAINER: '#F59E0B',
    RECEPTIONIST: '#10B981',
    CLIENT: '#94A3B8',
};

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'RECEPTIONIST' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const { toast, confirm } = useUI();

    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await usersApi.list(page, 20, search || undefined);
            setUsers(res.data);
            setTotal(res.total);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    useEffect(() => { loadUsers(); }, [page, search]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            if (editingUser) {
                const updateData: any = { name: form.name, phone: form.phone, role: form.role };
                if (form.password) updateData.password = form.password;
                await usersApi.update(editingUser.id, updateData);
            } else {
                if (!form.password) {
                    setError('La contraseña es obligatoria para nuevos usuarios');
                    setSaving(false);
                    return;
                }
                await usersApi.register({
                    email: form.email,
                    password: form.password,
                    name: form.name,
                    role: form.role,
                    phone: form.phone || undefined,
                });
            }
            setShowModal(false);
            loadUsers();
            toast(editingUser ? 'Usuario actualizado' : 'Usuario creado correctamente');
        } catch (err: any) {
            setError(err?.message || 'Error al guardar');
            toast(err?.message || 'Error al guardar', 'error');
        }
        setSaving(false);
    };

    const toggleActive = async (user: any) => {
        if (user.isActive) {
            const ok = await confirm({ title: '¿Desactivar usuario?', message: `"${user.name}" no podrá acceder al sistema.`, confirmText: 'Desactivar', danger: true });
            if (!ok) return;
        }
        try {
            await usersApi.update(user.id, { isActive: !user.isActive });
            toast(user.isActive ? 'Usuario desactivado' : 'Usuario activado');
            loadUsers();
        } catch (e) {
            console.error(e);
            toast('Error al cambiar estado', 'error');
        }
    };

    const openNew = () => {
        setEditingUser(null);
        setForm({ name: '', email: '', password: '', phone: '', role: 'RECEPTIONIST' });
        setError('');
        setShowModal(true);
    };

    const openEdit = (u: any) => {
        setEditingUser(u);
        setForm({ name: u.name, email: u.email, password: '', phone: u.phone || '', role: u.role });
        setError('');
        setShowModal(true);
    };

    return (
        <div style={{ padding: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                        <UserCog size={28} /> Gestión de Usuarios
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '.25rem' }}>
                        {total} usuario{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}
                    </p>
                </div>
                <button onClick={openNew} style={{
                    background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                    color: '#fff', border: 'none', borderRadius: '10px', padding: '.6rem 1.2rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '.4rem',
                    fontWeight: 600, fontSize: '.9rem',
                }}>
                    <Plus size={18} /> Nuevo Usuario
                </button>
            </div>

            {/* Search */}
            <div style={{
                position: 'relative', marginBottom: '1.5rem', maxWidth: '400px',
            }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    style={{
                        width: '100%', padding: '.6rem .6rem .6rem 2.4rem',
                        background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                        borderRadius: '8px', color: 'var(--text-primary)', fontSize: '.9rem',
                    }}
                />
            </div>

            {/* Table */}
            <div style={{
                background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)',
                overflow: 'hidden',
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                {['Nombre', 'Email', 'Teléfono', 'Rol', 'Estado', 'Creado', 'Acciones'].map(h => (
                                    <th key={h} style={{
                                        padding: '.75rem 1rem', textAlign: 'left', fontSize: '.8rem',
                                        color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase',
                                        letterSpacing: '.5px',
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No se encontraron usuarios</td></tr>
                            ) : users.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background .2s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,.05)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <td style={{ padding: '.75rem 1rem', fontWeight: 600 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '50%',
                                                background: `linear-gradient(135deg, ${roleBadgeColors[u.role] || '#7C3AED'}, ${roleBadgeColors[u.role] || '#7C3AED'}88)`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#fff', fontSize: '.8rem', fontWeight: 700,
                                            }}>
                                                {u.name?.charAt(0)?.toUpperCase()}
                                            </div>
                                            {u.name}
                                        </div>
                                    </td>
                                    <td style={{ padding: '.75rem 1rem', color: 'var(--text-secondary)', fontSize: '.9rem' }}>{u.email}</td>
                                    <td style={{ padding: '.75rem 1rem', color: 'var(--text-secondary)', fontSize: '.9rem' }}>{u.phone || '—'}</td>
                                    <td style={{ padding: '.75rem 1rem' }}>
                                        <span style={{
                                            background: `${roleBadgeColors[u.role] || '#7C3AED'}22`,
                                            color: roleBadgeColors[u.role] || '#7C3AED',
                                            padding: '.2rem .6rem', borderRadius: '6px', fontSize: '.8rem', fontWeight: 600,
                                        }}>
                                            {roleLabels[u.role] || u.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '.75rem 1rem' }}>
                                        <span style={{
                                            background: u.isActive ? '#10B98122' : '#EF444422',
                                            color: u.isActive ? '#10B981' : '#EF4444',
                                            padding: '.2rem .6rem', borderRadius: '6px', fontSize: '.8rem', fontWeight: 600,
                                        }}>
                                            {u.isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '.75rem 1rem', color: 'var(--text-secondary)', fontSize: '.85rem' }}>
                                        {new Date(u.createdAt).toLocaleDateString('es-PE')}
                                    </td>
                                    <td style={{ padding: '.75rem 1rem' }}>
                                        <div style={{ display: 'flex', gap: '.4rem' }}>
                                            <button onClick={() => openEdit(u)} title="Editar" style={{
                                                background: '#3B82F622', color: '#3B82F6', border: 'none',
                                                borderRadius: '6px', padding: '.3rem', cursor: 'pointer',
                                            }}><Edit size={16} /></button>
                                            <button onClick={() => toggleActive(u)} title={u.isActive ? 'Desactivar' : 'Activar'} style={{
                                                background: u.isActive ? '#EF444422' : '#10B98122',
                                                color: u.isActive ? '#EF4444' : '#10B981',
                                                border: 'none', borderRadius: '6px', padding: '.3rem', cursor: 'pointer',
                                            }}>
                                                {u.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {total > 20 && (
                    <div style={{
                        display: 'flex', justifyContent: 'center', gap: '.5rem',
                        padding: '1rem', borderTop: '1px solid var(--border-color)',
                    }}>
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                            style={{
                                padding: '.4rem .8rem', borderRadius: '6px', border: '1px solid var(--border-color)',
                                background: 'var(--card-bg)', color: 'var(--text-primary)', cursor: page <= 1 ? 'default' : 'pointer',
                                opacity: page <= 1 ? 0.5 : 1,
                            }}>← Anterior</button>
                        <span style={{ padding: '.4rem .8rem', color: 'var(--text-secondary)', fontSize: '.9rem' }}>
                            Página {page} de {Math.ceil(total / 20)}
                        </span>
                        <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}
                            style={{
                                padding: '.4rem .8rem', borderRadius: '6px', border: '1px solid var(--border-color)',
                                background: 'var(--card-bg)', color: 'var(--text-primary)',
                                cursor: page >= Math.ceil(total / 20) ? 'default' : 'pointer',
                                opacity: page >= Math.ceil(total / 20) ? 0.5 : 1,
                            }}>Siguiente →</button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-card slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {editingUser ? <Edit size={18} color="#fff" /> : <ShieldCheck size={18} color="#fff" />}
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '16px', fontWeight: 700 }}>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                        {editingUser ? 'Modifica los datos del usuario' : 'Registra un nuevo usuario del sistema'}
                                    </p>
                                </div>
                            </div>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '12px', fontWeight: 600, border: '1px solid rgba(239,68,68,0.2)' }}>
                                ⚠️ {error}
                            </div>
                        )}

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label className="form-label">Nombre *</label>
                                    <input className="input-field" placeholder="Juan Pérez" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="form-label">Email *</label>
                                    <input className="input-field" type="email" placeholder="usuario@email.com" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} disabled={!!editingUser}
                                        style={editingUser ? { opacity: 0.6, cursor: 'not-allowed' } : {}} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label className="form-label">
                                        Contraseña {editingUser ? '' : '*'}
                                        {editingUser && <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 400 }}> (vacío = sin cambio)</span>}
                                    </label>
                                    <input className="input-field" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={!editingUser} />
                                </div>
                                <div>
                                    <label className="form-label">Teléfono</label>
                                    <input className="input-field" placeholder="987654321" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                                </div>
                            </div>

                            <div>
                                <label className="form-label">Rol *</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                    {[
                                        { v: 'ADMIN', l: 'Administrador', icon: '🛡️', c: '#7C3AED' },
                                        { v: 'OWNER', l: 'Propietario', icon: '👑', c: '#06B6D4' },
                                        { v: 'TRAINER', l: 'Entrenador', icon: '💪', c: '#F59E0B' },
                                        { v: 'RECEPTIONIST', l: 'Recepcionista', icon: '🖥️', c: '#10B981' },
                                    ].map(r => (
                                        <button key={r.v} type="button" onClick={() => setForm(f => ({ ...f, role: r.v }))}
                                            style={{
                                                padding: '10px 6px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                                                border: form.role === r.v ? `2px solid ${r.c}` : '1px solid var(--color-border)',
                                                backgroundColor: form.role === r.v ? `${r.c}18` : 'var(--color-bg-tertiary)',
                                                color: form.role === r.v ? r.c : 'var(--color-text-muted)',
                                            }}>
                                            <div style={{ fontSize: '18px', marginBottom: '4px' }}>{r.icon}</div>
                                            <div style={{ fontSize: '10px', fontWeight: 700, lineHeight: 1.2 }}>{r.l}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={saving} style={{ minWidth: '140px' }}>
                                    {saving ? 'Guardando...' : editingUser ? '✏️ Actualizar' : '✅ Crear Usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
