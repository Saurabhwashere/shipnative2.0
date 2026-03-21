import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PRODUCTS } from './product-data.js';

export default function App() {
  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Shop</Text>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Weekend edit</Text>
          <Text style={styles.heroBody}>Soft neutrals, easy layers, and quick delivery.</Text>
        </View>
        <Text style={styles.sectionTitle}>Featured</Text>
        <View style={styles.grid}>
          {PRODUCTS.map((product) => (
            <View key={product.name} style={styles.card}>
              <View style={styles.thumb} />
              <Text style={styles.cardTitle}>{product.name}</Text>
              <Text style={styles.cardMeta}>{product.price}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.tabBar}>
        <Text style={styles.tabActive}>Home</Text>
        <Text style={styles.tab}>Orders</Text>
        <Text style={styles.tab}>Account</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f6f4ef' },
  scroll: { flex: 1 },
  content: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 120, gap: 18 },
  title: { fontSize: 34, lineHeight: 40, letterSpacing: -1, fontWeight: '800', color: '#1c1813' },
  hero: { borderRadius: 22, padding: 20, backgroundColor: '#201b17' },
  heroTitle: { fontSize: 24, lineHeight: 30, fontWeight: '700', color: '#fff6eb', marginBottom: 6 },
  heroBody: { fontSize: 15, lineHeight: 22, color: '#d7cfc4' },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: '#1c1813' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47%', backgroundColor: '#fff', borderRadius: 18, padding: 12, borderWidth: 1, borderColor: 'rgba(28,24,19,0.08)' },
  thumb: { height: 112, borderRadius: 14, backgroundColor: '#ece6dd', marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1c1813', marginBottom: 4 },
  cardMeta: { fontSize: 13, color: '#807568' },
  tabBar: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8, paddingBottom: 28, backgroundColor: '#fffffff0', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(28,24,19,0.08)' },
  tab: { fontSize: 12, color: '#8c8377', fontWeight: '600' },
  tabActive: { fontSize: 12, color: '#ba6a2a', fontWeight: '700' },
});
