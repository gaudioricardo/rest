import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { useSettingsStore } from '../../stores/settingsStore';

export default function AppLayout() {
  const userId = useAuthStore((s) => s.userId);
  const loadAll = useDataStore((s) => s.loadAll);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    if (userId) {
      loadAll(userId);
      loadSettings(userId);
    }
  }, [userId]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="invoice/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="invoice/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="invoice/edit" options={{ presentation: 'modal' }} />
      <Stack.Screen name="quote/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="quote/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="quote/edit" options={{ presentation: 'modal' }} />
      <Stack.Screen name="receipt/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="receipt/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="stock/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="stock/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="expense/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="expense/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="contact/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="client/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="client/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="settings/index" options={{ presentation: 'card' }} />
    </Stack>
  );
}
