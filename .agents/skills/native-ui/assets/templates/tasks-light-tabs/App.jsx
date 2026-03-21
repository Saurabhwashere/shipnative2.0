import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TASK_GROUPS } from './task-data.js';

const TABS = ['Personal', 'Work', 'Shopping'];

export default function App() {
  const [activeTab, setActiveTab] = useState('Personal');
  const groups = TASK_GROUPS[activeTab];

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Today</Text>
        <Text style={styles.title}>{activeTab}</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Next up</Text>
          <Text style={styles.summaryValue}>{groups.focus}</Text>
        </View>
        {groups.sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.list}>
              {section.items.map((item) => (
                <View key={item} style={styles.row}>
                  <View style={styles.dot} />
                  <Text style={styles.rowText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable key={tab} style={styles.tabItem} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f2f8' },
  scroll: { flex: 1 },
  content: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 120, gap: 18 },
  eyebrow: { fontSize: 13, color: '#8a8797', fontWeight: '600' },
  title: { fontSize: 34, lineHeight: 40, letterSpacing: -1, fontWeight: '800', color: '#16151d' },
  summaryCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(20,20,30,0.06)' },
  summaryLabel: { fontSize: 13, color: '#8a8797', marginBottom: 6 },
  summaryValue: { fontSize: 17, lineHeight: 24, fontWeight: '600', color: '#16151d' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: '#16151d' },
  list: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(20,20,30,0.08)' },
  dot: { width: 10, height: 10, borderRadius: 999, backgroundColor: '#5c5ce0' },
  rowText: { flex: 1, fontSize: 16, color: '#16151d' },
  tabBar: { flexDirection: 'row', paddingTop: 8, paddingBottom: 28, backgroundColor: '#ffffffee', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(20,20,30,0.08)' },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabLabel: { fontSize: 12, color: '#8a8797', fontWeight: '600' },
  tabLabelActive: { color: '#5c5ce0' },
});
