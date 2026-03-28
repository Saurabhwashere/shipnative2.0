import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { TASK_GROUPS } from './task-data.js';

const COLORS = {
  bg: '#f4f1ea',
  surface: '#ffffff',
  surfaceSoft: '#f8f5ef',
  surfaceBorder: 'rgba(30, 24, 17, 0.08)',
  textPrimary: '#1b1712',
  textSecondary: '#786d62',
  textMuted: '#a79c91',
  primary: '#5f5ce6',
  primarySoft: 'rgba(95, 92, 230, 0.12)',
  chip: '#efe8dc',
};

const TABS = [
  { key: 'Personal', label: 'Personal', icon: 'sparkles-outline' },
  { key: 'Work', label: 'Work', icon: 'briefcase-outline' },
  { key: 'Shopping', label: 'Shopping', icon: 'bag-handle-outline' },
];

function GlassBar({ children, style, onLayout }) {
  return (
    <View onLayout={onLayout} style={[styles.glassShell, style]}>
      <BlurView intensity={54} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.glassOverlay} />
      <View style={styles.glassHighlight} />
      {children}
    </View>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('Personal');
  const [barWidth, setBarWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(0));
  const fadeAnim = useRef(new Animated.Value(1));
  const tabWidth = barWidth > 0 ? (barWidth - 8) / TABS.length : 0;
  const group = TASK_GROUPS[activeTab];
  const totalItems = group.sections.reduce((count, section) => count + section.items.length, 0);

  useEffect(() => {
    const index = TABS.findIndex((tab) => tab.key === activeTab);
      Animated.parallel([
        Animated.spring(slideAnim.current, {
          toValue: index * tabWidth,
        tension: 320,
        friction: 28,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(fadeAnim.current, { toValue: 0.8, duration: 90, useNativeDriver: true }),
        Animated.timing(fadeAnim.current, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]),
    ]).start();
  }, [activeTab, tabWidth]);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>Thursday focus</Text>
            <Text style={styles.title}>Plan with calm clarity.</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}>
            <Ionicons name="add" size={18} color={COLORS.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroText}>
            <Text style={styles.heroLabel}>Main focus</Text>
            <Text style={styles.heroBody}>{group.focus}</Text>
          </View>
          <View style={styles.heroMetric}>
            <Text style={styles.heroMetricValue}>{totalItems}</Text>
            <Text style={styles.heroMetricLabel}>open</Text>
          </View>
        </View>

        {group.sections.map((section, sectionIndex) => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionMeta}>{section.items.length} tasks</Text>
            </View>
            <View style={styles.list}>
              {section.items.map((item, itemIndex) => (
                <Pressable
                  key={item}
                  style={({ pressed }) => [
                    styles.row,
                    itemIndex === section.items.length - 1 && styles.rowLast,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.rowDot, sectionIndex === 0 ? styles.rowDotPrimary : styles.rowDotWarm]} />
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowText}>{item}</Text>
                    <Text style={styles.rowSubtext}>{sectionIndex === 0 ? 'Best done before noon' : 'Flexible window'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <GlassBar
        style={styles.tabBar}
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      >
        <Animated.View
          style={[
            styles.activePill,
            {
              width: Math.max(tabWidth - 8, 0),
              transform: [{ translateX: Animated.add(slideAnim.current, new Animated.Value(4)) }],
            },
          ]}
        />
        <View style={styles.tabRow}>
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={({ pressed }) => [styles.tabItem, pressed && styles.pressed]}
              >
                <Ionicons
                  name={tab.icon}
                  size={18}
                  color={isActive ? COLORS.primary : COLORS.textSecondary}
                  style={{ opacity: isActive ? 1 : 0.5 }}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </GlassBar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { paddingTop: 68, paddingHorizontal: 20, paddingBottom: 132, gap: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  kicker: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  title: { fontSize: 34, lineHeight: 39, letterSpacing: -1.1, fontWeight: '800', color: COLORS.textPrimary, maxWidth: 230 },
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  heroText: { flex: 1, gap: 8 },
  heroLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  heroBody: { fontSize: 19, lineHeight: 27, fontWeight: '600', color: COLORS.textPrimary },
  heroMetric: {
    width: 82,
    height: 82,
    borderRadius: 25,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMetricValue: { fontSize: 28, lineHeight: 32, fontWeight: '800', color: COLORS.primary },
  heroMetricLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 20, lineHeight: 25, fontWeight: '700', color: COLORS.textPrimary },
  sectionMeta: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  list: {
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(27, 23, 18, 0.08)',
  },
  rowLast: { borderBottomWidth: 0 },
  rowDot: { width: 12, height: 12, borderRadius: 6 },
  rowDotPrimary: { backgroundColor: COLORS.primary },
  rowDotWarm: { backgroundColor: '#d3854f' },
  rowTextWrap: { flex: 1, gap: 3 },
  rowText: { fontSize: 16, lineHeight: 21, fontWeight: '600', color: COLORS.textPrimary },
  rowSubtext: { fontSize: 13, lineHeight: 18, color: COLORS.textSecondary },
  glassShell: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.46)',
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  tabBar: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 28,
    height: 62,
    borderRadius: 31,
    justifyContent: 'center',
  },
  activePill: {
    position: 'absolute',
    top: 6,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  tabRow: { flexDirection: 'row', paddingHorizontal: 4 },
  tabItem: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  tabLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, opacity: 0.5 },
  tabLabelActive: { color: COLORS.primary, opacity: 1 },
  pressed: { opacity: 0.86 },
});
