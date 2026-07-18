import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import PingMark from '../components/PingMark';
import { COLORS } from '../theme';

interface ScheduleItem {
  id: string;
  className: string;
  academicYear: string | null;
}

export default function ProfileScreen() {
  const { name, email, studentId, logout, token } = useAuth();
  const [modules, setModules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await api.get<ScheduleItem[]>('/api/attendance/my-schedules', token);
      if (res.success && res.data) setModules(res.data);
      setLoading(false);
    })();
  }, [token]);

  const years = Array.from(
    new Set(modules.map((m) => m.academicYear).filter((y): y is string => Boolean(y))),
  );
  const moduleNames = Array.from(new Set(modules.map((m) => m.className)));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <PingMark size={48} color={COLORS.teal} />
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      <View style={styles.card}>
        <Row label="Student ID" value={studentId || 'Not set'} />
        <Row label="Academic year(s)" value={years.length > 0 ? years.join(', ') : 'Not available'} last />
      </View>

      <Text style={styles.sectionLabel}>Enrolled modules</Text>
      {loading ? (
        <ActivityIndicator />
      ) : moduleNames.length === 0 ? (
        <Text style={styles.empty}>No modules yet.</Text>
      ) : (
        <View style={styles.card}>
          {moduleNames.map((className, i) => (
            <Text
              key={className}
              style={[styles.moduleRow, i === moduleNames.length - 1 && styles.noBorder]}
            >
              {className}
            </Text>
          ))}
        </View>
      )}

      <Pressable onPress={logout} style={styles.logout}>
        <Text style={{ color: COLORS.teal }}>Log out</Text>
      </Pressable>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, last && styles.noBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 48 },
  header: { alignItems: 'center', marginBottom: 24 },
  name: { fontSize: 20, fontWeight: '700', color: COLORS.ink, marginTop: 10 },
  email: { fontSize: 13, color: '#64748b', marginTop: 2 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  rowLabel: { color: '#64748b', fontSize: 13 },
  rowValue: { color: COLORS.ink, fontSize: 13, fontWeight: '600' },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  moduleRow: {
    padding: 14,
    fontSize: 14,
    color: COLORS.ink,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  noBorder: { borderBottomWidth: 0 },
  empty: { color: '#94a3b8', fontSize: 13, marginBottom: 20 },
  logout: { alignItems: 'center', marginTop: 12 },
});