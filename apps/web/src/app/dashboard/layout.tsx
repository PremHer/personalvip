'use client';

import { useAuth } from '@/lib/auth-context';
import { membershipsApi, authApi, clientsApi, attendanceApi } from '@/lib/api';
import { useUI } from '@/lib/ui-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, ReactNode, useState, useRef } from 'react';
import Link from 'next/link';
import PaymentReceipt from '@/components/PaymentReceipt';
import {
    LayoutDashboard, Users, CreditCard, ClipboardList, ShoppingCart,
    Package, Wrench, BarChart3, Shield, LogOut, Menu, X,
    Dumbbell, ChevronRight, Bell, Settings, Search, Sun, Moon, Key, Eye, EyeOff, Zap, Receipt,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['SUPERADMIN', 'ADMIN', 'OWNER', 'RECEPTIONIST', 'TRAINER'] },
    { href: '/dashboard/users', icon: Settings, label: 'Usuarios', roles: ['SUPERADMIN', 'ADMIN', 'OWNER'] },
    { href: '/dashboard/clients', icon: Users, label: 'Clientes', roles: ['SUPERADMIN', 'ADMIN', 'OWNER', 'RECEPTIONIST'] },
    { href: '/dashboard/memberships', icon: CreditCard, label: 'Membresías', roles: ['SUPERADMIN', 'ADMIN', 'OWNER', 'RECEPTIONIST'] },
    { href: '/dashboard/attendance', icon: ClipboardList, label: 'Asistencia', roles: ['SUPERADMIN', 'ADMIN', 'OWNER', 'RECEPTIONIST'] },
    { href: '/dashboard/sales', icon: ShoppingCart, label: 'Ventas', roles: ['SUPERADMIN', 'ADMIN', 'OWNER', 'RECEPTIONIST'] },
    { href: '/dashboard/receptionist-income', icon: Receipt, label: 'Ingresos', roles: ['SUPERADMIN', 'ADMIN', 'OWNER', 'RECEPTIONIST'] },
    { href: '/dashboard/products', icon: Package, label: 'Productos', roles: ['SUPERADMIN', 'ADMIN', 'OWNER'] },
    { href: '/dashboard/assets', icon: Wrench, label: 'Activos', roles: ['SUPERADMIN', 'ADMIN', 'OWNER'] },
    { href: '/dashboard/finance', icon: BarChart3, label: 'Finanzas', roles: ['SUPERADMIN', 'ADMIN', 'OWNER'] },
    { href: '/dashboard/audit', icon: Shield, label: 'Auditoría', roles: ['SUPERADMIN', 'ADMIN', 'OWNER'] },
];

const roleLabels: Record<string, string> = {
    SUPERADMIN: 'Super Admin',
    ADMIN: 'Administrador',
    OWNER: 'Propietario',
    TRAINER: 'Entrenador',
    RECEPTIONIST: 'Recepcionista',
    CLIENT: 'Cliente',
};

