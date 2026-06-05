import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, View, ActivityIndicator, Alert, PermissionsAndroid } from 'react-native';
import { getAll as getCallLogs } from './modules/CallLogModule';

import LoginScreen from './src/screens/LoginScreen';
import MainScreen from './src/screens/MainScreen';
import EmployeeScreen from './src/screens/EmployeeScreen';
import AdminScreen from './src/screens/AdminScreen';
import api from './src/api';

const Tab = createBottomTabNavigator();

const syncCallLog = async () => {
  try {
    Alert.alert('동기화 시작', '권한 요청 중...');

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      {
        title: '통화기록 권한',
        message: '통화기록을 동기화하려면 권한이 필요합니다.',
        buttonPositive: '허용',
        buttonNegative: '거부',
      }
    );

    Alert.alert('권한 결과', String(granted));

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert('권한 거부', '통화기록 권한이 거부되었습니다.');
      return;
    }

    Alert.alert('통화기록 요청 중', 'ContentResolver 쿼리 시작...');

    const logs = await getCallLogs();

    Alert.alert('로그 수', String(logs ? logs.length : 'null'));

    if (!logs || logs.length === 0) {
      console.log('Call log sync: no logs found');
      return;
    }

    const calls = logs.map((log) => ({
      phone_number: log.phoneNumber || '',
      call_date: new Date(parseInt(log.timestamp)).toISOString(),
      duration: parseInt(log.duration) || 0,
      call_type: log.type || 'UNKNOWN',
    }));

    const CHUNK_SIZE = 100;
    let totalInserted = 0;
    for (let i = 0; i < calls.length; i += CHUNK_SIZE) {
      const chunk = calls.slice(i, i + CHUNK_SIZE);
      const res = await api.post('/api/calls/sync', { calls: chunk });
      totalInserted += res.data.inserted || 0;
    }
    Alert.alert('동기화 완료', `${logs.length}개 가져옴, ${totalInserted}개 저장됨`);
    console.log(`Call log sync success: ${logs.length} fetched, ${totalInserted} inserted`);
  } catch (err) {
    Alert.alert('동기화 오류', err.message || String(err));
    console.log('Call log sync error:', err.message);
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const stored = await AsyncStorage.getItem('user');
      if (stored) {
        setUser(JSON.parse(stored));
        await syncCallLog();
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleLogin = async (userData) => {
    setUser(userData);
    Alert.alert('로그인 완료, 동기화 시작');
    await syncCallLog();
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    setUser(null);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerRight: () => (
            <Text onPress={handleLogout} style={{ marginRight: 16, color: '#1976d2', fontSize: 14 }}>
              로그아웃
            </Text>
          ),
        }}
      >
        <Tab.Screen
          name="Main"
          component={MainScreen}
          options={{ title: '랭킹', tabBarLabel: '랭킹' }}
        />
        <Tab.Screen
          name="Employee"
          component={EmployeeScreen}
          options={{ title: '내 콜타임', tabBarLabel: '내 콜타임' }}
        />
        {user.role === 'admin' && (
          <Tab.Screen
            name="Admin"
            component={AdminScreen}
            options={{ title: '관리자', tabBarLabel: '관리자' }}
          />
        )}
      </Tab.Navigator>
    </NavigationContainer>
  );
}
