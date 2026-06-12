import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  ActivityIndicator, Image,
} from 'react-native';
import api from '../api';

const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}시간 ${m}분 ${s}초`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
};

export default function MainScreen() {
  const [ranking, setRanking] = useState([]);
  const [prize, setPrize] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [rankRes, prizeRes] = await Promise.all([
        api.get('/api/calls/ranking'),
        api.get('/api/prize'),
      ]);
      setRanking(rankRes.data);
      setPrize(prizeRes.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const now = new Date();
  const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#1976d2" />;

  return (
    <FlatList
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={() => (
        <View>
          {prize && (
            <View style={styles.prizeCard}>
              <Text style={styles.prizeLabel}>🎁 이달의 상품 ({monthLabel})</Text>
              <Text style={styles.prizeTitle}>{prize.title}</Text>
              {prize.description ? <Text style={styles.prizeDesc}>{prize.description}</Text> : null}
              {prize.image_url ? (
                <Image source={{ uri: prize.image_url }} style={styles.prizeImage} resizeMode="contain" />
              ) : null}
            </View>
          )}
          <Text style={styles.rankingTitle}>{monthLabel} 콜타임 랭킹</Text>
        </View>
      )}
      data={ranking}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item, index }) => (
        <View style={[styles.rankItem, index === 0 && styles.first, index === 1 && styles.second, index === 2 && styles.third]}>
          <Text style={styles.rank}>
            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}위`}
          </Text>
          <View style={styles.rankInfo}>
            <Text style={styles.rankName}>{item.name}</Text>
            <Text style={styles.rankDetail}>
              콜수 {item.call_count}건 · {formatDuration(parseInt(item.total_duration))}
            </Text>
          </View>
        </View>
      )}
      ListEmptyComponent={() => (
        <Text style={styles.empty}>아직 통화 기록이 없습니다.</Text>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  prizeCard: {
    margin: 16, backgroundColor: '#fff', borderRadius: 12, padding: 16,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4,
  },
  prizeLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  prizeTitle: { fontSize: 20, fontWeight: 'bold', color: '#e53935' },
  prizeDesc: { marginTop: 6, color: '#555', fontSize: 14 },
  prizeImage: { width: '100%', height: 160, marginTop: 12, borderRadius: 8 },
  rankingTitle: { fontSize: 18, fontWeight: 'bold', margin: 16, marginBottom: 8, color: '#333' },
  rankItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 10, padding: 14, elevation: 1,
  },
  first: { borderLeftWidth: 4, borderLeftColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.08)' },
  second: { borderLeftWidth: 4, borderLeftColor: '#C0C0C0', backgroundColor: 'rgba(192,192,192,0.1)' },
  third: { borderLeftWidth: 4, borderLeftColor: '#CD7F32', backgroundColor: 'rgba(205,127,50,0.08)' },
  rank: { fontSize: 22, marginRight: 12, minWidth: 40, textAlign: 'center' },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  rankDetail: { fontSize: 13, color: '#666', marginTop: 2 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
});
