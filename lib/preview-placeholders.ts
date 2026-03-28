export const BLANK_LAYOUT_SOURCE = `import { Stack } from 'expo-router';
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
`;

export const BLANK_INDEX_SOURCE = `import React from 'react';
import { View } from 'react-native';
export default function HomeScreen() {
  return <View style={{ flex: 1, backgroundColor: '#000' }} />;
}
`;
