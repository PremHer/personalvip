'use client';

import React, { useRef } from 'react';
import { Printer, Download, X } from 'lucide-react';

interface ReceiptData {
    type: 'MEMBRESÍA' | 'PASE DIARIO';
    clientName: string;
    planName?: string;
    amount: number;
    paymentMethod: string;
    date: Date;
    startDate?: string;
    endDate?: string;
    pendingAmount?: number;
    receiptNumber?: string;
    cashierName?: string;
    // For duo/trio
    extraClients?: { name: string; amount: number }[];
    // Descuento
    discountAmount?: number;
    discountDescription?: string;
}

interface PaymentReceiptProps {
    data: ReceiptData;
    onClose: () => void;
}

const methodLabel = (m: string) => {
    switch (m) {
        case 'CASH': return 'Efectivo';
        case 'CARD': return 'Tarjeta';
        case 'TRANSFER': return 'Transferencia';
        case 'YAPE_PLIN': return 'Yape/Plin';
        default: return m;
    }
};

const formatDate = (d: Date) => d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatTime = (d: Date) => d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

export default function PaymentReceipt({ data, onClose }: PaymentReceiptProps) {
    const receiptRef = useRef<HTMLDivElement>(null);
    const receiptNo = data.receiptNumber || `R-${Date.now().toString(36).toUpperCase()}`;

    const totalPaid = data.amount + (data.extraClients?.reduce((s, c) => s + c.amount, 0) || 0);
    const totalDiscount = data.discountAmount || 0;
    const totalPlanPrice = data.pendingAmount !== undefined ? totalPaid + data.pendingAmount + totalDiscount : totalPaid + totalDiscount;

    const handlePrint = () => {
        if (!receiptRef.current) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`
            <html><head><title>Comprobante - ${data.clientName}</title>
            <style>
                @page { size: 80mm auto; margin: 0; }
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Segoe UI', Arial, sans-serif; width: 80mm; padding: 4mm; color: #111; }
                .receipt-header { text-align: center; padding-bottom: 10px; border-bottom: 2px dashed #333; margin-bottom: 10px; }
                .receipt-logo { font-size: 18px; font-weight: 800; letter-spacing: 1px; color: #7c3aed; }
                .receipt-subtitle { font-size: 10px; color: #666; margin-top: 2px; }
                .receipt-no { font-size: 9px; color: #999; margin-top: 6px; font-family: monospace; }
                .receipt-type { text-align: center; margin: 10px 0; }
                .receipt-type span { 
                    display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
                    background: ${data.type === 'MEMBRESÍA' ? '#7c3aed' : '#06b6d4'}; color: white;
                }
                .receipt-section { margin: 8px 0; }
                .receipt-row { display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; }
                .receipt-row .label { color: #666; }
                .receipt-row .value { font-weight: 600; text-align: right; max-width: 55%; }
                .receipt-divider { border: none; border-top: 1px dashed #ccc; margin: 8px 0; }
                .receipt-total { text-align: center; padding: 10px 0; border-top: 2px dashed #333; border-bottom: 2px dashed #333; margin: 10px 0; }
                .receipt-total .amount { font-size: 24px; font-weight: 800; color: #111; }
                .receipt-total .label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
                .receipt-discount { padding: 4px; background: #fee2e2; border-radius: 4px; font-size: 10px; color: #b91c1c; margin: 4px 0; text-align: center; font-weight: 600; }
                .receipt-pending { text-align: center; padding: 6px; background: #fff3cd; border-radius: 4px; font-size: 10px; color: #856404; margin: 6px 0; }
                .receipt-footer { text-align: center; margin-top: 12px; padding-top: 10px; border-top: 1px dashed #ccc; }
                .receipt-footer p { font-size: 9px; color: #999; line-height: 1.5; }
                .receipt-extra { padding: 6px 8px; background: #f8f5ff; border-radius: 4px; margin: 4px 0; }
            </style></head>
            <body>${receiptRef.current.innerHTML}</body></html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 400);
    };

    const handleDownload = () => {
        if (!receiptRef.current) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`
            <html><head><title>Comprobante - ${data.clientName}</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Segoe UI', Arial, sans-serif; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; background: #f5f5f5; padding: 20px; }
                .receipt-container { width: 320px; background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
                .receipt-header { text-align: center; padding-bottom: 14px; border-bottom: 2px dashed #e5e7eb; margin-bottom: 14px; }
                .receipt-logo { font-size: 20px; font-weight: 800; letter-spacing: 1px; color: #7c3aed; }
                .receipt-subtitle { font-size: 11px; color: #666; margin-top: 3px; }
                .receipt-no { font-size: 10px; color: #999; margin-top: 8px; font-family: monospace; }
                .receipt-type { text-align: center; margin: 12px 0; }
                .receipt-type span { 
                    display: inline-block; padding: 6px 18px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
                    background: ${data.type === 'MEMBRESÍA' ? '#7c3aed' : '#06b6d4'}; color: white;
                }
                .receipt-section { margin: 10px 0; }
                .receipt-row { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; }
                .receipt-row .label { color: #666; }
                .receipt-row .value { font-weight: 600; text-align: right; max-width: 55%; color: #111; }
                .receipt-divider { border: none; border-top: 1px dashed #e5e7eb; margin: 10px 0; }
                .receipt-total { text-align: center; padding: 12px 0; border-top: 2px dashed #e5e7eb; border-bottom: 2px dashed #e5e7eb; margin: 12px 0; }
                .receipt-total .amount { font-size: 28px; font-weight: 800; color: #111; }
                .receipt-total .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
                .receipt-discount { text-align: center; padding: 6px; background: #fee2e2; border-radius: 6px; font-size: 11px; color: #b91c1c; margin: 6px 0; font-weight: 600; }
                .receipt-pending { text-align: center; padding: 8px; background: #fff3cd; border-radius: 6px; font-size: 11px; color: #856404; margin: 8px 0; font-weight: 600; }
                .receipt-footer { text-align: center; margin-top: 16px; padding-top: 12px; border-top: 1px dashed #e5e7eb; }
                .receipt-footer p { font-size: 10px; color: #999; line-height: 1.6; }
                .receipt-extra { padding: 6px 10px; background: #f8f5ff; border-radius: 6px; margin: 4px 0; }
            </style></head>
            <body><div class="receipt-container">${receiptRef.current.innerHTML}</div></body></html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
            <div className="modal-card slide-up" style={{ maxWidth: '420px', padding: 0, overflow: 'hidden' }}>
                {/* Action bar */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)'
                }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>Comprobante de Pago</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={handlePrint} className="btn-primary" style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Printer size={13} /> Imprimir
                        </button>
                        <button onClick={handleDownload} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Download size={13} /> PDF
                        </button>
                        <button onClick={onClose} className="btn-icon" style={{ padding: '6px' }}>
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Receipt preview */}
                <div style={{ padding: '20px', background: '#ffffff', maxHeight: '75vh', overflowY: 'auto' }}>
                    <div ref={receiptRef} style={{ color: '#111', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
                        {/* Header */}
                        <div className="receipt-header" style={{ textAlign: 'center', paddingBottom: '14px', borderBottom: '2px dashed #e5e7eb', marginBottom: '14px' }}>
                            <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '1px', color: '#7c3aed' }}>
                                PERSONAL VIP
                            </div>
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>Centro de Entrenamiento</div>
                            <div style={{ fontSize: '10px', color: '#999', marginTop: '8px', fontFamily: 'monospace' }}>
                                N° {receiptNo}
                            </div>
                        </div>

                        {/* Type badge */}
                        <div style={{ textAlign: 'center', margin: '12px 0' }}>
                            <span style={{
                                display: 'inline-block', padding: '6px 18px', borderRadius: '20px',
                                fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                                background: data.type === 'MEMBRESÍA' ? '#7c3aed' : '#06b6d4', color: 'white'
                            }}>
                                {data.type}
                            </span>
                        </div>

                        {/* Details */}
                        <div style={{ margin: '10px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                                <span style={{ color: '#666' }}>Fecha</span>
                                <span style={{ fontWeight: 600 }}>{formatDate(data.date)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                                <span style={{ color: '#666' }}>Hora</span>
                                <span style={{ fontWeight: 600 }}>{formatTime(data.date)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                                <span style={{ color: '#666' }}>Cliente</span>
                                <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '55%', color: '#111' }}>{data.clientName}</span>
                            </div>
                            {data.cashierName && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                                    <span style={{ color: '#666' }}>Atendido por</span>
                                    <span style={{ fontWeight: 600, color: '#111' }}>{data.cashierName}</span>
                                </div>
                            )}
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px dashed #e5e7eb', margin: '10px 0' }} />

                        {/* Plan/Service details */}
                        <div style={{ margin: '10px 0' }}>
                            {data.planName && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                                    <span style={{ color: '#666' }}>Plan</span>
                                    <span style={{ fontWeight: 600 }}>{data.planName}</span>
                                </div>
                            )}
                            {data.startDate && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                                    <span style={{ color: '#666' }}>Inicio</span>
                                    <span style={{ fontWeight: 600 }}>{data.startDate}</span>
                                </div>
                            )}
                            {data.endDate && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                                    <span style={{ color: '#666' }}>Vencimiento</span>
                                    <span style={{ fontWeight: 600, color: '#111' }}>{data.endDate}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                                <span style={{ color: '#666' }}>Método de Pago</span>
                                <span style={{ fontWeight: 600, color: '#111' }}>{methodLabel(data.paymentMethod)}</span>
                            </div>
                        </div>

                        {/* Extra clients for Duo/Trio */}
                        {data.extraClients && data.extraClients.length > 0 && (
                            <>
                                <hr style={{ border: 'none', borderTop: '1px dashed #e5e7eb', margin: '10px 0' }} />
                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                    👥 Miembros del grupo
                                </div>
                                <div style={{ padding: '6px 10px', background: '#f8f5ff', borderRadius: '6px', margin: '4px 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '2px 0' }}>
                                        <span style={{ fontWeight: 500 }}>{data.clientName}</span>
                                        <span style={{ fontWeight: 700, color: '#16a34a' }}>S/{data.amount.toFixed(2)}</span>
                                    </div>
                                </div>
                                {data.extraClients.map((ec, i) => (
                                    <div key={i} style={{ padding: '6px 10px', background: '#f8f5ff', borderRadius: '6px', margin: '4px 0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '2px 0' }}>
                                            <span style={{ fontWeight: 500 }}>{ec.name}</span>
                                            <span style={{ fontWeight: 700, color: '#16a34a' }}>S/{ec.amount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}

                        {/* Total */}
                        <div style={{
                            textAlign: 'center', padding: '12px 0',
                            borderTop: '2px dashed #e5e7eb', borderBottom: '2px dashed #e5e7eb', margin: '12px 0'
                        }}>
                            <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Pagado</div>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: '#111' }}>S/{totalPaid.toFixed(2)}</div>
                        </div>

                        {/* Discount */}
                        {data.discountAmount !== undefined && data.discountAmount > 0 && (
                            <div style={{
                                textAlign: 'center', padding: '6px',
                                background: '#fee2e2', borderRadius: '6px', fontSize: '11px', color: '#b91c1c', margin: '6px 0', fontWeight: 600
                            }}>
                                ⬇️ Descuento aplicado: S/{data.discountAmount.toFixed(2)}
                                {data.discountDescription && ` (${data.discountDescription})`}
                            </div>
                        )}

                        {/* Pending balance */}
                        {data.pendingAmount !== undefined && data.pendingAmount > 0 && (
                            <div style={{
                                textAlign: 'center', padding: '8px',
                                background: '#fff3cd', borderRadius: '6px', fontSize: '11px', color: '#856404', margin: '8px 0', fontWeight: 600
                            }}>
                                ⚠️ Saldo Pendiente: S/{data.pendingAmount.toFixed(2)} de S/{totalPlanPrice.toFixed(2)}
                            </div>
                        )}

                        {/* Footer */}
                        <div style={{ textAlign: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #e5e7eb' }}>
                            <p style={{ fontSize: '10px', color: '#999', lineHeight: 1.6 }}>
                                ¡Gracias por tu preferencia!<br />
                                Este comprobante es tu respaldo de pago.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
