import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { requestLocationPermission } from '../services/gps';
import { scanWifi, WifiReading } from '../services/wifi';
import EmptyState from '../components/EmptyState';
import { COLORS } from '../theme';

interface ScheduleItem {
  id: string;
  roomName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export default function AdminFingerprintScreen() {
  const { token, logout } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scans, setScans] = useState<WifiReading[][]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await api.get<ScheduleItem[]>('/api/schedules', token);
      if (res.success && res.data) setSchedules(res.data);
      setLoading(false);
    })();
  }, [token]);

  async function captureScanPoint() {
    setBusy(true);
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('Permission required', 'Location permission is needed to scan Wi-Fi.');
        return;
      }
      const reading = await scanWifi();
      if (reading.length === 0) {
        Alert.alert('No networks found', 'Try again — make sure Wi-Fi is enabled.');
        return;
      }
      setScans((prev) => [...prev, reading]);
    } catch (err: any) {
      Alert.alert('Scan failed', err.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function saveFingerprint() {
    if (!selectedId) {
      Alert.alert('Select a schedule first');
      return;
    }
    if (scans.length < 2) {
      Alert.alert('At least 2 scan points are required');
      return;
    }
    setBusy(true);
    const res = await api.post(`/api/schedules/${selectedId}/fingerprint`, { scans }, token);
    setBusy(false);
    if (res.success) {
      Alert.alert('Fingerprint saved', `Anchor BSSID: ${(res.data as any)?.anchorBssid}`);
      setScans([]);
    } else {
      Alert.alert('Save failed', res.error ?? 'Unknown error');
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (schedules.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          title="No schedules to capture yet"
          description="Create a class and schedule from the web dashboard first. Once a schedule exists, it will appear here for Wi-Fi fingerprint capture."
        />
        <Pressable onPress={logout} style={styles.logout}>
          <Text style={{ color: COLORS.teal }}>Log out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select a room or schedule:</Text>
      <FlatList
        data={schedules}
        keyExtractor={(item) => item.id}
        horizontal={false}
        style={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.scheduleItem, selectedId === item.id && styles.scheduleItemSelected]}
            onPress={() => setSelectedId(item.id)}
          >
            <Text>{item.roomName} — {item.startTime}–{item.endTime}</Text>
          </Pressable>
        )}
      />

      {!selectedId ? (
        <EmptyState title="Pick a room above" description="Select which room's Wi-Fi you want to capture." />
      ) : (
        <Text style={styles.label}>Scan points captured: {scans.length}</Text>
      )}

      <Pressable style={styles.button} onPress={captureScanPoint} disabled={busy || !selectedId}>
        <Text style={styles.buttonText}>{busy ? '...' : 'Capture scan point'}</Text>
      </Pressable>

      <Pressable style={[styles.button, styles.buttonSecondary]} onPress={saveFingerprint} disabled={busy}>
        <Text style={styles.buttonText}>Save fingerprint</Text>
      </Pressable>

      <Pressable onPress={logout} style={styles.logout}>
        <Text style={{ color: COLORS.teal }}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontWeight: '600', marginTop: 12, marginBottom: 6, color: COLORS.ink },
  list: { maxHeight: 200 },
  scheduleItem: { padding: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginBottom: 6 },
  scheduleItemSelected: { borderColor: COLORS.teal, backgroundColor: '#EAFBFA' },
  button: { backgroundColor: COLORS.teal, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12 },
  buttonSecondary: { backgroundColor: COLORS.ink },
  buttonText: { color: '#fff', fontWeight: '600' },
  logout: { marginTop: 24, alignItems: 'center' },
});