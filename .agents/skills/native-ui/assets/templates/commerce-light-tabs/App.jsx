import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { PRODUCTS } from './product-data.js';

const COLORS = {
  bg: '#f7f3ec',
  surface: '#fffdf9',
  surfaceStrong: '#231b14',
  surfaceBorder: 'rgba(35, 27, 20, 0.08)',
  textPrimary: '#241c15',
  textSecondary: '#7c6f61',
  textMuted: '#ab9d8f',
  primary: '#c56d33',
  primarySoft: 'rgba(197, 109, 51, 0.12)',
  chip: '#efe7db',
};

const CATEGORIES = ['New in', 'Travel', 'Kitchen'];
const TABS = [
  { key: 'home', label: 'Home', icon: 'storefront-outline' },
  { key: 'saved', label: 'Saved', icon: 'heart-outline' },
  { key: 'account', label: 'Account', icon: 'person-circle-outline' },
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
  const [activeTab, setActiveTab] = useState('home');
  const [activeCategory, setActiveCategory] = useState('New in');
  const [barWidth, setBarWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(0));
  const tabWidth = barWidth > 0 ? (barWidth - 8) / TABS.length : 0;

  useEffect(() => {
    const index = TABS.findIndex((tab) => tab.key === activeTab);
    Animated.spring(slideAnim.current, {
      toValue: index * tabWidth,
      tension: 320,
      friction: 28,
      useNativeDriver: true,
    }).start();
  }, [activeTab, tabWidth]);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.searchText}>Search essentials</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}>
            <Ionicons name="options-outline" size={18} color={COLORS.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Curated drop</Text>
          <Text style={styles.heroTitle}>Weekend pieces built around warmth and quiet texture.</Text>
          <View style={styles.heroFooter}>
            <Text style={styles.heroMeta}>48 hour dispatch</Text>
            <Pressable style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}>
              <Text style={styles.heroButtonText}>Shop edit</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.categoryRow}>
          {CATEGORIES.map((category) => {
            const isActive = category === activeCategory;
            return (
              <Pressable
                key={category}
                onPress={() => setActiveCategory(category)}
                style={({ pressed }) => [
                  styles.categoryChip,
                  isActive && styles.categoryChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>{category}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.featurePanel}>
          <View style={styles.featureHero}>
            <Text style={styles.featureKicker}>Featured set</Text>
            <Text style={styles.featureTitle}>Soft carry-all tones for short-haul weekends.</Text>
          </View>
          <View style={styles.featureStack}>
            <View style={styles.featureMiniCard}>
              <Text style={styles.featureMiniValue}>Free</Text>
              <Text style={styles.featureMiniLabel}>alterations</Text>
            </View>
            <View style={styles.featureMiniCard}>
              <Text style={styles.featureMiniValue}>24h</Text>
              <Text style={styles.featureMiniLabel}>pickup</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Selected for you</Text>
          <Text style={styles.sectionMeta}>4 pieces</Text>
        </View>

        <View style={styles.grid}>
          {PRODUCTS.map((product, index) => (
            <Pressable key={product.name} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
              <View style={[styles.thumb, index % 2 === 0 ? styles.thumbWarm : styles.thumbCool]} />
              <Text style={styles.cardTitle}>{product.name}</Text>
              <Text style={styles.cardMeta}>{product.price}</Text>
            </Pressable>
          ))}
        </View>
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
  content: { paddingTop: 68, paddingHorizontal: 20, paddingBottom: 132, gap: 22 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchBar: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchText: { fontSize: 15, color: COLORS.textSecondary },
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 30,
    padding: 22,
    backgroundColor: COLORS.surfaceStrong,
    gap: 12,
  },
  heroEyebrow: { fontSize: 12, fontWeight: '700', color: '#dbc8b5', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroTitle: { fontSize: 29, lineHeight: 34, fontWeight: '800', letterSpacing: -0.8, color: '#fff7ef' },
  heroFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroMeta: { fontSize: 14, color: '#d0c0b0' },
  heroButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroButtonText: { fontSize: 14, fontWeight: '700', color: '#fff7ef' },
  categoryRow: { flexDirection: 'row', gap: 10 },
  categoryChip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipActive: { backgroundColor: COLORS.primarySoft },
  categoryLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  categoryLabelActive: { color: COLORS.primary },
  featurePanel: { flexDirection: 'row', gap: 12 },
  featureHero: {
    flex: 1.2,
    minHeight: 154,
    borderRadius: 26,
    padding: 18,
    justifyContent: 'flex-end',
    backgroundColor: '#eadbc9',
  },
  featureKicker: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8 },
  featureTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700', color: COLORS.textPrimary },
  featureStack: { flex: 0.9, gap: 12 },
  featureMiniCard: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 16,
    justifyContent: 'flex-end',
  },
  featureMiniValue: { fontSize: 22, lineHeight: 26, fontWeight: '800', color: COLORS.primary, marginBottom: 4 },
  featureMiniLabel: { fontSize: 13, lineHeight: 18, color: COLORS.textSecondary },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 20, lineHeight: 25, fontWeight: '700', color: COLORS.textPrimary },
  sectionMeta: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%',
    borderRadius: 24,
    padding: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  thumb: { height: 120, borderRadius: 18, marginBottom: 12 },
  thumbWarm: { backgroundColor: '#e8d4c0' },
  thumbCool: { backgroundColor: '#ddd9d3' },
  cardTitle: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  cardMeta: { fontSize: 13, color: COLORS.textSecondary },
  glassShell: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.64)',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.94)',
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
