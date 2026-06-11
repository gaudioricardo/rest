import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CompanySettings, Language } from '../shared/types';
import { getCompanySettings, saveCompanySettings } from '../lib/db';

interface SettingsState {
  company: CompanySettings | null;
  language: Language;
  darkMode: boolean;
  loading: boolean;
  loadSettings: (userId: string) => Promise<void>;
  saveSettings: (userId: string, settings: Partial<CompanySettings>) => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  setDarkMode: (dark: boolean) => Promise<void>;
  initPrefs: () => Promise<void>;
}

const DEFAULT_COMPANY: CompanySettings = {
  companyName: '',
  nuit: '',
  address: '',
  city: '',
  phone: '',
  email: '',
  bankAccounts: [],
  mobileContacts: [],
  setupComplete: false,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  company: null,
  language: 'pt',
  darkMode: false,
  loading: false,

  initPrefs: async () => {
    const lang = await AsyncStorage.getItem('rest_lang');
    const dark = await AsyncStorage.getItem('rest_dark');
    set({
      language: (lang as Language) ?? 'pt',
      darkMode: dark === 'true',
    });
  },

  loadSettings: async (userId) => {
    set({ loading: true });
    const cs = await getCompanySettings(userId);
    set({ company: cs ?? DEFAULT_COMPANY, loading: false });
  },

  saveSettings: async (userId, settings) => {
    const current = get().company ?? DEFAULT_COMPANY;
    const merged = { ...current, ...settings };
    await saveCompanySettings(userId, merged);
    set({ company: merged });
  },

  setLanguage: async (lang) => {
    await AsyncStorage.setItem('rest_lang', lang);
    set({ language: lang });
  },

  setDarkMode: async (dark) => {
    await AsyncStorage.setItem('rest_dark', String(dark));
    set({ darkMode: dark });
  },
}));
