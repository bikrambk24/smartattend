import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { requestLocationPermission, getCurrentLocation } from '../services/gps';
import { scanWifi } from '../services/wifi';
import EmptyState from '../components/EmptyState';
import { COLORS } from '../theme';

interface ScheduleItem {
  id: string;
  className: string;
  roomName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  sessionOpen: boolean;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const RESULT_STYLE: Record<string, { bg: string; text: string }> = {
  verified: { bg: '#dcfce7', text: '#15803d' },
  partial: { bg: '#fef3c7', text: '#b45309' },
  unverified: { bg: '#fee2e2', text: '#b91c1c' },
  flagged: { bg: '#fef3c7', text: '#b45309' },
  recorded: { bg: '#f1f5f9', text: '#475569' },
  rejected: { bg: '#fee2e2', text: '#b91c1c' },
};

export default function StudentHomeScreen() {
  const { name, token } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { label: string; key: string }>>({});

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    const res = await api.get<ScheduleItem[]>('/api/attendance/my-schedules', token);
    if (res.success && res.data) {
      setSchedules(res.data);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const today = new Date().getDay();
  const todaysSchedules = schedules.filter((s) => s.dayOfWeek === today);

  async function handleCheckIn(scheduleId: string) {
    setActionLoadingId(scheduleId);
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('Permission required', 'Location permission is needed to check in.');
        return;
      }

      const location = await getCurrentLocation();

      let wifiReadings: { bssid: string; rssi: number }[] = [];
      try {
        wifiReadings = await scanWifi();
      } catch {
        wifiReadings = [];
      }

      const res = await api.post(
        '/api/attendance/checkin',
        {
          scheduleId,
          studentLat: location.latitude,
          studentLng: location.longitude,
          gpsAccuracyMetres: location.accuracy,
          studentScan: wifiReadings,
          deviceId: 'dev-emulator-device-1',
        },
        token,
      );

      if (res.success) {
        const outcome = (res.data as any)?.verificationOutcome ?? 'unverified';
        Alert.alert('Checked in', `Outcome: ${outcome}`);
        setResults((prev) => ({ ...prev, [scheduleId]: { label: outcome, key: outcome } }));
      } else {
        Alert.alert('Check-in failed', res.error ?? 'Unknown error');
        setResults((prev) => ({
          ...prev,
          [scheduleId]: { label: res.error ?? 'Check-in failed', key: 'rejected' },
        }));
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Something went wrong getting your location.');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCheckOut(scheduleId: string) {
    setActionLoadingId(scheduleId);
    const res = await api.post('/api/attendance/checkout', { scheduleId }, token);
    if (res.success) {
      const flagged = (res.data as any)?.flagged;
      Alert.alert('Checked out', flagged ? 'Flagged for review' : 'Recorded');
      setResults((prev) => ({
        ...prev,
        [scheduleId]: flagged
          ? { label: 'Flagged for review', key: 'flagged' }
          : { label: 'Recorded', key: 'recorded' },
      }));
    } else {
      Alert.alert('Check-out failed', res.error ?? 'Unknown error');
      setResults((prev) => ({
        ...prev,
        [scheduleId]: { label: res.error ?? 'Check-out failed', key: 'rejected' },
      }));
    }
    setActionLoadingId(null);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {name}</Text>
      <Text style={styles.subtitle}>Today · {DAY_NAMES[today]}</Text>

      <FlatList
        data={todaysSchedules}
        keyExtractor={(item) => item.id}
        extraData={results}
        onRefresh={loadSchedules}
        refreshing={loading}
        contentContainerStyle={{ flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            title="No classes today"
            description="You don't have any modules scheduled for today."
          />
        }
        renderItem={({ item }) => {
          const result = results[item.id];
          const resultStyle = result ? RESULT_STYLE[result.key] ?? RESULT_STYLE.recorded : null;

          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.className}</Text>
              <Text style={styles.cardSub}>
                {item.startTime}–{item.endTime} · {item.roomName}
              </Text>
              <Text style={styles.cardSub}>Session: {item.sessionOpen ? 'Open' : 'Closed'}</Text>

              <View style={styles.row}>
                <Pressable
                  style={[styles.button, !item.sessionOpen && styles.buttonDisabled]}
                  disabled={!item.sessionOpen || actionLoadingId === item.id}
                  onPress={() => handleCheckIn(item.id)}
                >
                  <Text style={styles.buttonText}>
                    {actionLoadingId === item.id ? '...' : 'Check in'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.buttonSecondary, !item.sessionOpen && styles.buttonDisabled]}
                  disabled={!item.sessionOpen || actionLoadingId === item.id}
                  onPress={() => handleCheckOut(item.id)}
                >
                  <Text style={styles.buttonText}>
                    {actionLoadingId === item.id ? '...' : 'Check out'}
                  </Text>
                </Pressable>
              </View>

              {result && resultStyle && (
                <View style={[styles.resultBox, { backgroundColor: resultStyle.bg }]}>
                  <Text style={[styles.resultText, { color: resultStyle.text }]}>
                    {result.label.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.ink },
  subtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 16, marginTop: 2 },
  card: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.ink },
  cardSub: { color: '#555', marginTop: 2 },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  button: {
    backgroundColor: COLORS.teal,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flex: 1,
    alignItems: 'center',
  },
  buttonSecondary: { backgroundColor: COLORS.ink },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontWeight: '600' },
  resultBox: {
    marginTop: 10,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  resultText: { fontWeight: '700', fontSize: 12, letterSpacing: 0.5, textAlign: 'center' },
});