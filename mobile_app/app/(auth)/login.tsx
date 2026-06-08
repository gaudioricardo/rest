import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Image, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useBiometrics } from '../../hooks/useBiometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signIn, session } = useAuthStore();
  const biometricEnabled = useSettingsStore(s => s.biometricEnabled);
  const { available, biometricType, authenticate } = useBiometrics();

  useEffect(() => {
    if (session) router.replace('/(app)/(tabs)');
  }, [session]);

  useEffect(() => {
    if (biometricEnabled && available) tryBiometric();
  }, [biometricEnabled, available]);

  const tryBiometric = async () => {
    const success = await authenticate();
    if (success) {
      const saved = await AsyncStorage.getItem('ugest_last_email');
      if (saved) {
        // trigger headless re-auth via stored session — session persists via SecureStore
        router.replace('/(app)/(tabs)');
      }
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha o email e a password.');
      return;
    }
    setLoading(true);
    const err = await signIn(email.trim(), password);
    setLoading(false);
    if (err) {
      Alert.alert('Erro de autenticação', err);
    } else {
      await AsyncStorage.setItem('ugest_last_email', email.trim());
      router.replace('/(app)/(tabs)');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-ugest-background dark:bg-ugest-dark-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-16 pb-10">
            {/* Logo */}
            <View className="items-center mb-12">
              <View className="w-20 h-20 bg-primary-950 rounded-3xl items-center justify-center mb-4 shadow-lg">
                <Text className="text-white font-montserrat text-2xl">U</Text>
              </View>
              <Text className="text-3xl font-montserrat text-primary-950 dark:text-white">Ugest ERP</Text>
              <Text className="text-gray-500 dark:text-gray-400 font-inter mt-1">Sistema de Gestão Empresarial</Text>
            </View>

            {/* Form */}
            <View className="gap-4 mb-6">
              <View>
                <Text className="font-inter-medium text-gray-700 dark:text-gray-300 mb-1.5 text-sm">Email</Text>
                <View className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 px-4">
                  <Feather name="mail" size={18} color="#9ca3af" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="email@empresa.co.mz"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    className="flex-1 py-4 px-3 font-inter text-gray-900 dark:text-white text-base"
                  />
                </View>
              </View>

              <View>
                <Text className="font-inter-medium text-gray-700 dark:text-gray-300 mb-1.5 text-sm">Password</Text>
                <View className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 px-4">
                  <Feather name="lock" size={18} color="#9ca3af" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPass}
                    autoComplete="password"
                    className="flex-1 py-4 px-3 font-inter text-gray-900 dark:text-white text-base"
                  />
                  <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                    <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              className="bg-primary-950 rounded-xl py-4 items-center justify-center mb-4 flex-row gap-2 active:opacity-80"
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Feather name="log-in" size={18} color="#fff" />
              }
              <Text className="text-white font-inter-bold text-base">
                {loading ? 'A entrar...' : 'Entrar'}
              </Text>
            </TouchableOpacity>

            {/* Biometric */}
            {available && biometricEnabled && (
              <TouchableOpacity
                onPress={tryBiometric}
                className="flex-row items-center justify-center gap-2 py-3"
              >
                <Feather name="shield" size={18} color="#0c1c48" />
                <Text className="font-inter-medium text-primary-950 dark:text-primary-200">
                  Entrar com {biometricType}
                </Text>
              </TouchableOpacity>
            )}

            <View className="flex-1" />
            <Text className="text-center text-xs text-gray-400 font-inter">
              Ugest ERP · Moçambique · v1.0
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
