import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import api from '../api';

const today = () => new Date().toISOString().split('T')[0];
const formatDuration = (seconds) => {
  const s = parseInt(seconds) || 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분`;
  return `${s}초`;
};

const CALL_COLORS = { OUTGOING: '#1976d2', INCOMING: '#388e3c', MISSED: '#e53935', REJECTED: '#e53935' };
const CALL_LABELS = { OUTGOING: '발신', INCOMING: '수신', MISSED: '부재중', REJECTED: '거절' };

function StatCard({ label, count, color }) {
  return (
    <View style={[detailStyles.statCard, { borderTopColor: color }]}>
      <Text style={[detailStyles.statCount, { color }]}>{parseInt(count) || 0}건</Text>
      <Text style={detailStyles.statLabel}>{label}</Text>
    </View>
  );
}

export default function AdminScreen() {
  const [tab, setTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [userCalls, setUserCalls] = useState([]);
  const [selectedUserStats, setSelectedUserStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', name: '' });
  const [prize, setPrize] = useState({ title: '', description: '', image_url: '' });
  const [overviewData, setOverviewData] = useState([]);
  const [dailyDate, setDailyDate] = useState(today());

  const fetchDailyOverview = useCallback(async (date) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/calls/admin-daily-all?date=${date}`);
      setOverviewData(res.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchDailyOverview(dailyDate); }, [fetchDailyOverview, dailyDate]);

  const changeDate = (delta) => {
    const parts = dailyDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + delta);
    const newDate = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
    if (newDate <= today()) setDailyDate(newDate);
  };

  const fetchUserDetail = async (user, date) => {
    setSelectedUser(user);
    setSelectedDate(date);
    setSelectedUserStats(null);
    setUserCalls([]);
    setLoading(true);
    try {
      const [callsRes, statsRes] = await Promise.all([
        api.get(`/api/calls/admin?userId=${user.id}&start=${date}&end=${date}`),
        api.get(`/api/calls/admin-daily?userId=${user.id}&date=${date}`),
      ]);
      setUserCalls(callsRes.data);
      setSelectedUserStats(statsRes.data);
    } catch {}
    setLoading(false);
    setTab('detail');
  };

  const addUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.name) {
      Alert.alert('오류', '모든 필드를 입력하세요.');
      return;
    }
    try {
      await api.post('/api/users', newUser);
      Alert.alert('완료', '직원이 추가되었습니다.');
      setShowAddModal(false);
      setNewUser({ username: '', password: '', name: '' });
      fetchDailyOverview(dailyDate);
    } catch (err) {
      Alert.alert('오류', err.response?.data?.error || '추가 실패');
    }
  };

  const deleteUser = (user) => {
    Alert.alert('직원 삭제', `${user.name} 직원을 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/users/${user.id}`);
            fetchDailyOverview(dailyDate);
          } catch (err) {
            Alert.alert('오류', err.response?.data?.error || '삭제 실패');
          }
        },
      },
    ]);
  };

  const savePrize = async () => {
    try {
      await api.put('/api/prize', prize);
      Alert.alert('완료', '이달의 상품이 등록되었습니다.');
      setShowPrizeModal(false);
    } catch {
      Alert.alert('오류', '저장 실패');
    }
  };

  const loadPrize = async () => {
    try {
      const res = await api.get('/api/prize');
      if (res.data) setPrize({ title: res.data.title, description: res.data.description || '', image_url: res.data.image_url || '' });
    } catch {}
    setShowPrizeModal(true);
  };

  const onRefresh = () => { setRefreshing(true); fetchDailyOverview(dailyDate); };

  const DetailHeader = () => {
    if (!selectedUserStats) return null;
    const totalSec = parseInt(selectedUserStats.total_duration) || 0;
    const achieved = totalSec >= 7200;
    return (
      <View style={styles.detailCardWrap}>
        <Text style={styles.detailCardTitle}>{selectedUser?.name} · {selectedDate}</Text>
        <Text style={[styles.detailTotalDur, { color: achieved ? '#388e3c' : '#e53935' }]}>
          총 {formatDuration(totalSec)}  {achieved ? '✓ 목표달성' : '✗ 미달'}
        </Text>
        <View style={styles.detailRow}>
          <StatCard label="발신" count={selectedUserStats.outgoing_count} color="#1976d2" />
          <StatCard label="수신" count={selectedUserStats.incoming_count} color="#388e3c" />
          <StatCard label="부재중" count={selectedUserStats.missed_count} color="#e53935" />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {['overview', 'detail'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.activeTab]}
            onPress={() => t === 'overview' && setTab('overview')}
          >
            <Text style={[styles.tabText, tab === t && styles.activeTabText]}>
              {t === 'overview' ? '전직원 현황' : selectedUser ? selectedUser.name : '상세'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'overview' ? (
        <>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setShowAddModal(true)}>
              <Text style={styles.actionBtnText}>+ 직원 추가</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.prizeBtn]} onPress={loadPrize}>
              <Text style={styles.actionBtnText}>🎁 이달 상품</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.datePicker}>
            <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateNavBtn}>
              <Text style={styles.dateNavText}>◀</Text>
            </TouchableOpacity>
            <Text style={styles.dateDisplay}>{dailyDate}</Text>
            <TouchableOpacity
              onPress={() => changeDate(1)}
              style={styles.dateNavBtn}
              disabled={dailyDate >= today()}
            >
              <Text style={[styles.dateNavText, dailyDate >= today() && styles.dateNavDisabled]}>▶</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator style={{ marginTop: 30 }} color="#1976d2" />
          ) : (
            <FlatList
              data={overviewData}
              keyExtractor={(item) => String(item.id)}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              renderItem={({ item }) => {
                const totalSec = parseInt(item.total_duration) || 0;
                const achieved = totalSec >= 7200;
                return (
                  <TouchableOpacity style={styles.userItem} onPress={() => fetchUserDetail(item, dailyDate)}>
                    <View style={[styles.achieveBadge, { backgroundColor: achieved ? '#e8f5e9' : '#ffebee' }]}>
                      <Text style={[styles.achieveText, { color: achieved ? '#388e3c' : '#e53935' }]}>
                        {achieved ? '달성' : '미달'}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.name}</Text>
                      <Text style={[styles.userStat, { color: achieved ? '#388e3c' : '#e53935' }]}>
                        {formatDuration(totalSec)}
                      </Text>
                      <Text style={styles.userStatSmall}>
                        발신 {parseInt(item.outgoing_count)||0} · 수신 {parseInt(item.incoming_count)||0} · 부재중 {parseInt(item.missed_count)||0}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteUser(item)} style={styles.deleteBtn}>
                      <Text style={styles.deleteBtnText}>삭제</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={() => <Text style={styles.empty}>직원이 없습니다.</Text>}
            />
          )}
        </>
      ) : (
        loading ? (
          <ActivityIndicator style={{ marginTop: 30 }} color="#1976d2" />
        ) : (
          <FlatList
            data={userCalls}
            keyExtractor={(item) => String(item.id)}
            ListHeaderComponent={DetailHeader}
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
            ListEmptyComponent={() => <Text style={styles.empty}>통화 기록이 없습니다.</Text>}
          />
        )
      )}

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>직원 추가</Text>
            {['name', 'username', 'password'].map((field) => (
              <TextInput
                key={field}
                style={styles.modalInput}
                placeholder={field === 'name' ? '이름' : field === 'username' ? '아이디' : '비밀번호'}
                value={newUser[field]}
                onChangeText={(v) => setNewUser((prev) => ({ ...prev, [field]: v }))}
                secureTextEntry={field === 'password'}
                autoCapitalize="none"
              />
            ))}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={addUser}>
                <Text style={styles.confirmBtnText}>추가</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPrizeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>이달의 상품 등록</Text>
            <TextInput style={styles.modalInput} placeholder="상품명" value={prize.title} onChangeText={(v) => setPrize((p) => ({ ...p, title: v }))} />
            <TextInput style={[styles.modalInput, { height: 80 }]} placeholder="설명" value={prize.description} onChangeText={(v) => setPrize((p) => ({ ...p, description: v }))} multiline />
            <TextInput style={styles.modalInput} placeholder="이미지 URL (선택)" value={prize.image_url} onChangeText={(v) => setPrize((p) => ({ ...p, image_url: v }))} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPrizeModal(false)}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={savePrize}>
                <Text style={styles.confirmBtnText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  statCard: {
    flex: 1, alignItems: 'center', backgroundColor: '#fafafa',
    borderRadius: 8, padding: 12, borderTopWidth: 3,
  },
  statCount: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 3 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', elevation: 1 },
  tab: { flex: 1, padding: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#1976d2' },
  tabText: { fontSize: 14, color: '#888' },
  activeTabText: { color: '#1976d2', fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', padding: 12, gap: 8 },
  actionBtn: { flex: 1, backgroundColor: '#1976d2', borderRadius: 8, padding: 10, alignItems: 'center' },
  prizeBtn: { backgroundColor: '#e53935' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  datePicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  dateNavBtn: { paddingHorizontal: 24, paddingVertical: 6 },
  dateNavText: { fontSize: 18, color: '#1976d2' },
  dateNavDisabled: { color: '#ccc' },
  dateDisplay: { fontSize: 16, fontWeight: 'bold', color: '#333', minWidth: 110, textAlign: 'center' },
  userItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 12, marginBottom: 8, borderRadius: 10, padding: 14, elevation: 1,
  },
  achieveBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  achieveText: { fontSize: 12, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  userStat: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  userStatSmall: { fontSize: 11, color: '#999', marginTop: 2 },
  deleteBtn: { backgroundColor: '#ffebee', borderRadius: 6, padding: 6 },
  deleteBtnText: { color: '#e53935', fontSize: 12, fontWeight: 'bold' },
  detailCardWrap: { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 16, elevation: 2 },
  detailCardTitle: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 6 },
  detailTotalDur: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  detailRow: { flexDirection: 'row', gap: 8 },
  callItem: {
    flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8,
    borderRadius: 8, overflow: 'hidden', elevation: 1,
  },
  callTypeBar: { width: 4 },
  callContent: { flex: 1, padding: 14 },
  phone: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  callMeta: { fontSize: 12, color: '#888', marginTop: 4 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#333' },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 15 },
  modalBtns: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, alignItems: 'center' },
  cancelBtnText: { color: '#666' },
  confirmBtn: { flex: 1, backgroundColor: '#1976d2', borderRadius: 8, padding: 12, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: 'bold' },
});
