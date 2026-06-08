import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CompanySettings } from '../shared/types';
import { fetchCompanySettings } from '../shared/db';

type Language = 'pt' | 'en';

interface SettingsState {
  company: CompanySettings | null;
  language: Language;
  biometricEnabled: boolean;
  loading: boolean;
  loadCompany: (userId: string) => Promise<void>;
  setLanguage: (lang: Language) => void;
  setBiometric: (enabled: boolean) => void;
  init: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  company: null,
  language: 'pt',
  biometricEnabled: false,
  loading: false,

  loadCompany: async (userId) => {
    set({ loading: true });
    const company = await fetchCompanySettings(userId);
    set({ company, loading: false });
  },

  setLanguage: async (lang) => {
    set({ language: lang });
    await AsyncStorage.setItem('ugest_language', lang);
  },

  setBiometric: async (enabled) => {
    set({ biometricEnabled: enabled });
    await AsyncStorage.setItem('ugest_biometric', enabled ? '1' : '0');
  },

  init: async () => {
    const [lang, bio] = await Promise.all([
      AsyncStorage.getItem('ugest_language'),
      AsyncStorage.getItem('ugest_biometric'),
    ]);
    set({
      language: (lang as Language) ?? 'pt',
      biometricEnabled: bio === '1',
    });
  },
}));
