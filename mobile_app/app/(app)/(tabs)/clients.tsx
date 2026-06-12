import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '../../../stores/dataStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { Colors, Spacing, FontSize, Radius } from '../../../shared/theme';
import { tr } from '../../../shared/i18n';
import { Badge } from '../../../components/ui/Badge';
import { getAvatarColor, getInitials } from '../../../shared/theme';

// Normalise phone for WhatsApp (adds Mozambique +258 if needed)
function toWAPhone(phone: string) {
  const clean = phone.replace(/[\s\-\(\)]/g, '');
  if (clean.startsWith('+')) return clean.slice(1);
  if (clean.startsWith('258')) return clean;
  if (clean.startsWith('0')) return '258' + clean.slice(1);
  return '258' + clean;
}

export default function ClientsScreen() {
  const router = useRouter();
  const { language, darkMode } = useSettingsStore();
  const { debtClients } = useDataStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Pendente' | 'Liquidado'>('All');

  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  const filtered = debtClients.filter((c) => {
    const matchSearch = c.fullName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || c.status === filter;
    return matchSearch && matchFilter;
  });

  const filters = [
    { key: 'All', label: lang === 'pt' ? 'Todos' : 'All' },
    { key: 'Pendente', label: 'Pendente' },
    { key: 'Liquidado', label: 'Liquidado' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        <Text style={[styles.title, { color: palette.text }]}>{tr(lang, 'clients')}</Text>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: Colors.primary }]}
          onPress={() => router.push('/(app)/client/new')}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newBtnText}>{tr(lang, 'newClient')}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBar, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
        <Ionicons name="search-outline" size={16} color={palette.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: palette.text }]}
          placeholder={tr(lang, 'search')}
          placeholderTextColor={palette.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={[styles.filters, { borderBottomColor: palette.border }]}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key as any)}
            style={[
              styles.pill,
              filter === f.key
                ? { backgroundColor: Colors.primary }
                : { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 },
            ]}
          >
            <Text style={{ color: filter === f.key ? '#fff' : palette.textSecondary, fontSize: 12, fontWeight: '600' }}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: palette.textMuted }]}>{tr(lang, 'noData')}</Text>
        }
        renderItem={({ item }) => {
          const primaryPhone = item.movitelNumber || item.vodacomNumber || '';
          const hasPhone = !!primaryPhone;

          return (
            <View style={[styles.clientCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              {/* Tap to navigate to detail */}
              <TouchableOpacity
                onPress={() => router.push(`/(app)/client/${item.id}`)}
                style={styles.cardMain}
                activeOpacity={0.75}
              >
                <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.fullName) }]}>
                  <Text style={styles.initials}>{getInitials(item.fullName)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: palette.text }]}>{item.fullName}</Text>
                  {item.movitelNumber ? (
                    <Text style={[styles.info, { color: palette.textMuted }]}>
                      <Ionicons name="call-outline" size={11} /> {item.movitelNumber}
                    </Text>
                  ) : null}
                  {item.address ? (
                    <Text style={[styles.info, { color: palette.textMuted }]} numberOfLines={1}>
                      {item.address}
                    </Text>
                  ) : null}
                </View>
                <Badge
                  label={item.status}
                  variant={item.status === 'Liquidado' ? 'success' : 'warning'}
                />
              </TouchableOpacity>

              {/* Action buttons — only rendered when there's a phone number */}
              {hasPhone && (
                <View style={[styles.actionsRow, { borderTopColor: palette.border }]}>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${primaryPhone}`)}
                    style={[styles.actionBtn, { backgroundColor: '#22c55e18' }]}
                  >
                    <Ionicons name="call" size={15} color="#22c55e" />
                    <Text style={[styles.actionLabel, { color: '#22c55e' }]}>
                      {lang === 'pt' ? 'Ligar' : 'Call'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => Linking.openURL(`whatsapp://send?phone=${toWAPhone(primaryPhone)}`)}
                    style={[styles.actionBtn, { backgroundColor: '#25D36618' }]}
                  >
                    <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
                    <Text style={[styles.actionLabel, { color: '#25D366' }]}>WhatsApp</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => Linking.openURL(`sms:${primaryPhone}`)}
                    style={[styles.actionBtn, { backgroundColor: palette.accent + '22' }]}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={15} color={palette.accent} />
                    <Text style={[styles.actionLabel, { color: palette.accent }]}>SMS</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1,
  },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: FontSize.xl, fontWeight: '700' },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: Radius.md,
  },
  newBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.md, paddingVertical: 10, borderBottomWidth: 1,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm },
  filters: { flexDirection: 'row', gap: 8, padding: Spacing.md, borderBottomWidth: 1 },
  pill: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: Radius.full },
  list: { padding: Spacing.md, paddingBottom: 120 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: FontSize.sm },
  clientCard: {
    borderRadius: Radius.lg, borderWidth: 1, marginBottom: Spacing.sm, overflow: 'hidden',
  },
  cardMain: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center',
  },
  initials: { color: '#fff', fontWeight: '700', fontSize: 14 },
  name: { fontWeight: '600', fontSize: FontSize.base },
  info: { fontSize: 12, marginTop: 2 },
  actionsRow: {
    flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.sm, paddingVertical: 6, gap: 6,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 7, borderRadius: Radius.md,
  },
  actionLabel: { fontSize: 12, fontWeight: '600' },
});
