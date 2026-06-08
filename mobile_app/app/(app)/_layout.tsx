import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';

export default function AppLayout() {
  const { session, loading } = useAuthStore();

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/(auth)/login');
    }
  }, [session, loading]);

  if (loading || !session) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="invoice/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="invoice/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="quote/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="quote/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="receipt/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="client/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="settings/index" options={{ presentation: 'card' }} />
    </Stack>
  );
}
