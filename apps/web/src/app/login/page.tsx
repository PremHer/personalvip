'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Eye, EyeOff, Dumbbell, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Credenciales inválidas');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            background: 'var(--color-bg)',
        }}>
            {/* Left Panel - Branding */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '60px',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Background gradient orb */}
                <div style={{
                    position: 'absolute',
                    width: '500px', height: '500px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute',
                    width: '300px', height: '300px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
                    bottom: '10%', left: '20%',
                    pointerEvents: 'none',
                }} />

                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '400px' }}>
                    {/* Logo */}
                    <div style={{
                        width: '72px', height: '72px',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, var(--color-primary), #4F46E5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 24px',
                        boxShadow: '0 8px 32px rgba(124,58,237,0.35)',
                    }}>
                        <Dumbbell size={36} color="white" />
                    </div>

                    <h1 style={{
                        fontSize: '32px', fontWeight: 800,
                        background: 'linear-gradient(135deg, var(--color-text), var(--color-primary-light))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.03em',
                        marginBottom: '8px',
                    }}>
                        GymCore
                    </h1>
                    <p style={{ fontSize: '15px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                        Sistema integral de gestión para gimnasios
                    </p>

                    {/* Features list */}
                    <div style={{ marginTop: '40px', textAlign: 'left' }}>
                        {[
                            'Control de membresías y pagos',
                            'Registro de asistencia por QR',
                            'Punto de venta integrado',
                            'Reportes financieros en tiempo real',
                        ].map((feature, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '10px 0',
                                color: 'var(--color-text-secondary)',
                                fontSize: '13px',
                            }}>
                                <div style={{
                                    width: '6px', height: '6px', borderRadius: '50%',
                                    background: 'var(--color-primary)',
                                    flexShrink: 0,
                                }} />
                                {feature}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div style={{
                width: '480px', minWidth: '480px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '60px',
                background: 'var(--color-surface)',
                borderLeft: '1px solid var(--color-border)',
            }}>
                <div className="slide-up">
                    <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px', letterSpacing: '-0.02em' }}>
                        Bienvenido
                    </h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '32px' }}>
                        Ingresa tus credenciales para continuar
                    </p>

                    {error && (
                        <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '16px' }}>
                            <label className="form-label">Email</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                <input
                                    className="input-field"
                                    type="email"
                                    placeholder="admin@gymcore.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                    style={{ paddingLeft: '38px' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label className="form-label">Contraseña</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                <input
                                    className="input-field"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    style={{ paddingLeft: '38px', paddingRight: '40px' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)',
                                    }}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{
                                width: '100%',
                                justifyContent: 'center',
                                padding: '12px',
                                fontSize: '14px',
                            }}
                        >
                            {loading ? (
                                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                            ) : (
                                <>Iniciar Sesión <ArrowRight size={16} /></>
                            )}
                        </button>
                    </form>

                    {/* Demo credentials */}
                    <div style={{
                        marginTop: '32px',
                        padding: '16px',
                        background: 'var(--color-surface-2)',
                        borderRadius: '12px',
                        border: '1px solid var(--color-border)',
                    }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                            Credenciales de demostración
                        </div>
                        {[
                            { email: 'admin@gymcore.com', pass: 'admin123', role: 'Admin' },
                            { email: 'recepcion@gymcore.com', pass: 'recep123', role: 'Recepción' },
                        ].map((cred) => (
                            <button
                                key={cred.email}
                                type="button"
                                onClick={() => { setEmail(cred.email); setPassword(cred.pass); }}
                                style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    width: '100%', padding: '8px 10px', borderRadius: '8px',
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    color: 'var(--color-text-secondary)', fontSize: '12px',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-3)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                                <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{cred.email}</span>
                                <span className="badge badge-primary">{cred.role}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
