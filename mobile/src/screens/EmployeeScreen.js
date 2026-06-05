import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import api from '../api';
import { SyncContext } from '../../App';

const today = () => new Date().toISOString().split('T')[0];
const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const formatDuration = (seconds) => {
  const s = parseInt(seconds) || 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}시간 ${m}분 ${sec}초`;
};

const CALL_COLORS = { OUTGOING: '#1976d2', INCOMING: '#388e3c', MISSED: '#e53935', REJECTED: '#e53935' };
const CALL_LABELS = { OUTGOING: '발신', INCOMING: '수신', MISSED: '부재중', REJECTED: '거절' };

export default function EmployeeScreen() {
  const syncCount = useContext(SyncContext);

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
  }, [tab, syncCount]);

  const onRefresh = () => {
    setRefreshing(true);
    if (tab === 'today') fetchData(today(), today());
    else fetchData(start, end);
  };

  const outgoing = calls.filter((c) => c.call_type === 'OUTGOING');
  const incoming = calls.filter((c) => c.call_type === 'INCOMING');
  const missed = calls.filter((c) => c.call_type === 'MISSED' || c.call_type === 'REJECTED');
  const outgoingDur = outgoing.reduce((a, c) => a + (parseInt(c.duration) || 0), 0);
  const incomingDur = incoming.reduce((a, c) => a + (parseInt(c.duration) || 0), 0);

  const ListHeader = () => (
    <>
      {tab === 'today' && stats && (
        <View style={styles.todayCard}>
          <Text style={styles.todayCardTitle}>오늘 통계</Text>
          <View style={styles.todayRow}>
            <View style={styles.todayStat}>
              <Text style={[styles.todayCount, { color: '#1976d2' }]}>{outgoing.length}</Text>
              <Text style={styles.todayLabel}>발신</Text>
            </View>
            <View style={[styles.todayStat, styles.todayStatBorder]}>
              <Text style={[styles.todayCount, { color: '#388e3c' }]}>{incoming.length}</Text>
              <Text style={styles.todayLabel}>수신</Text>
            </View>
            <View style={[styles.todayStat, styles.todayStatBorder]}>
              <Text style={[styles.todayCount, { color: '#e53935' }]}>{missed.length}</Text>
              <Text style={styles.todayLabel}>부재중</Text>
            </View>
          </View>
          <View style={[styles.todayRow, styles.todayRowBorder]}>
            <View style={styles.todayStat}>
              <Text style={[styles.todayDur, { color: '#1976d2' }]}>{formatDuration(outgoingDur)}</Text>
              <Text style={styles.todayLabel}>발신콜타임</Text>
            </View>
            <View style={[styles.todayStat, styles.todayStatBorder]}>
              <Text style={[styles.todayDur, { color: '#388e3c' }]}>{formatDuration(incomingDur)}</Text>
              <Text style={styles.todayLabel}>수신콜타임</Text>
            </View>
            <View style={[styles.todayStat, styles.todayStatBorder]}>
              <Text style={[styles.todayDur, { color: '#555' }]}>
                {formatDuration(parseInt(stats.total_duration) || 0)}
              </Text>
              <Text style={styles.todayLabel}>총콜타임</Text>
            </View>
          </View>
        </View>
      )}
      {tab === 'range' && stats && (
        <View style={styles.rangeCard}>
          <Text style={styles.rangeCardTitle}>기간 요약</Text>
          <View style={styles.rangeRow}>
            <View style={styles.rangeItem}>
              <Text style={styles.rangeValue}>{calls.length}</Text>
              <Text style={styles.rangeLabel}>총 콜수</Text>
            </View>
            <View style={styles.rangeItem}>
              <Text style={styles.rangeValue}>{formatDuration(parseInt(stats.total_duration) || 0)}</Text>
              <Text style={styles.rangeLabel}>총 콜타임</Text>
            </View>
          </View>
          <View style={styles.rangeRow}>
            <View style={[styles.rangeTypeItem, { borderColor: '#1976d2' }]}>
              <Text style={[styles.rangeTypeCount, { color: '#1976d2' }]}>{outgoing.length}건</Text>
              <Text style={styles.rangeTypeLabel}>발신</Text>
              <Text style={styles.rangeTypeDur}>{formatDuration(outgoingDur)}</Text>
            </View>
            <View style={[styles.rangeTypeItem, { borderColor: '#388e3c' }]}>
              <Text style={[styles.rangeTypeCount, { color: '#388e3c' }]}>{incoming.length}건</Text>
              <Text style={styles.rangeTypeLabel}>수신</Text>
              <Text style={styles.rangeTypeDur}>{formatDuration(incomingDur)}</Text>
            </View>
            <View style={[styles.rangeTypeItem, { borderColor: '#e53935' }]}>
              <Text style={[styles.rangeTypeCount, { color: '#e53935' }]}>{missed.length}건</Text>
              <Text style={styles.rangeTypeLabel}>부재중</Text>
              <Text style={styles.rangeTypeDur}> </Text>
            </View>
          </View>
        </View>
      )}
    </>
  );

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

      {tab === 'range' && (
        <View style={styles.dateRow}>
          <TextInput
            style={styles.dateInput}
            value={start}
            onChangeText={setStart}
            placeholder="YYYY-MM-DD"
            keyboardType="numeric"
          />
          <Text style={styles.dateSep}>~</Text>
          <TextInput
            style={styles.dateInput}
            value={end}
            onChangeText={setEnd}
            placeholder="YYYY-MM-DD"
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={() => fetchData(start, end)}>
            <Text style={styles.searchBtnText}>조회</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} color="#1976d2" />
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={ListHeader}
          renderItem={({ item }) => {
            const color = CALL_COLORS[item.call_type] || '#888';
            return (
              <View style={styles.callItem}>
                <View style={[styles.callTypeBar, { backgroundColor: color }]} />
                <View style={styles.callContent}>
                  <Text style={styles.phone}>{item.phone_number}</Text>
                  <Text style={styles.callMeta}>
                    {item.call_date} · {formatDuration(item.duration)}
                    {'  '}
                    <Text style={{ color, fontWeight: 'bold' }}>
                      {CALL_LABELS[item.call_type] || item.call_type}
                    </Text>
                  </Text>
                </View>
              </View>
            );
          }}
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
  dateRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  dateInput: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, backgroundColor: '#fafafa',
  },
  dateSep: { fontSize: 16, color: '#aaa' },
  searchBtn: { backgroundColor: '#1976d2', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  searchBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  todayCard: {
    backgroundColor: '#fff', margin: 16, borderRadius: 12, elevation: 2, overflow: 'hidden',
  },
  todayCardTitle: {
    fontSize: 13, fontWeight: 'bold', color: '#888', padding: 14, paddingBottom: 10,
  },
  todayRow: { flexDirection: 'row' },
  todayRowBorder: { borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  todayStat: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  todayStatBorder: { borderLeftWidth: 1, borderLeftColor: '#f0f0f0' },
  todayCount: { fontSize: 26, fontWeight: 'bold' },
  todayDur: { fontSize: 13, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  todayLabel: { fontSize: 11, color: '#999', marginTop: 4 },
  rangeCard: { backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 16, elevation: 2 },
  rangeCardTitle: { fontSize: 13, fontWeight: 'bold', color: '#888', marginBottom: 12 },
  rangeRow: { flexDirection: 'row', marginBottom: 10, gap: 8 },
  rangeItem: {
    flex: 1, alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12,
  },
  rangeValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  rangeLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  rangeTypeItem: { flex: 1, alignItems: 'center', borderWidth: 1.5, borderRadius: 8, padding: 10 },
  rangeTypeCount: { fontSize: 16, fontWeight: 'bold' },
  rangeTypeLabel: { fontSize: 11, color: '#666', marginTop: 2 },
  rangeTypeDur: { fontSize: 11, color: '#999', marginTop: 2 },
  callItem: {
    flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 8, overflow: 'hidden', elevation: 1,
  },
  callTypeBar: { width: 4 },
  callContent: { flex: 1, padding: 14 },
  phone: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  callMeta: { fontSize: 12, color: '#888', marginTop: 4 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
});
