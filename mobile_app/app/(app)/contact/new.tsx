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
import { createContact } from '../../../lib/db';
import { getAvatarColor } from '../../../shared/theme';

export default function NewContactScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { userId } = useAuthStore();
  const { loadContacts } = useDataStore();
  const { language, darkMode } = useSettingsStore();
  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [rolePt, setRolePt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { showToast('Erro', 'Insira o nome', 'error'); return; }
    if (!userId) return;
    setLoading(true);
    try {
      await createContact(userId, {
        name: name.trim(), email, phone, company, role, rolePt: rolePt || role,
        avatarColor: getAvatarColor(name),
      });
      await loadContacts(userId);
      showToast(lang === 'pt' ? 'Contacto adicionado' : 'Contact added', undefined, 'success');
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
        <Text style={[styles.title, { color: palette.text }]}>{tr(lang, 'newContact')}</Text>
        <Button title={tr(lang, 'save')} onPress={handleSubmit} loading={loading} size="sm" />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Input label={lang === 'pt' ? 'Nome Completo' : 'Full Name'} value={name} onChangeText={setName} placeholder="Nome completo" />
          <Input label={tr(lang, 'email')} value={email} onChangeText={setEmail} placeholder="email@empresa.com" keyboardType="email-address" autoCapitalize="none" />
          <Input label={tr(lang, 'phone')} value={phone} onChangeText={setPhone} placeholder="+258 8X XXX XXXX" keyboardType="phone-pad" />
          <Input label={tr(lang, 'company')} value={company} onChangeText={setCompany} placeholder="Empresa" />
          <Input label={lang === 'pt' ? 'Cargo (EN)' : 'Role (EN)'} value={role} onChangeText={setRole} placeholder="e.g. Director" />
          <Input label={lang === 'pt' ? 'Cargo (PT)' : 'Role (PT)'} value={rolePt} onChangeText={setRolePt} placeholder="ex. Director" />
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
