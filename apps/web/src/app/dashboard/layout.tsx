'use client';

import { useAuth } from '@/lib/auth-context';
import { membershipsApi } from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, ReactNode, useState, useRef } from 'react';
import Link from 'next/link';
import {
    LayoutDashboard, Users, CreditCard, ClipboardList, ShoppingCart,
    Package, Wrench, BarChart3, Shield, LogOut, Menu, X,
    Dumbbell, ChevronRight, Bell, Settings, Search, Sun, Moon,
} from 'lucide-react';

const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'OWNER', 'RECEPTIONIST', 'TRAINER'] },
    { href: '/dashboard/clients', icon: Users, label: 'Clientes', roles: ['ADMIN', 'OWNER', 'RECEPTIONIST'] },
    { href: '/dashboard/memberships', icon: CreditCard, label: 'Membresías', roles: ['ADMIN', 'OWNER', 'RECEPTIONIST'] },
    { href: '/dashboard/attendance', icon: ClipboardList, label: 'Asistencia', roles: ['ADMIN', 'OWNER', 'RECEPTIONIST'] },
    { href: '/dashboard/sales', icon: ShoppingCart, label: 'Ventas', roles: ['ADMIN', 'OWNER', 'RECEPTIONIST'] },
    { href: '/dashboard/products', icon: Package, label: 'Productos', roles: ['ADMIN', 'OWNER'] },
    { href: '/dashboard/assets', icon: Wrench, label: 'Activos', roles: ['ADMIN', 'OWNER'] },
    { href: '/dashboard/finance', icon: BarChart3, label: 'Finanzas', roles: ['ADMIN', 'OWNER'] },
    { href: '/dashboard/audit', icon: Shield, label: 'Auditoría', roles: ['ADMIN', 'OWNER'] },
];

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

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Theme toggle
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    useEffect(() => {
        const saved = localStorage.getItem('gymcore-theme') as 'dark' | 'light' | null;
        if (saved) { setTheme(saved); document.documentElement.setAttribute('data-theme', saved); }
    }, []);
    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('gymcore-theme', next);
    };

    // Notifications
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notiOpen, setNotiOpen] = useState(false);
    const notiRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user) {
            membershipsApi.expiring(7).then(setNotifications).catch(() => { });
        }
    }, [user]);

    // Close notifications on outside click
    useEffect(() => {
        const fn = (e: MouseEvent) => {
            if (notiRef.current && !notiRef.current.contains(e.target as Node)) setNotiOpen(false);
        };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    // Global search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchOpen, setSearchOpen] = useState(false);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    // Click outside to close
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Ctrl+K shortcut
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
                setTimeout(() => {
                    const input = searchRef.current?.querySelector('input');
                    input?.focus();
                }, 50);
            }
            if (e.key === 'Escape') setSearchOpen(false);
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, []);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (!query.trim()) { setSearchResults([]); return; }
        searchTimeout.current = setTimeout(async () => {
            try {
                const { clientsApi } = await import('@/lib/api');
                const res = await clientsApi.list(1, 8, query);
                setSearchResults(res.data);
            } catch { setSearchResults([]); }
        }, 300);
    };

    if (loading || !user) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, var(--color-primary), #4F46E5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                        boxShadow: '0 8px 32px rgba(124,58,237,0.3)',
                    }}>
                        <Dumbbell size={24} color="white" />
                    </div>
                    <div className="spinner spinner-lg" style={{ margin: '0 auto' }} />
                </div>
            </div>
        );
    }

    const filteredNav = navItems.filter((item) => item.roles.includes(user.role));

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <aside style={{
                width: '240px', minWidth: '240px', height: '100vh', position: 'sticky', top: 0,
                background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)',
                display: 'flex', flexDirection: 'column', overflowY: 'auto',
            }}>
                {/* Logo */}
                <div style={{
                    padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '10px',
                    borderBottom: '1px solid var(--color-border)',
                }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, var(--color-primary), #4F46E5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
                        flexShrink: 0,
                    }}>
                        <Dumbbell size={18} color="white" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.01em' }}>GymCore</div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Panel Admin</div>
                    </div>
                </div>

                {/* Navigation */}
                <nav style={{ padding: '12px 8px', flex: 1 }}>
                    <div style={{
                        fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)',
                        padding: '8px 12px 6px', textTransform: 'uppercase', letterSpacing: '0.8px',
                    }}>
                        Navegación
                    </div>
                    {filteredNav.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`sidebar-link ${isActive ? 'active' : ''}`}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <item.icon size={18} />
                                <span>{item.label}</span>
                                {isActive && <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.4 }} />}
                            </Link>
                        );
                    })}
                </nav>

                {/* User section */}
                <div style={{ padding: '12px', borderTop: '1px solid var(--color-border)' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px', borderRadius: '10px', background: 'var(--color-surface-2)',
                        marginBottom: '8px',
                    }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: `${roleBadgeColors[user.role] || '#94A3B8'}20`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '13px',
                            color: roleBadgeColors[user.role] || '#94A3B8',
                            flexShrink: 0,
                        }}>
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontWeight: 600, fontSize: '12px',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                            }}>{user.name}</div>
                            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{roleLabels[user.role]}</div>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="btn-secondary"
                        style={{ width: '100%', justifyContent: 'center', fontSize: '12px', padding: '7px' }}
                    >
                        <LogOut size={14} />
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Top bar */}
                <header style={{
                    height: '56px', background: 'var(--color-surface)',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 24px', position: 'sticky', top: 0, zIndex: 30,
                }}>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                        {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Global Search */}
                        <div ref={searchRef} style={{ position: 'relative' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '6px 12px', borderRadius: '8px',
                                background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                                width: searchOpen ? '320px' : '200px',
                                transition: 'width 0.2s ease',
                            }}>
                                <Search size={14} color="var(--color-text-muted)" />
                                <input
                                    type="text"
                                    placeholder="Buscar cliente..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    onFocus={() => setSearchOpen(true)}
                                    style={{
                                        border: 'none', outline: 'none', background: 'transparent',
                                        color: 'var(--color-text)', fontSize: '12px', width: '100%',
                                    }}
                                />
                                <kbd style={{
                                    fontSize: '9px', padding: '2px 5px', borderRadius: '4px',
                                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                                    color: 'var(--color-text-muted)', fontFamily: 'monospace', whiteSpace: 'nowrap',
                                }}>Ctrl+K</kbd>
                            </div>

                            {/* Search Results Dropdown */}
                            {searchOpen && searchQuery && searchResults.length > 0 && (
                                <div style={{
                                    position: 'absolute', top: '44px', right: 0, width: '360px',
                                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                                    borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                                    maxHeight: '400px', overflowY: 'auto', zIndex: 100,
                                }}>
                                    <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)' }}>
                                        Clientes encontrados
                                    </div>
                                    {searchResults.map((c: any) => (
                                        <button
                                            key={c.id}
                                            onClick={() => {
                                                router.push(`/dashboard/clients/${c.id}`);
                                                setSearchOpen(false);
                                                setSearchQuery('');
                                                setSearchResults([]);
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                                                padding: '10px 12px', border: 'none', background: 'transparent',
                                                cursor: 'pointer', textAlign: 'left',
                                                borderBottom: '1px solid var(--color-border)',
                                                transition: 'background 0.1s ease',
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '8px',
                                                background: 'rgba(124,58,237,0.12)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '13px', fontWeight: 700, color: '#7C3AED', flexShrink: 0,
                                            }}>
                                                {c.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>{c.name}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                                    {c.email || c.phone || 'Sin contacto'}
                                                </div>
                                            </div>
                                            {c.activeMembership ? (
                                                <span className="badge badge-active" style={{ fontSize: '9px' }}>Activo</span>
                                            ) : (
                                                <span className="badge badge-cancelled" style={{ fontSize: '9px' }}>Inactivo</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {searchOpen && searchQuery && searchResults.length === 0 && searchQuery.length >= 2 && (
                                <div style={{
                                    position: 'absolute', top: '44px', right: 0, width: '320px',
                                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                                    borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                                    padding: '20px', textAlign: 'center', zIndex: 100,
                                }}>
                                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Sin resultados para &quot;{searchQuery}&quot;</div>
                                </div>
                            )}
                        </div>

                        <button className="btn-icon" onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'} style={{ position: 'relative' }}>
                            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                        <div ref={notiRef} style={{ position: 'relative' }}>
                            <button className="btn-icon" title="Notificaciones" onClick={() => setNotiOpen(!notiOpen)} style={{ position: 'relative' }}>
                                <Bell size={16} />
                                {notifications.length > 0 && (
                                    <span style={{
                                        position: 'absolute', top: '-2px', right: '-2px', width: '16px', height: '16px',
                                        borderRadius: '50%', background: '#EF4444', color: '#fff', fontSize: '9px',
                                        fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: '2px solid var(--color-surface)',
                                    }}>{notifications.length > 9 ? '9+' : notifications.length}</span>
                                )}
                            </button>
                            {notiOpen && (
                                <div style={{
                                    position: 'absolute', top: '44px', right: 0, width: '360px',
                                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                                    borderRadius: '14px', boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                                    zIndex: 100, overflow: 'hidden',
                                }}>
                                    <div style={{
                                        padding: '14px 16px', borderBottom: '1px solid var(--color-border)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    }}>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>🔔 Notificaciones</span>
                                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{notifications.length} alerta{notifications.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                                        {notifications.length === 0 ? (
                                            <div style={{ padding: '24px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '28px', marginBottom: '6px' }}>✅</div>
                                                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Sin notificaciones</div>
                                            </div>
                                        ) : notifications.map((m: any) => {
                                            const daysLeft = Math.ceil((new Date(m.endDate).getTime() - Date.now()) / 86400000);
                                            const isUrgent = daysLeft <= 2;
                                            return (
                                                <div key={m.id}
                                                    style={{
                                                        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px',
                                                        borderBottom: '1px solid var(--color-border)', cursor: 'pointer',
                                                        transition: 'background 0.15s',
                                                    }}
                                                    onClick={() => { router.push(`/dashboard/clients/${m.clientId}`); setNotiOpen(false); }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                >
                                                    <div style={{
                                                        width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                                                        background: isUrgent ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '12px', fontWeight: 700,
                                                        color: isUrgent ? '#EF4444' : '#F59E0B',
                                                    }}>
                                                        {m.client?.name?.charAt(0).toUpperCase() || '?'}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {m.client?.name}
                                                        </div>
                                                        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                                                            {m.plan?.name} · Vence {new Date(m.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                                        </div>
                                                    </div>
                                                    <span style={{
                                                        fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px',
                                                        background: isUrgent ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                                        color: isUrgent ? '#EF4444' : '#F59E0B', whiteSpace: 'nowrap',
                                                    }}>
                                                        {daysLeft <= 0 ? '¡Hoy!' : daysLeft === 1 ? 'Mañana' : `${daysLeft}d`}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: 'var(--color-bg)' }}>
                    <div className="animate-in">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
