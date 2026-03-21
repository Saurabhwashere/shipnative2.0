import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { METRICS } from './metric-data.js';

export default function App() {
  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Overview</Text>
        <Text style={styles.title}>Performance</Text>
        <View style={styles.heroCard}>
          <Text style={styles.heroValue}>84%</Text>
          <Text style={styles.heroLabel}>Goal completion this week</Text>
        </View>
        <View style={styles.grid}>
          {METRICS.map((metric) => (
            <View key={metric.label} style={styles.card}>
              <Text style={styles.cardValue}>{metric.value}</Text>
              <Text style={styles.cardLabel}>{metric.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b0d14' },
  scroll: { flex: 1 },
  content: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  eyebrow: { fontSize: 13, color: '#788099', fontWeight: '600' },
  title: { fontSize: 34, lineHeight: 40, letterSpacing: -1, fontWeight: '800', color: '#f4f7ff' },
  heroCard: { backgroundColor: '#151925', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  heroValue: { fontSize: 42, lineHeight: 48, fontWeight: '800', color: '#71e0b5' },
  heroLabel: { fontSize: 15, lineHeight: 22, color: '#98a0bb', marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47%', backgroundColor: '#151925', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  cardValue: { fontSize: 24, lineHeight: 30, fontWeight: '700', color: '#f4f7ff', marginBottom: 4 },
  cardLabel: { fontSize: 13, lineHeight: 20, color: '#98a0bb' },
});
