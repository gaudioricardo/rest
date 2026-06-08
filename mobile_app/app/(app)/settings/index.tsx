import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../../stores/authStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { supabase } from '../../../lib/supabase';
import { hapticSuccess, hapticError } from '../../../lib/haptics';

export default function SettingsScreen() {
  const user = useAuthStore(s => s.user);
  const { company, loadCompany, biometricEnabled, setBiometric, language, setLanguage } = useSettingsStore();

  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState(company?.companyName ?? '');
  const [nuit, setNuit] = useState(company?.nuit ?? '');
  const [address, setAddress] = useState(company?.address ?? '');
  const [city, setCity] = useState(company?.city ?? '');
  const [phone, setPhone] = useState(company?.phone ?? '');
  const [email, setEmail] = useState(company?.email ?? '');

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      const b64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      await supabase
        .from('company_settings')
        .update({ logo_base64: b64 })
        .eq('user_id', user?.id);
      if (user) loadCompany(user.id);
    }
  };

  const saveSettings = async () => {
    if (!user || !companyName.trim()) {
      Alert.alert('Erro', 'Nome da empresa obrigatório.');
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      company_name: companyName.trim(),
      nuit: nuit.trim(),
      address: address.trim(),
      city: city.trim(),
      phone: phone.trim(),
      email: email.trim(),
      setup_complete: true,
    };
    const { error } = await supabase
      .from('company_settings')
      .upsert(payload, { onConflict: 'user_id' });
    setSaving(false);
    if (error) {
      hapticError();
      Alert.alert('Erro', error.message);
    } else {
      hapticSuccess();
      await loadCompany(user.id);
      Alert.alert('Sucesso', 'Configurações guardadas.');
    }
  };

  const field = (label: string, value: string, onChange: (v: string) => void, opts?: { keyboardType?: 'email-address' | 'phone-pad' | 'default'; autoCapitalize?: 'none' | 'words' }) => (
    <View className="mb-3">
      <Text className="text-xs font-inter-medium text-gray-500 dark:text-gray-400 mb-1">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={opts?.keyboardType ?? 'default'}
        autoCapitalize={opts?.autoCapitalize ?? 'sentences'}
        className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 font-inter text-gray-800 dark:text-gray-100 text-sm border border-gray-200 dark:border-gray-600"
        placeholderTextColor="#9ca3af"
      />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-ugest-background dark:bg-ugest-dark-background" edges={['top']}>
      <View className="flex-row items-center px-4 pt-2 pb-4 gap-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Feather name="arrow-left" size={22} color="#0c1c48" />
        </TouchableOpacity>
        <Text className="flex-1 font-montserrat text-xl text-primary-950 dark:text-white">Configurações</Text>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Company info */}
        <Text className="font-inter-extrabold text-xs uppercase tracking-widest text-gray-400 mb-3">Empresa</Text>
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
          {field('Nome da empresa *', companyName, setCompanyName, { autoCapitalize: 'words' })}
          {field('NUIT', nuit, setNuit)}
          {field('Endereço', address, setAddress)}
          {field('Cidade', city, setCity, { autoCapitalize: 'words' })}
          {field('Telefone', phone, setPhone, { keyboardType: 'phone-pad' })}
          {field('Email', email, setEmail, { keyboardType: 'email-address', autoCapitalize: 'none' })}

          <TouchableOpacity
            onPress={pickLogo}
            className="flex-row items-center gap-2 py-3 px-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 mb-3"
          >
            <Feather name="image" size={16} color="#9ca3af" />
            <Text className="font-inter-medium text-gray-600 dark:text-gray-300 text-sm">
              {company?.logoBase64 ? 'Alterar logótipo' : 'Seleccionar logótipo'}
            </Text>
            {company?.logoBase64 && <Feather name="check-circle" size={14} color="#065f46" />}
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <Text className="font-inter-extrabold text-xs uppercase tracking-widest text-gray-400 mb-3">Preferências</Text>
        <View className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden mb-4">
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-700">
            <View>
              <Text className="font-inter-medium text-gray-800 dark:text-gray-100">Idioma</Text>
              <Text className="text-xs font-inter text-gray-400 mt-0.5">Português / English</Text>
            </View>
            <TouchableOpacity
              onPress={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
              className="px-4 py-2 bg-primary-50 dark:bg-primary-900 rounded-lg"
            >
              <Text className="font-inter-bold text-primary-950 dark:text-primary-100">
                {language === 'pt' ? 'PT' : 'EN'}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-between px-4 py-4">
            <View>
              <Text className="font-inter-medium text-gray-800 dark:text-gray-100">Biometria</Text>
              <Text className="text-xs font-inter text-gray-400 mt-0.5">Face ID / Touch ID</Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={setBiometric}
              trackColor={{ false: '#e5e7eb', true: '#0c1c48' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Account */}
        <Text className="font-inter-extrabold text-xs uppercase tracking-widest text-gray-400 mb-3">Conta</Text>
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
          <Text className="font-inter text-gray-700 dark:text-gray-200 text-sm">{user?.email}</Text>
          <Text className="text-xs font-inter text-gray-400 mt-1">ID: {user?.id?.slice(0, 8)}...</Text>
        </View>

        <View className="h-8" />
      </ScrollView>

      <View className="px-4 pb-6">
        <TouchableOpacity
          onPress={saveSettings}
          disabled={saving}
          className="flex-row items-center justify-center gap-2 py-4 rounded-2xl bg-primary-950 active:opacity-80"
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Feather name="save" size={18} color="#fff" />}
          <Text className="font-inter-bold text-white text-base">
            {saving ? 'A guardar...' : 'Guardar Configurações'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
