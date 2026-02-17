import React, { useEffect, useState } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import { api } from '../lib/api';

interface ClientProfileModalProps {
    clientId: string | null;
    visible: boolean;
    onClose: () => void;
}

export default function ClientProfileModal({ clientId, visible, onClose }: ClientProfileModalProps) {
    const [client, setClient] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [editingNotes, setEditingNotes] = useState(false);
    const [medicalNotes, setMedicalNotes] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);

    useEffect(() => {
        if (clientId && visible) {
            setLoading(true);
            Promise.all([
                api.getClientProfile(clientId),
                api.getClientAttendanceStats(clientId),
            ]).then(([c, s]) => {
                setClient(c);
                setStats(s);
                setMedicalNotes(c.medicalNotes || '');
            }).catch(e => {
                Alert.alert('Error', e.message);
            }).finally(() => setLoading(false));
        }
    }, [clientId, visible]);

    const handleSaveNotes = async () => {
        if (!clientId) return;
        setSavingNotes(true);
        try {
            await api.updateMedicalNotes(clientId, medicalNotes);
            setEditingNotes(false);
            Alert.alert('✅', 'Notas médicas actualizadas');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
        setSavingNotes(false);
    };

    const formatDate = (d: string) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const daysRemaining = (endDate: string) => {
        const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
        return diff;
    };

    const statusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return '#10B981';
            case 'EXPIRED': return '#EF4444';
            case 'FROZEN': return '#06B6D4';
            case 'CANCELLED': return '#94A3B8';
            default: return '#F59E0B';
        }
    };

    const statusLabel = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'Activo';
            case 'EXPIRED': return 'Vencido';
            case 'FROZEN': return 'Congelado';
            case 'CANCELLED': return 'Cancelado';
            default: return status;
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={s.container}>
                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                        <Text style={s.closeBtnText}>← Volver</Text>
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Perfil del Cliente</Text>
                    <View style={{ width: 60 }} />
                </View>

                {loading ? (
                    <View style={s.loadingWrap}>
                        <ActivityIndicator size="large" color="#7c3aed" />
                        <Text style={s.loadingText}>Cargando perfil...</Text>
                    </View>
                ) : !client ? (
                    <View style={s.loadingWrap}>
                        <Text style={{ fontSize: 40 }}>😕</Text>
                        <Text style={s.loadingText}>No se pudo cargar el perfil</Text>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
                        {/* Profile Card */}
                        <View style={s.profileCard}>
                            <View style={s.avatar}>
                                <Text style={s.avatarText}>{client.name.charAt(0).toUpperCase()}</Text>
                            </View>
                            <Text style={s.name}>{client.name}</Text>
                            {client.email && <Text style={s.email}>{client.email}</Text>}
                            {client.phone && <Text style={s.phone}>📱 {client.phone}</Text>}
                            {client.dni && <Text style={s.dni}>🪪 DNI: {client.dni}</Text>}
                        </View>

                        {/* Membership */}
                        <View style={s.section}>
                            <Text style={s.sectionTitle}>💳 Membresía</Text>
                            {client.memberships && client.memberships.length > 0 ? (() => {
                                const active = client.memberships.find((m: any) => m.status === 'ACTIVE');
                                const m = active || client.memberships[0];
                                const days = daysRemaining(m.endDate);
                                const isExpiring = days <= 7 && days > 0;
                                const isExpired = days <= 0;
                                return (
                                    <View style={[s.card, {
                                        borderColor: isExpired ? 'rgba(239,68,68,0.3)' : isExpiring ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.2)',
                                    }]}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <Text style={s.cardTitle}>{m.plan?.name || 'Plan'}</Text>
                                            <View style={[s.statusBadge, { backgroundColor: statusColor(m.status) + '20' }]}>
                                                <Text style={[s.statusText, { color: statusColor(m.status) }]}>
                                                    {statusLabel(m.status)}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={s.infoGrid}>
                                            <View style={s.infoItem}>
                                                <Text style={s.infoLabel}>Inicio</Text>
                                                <Text style={s.infoValue}>{formatDate(m.startDate)}</Text>
                                            </View>
                                            <View style={s.infoItem}>
                                                <Text style={s.infoLabel}>Fin</Text>
                                                <Text style={s.infoValue}>{formatDate(m.endDate)}</Text>
                                            </View>
                                            <View style={s.infoItem}>
                                                <Text style={s.infoLabel}>Pagado</Text>
                                                <Text style={[s.infoValue, { color: '#10B981' }]}>S/{Number(m.amountPaid).toFixed(2)}</Text>
                                            </View>
                                            <View style={s.infoItem}>
                                                <Text style={s.infoLabel}>Restante</Text>
                                                <Text style={[s.infoValue, {
                                                    color: isExpired ? '#EF4444' : isExpiring ? '#F59E0B' : '#10B981',
                                                    fontWeight: '800',
                                                }]}>
                                                    {isExpired ? 'Vencido' : `${days} días`}
                                                </Text>
                                            </View>
                                        </View>
                                        {isExpiring && (
                                            <View style={s.warningBar}>
                                                <Text style={s.warningText}>⚠️ La membresía vence en {days} día{days !== 1 ? 's' : ''}</Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            })() : (
                                <View style={s.emptyCard}>
                                    <Text style={s.emptyIcon}>📭</Text>
                                    <Text style={s.emptyText}>Sin membresía activa</Text>
                                </View>
                            )}
                        </View>

                        {/* Stats */}
                        {stats && (
                            <View style={s.section}>
                                <Text style={s.sectionTitle}>📊 Estadísticas</Text>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <View style={[s.statBox, { borderColor: 'rgba(124,58,237,0.2)' }]}>
                                        <Text style={[s.statNum, { color: '#7c3aed' }]}>{stats.totalVisits || 0}</Text>
                                        <Text style={s.statLabel}>Visitas totales</Text>
                                    </View>
                                    <View style={[s.statBox, { borderColor: 'rgba(6,182,212,0.2)' }]}>
                                        <Text style={[s.statNum, { color: '#06b6d4' }]}>{stats.thisMonth || 0}</Text>
                                        <Text style={s.statLabel}>Este mes</Text>
                                    </View>
                                    <View style={[s.statBox, { borderColor: 'rgba(16,185,129,0.2)' }]}>
                                        <Text style={[s.statNum, { color: '#10b981', fontSize: 14 }]}>{stats.avgDuration || '—'}</Text>
                                        <Text style={s.statLabel}>Promedio</Text>
                                    </View>
                                </View>
                                {stats.lastVisit && (
                                    <Text style={s.lastVisit}>Última visita: {formatDate(stats.lastVisit)}</Text>
                                )}
                            </View>
                        )}

                        {/* Medical Notes */}
                        <View style={s.section}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={s.sectionTitle}>🏥 Notas Médicas</Text>
                                {!editingNotes && (
                                    <TouchableOpacity onPress={() => setEditingNotes(true)}>
                                        <Text style={s.editLink}>Editar</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            {editingNotes ? (
                                <View style={s.card}>
                                    <TextInput
                                        style={s.notesInput}
                                        value={medicalNotes}
                                        onChangeText={setMedicalNotes}
                                        placeholder="Alergias, lesiones, condiciones médicas..."
                                        placeholderTextColor="#64748b"
                                        multiline
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                    />
                                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                                        <TouchableOpacity style={s.saveBtn} onPress={handleSaveNotes} disabled={savingNotes}>
                                            {savingNotes ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <Text style={s.saveBtnText}>Guardar</Text>
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity style={s.cancelBtn} onPress={() => { setEditingNotes(false); setMedicalNotes(client.medicalNotes || ''); }}>
                                            <Text style={s.cancelBtnText}>Cancelar</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <View style={s.card}>
                                    <Text style={[s.notesText, !medicalNotes && { fontStyle: 'italic', color: '#64748b' }]}>
                                        {medicalNotes || 'Sin notas médicas registradas'}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Emergency Contact */}
                        {client.emergencyContact && (
                            <View style={s.section}>
                                <Text style={s.sectionTitle}>🆘 Contacto de Emergencia</Text>
                                <View style={s.card}>
                                    <Text style={s.infoValue}>{client.emergencyContact}</Text>
                                    {client.emergencyPhone && (
                                        <Text style={[s.infoLabel, { marginTop: 4 }]}>📞 {client.emergencyPhone}</Text>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Registration info */}
                        <View style={s.section}>
                            <Text style={s.sectionTitle}>ℹ️ Información</Text>
                            <View style={s.card}>
                                <View style={s.infoRow}>
                                    <Text style={s.infoLabel}>Registrado</Text>
                                    <Text style={s.infoValue}>{formatDate(client.createdAt)}</Text>
                                </View>
                                {client.birthDate && (
                                    <View style={s.infoRow}>
                                        <Text style={s.infoLabel}>Nacimiento</Text>
                                        <Text style={s.infoValue}>{formatDate(client.birthDate)}</Text>
                                    </View>
                                )}
                                {client.gender && (
                                    <View style={s.infoRow}>
                                        <Text style={s.infoLabel}>Género</Text>
                                        <Text style={s.infoValue}>{client.gender === 'M' ? 'Masculino' : client.gender === 'F' ? 'Femenino' : client.gender}</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={{ height: 32 }} />
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0a1a' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: '#0f0a1a', borderBottomWidth: 1, borderBottomColor: 'rgba(124,58,237,0.12)',
    },
    closeBtn: { width: 60 },
    closeBtnText: { color: '#a78bfa', fontSize: 14, fontWeight: '600' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#e2e8f0' },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { color: '#94a3b8', fontSize: 13, marginTop: 10 },
    content: { padding: 16 },

    // Profile
    profileCard: {
        alignItems: 'center', padding: 20, backgroundColor: '#1e1b2e', borderRadius: 18,
        borderWidth: 1, borderColor: 'rgba(124,58,237,0.15)', marginBottom: 16,
    },
    avatar: {
        width: 64, height: 64, borderRadius: 32, backgroundColor: '#7c3aed',
        alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    },
    avatarText: { fontSize: 26, fontWeight: '900', color: '#fff' },
    name: { fontSize: 18, fontWeight: '800', color: '#e2e8f0' },
    email: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
    phone: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    dni: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

    // Section
    section: { marginBottom: 14 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#e2e8f0', marginBottom: 8 },

    // Card
    card: {
        backgroundColor: '#1e1b2e', borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: 'rgba(124,58,237,0.1)',
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#e2e8f0' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
    statusText: { fontSize: 11, fontWeight: '700' },

    // Info grid
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    infoItem: {
        flex: 1, minWidth: '45%' as any, paddingVertical: 6,
    },
    infoLabel: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
    infoValue: { fontSize: 13, color: '#e2e8f0', fontWeight: '600', marginTop: 2 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },

    // Warning
    warningBar: {
        backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 8, padding: 8, marginTop: 10,
        borderWidth: 1, borderColor: 'rgba(245,158,11,0.15)',
    },
    warningText: { fontSize: 11, color: '#F59E0B', fontWeight: '600', textAlign: 'center' },

    // Stats
    statBox: {
        flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
        backgroundColor: '#1e1b2e', borderWidth: 1,
    },
    statNum: { fontSize: 22, fontWeight: '900' },
    statLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
    lastVisit: { fontSize: 11, color: '#64748b', marginTop: 8, textAlign: 'center' },

    // Notes
    editLink: { color: '#a78bfa', fontSize: 12, fontWeight: '600' },
    notesText: { fontSize: 13, color: '#e2e8f0', lineHeight: 20 },
    notesInput: {
        backgroundColor: '#16132a', borderRadius: 10, padding: 12, color: '#e2e8f0',
        fontSize: 13, lineHeight: 20, minHeight: 80,
        borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)',
    },
    saveBtn: {
        flex: 1, backgroundColor: '#7c3aed', paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    cancelBtn: {
        flex: 1, backgroundColor: 'rgba(124,58,237,0.1)', paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    },
    cancelBtnText: { color: '#a78bfa', fontWeight: '600', fontSize: 13 },

    // Empty
    emptyCard: {
        backgroundColor: '#1e1b2e', borderRadius: 14, padding: 20, alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(124,58,237,0.1)',
    },
    emptyIcon: { fontSize: 28, marginBottom: 6 },
    emptyText: { fontSize: 12, color: '#94a3b8' },
});
