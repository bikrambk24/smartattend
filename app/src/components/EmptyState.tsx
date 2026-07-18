import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PingMark from './PingMark';
import { COLORS } from '../theme';

interface EmptyStateProps {
  title: string;
  description?: string;
}

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={{ opacity: 0.6, marginBottom: 12 }}>
        <PingMark size={32} color={COLORS.teal} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  title: { fontSize: 15, fontWeight: '600', color: COLORS.slate500, marginBottom: 4, textAlign: 'center' },
  description: { fontSize: 13, color: COLORS.slate400, textAlign: 'center' },
});