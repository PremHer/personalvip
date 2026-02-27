'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ============ TYPES ============
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
}

interface UIContextType {
    toast: (message: string, type?: ToastType) => void;
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

// ============ CONTEXT ============
const UIContext = createContext<UIContextType | null>(null);

export function useUI() {
    const ctx = useContext(UIContext);
    if (!ctx) throw new Error('useUI must be used within UIProvider');
    return ctx;
}

// ============ PROVIDER ============
let toastId = 0;

export function UIProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmState, setConfirmState] = useState<{
        options: ConfirmOptions;
        resolve: (v: boolean) => void;
    } | null>(null);

    const toast = useCallback((message: string, type: ToastType = 'success') => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise(resolve => {
            setConfirmState({ options, resolve });
        });
    }, []);

    const handleConfirm = (result: boolean) => {
        confirmState?.resolve(result);
        setConfirmState(null);
    };

    const iconMap: Record<ToastType, typeof CheckCircle> = {
        success: CheckCircle,
        error: XCircle,
        warning: AlertTriangle,
        info: Info,
    };

    const colorMap: Record<ToastType, { bg: string; border: string; text: string }> = {
        success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#10B981' },
        error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#EF4444' },
        warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#F59E0B' },
        info: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', text: '#3B82F6' },
    };

    return (
        <UIContext.Provider value={{ toast, confirm }}>
            {children}

            {/* ===== TOASTS ===== */}
            <div style={{
                position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
                display: 'flex', flexDirection: 'column', gap: '8px',
                pointerEvents: 'none', maxWidth: '380px', width: '100%',
            }}>
                {toasts.map(t => {
                    const Icon = iconMap[t.type];
                    const colors = colorMap[t.type];
                    return (
                        <div key={t.id} style={{
                            background: 'var(--color-surface, #1F2937)',
                            border: `1px solid ${colors.border}`,
                            borderLeft: `4px solid ${colors.text}`,
                            borderRadius: '12px',
                            padding: '12px 16px',
                            display: 'flex', alignItems: 'center', gap: '10px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            animation: 'slideInRight 0.3s ease-out',
                            pointerEvents: 'auto',
                        }}>
                            <Icon size={18} color={colors.text} style={{ flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--color-text, #F1F5F9)' }}>
                                {t.message}
                            </span>
                            <button onClick={() => removeToast(t.id)} style={{
                                background: 'none', border: 'none', color: 'var(--color-text-muted, #64748B)',
                                cursor: 'pointer', padding: '2px', flexShrink: 0,
                            }}>
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* ===== CONFIRM DIALOG ===== */}
            {confirmState && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)', zIndex: 10000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px', animation: 'fadeIn 0.15s ease',
                }} onClick={() => handleConfirm(false)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: 'var(--color-surface, #1F2937)',
                        border: '1px solid var(--color-border, rgba(148,163,184,0.12))',
                        borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                        animation: 'slideUp 0.2s ease-out',
                    }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '12px',
                            background: confirmState.options.danger ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '16px',
                        }}>
                            <AlertTriangle size={24} color={confirmState.options.danger ? '#EF4444' : '#F59E0B'} />
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: 'var(--color-text, #F1F5F9)' }}>
                            {confirmState.options.title}
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary, #94A3B8)', lineHeight: 1.6, marginBottom: '24px' }}>
                            {confirmState.options.message}
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => handleConfirm(false)} style={{
                                padding: '8px 16px', borderRadius: '8px',
                                border: '1px solid var(--color-border, rgba(148,163,184,0.12))',
                                background: 'transparent', color: 'var(--color-text, #F1F5F9)',
                                cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                            }}>
                                {confirmState.options.cancelText || 'Cancelar'}
                            </button>
                            <button onClick={() => handleConfirm(true)} style={{
                                padding: '8px 16px', borderRadius: '8px', border: 'none',
                                background: confirmState.options.danger
                                    ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                                    : 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                                color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                                boxShadow: confirmState.options.danger
                                    ? '0 2px 8px rgba(239,68,68,0.3)'
                                    : '0 2px 8px rgba(124,58,237,0.3)',
                            }}>
                                {confirmState.options.confirmText || 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </UIContext.Provider>
    );
}