const roleBadgeColors: Record<string, string> = {
    SUPERADMIN: '#EF4444',
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
    const { toast } = useUI();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Password change
    const [showPwModal, setShowPwModal] = useState(false);
    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [pwSaving, setPwSaving] = useState(false);
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);

    // Daily pass
    const [showDailyPassModal, setShowDailyPassModal] = useState(false);
    const [dpStep, setDpStep] = useState<'search' | 'form' | 'result'>('search');
    const [dpDni, setDpDni] = useState('');
    const [dpFound, setDpFound] = useState<any>(null);
    const [dpSearching, setDpSearching] = useState(false);
    const [dpForm, setDpForm] = useState({ name: '', phone: '', amountPaid: 8, paymentMethod: 'CASH', receiptUrl: '' });
    const [dpSaving, setDpSaving] = useState(false);
    const [dpResult, setDpResult] = useState<any>(null);

    // Receipt context
    const [receiptData, setReceiptData] = useState<any>(null);

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

    // Page route animation state
    const [isAnimating, setIsAnimating] = useState(true);
    useEffect(() => {
        setIsAnimating(true);
        const t = setTimeout(() => setIsAnimating(false), 300);
        return () => clearTimeout(t);
    }, [pathname]);

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
        <>
            <div style={{ display: 'flex', minHeight: '100vh' }}>
                {/* Mobile sidebar overlay */}
                <div
                    className={`sidebar-overlay ${!sidebarOpen ? 'hidden' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                />

                {/* Sidebar */}
                <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={{
                    width: '240px', minWidth: '240px', height: '100vh', position: 'sticky', top: 0,
                    background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)',
                    display: 'flex', flexDirection: 'column', overflowY: 'auto',
                }}>
                    {/* Logo */}
                    <div style={{
                        padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '10px',
                        borderBottom: '1px solid var(--color-border)',
                    }}>
                        <img src="/logo.png" alt="Personal VIP" style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            objectFit: 'cover',
                        }} />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.01em' }}>Personal VIP</div>
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

                        {/* Quick Daily Pass Button */}
                        {['SUPERADMIN', 'ADMIN', 'OWNER', 'RECEPTIONIST'].includes(user.role) && (
                            <div style={{ padding: '8px 4px 0' }}>
                                <button onClick={() => {
                                    setDpDni(''); setDpFound(null); setDpStep('search');
                                    setDpForm({ name: '', phone: '', amountPaid: 8, paymentMethod: 'CASH', receiptUrl: '' }); setDpResult(null);
                                    setShowDailyPassModal(true);
                                    setSidebarOpen(false);
                                }} style={{
                                    width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.3)',
                                    background: 'rgba(245,158,11,0.08)', color: '#F59E0B',
                                    fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    transition: 'all 0.2s',
                                }}>
                                    <Zap size={16} /> Pase Diario
                                </button>
                            </div>
                        )}
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
                            onClick={() => setShowPwModal(true)}
                            className="btn-secondary"
                            style={{ width: '100%', justifyContent: 'center', fontSize: '12px', padding: '7px', marginBottom: '6px' }}
                        >
                            <Key size={14} />
                            Cambiar Contraseña
                        </button>
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
                    <header className="top-header" style={{
                        height: '56px', background: 'var(--color-surface)',
                        borderBottom: '1px solid var(--color-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0 24px', position: 'sticky', top: 0, zIndex: 30,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button
                                className="hamburger-btn"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                aria-label="Toggle menu"
                            >
                                {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
                            </button>
                            <div className="date-text" style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                                {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {/* Global Search */}
                            <div ref={searchRef} className="search-box" style={{ position: 'relative' }}>
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
                    <div className="page-content" style={{ flex: 1, padding: '24px', overflowY: 'auto', background: 'var(--color-bg)' }}>
                        <div className={isAnimating ? "animate-in" : ""}>
                            {children}
                        </div>
                    </div>
                </main>

                {/* Change Password Modal */}
                {showPwModal && (
                    <div className="modal-overlay" onClick={() => setShowPwModal(false)}>
                        <div className="modal-card slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Cambiar Contraseña</h2>
                                <button className="btn-icon" onClick={() => setShowPwModal(false)}><X size={16} /></button>
                            </div>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                if (pwForm.newPassword !== pwForm.confirmPassword) { toast('Las contraseñas no coinciden', 'error'); return; }
                                if (pwForm.newPassword.length < 6) { toast('La nueva contraseña debe tener al menos 6 caracteres', 'warning'); return; }
                                setPwSaving(true);
                                try {
                                    await authApi.changePassword(pwForm.currentPassword, pwForm.newPassword);
                                    toast('Contraseña actualizada correctamente');
                                    setShowPwModal(false);
                                    setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                } catch (err: any) { toast(err?.message || 'Error al cambiar contraseña', 'error'); }
                                setPwSaving(false);
                            }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label className="form-label">Contraseña Actual</label>
                                    <div style={{ position: 'relative' }}>
                                        <input className="input-field" type={showCurrentPw ? 'text' : 'password'} value={pwForm.currentPassword}
                                            onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} required style={{ paddingRight: '38px' }} />
                                        <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} style={{
                                            position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px',
                                        }}>{showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label">Nueva Contraseña</label>
                                    <div style={{ position: 'relative' }}>
                                        <input className="input-field" type={showNewPw ? 'text' : 'password'} value={pwForm.newPassword}
                                            onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} required minLength={6} style={{ paddingRight: '38px' }} />
                                        <button type="button" onClick={() => setShowNewPw(!showNewPw)} style={{
                                            position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px',
                                        }}>{showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label">Confirmar Nueva Contraseña</label>
                                    <input className="input-field" type="password" value={pwForm.confirmPassword}
                                        onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required minLength={6} />
                                </div>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                                    <button type="button" className="btn-secondary" onClick={() => setShowPwModal(false)}>Cancelar</button>
                                    <button type="submit" className="btn-primary" disabled={pwSaving}>
                                        {pwSaving ? <><div className="spinner" style={{ width: '14px', height: '14px' }} /> Guardando...</> : 'Actualizar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

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

                        {dpStep === 'search' && (
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                if (!dpDni.trim()) return;
                                setDpSearching(true);
                                try {
                                    const found = await clientsApi.searchByDni(dpDni.trim());
                                    setDpFound(found || null);
                                } catch { setDpFound(null); }
                                setDpStep('form');
                                setDpSearching(false);
                            }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

                        {dpStep === 'form' && (
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                setDpSaving(true);
                                try {
                                    if (dpFound?.activeMembership) {
                                        const res = await attendanceApi.checkIn(dpFound.id, 'MANUAL');
                                        if (res.success) {
                                            toast('✅ Asistencia registrada exitosamente');
                                            setShowDailyPassModal(false);
                                            setDpStep('search'); setDpDni(''); setDpFound(null);
                                        } else {
                                            toast(res.message || 'Error al registrar asistencia', 'error');
                                        }
                                    } else {
                                        let clientId: string;
                                        if (dpFound) {
                                            clientId = dpFound.id;
                                        } else {
                                            const nc = await clientsApi.create({ name: dpForm.name.trim(), phone: dpForm.phone.trim() || undefined, dni: dpDni.trim() || undefined });
                                            clientId = nc.id;
                                        }
                                        await membershipsApi.dailyPass({ clientId, amountPaid: Number(dpForm.amountPaid), paymentMethod: dpForm.paymentMethod, receiptUrl: dpForm.receiptUrl || undefined });
                                        const full = await clientsApi.get(clientId);
                                        setDpResult(full);
                                        setDpStep('result');
                                        toast('✅ Pase Diario asignado y acceso registrado');
                                    }
                                } catch (err: any) { toast(err.message || 'Error', 'error'); }
                                finally { setDpSaving(false); }
                            }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {dpFound ? (
                                    <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>✅ Cliente Registrado</div>
                                        <div style={{ fontWeight: 600, fontSize: '15px' }}>{dpFound.name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>DNI: {dpFound.dni} {dpFound.phone ? `• Tel: ${dpFound.phone}` : ''}</div>
                                        {dpFound.activeMembership && (
                                            <div style={{ marginTop: '8px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(245,158,11,0.1)', fontSize: '11px', color: '#F59E0B', fontWeight: 600 }}>
                                                ⚠️ Ya tiene membresía activa: {dpFound.activeMembership.plan?.name}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                            🆕 No se encontró cliente con DNI <strong style={{ color: 'var(--color-text)' }}>{dpDni}</strong>. Completa los datos:
                                        </div>
                                        <div><label className="form-label">Nombre *</label><input className="input-field" placeholder="Juan Pérez" value={dpForm.name} onChange={(e) => setDpForm({ ...dpForm, name: e.target.value })} required autoFocus /></div>
                                        <div><label className="form-label">Teléfono</label><input className="input-field" placeholder="Opcional" value={dpForm.phone} onChange={(e) => setDpForm({ ...dpForm, phone: e.target.value })} /></div>
                                    </>
                                )}

                                {!dpFound?.activeMembership && (
                                    <>
                                        <div><label className="form-label">Monto (S/) *</label><input className="input-field" type="number" step="0.01" min={0} value={dpForm.amountPaid} onChange={(e) => setDpForm({ ...dpForm, amountPaid: Number(e.target.value) })} required /></div>
                                        <div><label className="form-label">Método de Pago *</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                                                {[{ v: 'CASH', l: '💵 Efectivo' }, { v: 'CARD', l: '💳 Tarjeta' }, { v: 'TRANSFER', l: '🏦 Transfer.' }, { v: 'YAPE_PLIN', l: '📱 Yape/Plin' }].map(m => (
                                                    <button key={m.v} type="button" onClick={() => setDpForm({ ...dpForm, paymentMethod: m.v as any })}
                                                        style={{ padding: '8px 4px', borderRadius: '8px', border: dpForm.paymentMethod === m.v ? '2px solid #F59E0B' : '1px solid var(--color-border)', backgroundColor: dpForm.paymentMethod === m.v ? 'rgba(245,158,11,0.15)' : 'var(--color-bg-tertiary)', color: dpForm.paymentMethod === m.v ? '#F59E0B' : 'var(--color-text-muted)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
                                                        {m.l}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div><label className="form-label">Comprobante de Pago (opcional)</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <label style={{ padding: '6px 12px', borderRadius: '8px', border: '1px dashed var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    📷 Subir imagen
                                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onload = () => setDpForm(prev => ({ ...prev, receiptUrl: reader.result as string }));
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }} />
                                                </label>
                                                {dpForm.receiptUrl && (
                                                    <div style={{ position: 'relative' }}>
                                                        <img src={dpForm.receiptUrl} alt="Comprobante" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
                                                        <button type="button" onClick={() => setDpForm(prev => ({ ...prev, receiptUrl: '' }))} style={{ position: 'absolute', top: '-5px', right: '-5px', width: '14px', height: '14px', borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: dpFound?.activeMembership ? '16px' : '0' }}>
                                    <button type="button" className="btn-secondary" onClick={() => setDpStep('search')}>← Cambiar DNI</button>
                                    <button type="submit" className="btn-primary" disabled={dpSaving || (!dpFound && !dpForm.name.trim())} style={{ background: dpFound?.activeMembership ? '#22c55e' : '#F59E0B' }}>
                                        {dpSaving ? <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> : dpFound?.activeMembership ? '✅ Registrar Asistencia' : '⚡ Asignar Pase'}
                                    </button>
                                </div>
                            </form>
                        )}

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
                                    <button type="button" className="btn-secondary" onClick={() => {
                                        setReceiptData({
                                            type: 'PASE DIARIO',
                                            clientName: dpResult.name,
                                            amount: Number(dpForm.amountPaid),
                                            paymentMethod: dpForm.paymentMethod,
                                            date: new Date(),
                                            cashierName: user?.name || 'Caja'
                                        });
                                    }}>
                                        <Receipt size={14} style={{ marginRight: '4px' }} /> Ver Comprobante
                                    </button>
                                    <button className="btn-primary" onClick={() => {
                                        setShowDailyPassModal(false);
                                        setReceiptData(null);
                                    }}>Listo</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {receiptData && (
                <PaymentReceipt data={receiptData} onClose={() => setReceiptData(null)} />
            )}
        </>
    );
}
