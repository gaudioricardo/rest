import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { ToastProvider } from '../components/ui/ToastContainer';

SplashScreen.preventAutoHideAsync();

function OfflineScreen({ lang }: { lang: 'pt' | 'en' }) {
  const pulse = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={offlineStyles.container}>
      <View style={offlineStyles.iconWrap}>
        <Text style={offlineStyles.icon}>📡</Text>
      </View>
      <Text style={offlineStyles.title}>
        {lang === 'en' ? 'No internet connection' : 'Sem ligação à internet'}
      </Text>
      <Text style={offlineStyles.desc}>
        {lang === 'en'
          ? 'Check your connection. The app will reconnect automatically.'
          : 'Verifique a sua ligação. A aplicação vai reconectar automaticamente.'}
      </Text>
      <View style={offlineStyles.statusRow}>
        <Animated.View style={[offlineStyles.dot, { opacity: pulse }]} />
        <Text style={offlineStyles.statusText}>
          {lang === 'en' ? 'Waiting for connection...' : 'A aguardar ligação...'}
        </Text>
      </View>
    </View>
  );
}

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
      <Image source={require('../assets/Logo.png')} style={styles.logoImg} resizeMode="contain" />
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
      router.replace('/(app)/(tabs)');
    }
  }, [userId, authLoading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [preloaderDone, setPreloaderDone] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const { init: initAuth } = useAuthStore();
  const { initPrefs } = useSettingsStore();
  const lang = useSettingsStore((s) => s.language) ?? 'pt';

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
    const unsub = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected !== false);
    });
    return () => unsub();
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
        {!isOnline && (
          <View style={offlineStyles.overlay}>
            <OfflineScreen lang={lang as 'pt' | 'en'} />
          </View>
        )}
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
  logoImg: {
    width: 220,
    height: 80,
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

const offlineStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9998,
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.97)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
    color: '#1e293b',
    textAlign: 'center',
  },
  desc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f87171',
  },
  statusText: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
