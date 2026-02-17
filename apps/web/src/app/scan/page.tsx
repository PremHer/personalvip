'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, CheckCircle, XCircle, AlertTriangle, Camera, CameraOff } from 'lucide-react';

interface ScanResult {
    valid: boolean;
    canEnter?: boolean;
    message?: string;
    client?: { id: string; name: string; photoUrl?: string; qrCode?: string };
    membership?: { active: boolean; plan: string; daysLeft: number; endDate: string; startDate: string } | null;
    upcomingMembership?: { plan: string; startDate: string } | null;
}

export default function ScanPage() {
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const startScanner = async () => {
        setResult(null);
        setError('');

        try {
            const scanner = new Html5Qrcode('qr-reader');
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1,
                },
                async (decodedText) => {
                    // QR scanned — validate it
                    await scanner.stop();
                    setScanning(false);
                    await validateQr(decodedText);
                },
                () => { /* ignore scan errors */ }
            );
            setScanning(true);
        } catch (err: any) {
            setError(err.message || 'No se pudo acceder a la cámara');
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try { await scannerRef.current.stop(); } catch { }
            scannerRef.current = null;
        }
        setScanning(false);
    };

    const validateQr = async (qrCode: string) => {
        setLoading(true);
        try {
            const res = await fetch('/api/attendance/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrCode }),
            });
            const data = await res.json();
            setResult(data);
        } catch (e: any) {
            setError('Error al validar el QR');
        }
        setLoading(false);
    };

    const scanAgain = () => {
        setResult(null);
        setError('');
        startScanner();
    };

    useEffect(() => {
        return () => { stopScanner(); };
    }, []);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f0a1a 0%, #1a1025 50%, #0f0a1a 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            color: '#e2e8f0',
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                    width: '56px', height: '56px', borderRadius: '16px',
                    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px', boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
                }}>
                    <QrCode size={28} color="#ffffff" />
                </div>
                <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>GymCore Scanner</h1>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Escanea el QR del cliente para verificar acceso</p>
            </div>

            {/* Scanner area */}
            {!result && (
                <div style={{
                    width: '100%', maxWidth: '360px', borderRadius: '20px',
                    overflow: 'hidden', position: 'relative',
                    background: '#1e1b2e', border: '1px solid rgba(124,58,237,0.2)',
                }}>
                    <div id="qr-reader" ref={containerRef} style={{ width: '100%' }} />

                    {!scanning && !loading && (
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', padding: '60px 20px', gap: '16px',
                        }}>
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '20px',
                                background: 'rgba(124,58,237,0.1)', border: '2px dashed rgba(124,58,237,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Camera size={32} color="#7c3aed" />
                            </div>
                            <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
                                Presiona el botón para iniciar la cámara
                            </p>
                            <button onClick={startScanner} style={{
                                padding: '12px 28px', borderRadius: '12px', border: 'none',
                                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                boxShadow: '0 4px 15px rgba(124,58,237,0.4)',
                            }}>
                                <Camera size={18} /> Iniciar Escáner
                            </button>
                        </div>
                    )}

                    {scanning && (
                        <div style={{ padding: '12px', display: 'flex', justifyContent: 'center' }}>
                            <button onClick={stopScanner} style={{
                                padding: '8px 20px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)',
                                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                fontWeight: 500, fontSize: '12px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                            }}>
                                <CameraOff size={14} /> Detener
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div style={{
                    width: '100%', maxWidth: '360px', padding: '40px', textAlign: 'center',
                    borderRadius: '20px', background: '#1e1b2e', border: '1px solid rgba(124,58,237,0.2)',
                }}>
                    <div style={{
                        width: '40px', height: '40px', border: '3px solid rgba(124,58,237,0.2)',
                        borderTopColor: '#7c3aed', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
                    }} />
                    <p style={{ fontSize: '13px', color: '#94a3b8' }}>Validando QR...</p>
                </div>
            )}

            {/* Result */}
            {result && (
                <div style={{
                    width: '100%', maxWidth: '360px', borderRadius: '20px',
                    overflow: 'hidden', background: '#1e1b2e',
                    border: `2px solid ${result.canEnter ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                }}>
                    {/* Status header */}
                    <div style={{
                        padding: '24px', textAlign: 'center',
                        background: result.canEnter
                            ? 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))'
                            : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
                    }}>
                        {result.canEnter ? (
                            <CheckCircle size={48} color="#22c55e" style={{ marginBottom: '8px' }} />
                        ) : (
                            <XCircle size={48} color="#ef4444" style={{ marginBottom: '8px' }} />
                        )}
                        <h2 style={{
                            fontSize: '18px', fontWeight: 700, margin: '0 0 4px',
                            color: result.canEnter ? '#22c55e' : '#ef4444',
                        }}>
                            {result.canEnter ? '✅ Acceso Permitido' : '❌ Acceso Denegado'}
                        </h2>
                    </div>

                    {/* Client info */}
                    {result.client && (
                        <div style={{ padding: '20px' }}>
                            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                <div style={{
                                    width: '50px', height: '50px', borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 8px', fontSize: '20px', fontWeight: 700, color: '#fff',
                                }}>
                                    {result.client.name.charAt(0)}
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: 700 }}>{result.client.name}</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{result.client.qrCode}</div>
                            </div>

                            {result.membership && (
                                <div style={{
                                    padding: '14px', borderRadius: '12px',
                                    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                                    marginBottom: '12px',
                                }}>
                                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                        Membresía Activa
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{result.membership.plan}</div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                                Vence: {new Date(result.membership.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '24px', fontWeight: 700, color: result.membership.daysLeft <= 7 ? '#f59e0b' : '#22c55e' }}>
                                                {result.membership.daysLeft}
                                            </div>
                                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>días</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!result.membership && result.upcomingMembership && (
                                <div style={{
                                    padding: '14px', borderRadius: '12px',
                                    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                                    marginBottom: '12px',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <AlertTriangle size={14} color="#f59e0b" />
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#f59e0b' }}>Membresía Programada</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                        {result.upcomingMembership.plan} — inicia el {new Date(result.upcomingMembership.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                </div>
                            )}

                            {!result.membership && !result.upcomingMembership && (
                                <div style={{
                                    padding: '14px', borderRadius: '12px',
                                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                                    marginBottom: '12px', textAlign: 'center',
                                }}>
                                    <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 500 }}>
                                        Sin membresía activa ni programada
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {!result.valid && result.message && (
                        <div style={{ padding: '20px', textAlign: 'center' }}>
                            <p style={{ fontSize: '13px', color: '#94a3b8' }}>{result.message}</p>
                        </div>
                    )}

                    {/* Scan again button */}
                    <div style={{ padding: '0 20px 20px', display: 'flex', gap: '8px' }}>
                        <button onClick={scanAgain} style={{
                            flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                            color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            boxShadow: '0 4px 15px rgba(124,58,237,0.3)',
                        }}>
                            <QrCode size={16} /> Escanear Otro
                        </button>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div style={{
                    width: '100%', maxWidth: '360px', padding: '16px', borderRadius: '12px',
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                    marginTop: '12px', textAlign: 'center',
                }}>
                    <p style={{ fontSize: '13px', color: '#ef4444' }}>{error}</p>
                    <button onClick={scanAgain} style={{
                        marginTop: '8px', padding: '8px 16px', borderRadius: '8px', border: 'none',
                        background: 'rgba(239,68,68,0.2)', color: '#ef4444',
                        fontWeight: 500, fontSize: '12px', cursor: 'pointer',
                    }}>
                        Reintentar
                    </button>
                </div>
            )}

            {/* Manual input fallback */}
            {!scanning && !result && !loading && (
                <div style={{ width: '100%', maxWidth: '360px', marginTop: '16px' }}>
                    <ManualInput onSubmit={validateQr} />
                </div>
            )}

            <style jsx global>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                #qr-reader video { border-radius: 16px !important; }
                #qr-reader { border: none !important; }
                #qr-reader__scan_region { background: transparent !important; }
                #qr-reader__dashboard { display: none !important; }
            `}</style>
        </div>
    );
}

function ManualInput({ onSubmit }: { onSubmit: (code: string) => void }) {
    const [code, setCode] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (code.trim()) onSubmit(code.trim());
    };

    return (
        <div style={{
            padding: '16px', borderRadius: '16px', background: '#1e1b2e',
            border: '1px solid rgba(124,58,237,0.15)',
        }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                O ingresa el código manualmente
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
                <input
                    value={code} onChange={(e) => setCode(e.target.value)}
                    placeholder="Ej: GYM-AD2479D1"
                    style={{
                        flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(124,58,237,0.2)',
                        background: '#0f0a1a', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace',
                        outline: 'none',
                    }}
                />
                <button type="submit" style={{
                    padding: '10px 16px', borderRadius: '10px', border: 'none',
                    background: '#7c3aed', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                }}>
                    Validar
                </button>
            </form>
        </div>
    );
}
