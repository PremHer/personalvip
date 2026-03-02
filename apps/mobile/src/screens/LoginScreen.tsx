import React, { useState } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
    ScrollView, Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const STAFF_ROLES = ['SUPERADMIN', 'ADMIN', 'OWNER', 'RECEPTIONIST', 'TRAINER'];

export default function LoginScreen() {
    const { login, logout } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [serverUrl, setServerUrl] = useState(api.getBaseUrl());
    const [loading, setLoading] = useState(false);
    const [showServer, setShowServer] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Error', 'Ingresa email y contraseña');
            return;
        }
        setLoading(true);
        try {
            const res = await login(email.trim(), password.trim());
            const role = res.user?.role;

            if (!role || !STAFF_ROLES.includes(role)) {
                // Logged in but not staff — logout immediately
                logout();
                Alert.alert(
                    '⛔ Acceso Denegado',
                    'Solo personal autorizado puede acceder a esta aplicación.',
                );
                setLoading(false);
                return;
            }

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

        Alert.prompt(
            '🔐 Autenticación Requerida',
            'Ingresa la contraseña de administrador para cambiar el servidor:',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async (pwd?: string) => {
                        if (pwd === 'CCRED2026@') {
                            await api.setBaseUrl(url);
                            setServerUrl(api.getBaseUrl());
                            setShowServer(false);
                            Alert.alert('✅ Guardado', `Servidor: ${api.getBaseUrl()}`);
                        } else {
                            Alert.alert('❌ Error', 'Contraseña incorrecta');
                        }
                    }
                }
            ],
            'secure-text'
        );
    };

    return (
        <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
                {/* Logo */}
                <View style={s.logoWrap}>
                    <Image source={require('../../assets/logo.png')} style={s.logoImg} resizeMode="contain" />
                    <Text style={s.logoTitle}>Personal VIP</Text>
                    <Text style={s.logoSubtitle}>Sistema de Gestión</Text>
                </View>

                {/* Login Card */}
                <View style={s.card}>
                    <Text style={s.cardTitle}>Iniciar Sesión</Text>
                    <Text style={s.cardSubtitle}>Ingresa con tu cuenta de staff</Text>

                    <View style={s.inputGroup}>
                        <Text style={s.inputLabel}>Email</Text>
                        <TextInput
                            style={s.input}
                            placeholder="correo@personalvip.com"
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
                </View>

                {/* Server config */}
                <TouchableOpacity style={s.serverToggle} onPress={() => setShowServer(!showServer)}>
                    <Text style={s.serverToggleText}>⚙️ Configurar Servidor</Text>
                </TouchableOpacity>

                {showServer && (
                    <View style={s.serverCard}>
                        <Text style={s.inputLabel}>URL del Servidor</Text>
                        <TextInput
                            style={s.input}
                            value={serverUrl}
                            onChangeText={setServerUrl}
                            placeholder="https://gymcoreapi-production.up.railway.app/api"
                            placeholderTextColor="#64748b"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity style={s.saveServerBtn} onPress={handleSaveServer}>
                            <Text style={s.saveServerText}>Guardar</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <Text style={s.version}>Personal VIP v1.1.0</Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0a1a' },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 },

    // Logo
    logoWrap: { alignItems: 'center', marginBottom: 32 },
    logoImg: { width: 100, height: 100, borderRadius: 50, marginBottom: 8 },
    logoTitle: { fontSize: 32, fontWeight: '900', color: '#e2e8f0', marginTop: 8, letterSpacing: 1 },
    logoSubtitle: { fontSize: 13, color: '#7c3aed', fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 },

    // Card
    card: {
        backgroundColor: '#1e1b2e', borderRadius: 20, padding: 24,
        borderWidth: 1, borderColor: 'rgba(124,58,237,0.15)',
    },
    cardTitle: { fontSize: 20, fontWeight: '800', color: '#e2e8f0', textAlign: 'center' },
    cardSubtitle: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 4, marginBottom: 20 },

    // Inputs
    inputGroup: { marginBottom: 14 },
    inputLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', marginBottom: 6, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
        backgroundColor: '#16132a', borderRadius: 12, paddingHorizontal: 16,
        paddingVertical: 13, color: '#e2e8f0', fontSize: 15, borderWidth: 1,
        borderColor: 'rgba(124,58,237,0.2)',
    },

    // Login button
    loginBtn: {
        backgroundColor: '#7c3aed', paddingVertical: 15, borderRadius: 14,
        alignItems: 'center', marginTop: 8, elevation: 8, shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12,
    },
    loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    // Server
    serverToggle: { alignItems: 'center', marginTop: 24 },
    serverToggleText: { color: '#64748b', fontSize: 13 },
    serverCard: {
        backgroundColor: '#1e1b2e', borderRadius: 16, padding: 16, marginTop: 12,
        borderWidth: 1, borderColor: 'rgba(124,58,237,0.1)',
    },
    saveServerBtn: { backgroundColor: '#22c55e', paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    saveServerText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    // Footer
    version: { textAlign: 'center', color: '#475569', fontSize: 11, marginTop: 24 },
});
