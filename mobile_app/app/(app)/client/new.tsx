import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../stores/authStore';
import { useDataStore } from '../../../stores/dataStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { Colors, Spacing, Radius, FontSize } from '../../../shared/theme';
import { tr } from '../../../shared/i18n';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastContainer';
import { createDebtClient } from '../../../lib/db';

export default function NewClientScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { userId } = useAuthStore();
  const { loadClients } = useDataStore();
  const { language, darkMode } = useSettingsStore();
  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  const [fullName, setFullName] = useState('');
  const [movitelNumber, setMovitelNumber] = useState('');
  const [vodacomNumber, setVodacomNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!fullName.trim()) { showToast('Erro', 'Insira o nome completo', 'error'); return; }
    if (!userId) return;
    setLoading(true);
    try {
      await createDebtClient(userId, { fullName: fullName.trim(), movitelNumber, vodacomNumber, email, address, status: 'Pendente' });
      await loadClients(userId);
      showToast(lang === 'pt' ? 'Cliente adicionado' : 'Client added', undefined, 'success');
      router.back();
    } catch (e) {
      showToast('Erro', String(e), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: palette.text }]}>{tr(lang, 'newClient')}</Text>
        <Button title={tr(lang, 'save')} onPress={handleSubmit} loading={loading} size="sm" />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Input label={lang === 'pt' ? 'Nome Completo' : 'Full Name'} value={fullName} onChangeText={setFullName} placeholder="Nome completo" />
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="email@cliente.com" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Movitel" value={movitelNumber} onChangeText={setMovitelNumber} placeholder="+258 86 XXX XXXX" keyboardType="phone-pad" />
          <Input label="Vodacom" value={vodacomNumber} onChangeText={setVodacomNumber} placeholder="+258 84 XXX XXXX" keyboardType="phone-pad" />
          <Input label={tr(lang, 'address')} value={address} onChangeText={setAddress} placeholder="Endereço completo" multiline numberOfLines={2} style={{ height: 64, textAlignVertical: 'top' }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1,
  },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: FontSize.lg, fontWeight: '700' },
  scroll: { padding: Spacing.md, paddingBottom: 48 },
});
