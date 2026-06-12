import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { ToastProvider } from '../components/ui/ToastContainer';

SplashScreen.preventAutoHideAsync();

const DOT_COUNT = 4;

function Preloader({ onDone }: { onDone: () => void }) {
  const dots = Array.from({ length: DOT_COUNT }, (_, i) => {
    const anim = React.useRef(new Animated.Value(0)).current;
    return { anim };
  });

  useEffect(() => {
    const animations = dots.map(({ anim }, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 120),
          Animated.timing(anim, { toValue: -10, duration: 300, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay((DOT_COUNT - i) * 120),
        ])
      )
    );
    animations.forEach((a) => a.start());

    const timer = setTimeout(onDone, 3500);
    return () => {
      timer && clearTimeout(timer);
      animations.forEach((a) => a.stop());
    };
  }, []);

  return (
    <View style={styles.preloader}>
      <Text style={styles.logo}>Rest</Text>
      <Text style={styles.tagline}>Where growth finds space</Text>
      <View style={styles.dotsRow}>
        {dots.map(({ anim }, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, { transform: [{ translateY: anim }] }]}
          />
        ))}
      </View>
    </View>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const userId = useAuthStore((s) => s.userId);
  const authLoading = useAuthStore((s) => s.loading);

  useEffect(() => {
    if (authLoading) return;
    const inApp = segments[0] === '(app)';
    const inAuth = segments[0] === '(auth)';

    if (!userId && inApp) {
      router.replace('/(auth)/login');
    } else if (userId && inAuth) {
      router.replace('/(app)/(tabs)/');
    }
  }, [userId, authLoading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [preloaderDone, setPreloaderDone] = useState(false);
  const { init: initAuth } = useAuthStore();
  const { initPrefs } = useSettingsStore();

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular: require('../assets/fonts/PlayfairDisplay_400Regular.ttf'),
    PlayfairDisplay_600SemiBold: require('../assets/fonts/PlayfairDisplay_600SemiBold.ttf'),
    PlayfairDisplay_700Bold: require('../assets/fonts/PlayfairDisplay_700Bold.ttf'),
    PlayfairDisplay_400Regular_Italic: require('../assets/fonts/PlayfairDisplay_400Regular_Italic.ttf'),
  });

  useEffect(() => {
    initPrefs();
    initAuth();
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded || !preloaderDone) {
    return <Preloader onDone={() => setPreloaderDone(true)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
          <AuthGuard>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
          </AuthGuard>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  preloader: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  logo: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 48,
    color: '#0c1c48',
    letterSpacing: 2,
  },
  tagline: {
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontSize: 18,
    color: '#805522',
    letterSpacing: 0.5,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#805522',
  },
});
