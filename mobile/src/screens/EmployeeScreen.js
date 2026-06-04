import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Platform,
} from 'react-native';
import api from '../api';

const today = () => new Date().toISOString().split('T')[0];
const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
};

export default function EmployeeScreen() {
  const [tab, setTab] = useState('today');
  const [start, setStart] = useState(firstOfMonth());
  const [end, setEnd] = useState(today());
  const [stats, setStats] = useState(null);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (s, e) => {
    setLoading(true);
    try {
      const [statsRes, callsRes] = await Promise.all([
        api.get(`/api/calls/stats?start=${s}&end=${e}`),
        api.get(`/api/calls/my?start=${s}&end=${e}`),
      ]);
      setStats(statsRes.data);
      setCalls(callsRes.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (tab === 'today') fetchData(today(), today());
    else fetchData(start, end);
  }, [tab]);

  const onRefresh = () => {
    setRefreshing(true);
    if (tab === 'today') fetchData(today(), today());
    else fetchData(start, end);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {['today', 'range'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.activeTab]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.activeTabText]}>
              {t === 'today' ? '오늘' : '기간 조회'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {stats && (
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.call_count}</Text>
            <Text style={styles.statLabel}>콜수</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDuration(parseInt(stats.total_duration))}</Text>
            <Text style={styles.statLabel}>총 콜타임</Text>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} color="#1976d2" />
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={styles.callItem}>
              <Text style={styles.phone}>{item.phone_number}</Text>
              <Text style={styles.callMeta}>
                {item.call_date} · {formatDuration(item.duration)} · {item.call_type}
              </Text>
            </View>
          )}
          ListEmptyComponent={() => (
            <Text style={styles.empty}>통화 기록이 없습니다.</Text>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', elevation: 1 },
  tab: { flex: 1, padding: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#1976d2' },
  tabText: { fontSize: 14, color: '#888' },
  activeTabText: { color: '#1976d2', fontWeight: 'bold' },
  statsCard: {
    flexDirection: 'row', backgroundColor: '#1976d2', margin: 16,
    borderRadius: 12, padding: 20, elevation: 3,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  callItem: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 8, padding: 14,
  },
  phone: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  callMeta: { fontSize: 12, color: '#888', marginTop: 4 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
});
