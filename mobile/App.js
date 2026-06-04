import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, View, ActivityIndicator, Alert } from 'react-native';
import CallLogs from 'react-native-call-log';
import * as Updates from 'expo-updates';

import LoginScreen from './src/screens/LoginScreen';
import MainScreen from './src/screens/MainScreen';
import EmployeeScreen from './src/screens/EmployeeScreen';
import AdminScreen from './src/screens/AdminScreen';
import api from './src/api';

const Tab = createBottomTabNavigator();

const syncCallLog = async () => {
  try {
    Alert.alert('동기화 시작', 'CallLogs 모듈 로드 및 통화기록 요청 중...');
    const logs = await CallLogs.loadAll();
    Alert.alert('로그 수: ' + (logs ? logs.length : 'null'));
    if (!logs || logs.length === 0) {
      console.log('Call log sync: no logs found');
      return;
    }

    const calls = logs.map((log) => ({
      phone_number: log.phoneNumber || String(log.rawType),
      call_date: new Date(parseInt(log.timestamp)).toISOString(),
      duration: parseInt(log.duration) || 0,
      call_type: log.type || 'UNKNOWN',
    }));

    const res = await api.post('/api/calls/sync', { calls });
    console.log(`Call log sync success: ${logs.length} fetched, ${res.data.inserted} inserted`);
  } catch (err) {
    Alert.alert('동기화 오류', err.message || String(err));
    console.log('Call log sync error:', err.message);
  }
};

const checkForUpdates = async () => {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch {}
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await checkForUpdates();
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
