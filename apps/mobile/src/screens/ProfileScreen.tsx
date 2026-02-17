import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    Alert, ScrollView, KeyboardAvoidingView, Platform,
    ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export default function ProfileScreen() {
    const { user, login, logout } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [serverUrl, setServerUrl] = useState(api.getBaseUrl());
    const [loading, setLoading] = useState(false);
    const [editingServer, setEditingServer] = useState(false);
    const [dashStats, setDashStats] = useState<any>(null);

    useEffect(() => {
        if (user) {
            api.getDashboardStats().then(setDashStats).catch(() => { });
        }
    }, [user]);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Error', 'Ingresa email y contraseña');
            return;
        }
        setLoading(true);
        try {
            await login(email.trim(), password.trim());
            setEmail('');
            setPassword('');
        } catch (e: any) {
            Alert.alert('Error de Login', e.message);
        }
        setLoading(false);
    };

    const handleSaveServer = async () => {
        const url = serverUrl.trim();
        if (!url) return;
        await api.setBaseUrl(url);
        setServerUrl(api.getBaseUrl());
        setEditingServer(false);
        Alert.alert('✅ Guardado', `Servidor: ${api.getBaseUrl()}`);
    };

    const roleLabels: Record<string, string> = {
        ADMIN: 'Administrador',
        OWNER: 'Propietario',
        TRAINER: 'Entrenador',
        RECEPTIONIST: 'Recepcionista',
    };

    const roleBadgeColors: Record<string, string> = {
        ADMIN: '#7c3aed',
        OWNER: '#06b6d4',
        TRAINER: '#f59e0b',
        RECEPTIONIST: '#10b981',
    };

    if (!user) {
        // Login form
        return (
            <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={s.loginWrap} keyboardShouldPersistTaps="handled">
                    <Text style={{ fontSize: 48 }}>🏋️</Text>
                    <Text style={s.loginTitle}>GymCore</Text>
                    <Text style={s.loginSubtitle}>Inicia sesión con tu cuenta de staff</Text>

                    <View style={s.inputGroup}>
                        <Text style={s.inputLabel}>Email</Text>
                        <TextInput
                            style={s.input}
                            placeholder="correo@gymcore.com"
                            placeholderTextColor="#64748b"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={s.inputGroup}>
                        <Text style={s.inputLabel}>Contraseña</Text>
                        <TextInput
                            style={s.input}
                            placeholder="••••••••"
                            placeholderTextColor="#64748b"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity style={s.loginBtn} onPress={handleLogin} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={s.loginBtnText}>Iniciar Sesión</Text>
                        )}
                    </TouchableOpacity>

                    {/* Server config */}
                    <TouchableOpacity style={s.serverToggle} onPress={() => setEditingServer(!editingServer)}>
                        <Text style={s.serverToggleText}>⚙️ Configurar Servidor</Text>
                    </TouchableOpacity>

                    {editingServer && (
                        <View style={s.serverSection}>
                            <Text style={s.inputLabel}>URL del Servidor</Text>
                            <TextInput
                                style={s.input}
                                value={serverUrl}
                                onChangeText={setServerUrl}
                                placeholder="http://192.168.18.28:3001/api"
                                placeholderTextColor="#64748b"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <TouchableOpacity style={s.saveServerBtn} onPress={handleSaveServer}>
                                <Text style={s.saveServerText}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    // Logged in profile
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

            {/* Dashboard stats */}
            {dashStats && (
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
                        <Text style={s.infoValue}>GymCore Scanner</Text>
                    </View>
                    <View style={s.infoRow}>
                        <Text style={s.infoLabel}>Versión</Text>
                        <Text style={s.infoValue}>1.0.0</Text>
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
    // Login
    loginWrap: { alignItems: 'center', padding: 30, paddingTop: 60 },
    loginTitle: { fontSize: 28, fontWeight: '900', color: '#e2e8f0', marginTop: 12 },
    loginSubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4, marginBottom: 30 },
    inputGroup: { width: '100%', marginBottom: 16 },
    inputLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginBottom: 6, marginLeft: 4 },
    input: {
        width: '100%', backgroundColor: '#1e1b2e', borderRadius: 12, paddingHorizontal: 16,
        paddingVertical: 13, color: '#e2e8f0', fontSize: 15, borderWidth: 1,
        borderColor: 'rgba(124,58,237,0.2)',
    },
    loginBtn: {
        width: '100%', backgroundColor: '#7c3aed', paddingVertical: 15, borderRadius: 14,
        alignItems: 'center', marginTop: 8, elevation: 8, shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12,
    },
    loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    serverToggle: { marginTop: 24 },
    serverToggleText: { color: '#64748b', fontSize: 13 },
    serverSection: { width: '100%', marginTop: 12 },
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
