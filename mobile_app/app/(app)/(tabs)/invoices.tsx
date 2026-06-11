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
import { getInvoiceVariant } from '../../../components/ui/Badge';

export default function InvoicesScreen() {
  const router = useRouter();
  const { language, darkMode } = useSettingsStore();
  const { invoices } = useDataStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Paid' | 'Pending' | 'Overdue'>('All');

  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  const filtered = invoices.filter((inv) => {
    const matchSearch = inv.client.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || inv.status === filter;
    return matchSearch && matchFilter;
  });

  const filterLabels = [
    { key: 'All', label: lang === 'pt' ? 'Todos' : 'All' },
    { key: 'Paid', label: lang === 'pt' ? 'Pagos' : 'Paid' },
    { key: 'Pending', label: lang === 'pt' ? 'Pendentes' : 'Pending' },
    { key: 'Overdue', label: lang === 'pt' ? 'Vencidos' : 'Overdue' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        <Text style={[styles.title, { color: palette.text }]}>{tr(lang, 'invoices')}</Text>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: Colors.primary }]}
          onPress={() => router.push('/(app)/invoice/new')}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newBtnText}>{tr(lang, 'newInvoice')}</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
        <Ionicons name="search-outline" size={16} color={palette.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: palette.text }]}
          placeholder={tr(lang, 'search')}
          placeholderTextColor={palette.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={palette.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Pills */}
      <View style={[styles.filters, { borderBottomColor: palette.border }]}>
        {filterLabels.map((f) => (
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
        renderItem={({ item }) => (
          <DocumentListItem
            number={item.invoiceNumber}
            client={item.client}
            initials={item.initials}
            avatarColor={item.logoBg}
            date={formatDate(item.issueDate, lang)}
            amount={formatCurrency(item.amount)}
            statusLabel={lang === 'pt' ? item.statusPt : item.status}
            statusVariant={getInvoiceVariant(item.status)}
            onPress={() => router.push(`/(app)/invoice/${item.id}`)}
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
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold', fontSize: FontSize.xl, fontWeight: '700',
  },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: Radius.md,
  },
  newBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm },
  filters: {
    flexDirection: 'row', gap: 8, padding: Spacing.md, borderBottomWidth: 1,
  },
  pill: {
    paddingVertical: 5, paddingHorizontal: 12, borderRadius: Radius.full,
  },
  list: { padding: Spacing.md },
  empty: { textAlign: 'center', marginTop: 48, fontSize: FontSize.sm },
});
