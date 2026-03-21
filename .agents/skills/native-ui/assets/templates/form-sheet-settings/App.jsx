import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SETTINGS_GROUPS } from './settings-data.js';

export default function App() {
  const [showSheet, setShowSheet] = useState(false);

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>
        {SETTINGS_GROUPS.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.list}>
              {group.items.map((item) => (
                <Pressable key={item} style={styles.row} onPress={() => setShowSheet(true)}>
                  <Text style={styles.rowText}>{item}</Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal transparent visible={showSheet} animationType="slide">
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Edit preference</Text>
            <Text style={styles.sheetBody}>Use grouped rows and sheet editing for focused settings changes.</Text>
            <Pressable style={styles.button} onPress={() => setShowSheet(false)}>
              <Text style={styles.buttonText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f2f2f7' },
  scroll: { flex: 1 },
  content: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 40, gap: 18 },
  title: { fontSize: 34, lineHeight: 40, letterSpacing: -1, fontWeight: '800', color: '#1c1c1e' },
  group: { gap: 8 },
  groupTitle: { fontSize: 13, color: '#7a7a87', fontWeight: '600', textTransform: 'uppercase' },
  list: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(28,28,30,0.08)' },
  rowText: { fontSize: 16, color: '#1c1c1e' },
  chevron: { fontSize: 18, color: '#a2a2ab' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,16,22,0.32)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 34 },
  sheetHandle: { alignSelf: 'center', width: 42, height: 5, borderRadius: 999, backgroundColor: '#d0d0d6', marginBottom: 16 },
  sheetTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: '#1c1c1e', marginBottom: 6 },
  sheetBody: { fontSize: 15, lineHeight: 22, color: '#6b6b78', marginBottom: 18 },
  button: { borderRadius: 14, backgroundColor: '#0a84ff', paddingVertical: 14, alignItems: 'center' },
  buttonText: { fontSize: 17, color: '#fff', fontWeight: '600' },
});
