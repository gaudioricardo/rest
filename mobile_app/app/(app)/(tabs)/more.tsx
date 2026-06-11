import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../stores/authStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { Colors, Spacing, FontSize, Radius } from '../../../shared/theme';
import { tr } from '../../../shared/i18n';

interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
  badge?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onPress, color = Colors.primary, badge }) => {
  const dark = useSettingsStore((s) => s.darkMode);
  const palette = dark ? Colors.dark : Colors.light;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.menuItem, { borderBottomColor: palette.border }]}
    >
      <View style={[styles.iconBox, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.menuLabel, { color: palette.text }]}>{label}</Text>
      {badge && (
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
    </TouchableOpacity>
  );
};

export default function MoreScreen() {
  const router = useRouter();
  const { signOut, userEmail, userName } = useAuthStore();
  const { language, setLanguage, darkMode, setDarkMode } = useSettingsStore();
  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        <Text style={[styles.title, { color: palette.text }]}>{tr(lang, 'more')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* User Info */}
        <View style={[styles.userCard, { backgroundColor: palette.card }]}>
          <View style={[styles.userAvatar, { backgroundColor: Colors.primary }]}>
            <Text style={styles.userInitials}>
              {(userName ?? userEmail ?? 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={[styles.userName, { color: palette.text }]}>{userName ?? 'Utilizador'}</Text>
            <Text style={[styles.userEmail, { color: palette.textMuted }]}>{userEmail}</Text>
          </View>
        </View>

        {/* Section: Management */}
        <Text style={[styles.section, { color: palette.textMuted }]}>
          {lang === 'pt' ? 'GESTÃO' : 'MANAGEMENT'}
        </Text>
        <View style={[styles.group, { backgroundColor: palette.card }]}>
          <MenuItem
            icon="cube-outline"
            label={tr(lang, 'stock')}
            onPress={() => router.push('/(app)/stock/list' as any)}
            color={Colors.primary}
          />
          <MenuItem
            icon="wallet-outline"
            label={tr(lang, 'expenses')}
            onPress={() => router.push('/(app)/expense/list' as any)}
            color={Colors.secondary}
          />
          <MenuItem
            icon="person-outline"
            label={tr(lang, 'contacts')}
            onPress={() => router.push('/(app)/contact/list' as any)}
            color="#0369a1"
          />
        </View>

        {/* Section: Preferences */}
        <Text style={[styles.section, { color: palette.textMuted }]}>
          {lang === 'pt' ? 'PREFERÊNCIAS' : 'PREFERENCES'}
        </Text>
        <View style={[styles.group, { backgroundColor: palette.card }]}>
          <View style={[styles.menuItem, { borderBottomColor: palette.border }]}>
            <View style={[styles.iconBox, { backgroundColor: Colors.primary + '18' }]}>
              <Ionicons name="moon-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={[styles.menuLabel, { color: palette.text, flex: 1 }]}>
              {tr(lang, 'darkMode')}
            </Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ true: Colors.primary, false: palette.border }}
            />
          </View>
          <View style={[styles.menuItem, { borderBottomColor: palette.border }]}>
            <View style={[styles.iconBox, { backgroundColor: Colors.secondary + '18' }]}>
              <Ionicons name="language-outline" size={20} color={Colors.secondary} />
            </View>
            <Text style={[styles.menuLabel, { color: palette.text, flex: 1 }]}>
              {tr(lang, 'language')}
            </Text>
            <TouchableOpacity
              onPress={() => setLanguage(lang === 'pt' ? 'en' : 'pt')}
              style={[styles.langToggle, { borderColor: palette.border }]}
            >
              <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 13 }}>
                {lang === 'pt' ? 'PT' : 'EN'}
              </Text>
            </TouchableOpacity>
          </View>
          <MenuItem
            icon="settings-outline"
            label={tr(lang, 'settings')}
            onPress={() => router.push('/(app)/settings/index')}
            color="#0369a1"
          />
        </View>

        {/* Sign Out */}
        <View style={[styles.group, { backgroundColor: palette.card, marginTop: Spacing.md }]}>
          <MenuItem
            icon="log-out-outline"
            label={lang === 'pt' ? 'Terminar Sessão' : 'Sign Out'}
            onPress={signOut}
            color={Colors.error}
          />
        </View>

        <Text style={[styles.version, { color: palette.textMuted }]}>
          Rest ERP v1.0 · Processado por Computador
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1,
  },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: FontSize.xl, fontWeight: '700' },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    margin: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg,
  },
  userAvatar: {
    width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center',
  },
  userInitials: { color: '#fff', fontWeight: '700', fontSize: 22 },
  userName: { fontWeight: '700', fontSize: FontSize.md },
  userEmail: { fontSize: FontSize.sm, marginTop: 2 },
  section: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1,
    marginHorizontal: Spacing.md, marginTop: Spacing.lg, marginBottom: 6,
  },
  group: { marginHorizontal: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: Spacing.md, borderBottomWidth: 0.5,
  },
  iconBox: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: FontSize.base, fontWeight: '500' },
  badge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  langToggle: {
    borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 4,
  },
  version: { textAlign: 'center', fontSize: 11, marginTop: 24 },
});
