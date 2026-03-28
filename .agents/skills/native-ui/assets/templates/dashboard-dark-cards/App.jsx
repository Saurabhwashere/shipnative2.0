import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { METRICS } from './metric-data.js';

const COLORS = {
  bg: '#0b0d12',
  surface: '#141821',
  surfaceSoft: '#191f29',
  surfaceBorder: 'rgba(255,255,255,0.08)',
  textPrimary: '#f5f7fb',
  textSecondary: '#95a0b5',
  textMuted: '#667189',
  primary: '#62d7aa',
  primarySoft: 'rgba(98,215,170,0.12)',
  alt: '#7cb7ff',
};

const FILTERS = ['Today', '7 days', '30 days'];
const INSIGHTS = [
  { label: 'Revenue pulse', value: '+18.4%', tone: 'primary' },
  { label: 'New trials', value: '412', tone: 'alt' },
  { label: 'Churn risk', value: '2.1%', tone: 'neutral' },
];

export default function App() {
  const [activeFilter, setActiveFilter] = useState('7 days');

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.navRow}>
          <View>
            <Text style={styles.navLabel}>Growth monitor</Text>
            <Text style={styles.navTitle}>Performance</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.navAction, pressed && styles.pressed]}>
            <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((filter) => {
            const isActive = filter === activeFilter;
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={({ pressed }) => [
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{filter}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroEyebrow}>Revenue pulse</Text>
            <View style={styles.heroTrend}>
              <Ionicons name="trending-up" size={14} color={COLORS.primary} />
              <Text style={styles.heroTrendText}>Up 12.6%</Text>
            </View>
          </View>
          <Text style={styles.heroValue}>$128.4k</Text>
          <Text style={styles.heroBody}>Strong conversion and repeat sessions are carrying this week.</Text>
        </View>

        <View style={styles.insightRow}>
          {INSIGHTS.map((insight) => (
            <View key={insight.label} style={styles.insightCard}>
              <Text
                style={[
                  styles.insightValue,
                  insight.tone === 'primary' && styles.insightValuePrimary,
                  insight.tone === 'alt' && styles.insightValueAlt,
                ]}
              >
                {insight.value}
              </Text>
              <Text style={styles.insightLabel}>{insight.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Core metrics</Text>
          <Text style={styles.sectionMeta}>Live snapshot</Text>
        </View>

        <View style={styles.grid}>
          {METRICS.map((metric, index) => (
            <View key={metric.label} style={[styles.card, index === 0 && styles.cardWide]}>
              <Text style={[styles.cardValue, index === 0 && styles.cardValuePrimary]}>{metric.value}</Text>
              <Text style={styles.cardLabel}>{metric.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent movement</Text>
          <Text style={styles.sectionMeta}>Updated 4m ago</Text>
        </View>

        <View style={styles.timeline}>
          {[
            ['09:20', 'Campaign launch crossed target CTR'],
            ['11:45', 'Retention held above 70% in the latest cohort'],
            ['14:10', 'Session duration grew after the onboarding refresh'],
          ].map(([time, label], index) => (
            <View key={time} style={styles.timelineRow}>
              <View style={styles.timelineRail}>
                <View style={styles.timelineDot} />
                {index < 2 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineCard}>
                <Text style={styles.timelineTime}>{time}</Text>
                <Text style={styles.timelineLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { paddingTop: 30, paddingHorizontal: 20, paddingBottom: 40, gap: 22 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  navLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  navTitle: { fontSize: 17, lineHeight: 22, fontWeight: '700', color: COLORS.textPrimary },
  navAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: COLORS.primarySoft, borderColor: 'rgba(98,215,170,0.25)' },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.primary },
  heroCard: {
    borderRadius: 28,
    padding: 22,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: 10,
  },
  heroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroEyebrow: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  heroTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(98,215,170,0.08)',
  },
  heroTrendText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  heroValue: { fontSize: 52, lineHeight: 56, fontWeight: '800', color: COLORS.primary, letterSpacing: -1.8 },
  heroBody: { fontSize: 15, lineHeight: 22, color: COLORS.textSecondary, maxWidth: 240 },
  insightRow: { flexDirection: 'row', gap: 12 },
  insightCard: {
    flex: 1,
    minHeight: 92,
    borderRadius: 22,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    justifyContent: 'flex-end',
  },
  insightValue: { fontSize: 22, lineHeight: 26, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  insightValuePrimary: { color: COLORS.primary },
  insightValueAlt: { color: COLORS.alt },
  insightLabel: { fontSize: 13, lineHeight: 18, color: COLORS.textSecondary },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 20, lineHeight: 24, fontWeight: '700', color: COLORS.textPrimary },
  sectionMeta: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%',
    borderRadius: 24,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  cardWide: { width: '100%' },
  cardValue: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  cardValuePrimary: { color: COLORS.primary },
  cardLabel: { fontSize: 13, lineHeight: 18, color: COLORS.textSecondary },
  timeline: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: 0,
  },
  timelineRow: { flexDirection: 'row', gap: 14 },
  timelineRail: { width: 18, alignItems: 'center', paddingTop: 8 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, zIndex: 1 },
  timelineLine: { width: 1, flex: 1, backgroundColor: COLORS.surfaceBorder, marginTop: 4 },
  timelineCard: { flex: 1, paddingBottom: 18 },
  timelineTime: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, marginBottom: 6 },
  timelineLabel: { fontSize: 15, lineHeight: 21, color: COLORS.textPrimary },
  pressed: { opacity: 0.86 },
});
