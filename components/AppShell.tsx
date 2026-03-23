'use client';

import { useState, useCallback } from 'react';
import Header from '@/components/Header';
import ChatPanel from '@/components/ChatPanel';
import CodeEditor from '@/components/CodeEditor';
import PhonePreview from '@/components/PhonePreview';
import { VFSProvider } from '@/contexts/VFSContext';
import { PreviewProvider } from '@/contexts/PreviewContext';
import { useVFS } from '@/contexts/VFSContext';

const STARTER_APP = `import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const TABS = ['Personal', 'Work', 'Shopping'];

const TASKS = {
  Personal: {
    summary: '2 of 5 completed',
    sections: [
      { title: 'Today', items: ['Book dentist appointment', 'Plan Saturday brunch'] },
      { title: 'Soon', items: ['Renew passport reminder', 'Sort wardrobe donations'] },
    ],
  },
  Work: {
    summary: '3 of 7 completed',
    sections: [
      { title: 'Priority', items: ['Ship native UI prompt upgrade', 'Review onboarding copy'] },
      { title: 'Later', items: ['Triage bugs', 'Write release notes'] },
    ],
  },
  Shopping: {
    summary: '1 of 4 completed',
    sections: [
      { title: 'Groceries', items: ['Blueberries', 'Sourdough'] },
      { title: 'Home', items: ['Dishwasher tablets', 'Paper towels'] },
    ],
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState('Personal');
  const current = TASKS[activeTab];

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Welcome back</Text>
        <Text style={styles.title}>{activeTab}</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{current.summary}</Text>
          <Text style={styles.summaryLabel}>Keep the structure top-anchored, compact, and task-first.</Text>
        </View>
        {current.sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.group}>
              {section.items.map((item) => (
                <Pressable key={item} style={styles.row}>
                  <View style={styles.check} />
                  <Text style={styles.rowText}>{item}</Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
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
  screen: { flex: 1, backgroundColor: '#f2f2f7' },
  scroll: { flex: 1 },
  content: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 120, gap: 18 },
  eyebrow: { fontSize: 13, color: '#7d7d89', fontWeight: '600' },
  title: { fontSize: 34, lineHeight: 40, letterSpacing: -1, fontWeight: '800', color: '#1c1c1e' },
  summaryCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  summaryValue: { fontSize: 17, lineHeight: 24, fontWeight: '700', color: '#1c1c1e', marginBottom: 4 },
  summaryLabel: { fontSize: 14, lineHeight: 20, color: '#6b6b78' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: '#1c1c1e' },
  group: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
  check: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#5a5adf' },
  rowText: { flex: 1, fontSize: 16, color: '#1c1c1e' },
  chevron: { fontSize: 18, color: '#b0b0b8' },
  tabBar: { flexDirection: 'row', paddingTop: 8, paddingBottom: 28, backgroundColor: '#ffffffee', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.06)' },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabLabel: { fontSize: 12, color: '#7d7d89', fontWeight: '600' },
  tabLabelActive: { color: '#5a5adf' },
});
`;

const INITIAL_FILES = [{ path: 'App.jsx', content: STARTER_APP }];

// ── Snapshot types ────────────────────────────────────────────────────────────
interface ProjectSnapshot {
  id: string;
  timestamp: number;
  label: string;
  files: { path: string; content: string }[];
}

// ── Layout (inside providers, so it can use useVFS) ───────────────────────────
function Layout({ initialPrompt }: { initialPrompt?: string }) {
  const { vfs } = useVFS();
  const [showEditor, setShowEditor] = useState(false);
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null);

  const saveSnapshot = useCallback((label: string) => {
    const files = vfs.getAllFiles().map((f) => ({ path: f.path, content: f.content }));
    const snap: ProjectSnapshot = {
      id: `snap-${Date.now()}`,
      timestamp: Date.now(),
      label: label.slice(0, 50),
      files,
    };
    setSnapshots((prev) => [...prev.slice(-19), snap]);
  }, [vfs]);

  const restoreSnapshot = useCallback((id: string) => {
    const snap = snapshots.find((s) => s.id === id);
    if (!snap) return;
    // Delete files not in snapshot
    for (const path of vfs.listFiles()) vfs.deleteFile(path);
    // Write snapshot files
    for (const { path, content } of snap.files) vfs.writeFile(path, content);
    setShowHistory(false);
    setRestoreConfirm(null);
  }, [snapshots, vfs]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1c1c1c] overflow-hidden">
      <Header
        showEditor={showEditor}
        onToggleEditor={() => setShowEditor((v) => !v)}
        snapshots={snapshots}
        showHistory={showHistory}
        onToggleHistory={() => setShowHistory((v) => !v)}
        onRestoreSnapshot={(id) => setRestoreConfirm(id)}
        fileCount={vfs.listFiles().length}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Chat panel */}
        <div
          className="flex flex-col border-r border-[#252525] shrink-0 transition-all duration-300"
          style={{ width: showEditor ? '30%' : '40%', minWidth: 320, maxWidth: 480 }}
        >
          <ChatPanel className="flex-1 overflow-hidden" onBeforeSend={saveSnapshot} initialPrompt={initialPrompt} />
        </div>

        {/* Code editor (toggleable) */}
        {showEditor && (
          <div
            className="flex flex-col border-r border-[#252525] animate-slide-in overflow-hidden"
            style={{ width: '35%', minWidth: 280 }}
          >
            <CodeEditor className="flex-1 overflow-hidden" />
          </div>
        )}

        {/* Phone preview */}
        <div className="flex-1 overflow-hidden" style={{ minWidth: 350 }}>
          <PhonePreview className="h-full" />
        </div>
      </div>

      {/* Restore confirmation modal */}
      {restoreConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setRestoreConfirm(null)}
        >
          <div
            className="bg-[#222222] border border-[#3a3a3a] rounded-2xl p-6 max-w-sm w-full mx-4"
            style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.6)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[#f0f0f5] text-sm font-semibold mb-2">Restore version?</h3>
            <p className="text-[#6b7080] text-xs mb-5 leading-relaxed">
              This will overwrite all current files. Any unsaved AI changes will be lost.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRestoreConfirm(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-[#6b7080] hover:text-[#f0f0f5] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => restoreSnapshot(restoreConfirm)}
                className="px-3 py-1.5 rounded-lg text-[#1c1c1c] text-xs font-medium transition-colors"
                style={{ background: '#ffffff' }}
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppShell({ initialPrompt }: { initialPrompt?: string }) {
  return (
    <VFSProvider initialFiles={INITIAL_FILES}>
      <PreviewProvider>
        <Layout initialPrompt={initialPrompt} />
      </PreviewProvider>
    </VFSProvider>
  );
}
