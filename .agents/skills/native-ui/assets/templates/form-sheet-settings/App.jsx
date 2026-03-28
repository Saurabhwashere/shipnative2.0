import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { SETTINGS_GROUPS } from './settings-data.js';

const COLORS = {
  bg: '#f3f2f7',
  surface: '#ffffff',
  surfaceBorder: 'rgba(28, 28, 30, 0.08)',
  textPrimary: '#1c1c1e',
  textSecondary: '#6f6f7b',
  textMuted: '#a1a1ad',
  primary: '#0a84ff',
  primarySoft: 'rgba(10,132,255,0.12)',
};

function SheetGlass({ children, style }) {
  return (
    <View style={[styles.sheetGlassShell, style]}>
      <BlurView intensity={58} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.sheetGlassOverlay} />
      {children}
    </View>
  );
}

export default function App() {
  const [selectedItem, setSelectedItem] = useState(null);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>SC</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileTitle}>Sana Chen</Text>
            <Text style={styles.profileBody}>Quiet defaults, grouped settings, and low-friction control.</Text>
          </View>
        </View>

        {SETTINGS_GROUPS.map((group, groupIndex) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.list}>
              {group.items.map((item, itemIndex) => (
                <Pressable
                  key={item}
                  onPress={() => setSelectedItem(item)}
                  style={({ pressed }) => [
                    styles.row,
                    itemIndex === group.items.length - 1 && styles.rowLast,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.rowIcon, groupIndex === 0 && styles.rowIconPrimary]}>
                    <Ionicons
                      name={groupIndex === 0 ? 'notifications-outline' : groupIndex === 1 ? 'person-outline' : 'shield-checkmark-outline'}
                      size={16}
                      color={groupIndex === 0 ? COLORS.primary : COLORS.textPrimary}
                    />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowText}>{item}</Text>
                    <Text style={styles.rowHint}>
                      {groupIndex === 0 ? 'Manage frequency and quiet hours' : groupIndex === 1 ? 'Profile and access details' : 'Permissions and visibility'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal transparent visible={Boolean(selectedItem)} animationType="slide">
        <View style={styles.sheetBackdrop}>
          <SheetGlass style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetKicker}>Edit preference</Text>
            <Text style={styles.sheetTitle}>{selectedItem}</Text>
            <Text style={styles.sheetBody}>
              Keep edits focused and reversible. Use sheets for one decision at a time instead of stacking full forms.
            </Text>
            <View style={styles.sheetActions}>
              <Pressable style={({ pressed }) => [styles.ghostButton, pressed && styles.pressed]} onPress={() => setSelectedItem(null)}>
                <Text style={styles.ghostButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={() => setSelectedItem(null)}>
                <Text style={styles.primaryButtonText}>Save</Text>
              </Pressable>
            </View>
          </SheetGlass>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { paddingTop: 68, paddingHorizontal: 20, paddingBottom: 40, gap: 24 },
  profileCard: {
    borderRadius: 28,
    padding: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  profileCopy: { flex: 1, gap: 4 },
  profileTitle: { fontSize: 24, lineHeight: 28, fontWeight: '800', color: COLORS.textPrimary },
  profileBody: { fontSize: 14, lineHeight: 20, color: COLORS.textSecondary },
  group: { gap: 10 },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
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
    borderBottomColor: COLORS.surfaceBorder,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#f2f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconPrimary: { backgroundColor: COLORS.primarySoft },
  rowTextWrap: { flex: 1, gap: 3 },
  rowText: { fontSize: 16, lineHeight: 21, fontWeight: '600', color: COLORS.textPrimary },
  rowHint: { fontSize: 13, lineHeight: 18, color: COLORS.textSecondary },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 16, 22, 0.3)',
    justifyContent: 'flex-end',
  },
  sheetGlassShell: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  sheetGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.44)',
  },
  sheet: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 34 },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d0d0d6',
    marginBottom: 18,
  },
  sheetKicker: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 24, lineHeight: 29, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  sheetBody: { fontSize: 15, lineHeight: 22, color: COLORS.textSecondary, marginBottom: 20 },
  sheetActions: { flexDirection: 'row', gap: 10 },
  ghostButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.66)',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  pressed: { opacity: 0.86 },
});
