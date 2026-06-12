import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '../../../stores/dataStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { Colors, Spacing, FontSize, Radius } from '../../../shared/theme';
import { tr, formatCurrency, formatDate } from '../../../shared/i18n';
import { DocumentListItem } from '../../../components/ui/DocumentListItem';
import { getInitials, getAvatarColor } from '../../../shared/theme';
import { TAB_BAR_BOTTOM_INSET } from '../../../components/ui/TabBar';

export default function ReceiptsScreen() {
  const router = useRouter();
  const { language, darkMode } = useSettingsStore();
  const { receipts } = useDataStore();
  const [search, setSearch] = useState('');

  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  const filtered = receipts.filter((r) =>
    r.client.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        <Text style={[styles.title, { color: palette.text }]}>{tr(lang, 'receipts')}</Text>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: Colors.primary }]}
          onPress={() => router.push('/(app)/receipt/new')}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newBtnText}>{tr(lang, 'newReceipt')}</Text>
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

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: palette.textMuted }]}>{tr(lang, 'noData')}</Text>
        }
        renderItem={({ item }) => (
          <DocumentListItem
            number={item.receiptNumber}
            client={item.client}
            initials={getInitials(item.client)}
            avatarColor={getAvatarColor(item.client)}
            date={formatDate(item.paymentDate, lang)}
            amount={formatCurrency(item.amount)}
            statusLabel={item.methodPt || item.method}
            statusVariant="info"
            onPress={() => router.push(`/(app)/receipt/${item.id}`)}
          />
        )}
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
  list: { padding: Spacing.md, paddingBottom: TAB_BAR_BOTTOM_INSET },
  empty: { textAlign: 'center', marginTop: 48, fontSize: FontSize.sm },
});
