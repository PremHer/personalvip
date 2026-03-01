import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    Alert, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const FINANCE_ROLES = ['SUPERADMIN', 'ADMIN', 'OWNER'];

export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const [serverUrl, setServerUrl] = useState(api.getBaseUrl());
    const [editingServer, setEditingServer] = useState(false);
    const [dashStats, setDashStats] = useState<any>(null);

    const canSeeFinance = user && FINANCE_ROLES.includes(user.role);

    useEffect(() => {
        if (user && canSeeFinance) {
            api.getDashboardStats().then(setDashStats).catch(() => { });
        }
    }, [user]);

    const handleSaveServer = async () => {
        const url = serverUrl.trim();
        if (!url) return;
        await api.setBaseUrl(url);
        setServerUrl(api.getBaseUrl());
        setEditingServer(false);
        Alert.alert('✅ Guardado', `Servidor: ${api.getBaseUrl()}`);
    };

    const roleLabels: Record<string, string> = {
        SUPERADMIN: 'Super Admin',
        ADMIN: 'Administrador',
        OWNER: 'Propietario',
        TRAINER: 'Entrenador',
        RECEPTIONIST: 'Recepcionista',
    };

    const roleBadgeColors: Record<string, string> = {
        SUPERADMIN: '#ef4444',
        ADMIN: '#7c3aed',
        OWNER: '#06b6d4',
        TRAINER: '#f59e0b',
        RECEPTIONIST: '#10b981',
    };

    if (!user) return null;

    return (
        <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
            {/* User card */}
            <View style={s.profileCard}>
                <View style={[s.profileAvatar, { backgroundColor: roleBadgeColors[user.role] || '#7c3aed' }]}>
                    <Text style={s.profileAvatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={s.profileName}>{user.name}</Text>
                <View style={[s.roleBadge, { backgroundColor: (roleBadgeColors[user.role] || '#7c3aed') + '25' }]}>
                    <Text style={[s.roleBadgeText, { color: roleBadgeColors[user.role] || '#7c3aed' }]}>
                        {roleLabels[user.role] || user.role}
                    </Text>
                </View>
                <Text style={s.profileEmail}>{user.email}</Text>
            </View>

            {/* Dashboard stats — only for SUPERADMIN/ADMIN/OWNER */}
            {canSeeFinance && dashStats && (
                <View style={s.section}>
                    <Text style={s.sectionTitle}>📊 Resumen del Día</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={[s.miniStat, { borderColor: 'rgba(124,58,237,0.2)' }]}>
                            <Text style={[s.miniStatValue, { color: '#7c3aed' }]}>S/{(dashStats.todayIncome || 0).toFixed(0)}</Text>
                            <Text style={s.miniStatLabel}>Hoy</Text>
                        </View>
                        <View style={[s.miniStat, { borderColor: 'rgba(6,182,212,0.2)' }]}>
                            <Text style={[s.miniStatValue, { color: '#06b6d4' }]}>S/{(dashStats.weekIncome || 0).toFixed(0)}</Text>
                            <Text style={s.miniStatLabel}>Semana</Text>
                        </View>
                        <View style={[s.miniStat, { borderColor: 'rgba(243,63,94,0.2)' }]}>
                            <Text style={[s.miniStatValue, { color: '#f43f5e' }]}>S/{(dashStats.monthIncome || 0).toFixed(0)}</Text>
                            <Text style={s.miniStatLabel}>Mes</Text>
                        </View>
                        <View style={[s.miniStat, { borderColor: 'rgba(16,185,129,0.2)' }]}>
                            <Text style={[s.miniStatValue, { color: '#10b981' }]}>{dashStats.activeMembers || 0}</Text>
                            <Text style={s.miniStatLabel}>Activos</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Server config */}
            <View style={s.section}>
                <Text style={s.sectionTitle}>⚙️ Servidor</Text>
                <View style={s.sectionBox}>
                    {!editingServer ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={s.serverUrl} numberOfLines={1}>{api.getBaseUrl()}</Text>
                            </View>
                            <TouchableOpacity style={s.editBtn} onPress={() => setEditingServer(true)}>
                                <Text style={s.editBtnText}>Editar</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            <TextInput
                                style={s.input}
                                value={serverUrl}
                                onChangeText={setServerUrl}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                <TouchableOpacity style={[s.saveServerBtn, { flex: 1 }]} onPress={handleSaveServer}>
                                    <Text style={s.saveServerText}>Guardar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[s.editBtn, { flex: 1, alignItems: 'center', paddingVertical: 10 }]} onPress={() => setEditingServer(false)}>
                                    <Text style={s.editBtnText}>Cancelar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </View>

            {/* App info */}
            <View style={s.section}>
                <Text style={s.sectionTitle}>ℹ️ Aplicación</Text>
                <View style={s.sectionBox}>
                    <View style={s.infoRow}>
                        <Text style={s.infoLabel}>App</Text>
                        <Text style={s.infoValue}>Personal VIP</Text>
                    </View>
                    <View style={s.infoRow}>
                        <Text style={s.infoLabel}>Versión</Text>
                        <Text style={s.infoValue}>1.1.0</Text>
                    </View>
                </View>
            </View>

            {/* Logout */}
            <TouchableOpacity style={s.logoutBtn} onPress={() => {
                Alert.alert('Cerrar Sesión', '¿Estás seguro?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Cerrar Sesión', style: 'destructive', onPress: logout },
                ]);
            }}>
                <Text style={s.logoutText}>🚪 Cerrar Sesión</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0a1a' },
    input: {
        width: '100%', backgroundColor: '#16132a', borderRadius: 12, paddingHorizontal: 16,
        paddingVertical: 13, color: '#e2e8f0', fontSize: 15, borderWidth: 1,
        borderColor: 'rgba(124,58,237,0.2)',
    },
    saveServerBtn: { backgroundColor: '#22c55e', paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginTop: 8 },
    saveServerText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    // Profile
    profileCard: {
        alignItems: 'center', padding: 24, backgroundColor: '#1e1b2e', borderRadius: 20,
        borderWidth: 1, borderColor: 'rgba(124,58,237,0.15)', marginBottom: 16,
    },
    profileAvatar: {
        width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    profileAvatarText: { fontSize: 28, fontWeight: '900', color: '#fff' },
    profileName: { fontSize: 20, fontWeight: '800', color: '#e2e8f0' },
    roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginTop: 6 },
    roleBadgeText: { fontSize: 12, fontWeight: '700' },
    profileEmail: { fontSize: 13, color: '#94a3b8', marginTop: 8 },
    // Mini stat cards
    miniStat: {
        flex: 1, alignItems: 'center' as const, paddingVertical: 10, borderRadius: 12,
        backgroundColor: '#1e1b2e', borderWidth: 1,
    },
    miniStatValue: { fontSize: 16, fontWeight: '800' as const },
    miniStatLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '600' as const, marginTop: 2, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    // Sections
    section: { marginBottom: 16 },
    sectionTitle: { fontSize: 14, fontWeight: '700' as const, color: '#e2e8f0', marginBottom: 8 },
    sectionBox: {
        backgroundColor: '#1e1b2e', borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: 'rgba(124,58,237,0.1)',
    },
    serverUrl: { fontSize: 13, color: '#a78bfa', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(124,58,237,0.15)' },
    editBtnText: { color: '#a78bfa', fontWeight: '600', fontSize: 12 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    infoLabel: { fontSize: 13, color: '#94a3b8' },
    infoValue: { fontSize: 13, color: '#e2e8f0', fontWeight: '600' },
    // Logout
    logoutBtn: {
        backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 14, paddingVertical: 14,
        alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', marginTop: 8,
    },
    logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
});
