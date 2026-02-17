import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity,
    StatusBar, Animated, Dimensions, TextInput, ScrollView,
    Platform, Vibration, Alert, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { api } from '../lib/api';

interface ScanResult {
    valid: boolean;
    canEnter?: boolean;
    message?: string;
    client?: { id: string; name: string; photoUrl?: string; qrCode?: string; medicalNotes?: string | null };
    membership?: { active: boolean; plan: string; daysLeft: number; endDate: string; startDate: string } | null;
    upcomingMembership?: { plan: string; startDate: string; endDate: string } | null;
    checkIn?: { registered: boolean; alreadyCheckedIn?: boolean; message: string } | null;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCANNER_SIZE = SCREEN_WIDTH * 0.65;

export default function ScannerScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [showManual, setShowManual] = useState(false);
    const [editingNotes, setEditingNotes] = useState(false);
    const [medicalNotesText, setMedicalNotesText] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);

    const scanLineAnim = useRef(new Animated.Value(0)).current;
    const resultSlideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!scanned) {
            const anim = Animated.loop(
                Animated.sequence([
                    Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
                    Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
                ])
            );
            anim.start();
            return () => anim.stop();
        }
    }, [scanned]);

    useEffect(() => {
        if (result) {
            Animated.spring(resultSlideAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start();
        } else {
            resultSlideAnim.setValue(0);
        }
    }, [result]);

    const validateQr = async (qrCode: string) => {
        setLoading(true);
        setScanned(true);
        try {
            const data: ScanResult = await api.scanQr(qrCode, true);
            setResult(data);
            if (data.checkIn?.registered) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else if (data.checkIn?.alreadyCheckedIn) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                Vibration.vibrate(200);
            } else if (!data.canEnter) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Vibration.vibrate(300);
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (e: any) {
            setResult({
                valid: false, canEnter: false,
                message: `Error de conexión: ${e.message}`,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        setLoading(false);
    };

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        if (scanned || loading) return;
        validateQr(data);
    };

    const scanAgain = () => {
        setScanned(false);
        setResult(null);
        setShowManual(false);
        setManualCode('');
        setEditingNotes(false);
        setMedicalNotesText('');
    };

    const handleEditNotes = () => {
        setMedicalNotesText(result?.client?.medicalNotes || '');
        setEditingNotes(true);
    };

    const handleSaveNotes = async () => {
        if (!result?.client?.id) return;
        setSavingNotes(true);
        try {
            await api.updateMedicalNotes(result.client.id, medicalNotesText);
            setResult({
                ...result,
                client: { ...result.client!, medicalNotes: medicalNotesText },
            });
            setEditingNotes(false);
            Alert.alert('✅ Guardado', 'Notas médicas actualizadas correctamente.');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
        setSavingNotes(false);
    };

    const handleManualSubmit = () => {
        const code = manualCode.trim();
        if (!code) return;
        setShowManual(false);
        validateQr(code);
    };

    if (!permission) {
        return <View style={s.container}><Text style={s.loadingText}>Cargando...</Text></View>;
    }

    if (!permission.granted) {
        return (
            <View style={s.container}>
                <View style={s.permBox}>
                    <Text style={{ fontSize: 48 }}>📷</Text>
                    <Text style={s.permTitle}>Permiso de Cámara</Text>
                    <Text style={s.permText}>Necesitamos acceso a tu cámara para escanear códigos QR.</Text>
                    <TouchableOpacity style={s.btn} onPress={requestPermission}>
                        <Text style={s.btnText}>Permitir Cámara</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={s.container}>
            {!result ? (
                <View style={s.scannerWrap}>
                    <View style={s.cameraWrap}>
                        <CameraView
                            style={s.camera}
                            facing="back"
                            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        />
                        <View style={StyleSheet.absoluteFillObject}>
                            <View style={s.overlayDark} />
                            <View style={s.overlayMiddle}>
                                <View style={s.overlayDark} />
                                <View style={s.scanArea}>
                                    <View style={[s.corner, s.cTL]} />
                                    <View style={[s.corner, s.cTR]} />
                                    <View style={[s.corner, s.cBL]} />
                                    <View style={[s.corner, s.cBR]} />
                                    {!scanned && (
                                        <Animated.View style={[s.scanLine, {
                                            transform: [{
                                                translateY: scanLineAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [-SCANNER_SIZE / 2 + 10, SCANNER_SIZE / 2 - 10],
                                                }),
                                            }],
                                        }]} />
                                    )}
                                </View>
                                <View style={s.overlayDark} />
                            </View>
                            <View style={s.overlayDark} />
                        </View>
                        {loading && (
                            <View style={s.loadingOv}>
                                <Text style={{ fontSize: 32 }}>⏳</Text>
                                <Text style={s.loadingLabel}>Validando...</Text>
                            </View>
                        )}
                    </View>
                    <Text style={s.instruction}>Apunta la cámara al código QR del cliente</Text>
                    {!showManual ? (
                        <TouchableOpacity style={s.manualBtn} onPress={() => setShowManual(true)}>
                            <Text style={s.manualBtnText}>⌨️ Ingresar código manual</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={s.manualRow}>
                            <TextInput
                                style={s.manualInput}
                                placeholder="Ej: GYM-AD2479D1"
                                placeholderTextColor="#64748b"
                                value={manualCode}
                                onChangeText={setManualCode}
                                autoCapitalize="characters"
                                autoFocus
                            />
                            <TouchableOpacity style={s.manualSubmit} onPress={handleManualSubmit}>
                                <Text style={s.manualSubmitText}>Validar</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            ) : (
                <Animated.View style={[s.resultWrap, {
                    transform: [{ translateY: resultSlideAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }) }],
                    opacity: resultSlideAnim,
                }]}>
                    <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
                        {/* Status */}
                        <View style={[
                            s.statusBanner,
                            result.checkIn?.registered ? s.bgSuccess
                                : result.checkIn?.alreadyCheckedIn ? s.bgWarning
                                    : result.canEnter ? s.bgSuccess : s.bgDanger
                        ]}>
                            <Text style={{ fontSize: 42, marginBottom: 8 }}>
                                {result.checkIn?.registered ? '✅' : result.checkIn?.alreadyCheckedIn ? '⚠️' : result.canEnter ? '✅' : '❌'}
                            </Text>
                            <Text style={[s.statusTitle,
                            result.checkIn?.registered ? s.textGreen
                                : result.checkIn?.alreadyCheckedIn ? s.textYellow
                                    : result.canEnter ? s.textGreen : s.textRed
                            ]}>
                                {result.checkIn?.registered ? 'Entrada Registrada'
                                    : result.checkIn?.alreadyCheckedIn ? 'Ya Registrado'
                                        : result.canEnter ? 'Acceso Permitido' : 'Acceso Denegado'}
                            </Text>
                            {result.checkIn?.message && <Text style={s.statusMsg}>{result.checkIn.message}</Text>}
                        </View>

                        {/* Client */}
                        {result.client && (
                            <View style={s.card}>
                                <View style={s.avatar}>
                                    <Text style={s.avatarText}>{result.client.name.charAt(0).toUpperCase()}</Text>
                                </View>
                                <Text style={s.clientName}>{result.client.name}</Text>
                                {result.client.qrCode && <Text style={s.clientCode}>{result.client.qrCode}</Text>}
                            </View>
                        )}

                        {/* Membership */}
                        {result.membership && (
                            <View style={[s.card, { borderColor: 'rgba(34,197,94,0.2)' }]}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <Text style={[s.label, { color: '#22c55e' }]}>MEMBRESÍA ACTIVA</Text>
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={[{ fontSize: 26, fontWeight: '900' }, result.membership.daysLeft <= 7 ? s.textYellow : s.textGreen]}>
                                            {result.membership.daysLeft}
                                        </Text>
                                        <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: -4 }}>días</Text>
                                    </View>
                                </View>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: '#e2e8f0' }}>{result.membership.plan}</Text>
                                <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                                    Vence: {new Date(result.membership.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </Text>
                            </View>
                        )}

                        {/* Upcoming */}
                        {!result.membership && result.upcomingMembership && (
                            <View style={[s.card, { borderColor: 'rgba(245,158,11,0.2)' }]}>
                                <Text style={[s.label, { color: '#f59e0b', marginBottom: 4 }]}>⏰ MEMBRESÍA PROGRAMADA</Text>
                                <Text style={{ fontSize: 15, fontWeight: '600', color: '#e2e8f0' }}>{result.upcomingMembership.plan}</Text>
                                <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                                    Inicia: {new Date(result.upcomingMembership.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </Text>
                            </View>
                        )}

                        {/* No membership */}
                        {!result.membership && !result.upcomingMembership && result.valid && (
                            <View style={[s.card, { borderColor: 'rgba(239,68,68,0.2)', alignItems: 'center' }]}>
                                <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '600' }}>Sin membresía activa ni programada</Text>
                            </View>
                        )}

                        {/* Medical Notes */}
                        {result.client && (
                            <View style={[s.card, { borderColor: result.client.medicalNotes ? 'rgba(245,158,11,0.25)' : 'rgba(124,58,237,0.15)', alignItems: 'stretch' }]}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={[s.label, { color: result.client.medicalNotes ? '#f59e0b' : '#94a3b8' }]}>
                                        🩺 NOTAS MÉDICAS
                                    </Text>
                                    {!editingNotes && (
                                        <TouchableOpacity onPress={handleEditNotes} style={s.editNotesBtn}>
                                            <Text style={s.editNotesBtnText}>✏️ Editar</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                {!editingNotes ? (
                                    result.client.medicalNotes ? (
                                        <Text style={s.notesText}>{result.client.medicalNotes}</Text>
                                    ) : (
                                        <Text style={s.notesEmpty}>Sin notas médicas registradas</Text>
                                    )
                                ) : (
                                    <View>
                                        <TextInput
                                            style={s.notesInput}
                                            value={medicalNotesText}
                                            onChangeText={setMedicalNotesText}
                                            placeholder="Ej: Lesión rodilla derecha, hipertensión..."
                                            placeholderTextColor="#64748b"
                                            multiline
                                            numberOfLines={4}
                                            autoFocus
                                        />
                                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                            <TouchableOpacity style={s.saveNotesBtn} onPress={handleSaveNotes} disabled={savingNotes}>
                                                {savingNotes ? (
                                                    <ActivityIndicator size="small" color="#fff" />
                                                ) : (
                                                    <Text style={s.saveNotesBtnText}>💾 Guardar</Text>
                                                )}
                                            </TouchableOpacity>
                                            <TouchableOpacity style={s.cancelNotesBtn} onPress={() => setEditingNotes(false)}>
                                                <Text style={s.cancelNotesBtnText}>Cancelar</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Error */}
                        {!result.valid && result.message && (
                            <View style={[s.card, { borderColor: 'rgba(239,68,68,0.2)' }]}>
                                <Text style={{ color: '#fca5a5', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>{result.message}</Text>
                            </View>
                        )}

                        <TouchableOpacity style={s.btn} onPress={scanAgain}>
                            <Text style={s.btnText}>📷 Escanear Otro</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0a1a' },
    loadingText: { color: '#e2e8f0', fontSize: 16, textAlign: 'center', marginTop: 100 },
    permBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    permTitle: { fontSize: 22, fontWeight: '700', color: '#e2e8f0', marginTop: 16, marginBottom: 8 },
    permText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    btn: { backgroundColor: '#7c3aed', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, alignItems: 'center', elevation: 8, shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, marginTop: 4 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    scannerWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
    cameraWrap: { width: '100%', aspectRatio: 1, maxWidth: 340, borderRadius: 20, overflow: 'hidden' },
    camera: { flex: 1 },
    overlayDark: { flex: 1, backgroundColor: 'rgba(15,10,26,0.6)' },
    overlayMiddle: { flexDirection: 'row', height: SCANNER_SIZE },
    scanArea: { width: SCANNER_SIZE, height: SCANNER_SIZE, justifyContent: 'center', alignItems: 'center' },
    corner: { position: 'absolute', width: 26, height: 26, borderColor: '#7c3aed' },
    cTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
    cTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
    cBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
    cBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
    scanLine: { width: SCANNER_SIZE - 40, height: 2, backgroundColor: '#7c3aed', shadowColor: '#7c3aed', shadowOpacity: 0.8, shadowRadius: 8, elevation: 4 },
    loadingOv: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,10,26,0.85)', alignItems: 'center', justifyContent: 'center', gap: 8 },
    loadingLabel: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
    instruction: { color: '#94a3b8', fontSize: 13, marginTop: 14, textAlign: 'center' },
    manualBtn: { marginTop: 14, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)', backgroundColor: 'rgba(124,58,237,0.08)' },
    manualBtnText: { color: '#a78bfa', fontSize: 13, fontWeight: '500' },
    manualRow: { flexDirection: 'row', marginTop: 14, gap: 8, width: '100%', maxWidth: 340 },
    manualInput: { flex: 1, backgroundColor: '#1e1b2e', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: '#e2e8f0', fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)' },
    manualSubmit: { backgroundColor: '#7c3aed', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
    manualSubmitText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    resultWrap: { flex: 1, paddingHorizontal: 16 },
    statusBanner: { borderRadius: 18, padding: 20, alignItems: 'center', marginBottom: 12 },
    bgSuccess: { backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1.5, borderColor: 'rgba(34,197,94,0.3)' },
    bgDanger: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.3)' },
    bgWarning: { backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.3)' },
    statusTitle: { fontSize: 20, fontWeight: '800' },
    statusMsg: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 6, lineHeight: 18 },
    textGreen: { color: '#22c55e' },
    textRed: { color: '#ef4444' },
    textYellow: { color: '#f59e0b' },
    card: { backgroundColor: '#1e1b2e', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(124,58,237,0.15)' },
    avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 8, backgroundColor: '#7c3aed' },
    avatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
    clientName: { fontSize: 18, fontWeight: '700', color: '#e2e8f0' },
    clientCode: { fontSize: 11, color: '#64748b', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 2 },
    label: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
    editNotesBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(124,58,237,0.15)' },
    editNotesBtnText: { color: '#a78bfa', fontSize: 11, fontWeight: '600' },
    notesText: { fontSize: 14, color: '#fbbf24', lineHeight: 20, fontStyle: 'italic' },
    notesEmpty: { fontSize: 13, color: '#64748b', fontStyle: 'italic' },
    notesInput: { backgroundColor: '#0f0a1a', borderRadius: 12, padding: 12, color: '#e2e8f0', fontSize: 14, lineHeight: 20, borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)', textAlignVertical: 'top', minHeight: 80 },
    saveNotesBtn: { flex: 1, backgroundColor: '#22c55e', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    saveNotesBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    cancelNotesBtn: { flex: 1, backgroundColor: 'rgba(124,58,237,0.1)', paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)' },
    cancelNotesBtnText: { color: '#a78bfa', fontWeight: '600', fontSize: 13 },
});
