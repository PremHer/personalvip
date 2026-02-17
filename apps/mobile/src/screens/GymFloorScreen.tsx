import React, { useState, useCallback } from 'react';
import {
    StyleSheet, Text, View, FlatList, TouchableOpacity,
    RefreshControl, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../lib/api';
import ClientProfileModal from './ClientProfileModal';

interface AttendanceRecord {
    id: string;
    checkIn: string;
    checkOut: string | null;
    method: string;
    client: { id: string; name: string; photoUrl?: string };
}

export default function GymFloorScreen() {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [stats, setStats] = useState({ totalToday: 0, avgDuration: '' });
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [profileVisible, setProfileVisible] = useState(false);

    const loadData = async () => {
        try {
            const data = await api.getTodayAttendance();
            const inGym = data.filter((r: AttendanceRecord) => !r.checkOut);
            const checkedOut = data.filter((r: AttendanceRecord) => r.checkOut);

            // Calculate stats
            let totalMins = 0;
            checkedOut.forEach((r: any) => {
                totalMins += (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 60000;
            });
            const avgMins = checkedOut.length > 0 ? Math.round(totalMins / checkedOut.length) : 0;
            const avgHrs = Math.floor(avgMins / 60);
            const avgStr = avgMins > 0 ? (avgHrs > 0 ? `${avgHrs}h ${avgMins % 60}m` : `${avgMins}m`) : '—';

            setStats({ totalToday: data.length, avgDuration: avgStr });
            setAllRecords(inGym);
            setRecords(inGym);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
            const interval = setInterval(loadData, 15000);
            return () => clearInterval(interval);
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleSearch = (text: string) => {
        setSearch(text);
        if (!text.trim()) {
            setRecords(allRecords);
        } else {
            setRecords(allRecords.filter(r =>
                r.client.name.toLowerCase().includes(text.toLowerCase())
            ));
        }
    };

    const handleCheckout = async (record: AttendanceRecord) => {
        setLoadingCheckout(record.client.id);
        try {
            await api.checkOut(record.client.id);
            await loadData();
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
        setLoadingCheckout(null);
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    const timeSince = (iso: string) => {
        const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
        if (mins < 60) return `${mins} min`;
        const hrs = Math.floor(mins / 60);
        return `${hrs}h ${mins % 60}m`;
    };

    const renderItem = ({ item }: { item: AttendanceRecord }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => { setSelectedClientId(item.client.id); setProfileVisible(true); }}
        >
            <View style={s.row}>
                <View style={s.avatarCircle}>
                    <Text style={s.avatarText}>{item.client.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={s.rowInfo}>
                    <Text style={s.rowName}>{item.client.name}</Text>
                    <Text style={s.rowMeta}>Entrada: {formatTime(item.checkIn)} · {timeSince(item.checkIn)}</Text>
                </View>
                <TouchableOpacity
                    style={s.checkoutBtn}
                    onPress={(e) => { e.stopPropagation?.(); handleCheckout(item); }}
                    disabled={loadingCheckout === item.client.id}
                >
                    {loadingCheckout === item.client.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={s.checkoutText}>Salida</Text>
                    )}
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={s.container}>
            {/* Stats Row */}
            <View style={s.statsRow}>
                <View style={s.statBox}>
                    <Text style={s.statNumber}>{records.length}</Text>
                    <Text style={s.statLabel}>En gym</Text>
                </View>
                <View style={[s.statBox, s.statBoxAlt]}>
                    <Text style={[s.statNumber, { color: '#06b6d4' }]}>{stats.totalToday}</Text>
                    <Text style={s.statLabel}>Hoy total</Text>
                </View>
                <View style={[s.statBox, s.statBoxAlt2]}>
                    <Text style={[s.statNumber, { color: '#10b981', fontSize: 18 }]}>{stats.avgDuration}</Text>
                    <Text style={s.statLabel}>Promedio</Text>
                </View>
            </View>

            {/* Search */}
            <View style={s.searchWrap}>
                <Text style={s.searchIcon}>🔍</Text>
                <TextInput
                    style={s.searchInput}
                    placeholder="Buscar cliente..."
                    placeholderTextColor="#64748b"
                    value={search}
                    onChangeText={handleSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearch('')}>
                        <Text style={{ color: '#94a3b8', fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={records}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" colors={['#7c3aed']} />}
                contentContainerStyle={records.length === 0 ? s.emptyWrap : s.listContent}
                ListEmptyComponent={
                    <View style={s.emptyBox}>
                        <Text style={{ fontSize: 48 }}>🏋️</Text>
                        <Text style={s.emptyTitle}>{search ? 'Sin resultados' : 'Gym vacío'}</Text>
                        <Text style={s.emptyText}>{search ? `No se encontró "${search}"` : 'No hay clientes registrados en este momento'}</Text>
                    </View>
                }
            />

            {/* Client Profile Modal */}
            <ClientProfileModal
                clientId={selectedClientId}
                visible={profileVisible}
                onClose={() => { setProfileVisible(false); setSelectedClientId(null); }}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0a1a' },
    statsRow: {
        flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
    },
    statBox: {
        flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14,
        backgroundColor: 'rgba(124,58,237,0.1)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)',
    },
    statBoxAlt: {
        backgroundColor: 'rgba(6,182,212,0.08)', borderColor: 'rgba(6,182,212,0.15)',
    },
    statBoxAlt2: {
        backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.15)',
    },
    statNumber: { fontSize: 24, fontWeight: '900', color: '#7c3aed' },
    statLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
    searchWrap: {
        flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 10, marginBottom: 6,
        backgroundColor: '#1e1b2e', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 2,
        borderWidth: 1, borderColor: 'rgba(124,58,237,0.12)',
    },
    searchIcon: { fontSize: 14, marginRight: 8 },
    searchInput: { flex: 1, color: '#e2e8f0', fontSize: 14, paddingVertical: 10 },
    listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
    row: {
        flexDirection: 'row', alignItems: 'center', padding: 14,
        backgroundColor: '#1e1b2e', borderRadius: 14, marginBottom: 8,
        borderWidth: 1, borderColor: 'rgba(124,58,237,0.1)',
    },
    avatarCircle: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#7c3aed',
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
    rowInfo: { flex: 1, marginLeft: 12 },
    rowName: { fontSize: 15, fontWeight: '700', color: '#e2e8f0' },
    rowMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    checkoutBtn: {
        backgroundColor: '#ef4444', paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 10, minWidth: 65, alignItems: 'center',
    },
    checkoutText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    emptyWrap: { flex: 1, justifyContent: 'center' },
    emptyBox: { alignItems: 'center', padding: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#e2e8f0', marginTop: 12 },
    emptyText: { fontSize: 13, color: '#94a3b8', marginTop: 4, textAlign: 'center' },
});
