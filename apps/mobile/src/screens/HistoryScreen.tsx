import React, { useState, useCallback } from 'react';
import {
    StyleSheet, Text, View, FlatList, RefreshControl, Alert,
    TouchableOpacity, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../lib/api';

interface AttendanceRecord {
    id: string;
    checkIn: string;
    checkOut: string | null;
    method: string;
    client: { id: string; name: string };
}

export default function HistoryScreen() {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Date navigation: defaults to today
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        return d.toISOString().split('T')[0]; // YYYY-MM-DD
    });

    const loadData = async (dateStr: string, pg = 1) => {
        setLoading(true);
        try {
            const res = await api.getHistory({ date: dateStr, page: pg, limit: 50 });
            setRecords(res.data);
            setTotal(res.total);
            setPage(res.page);
            setTotalPages(res.totalPages);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
        setLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadData(selectedDate);
        }, [selectedDate])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData(selectedDate);
        setRefreshing(false);
    };

    const goDay = (offset: number) => {
        const d = new Date(selectedDate + 'T12:00:00');
        d.setDate(d.getDate() + offset);
        // Don't go to the future
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (d > today) return;
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const goToday = () => {
        setSelectedDate(new Date().toISOString().split('T')[0]);
    };

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const formatDisplayDate = (dateStr: string) => {
        const d = new Date(dateStr + 'T12:00:00');
        if (isToday) return 'Hoy';
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (dateStr === yesterday.toISOString().split('T')[0]) return 'Ayer';
        return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    const inGym = records.filter(r => !r.checkOut).length;
    const checkedOut = records.filter(r => r.checkOut).length;

    const renderItem = ({ item }: { item: AttendanceRecord }) => (
        <View style={s.row}>
            <View style={[s.dot, item.checkOut ? s.dotGray : s.dotGreen]} />
            <View style={s.avatarSmall}>
                <Text style={s.avatarText}>{item.client.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={s.rowInfo}>
                <Text style={s.rowName}>{item.client.name}</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
                    <Text style={s.rowTime}>🟢 {formatTime(item.checkIn)}</Text>
                    {item.checkOut && <Text style={s.rowTime}>🔴 {formatTime(item.checkOut)}</Text>}
                </View>
            </View>
            <View style={[s.badge, item.method === 'QR' ? s.badgeQr : s.badgeManual]}>
                <Text style={s.badgeText}>{item.method}</Text>
            </View>
        </View>
    );

    return (
        <View style={s.container}>
            {/* Date navigator */}
            <View style={s.dateNav}>
                <TouchableOpacity style={s.dateArrow} onPress={() => goDay(-1)}>
                    <Text style={s.dateArrowText}>◀</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={goToday} style={s.dateCenter}>
                    <Text style={s.dateCurrent}>{formatDisplayDate(selectedDate)}</Text>
                    <Text style={s.dateISO}>{selectedDate}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.dateArrow, isToday && s.dateArrowDisabled]} onPress={() => goDay(1)} disabled={isToday}>
                    <Text style={[s.dateArrowText, isToday && { opacity: 0.3 }]}>▶</Text>
                </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={s.statsRow}>
                <View style={s.statCard}>
                    <Text style={[s.statNum, { color: '#7c3aed' }]}>{total}</Text>
                    <Text style={s.statLabel}>Total</Text>
                </View>
                <View style={s.statCard}>
                    <Text style={[s.statNum, { color: '#22c55e' }]}>{inGym}</Text>
                    <Text style={s.statLabel}>En Gym</Text>
                </View>
                <View style={s.statCard}>
                    <Text style={[s.statNum, { color: '#94a3b8' }]}>{checkedOut}</Text>
                    <Text style={s.statLabel}>Salidos</Text>
                </View>
            </View>

            <FlatList
                data={records}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" colors={['#7c3aed']} />}
                contentContainerStyle={records.length === 0 ? s.emptyWrap : s.listContent}
                ListEmptyComponent={
                    loading ? (
                        <View style={s.emptyBox}>
                            <Text style={{ fontSize: 32 }}>⏳</Text>
                            <Text style={s.emptyTitle}>Cargando...</Text>
                        </View>
                    ) : (
                        <View style={s.emptyBox}>
                            <Text style={{ fontSize: 48 }}>📋</Text>
                            <Text style={s.emptyTitle}>Sin registros</Text>
                            <Text style={s.emptyText}>No hay asistencia registrada para esta fecha</Text>
                        </View>
                    )
                }
                ListFooterComponent={
                    totalPages > 1 ? (
                        <View style={s.pageNav}>
                            <TouchableOpacity style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]} onPress={() => loadData(selectedDate, page - 1)} disabled={page <= 1}>
                                <Text style={s.pageBtnText}>◀ Anterior</Text>
                            </TouchableOpacity>
                            <Text style={s.pageText}>Pág {page} de {totalPages}</Text>
                            <TouchableOpacity style={[s.pageBtn, page >= totalPages && s.pageBtnDisabled]} onPress={() => loadData(selectedDate, page + 1)} disabled={page >= totalPages}>
                                <Text style={s.pageBtnText}>Siguiente ▶</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0a1a' },
    // Date navigator
    dateNav: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: '#1e1b2e', borderBottomWidth: 1, borderBottomColor: 'rgba(124,58,237,0.15)',
    },
    dateArrow: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(124,58,237,0.15)', alignItems: 'center', justifyContent: 'center' },
    dateArrowDisabled: { opacity: 0.4 },
    dateArrowText: { fontSize: 16, color: '#a78bfa' },
    dateCenter: { alignItems: 'center' },
    dateCurrent: { fontSize: 18, fontWeight: '800', color: '#e2e8f0' },
    dateISO: { fontSize: 11, color: '#64748b', marginTop: 1 },
    // Stats
    statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
    statCard: {
        flex: 1, alignItems: 'center', paddingVertical: 14,
        backgroundColor: '#1e1b2e', borderRadius: 14,
        borderWidth: 1, borderColor: 'rgba(124,58,237,0.1)',
    },
    statNum: { fontSize: 28, fontWeight: '900' },
    statLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: -2 },
    // List
    listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },
    row: {
        flexDirection: 'row', alignItems: 'center', padding: 12,
        backgroundColor: '#1e1b2e', borderRadius: 12, marginBottom: 6,
        borderWidth: 1, borderColor: 'rgba(124,58,237,0.08)',
    },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
    dotGreen: { backgroundColor: '#22c55e' },
    dotGray: { backgroundColor: '#64748b' },
    avatarSmall: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: '#7c3aed',
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 14, fontWeight: '800', color: '#fff' },
    rowInfo: { flex: 1, marginLeft: 10 },
    rowName: { fontSize: 14, fontWeight: '600', color: '#e2e8f0' },
    rowTime: { fontSize: 11, color: '#94a3b8' },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeQr: { backgroundColor: 'rgba(124,58,237,0.15)' },
    badgeManual: { backgroundColor: 'rgba(245,158,11,0.15)' },
    badgeText: { fontSize: 10, fontWeight: '700', color: '#a78bfa' },
    // Empty
    emptyWrap: { flex: 1, justifyContent: 'center' },
    emptyBox: { alignItems: 'center', padding: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#e2e8f0', marginTop: 12 },
    emptyText: { fontSize: 13, color: '#94a3b8', marginTop: 4, textAlign: 'center' },
    // Pagination
    pageNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    pageBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.15)' },
    pageBtnDisabled: { opacity: 0.3 },
    pageBtnText: { color: '#a78bfa', fontWeight: '600', fontSize: 12 },
    pageText: { color: '#94a3b8', fontSize: 12 },
});
