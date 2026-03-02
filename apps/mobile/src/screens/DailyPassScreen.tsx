import React, { useState } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';

type Step = 'search' | 'form' | 'done';

export default function DailyPassScreen() {
    const [step, setStep] = useState<Step>('search');
    const [dni, setDni] = useState('');
    const [found, setFound] = useState<any>(null);
    const [searching, setSearching] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [amount, setAmount] = useState('8');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState<any>(null);

    const reset = () => {
        setStep('search');
        setDni('');
        setFound(null);
        setName('');
        setPhone('');
        setAmount('8');
        setPaymentMethod('CASH');
        setResult(null);
    };

    const handleSearch = async () => {
        if (!dni.trim()) return;
        setSearching(true);
        try {
            const client = await api.searchByDni(dni.trim());
            setFound(client || null);
        } catch {
            setFound(null);
        }
        setStep('form');
        setSearching(false);
    };

    const handleAssign = async () => {
        if (!found && !name.trim()) {
            Alert.alert('Error', 'Ingrese el nombre del cliente');
            return;
        }
        setSaving(true);
        try {
            if (found?.activeMembership) {
                // Just check them in without payment
                const res = await api.checkIn(found.id, 'MANUAL');
                if (res.success) {
                    Alert.alert('✅ Asistencia', 'Asistencia registrada exitosamente');
                    setDni('');
                    setFound(null);
                    setStep('search');
                } else {
                    Alert.alert('Error', res.message || 'Error al registrar asistencia');
                }
            } else {
                let clientId: string;
                if (found) {
                    clientId = found.id;
                } else {
                    const nc = await api.createClient({
                        name: name.trim(),
                        phone: phone.trim() || undefined,
                        dni: dni.trim() || undefined,
                    });
                    clientId = nc.id;
                }

                // Assign daily pass (backend creates Sale + Attendance)
                await api.dailyPass({ clientId, amountPaid: Number(amount) || 8, paymentMethod });

                // Get updated client info
                const full = await api.getClient(clientId);

                setResult(full);
                setStep('done');
                Alert.alert('✅ Pase Diario', `Pase asignado y acceso registrado para ${full.name}`);
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Error al procesar pase diario');
        }
        setSaving(false);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                    <Ionicons name="flash" size={28} color="#F59E0B" />
                    <Text style={styles.title}>Pase Diario</Text>
                    <Text style={styles.subtitle}>
                        {step === 'search' ? 'Buscar cliente por DNI' :
                            step === 'form' ? (found ? 'Cliente encontrado' : 'Nuevo cliente') :
                                'Pase asignado ✅'}
                    </Text>
                </View>

                {/* Step 1: DNI Search */}
                {step === 'search' && (
                    <View style={styles.card}>
                        <Text style={styles.label}>DNI del Cliente</Text>
                        <TextInput
                            style={styles.dniInput}
                            placeholder="12345678"
                            placeholderTextColor="#555"
                            value={dni}
                            onChangeText={setDni}
                            keyboardType="numeric"
                            maxLength={15}
                            autoFocus
                        />
                        <TouchableOpacity
                            style={[styles.btn, styles.btnPrimary, !dni.trim() && styles.btnDisabled]}
                            onPress={handleSearch}
                            disabled={searching || !dni.trim()}
                        >
                            {searching ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="search" size={18} color="#fff" />
                                    <Text style={styles.btnText}>Buscar</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Step 2: Form (found or create) */}
                {step === 'form' && (
                    <View style={styles.card}>
                        {found ? (
                            <View style={styles.foundCard}>
                                <View style={styles.foundHeader}>
                                    <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                                    <Text style={styles.foundLabel}>CLIENTE REGISTRADO</Text>
                                </View>
                                <Text style={styles.foundName}>{found.name}</Text>
                                <Text style={styles.foundInfo}>
                                    DNI: {found.dni} {found.phone ? `• Tel: ${found.phone}` : ''}
                                </Text>
                                {found.activeMembership && (
                                    <View style={styles.warningBadge}>
                                        <Ionicons name="warning" size={14} color="#F59E0B" />
                                        <Text style={styles.warningText}>
                                            Ya tiene membresía: {found.activeMembership.plan?.name}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <>
                                <View style={styles.newClientBadge}>
                                    <Ionicons name="person-add" size={16} color="#7c3aed" />
                                    <Text style={styles.newClientText}>
                                        No se encontró DNI {dni}. Registra al cliente:
                                    </Text>
                                </View>
                                <Text style={styles.label}>Nombre Completo *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Juan Pérez"
                                    placeholderTextColor="#555"
                                    value={name}
                                    onChangeText={setName}
                                    autoFocus
                                />
                                <Text style={styles.label}>Teléfono</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Opcional"
                                    placeholderTextColor="#555"
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                />
                            </>
                        )}

                        {!found?.activeMembership && (
                            <>
                                <Text style={styles.label}>Monto del Pase (S/)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="decimal-pad"
                                />

                                <Text style={styles.label}>Método de Pago</Text>
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                    {[{ v: 'CASH', l: '💵 Efectivo' }, { v: 'CARD', l: '💳 Tarjeta' }, { v: 'TRANSFER', l: '🏦 Transfer.' }, { v: 'YAPE_PLIN', l: '📱 Yape/Plin' }].map(m => (
                                        <TouchableOpacity key={m.v} onPress={() => setPaymentMethod(m.v)}
                                            style={[styles.payBtn, paymentMethod === m.v && styles.payBtnActive]}>
                                            <Text style={[styles.payBtnText, paymentMethod === m.v && styles.payBtnTextActive]}>{m.l}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={[styles.btn, styles.btnSecondary]}
                                onPress={() => { setStep('search'); setFound(null); }}
                            >
                                <Ionicons name="arrow-back" size={16} color="#94a3b8" />
                                <Text style={[styles.btnText, { color: '#94a3b8' }]}>Cambiar DNI</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.btn,
                                    found?.activeMembership ? { backgroundColor: '#22c55e' } : styles.btnOrange,
                                    (saving || (!found && !name.trim())) && styles.btnDisabled
                                ]}
                                onPress={handleAssign}
                                disabled={saving || (!found && !name.trim())}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        {found?.activeMembership ? (
                                            <Ionicons name="checkmark-circle" size={16} color="#fff" />
                                        ) : (
                                            <Ionicons name="flash" size={16} color="#fff" />
                                        )}
                                        <Text style={styles.btnText}>
                                            {found?.activeMembership ? 'Registrar Asistencia' : (found ? 'Asignar Pase' : 'Crear y Asignar')}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Step 3: Done */}
                {step === 'done' && result && (
                    <View style={styles.card}>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ fontSize: 52, marginBottom: 8 }}>✅</Text>
                            <Text style={styles.doneTitle}>{result.name}</Text>
                            <Text style={styles.doneSubtitle}>DNI: {result.dni || dni}</Text>
                            <View style={styles.activeBadge}>
                                <Text style={styles.activeBadgeText}>Pase Diario Activo + Check-in ✓</Text>
                            </View>
                            <Text style={styles.qrLabel}>QR: {result.qrCode}</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnPrimary, { marginTop: 20 }]}
                            onPress={reset}
                        >
                            <Ionicons name="add-circle" size={18} color="#fff" />
                            <Text style={styles.btnText}>Nuevo Pase Diario</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0f' },
    scroll: { padding: 16, paddingBottom: 40 },
    header: { alignItems: 'center', marginBottom: 20, marginTop: 8 },
    title: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 8 },
    subtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
    card: {
        backgroundColor: '#111118', borderRadius: 16,
        padding: 20, borderWidth: 1, borderColor: '#1e1e2e',
    },
    label: { fontSize: 12, fontWeight: '700', color: '#94a3b8', marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
        backgroundColor: '#1a1a24', borderRadius: 10, padding: 12,
        color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#2a2a3a',
    },
    dniInput: {
        backgroundColor: '#1a1a24', borderRadius: 12, padding: 16,
        color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center',
        letterSpacing: 4, borderWidth: 1, borderColor: '#2a2a3a',
    },
    btn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: 14, borderRadius: 12, marginTop: 16,
    },
    btnPrimary: { backgroundColor: '#7c3aed' },
    btnSecondary: { backgroundColor: '#1a1a24', borderWidth: 1, borderColor: '#2a2a3a' },
    btnOrange: { backgroundColor: '#F59E0B' },
    btnDisabled: { opacity: 0.5 },
    btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
    foundCard: {
        backgroundColor: 'rgba(34,197,94,0.06)', borderRadius: 12,
        padding: 14, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
    },
    foundHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    foundLabel: { fontSize: 10, fontWeight: '800', color: '#22c55e', letterSpacing: 0.5 },
    foundName: { fontSize: 17, fontWeight: '700', color: '#fff' },
    foundInfo: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    warningBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginTop: 8, backgroundColor: 'rgba(245,158,11,0.1)',
        padding: 8, borderRadius: 8,
    },
    warningText: { fontSize: 11, color: '#F59E0B', fontWeight: '600' },
    newClientBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(124,58,237,0.06)', padding: 10, borderRadius: 10,
        borderWidth: 1, borderColor: 'rgba(124,58,237,0.15)',
    },
    newClientText: { fontSize: 12, color: '#94a3b8', flex: 1 },
    doneTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
    doneSubtitle: { fontSize: 13, color: '#94a3b8' },
    activeBadge: {
        backgroundColor: 'rgba(34,197,94,0.1)', paddingHorizontal: 14, paddingVertical: 6,
        borderRadius: 20, marginTop: 12, marginBottom: 8,
    },
    activeBadgeText: { color: '#22c55e', fontSize: 12, fontWeight: '700' },
    qrLabel: { fontSize: 12, color: '#64748b', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    payBtn: {
        flex: 1, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8,
        borderWidth: 1, borderColor: '#2a2a3a', backgroundColor: '#1a1a24', alignItems: 'center',
    },
    payBtnActive: { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 2 },
    payBtnText: { fontSize: 10, fontWeight: '600', color: '#94a3b8', textAlign: 'center' },
    payBtnTextActive: { color: '#F59E0B' },
});
