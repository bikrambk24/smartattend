import React, { useEffect, useState } from 'react';
import { View, Text, SectionList, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import EmptyState from '../components/EmptyState';
import { COLORS } from '../theme';

interface HistoryItem {
  id: string;
  eventType: 'checkin' | 'checkout';
  timestamp: string;
  verificationOutcome: 'verified' | 'partial' | 'unverified';
  flagged: boolean;
  teacherReviewed: boolean;
  teacherDecision: string | null;
  schedule: { roomName: string; class: { name: string } };
}

interface Section {
  title: string;
  data: HistoryItem[];
}

const OUTCOME_COLOR: Record<string, string> = {
  verified: '#16a34a',
  partial: '#d97706',
  unverified: '#dc2626',
};

function groupByClass(history: HistoryItem[]): Section[] {
  const map = new Map<string, HistoryItem[]>();
  for (const item of history) {
    const key = item.schedule.class.name;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries())
    .map(([title, data]) => ({ title, data }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export default function AttendanceHistoryScreen() {
  const { token } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await api.get<HistoryItem[]>('/api/attendance/history', token);
      if (res.success && res.data) setHistory(res.data);
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  const sections = groupByClass(history);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      stickySectionHeadersEnabled
      ListEmptyComponent={
        <EmptyState
          title="No attendance records yet"
          description="Once you check in to a class, your history will show up here."
        />
      }
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionHeader}>{section.title}</Text>
      )}
      renderItem={({ item }) => {
        const hasOverride = item.eventType === 'checkin' && item.teacherReviewed && item.teacherDecision;

        return (
          <View style={styles.card}>
            <Text style={styles.cardSub}>
              {item.eventType === 'checkin' ? 'Check in' : 'Check out'} · {item.schedule.roomName}
            </Text>
            <Text style={styles.cardSub}>{new Date(item.timestamp).toLocaleString()}</Text>
            {hasOverride && (
              <Text style={styles.systemCheck}>System check: {item.verificationOutcome}</Text>
            )}
            <View style={styles.row}>
              {item.eventType === 'checkin' ? (
                hasOverride ? (
                  <Text
                    style={[
                      styles.badge,
                      { color: item.teacherDecision === 'present' ? '#16a34a' : '#dc2626' },
                    ]}
                  >
                    {item.teacherDecision === 'present' ? 'PRESENT' : 'ABSENT'}
                  </Text>
                ) : (
                  <Text style={[styles.badge, { color: OUTCOME_COLOR[item.verificationOutcome] }]}>
                    {item.verificationOutcome.toUpperCase()}
                  </Text>
                )
              ) : (
                <Text style={[styles.badge, { color: '#64748b' }]}>RECORDED</Text>
              )}
              {item.flagged && <Text style={styles.flagged}>FLAGGED</Text>}
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, flexGrow: 1 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 14, marginBottom: 10, marginTop: 6 },
  cardSub: { color: '#555', marginTop: 2 },
  systemCheck: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, marginTop: 6 },
  badge: { fontWeight: '700', fontSize: 12 },
  flagged: { color: '#dc2626', fontWeight: '700', fontSize: 12 },
});