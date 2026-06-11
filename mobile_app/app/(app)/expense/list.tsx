import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '../../../stores/dataStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useAuthStore } from '../../../stores/authStore';
import { Colors, Spacing, FontSize, Radius } from '../../../shared/theme';
import { tr, formatCurrency, formatDate } from '../../../shared/i18n';
import { Badge } from '../../../components/ui/Badge';
import { DeleteModal } from '../../../components/ui/DeleteModal';
import { useToast } from '../../../components/ui/ToastContainer';
import { deleteExpense } from '../../../lib/db';

export default function ExpenseListScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { language, darkMode } = useSettingsStore();
  const { userId } = useAuthStore();
  const { expenses, loadExpenses } = useDataStore();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  const filtered = expenses.filter((e) => e.merchant.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async () => {
    if (!deleteId || !userId) return;
    setDeleting(true);
    try {
      await deleteExpense(deleteId);
      await loadExpenses(userId);
      showToast(lang === 'pt' ? 'Despesa eliminada' : 'Expense deleted', undefined, 'info');
    } catch { showToast('Erro', '', 'error'); }
    finally { setDeleting(false); setDeleteId(null); }
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: palette.text }]}>{tr(lang, 'expenses')}</Text>
          <Text style={[{ fontSize: 11, color: Colors.error, fontWeight: '600' }]}>
            {lang === 'pt' ? 'Total: ' : 'Total: '}{formatCurrency(totalExpenses)}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: Colors.secondary }]}
          onPress={() => router.push('/(app)/expense/new')}
        >
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBar, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
        <Ionicons name="search-outline" size={16} color={palette.textMuted} />
        <TextInput style={[styles.searchInput, { color: palette.text }]} placeholder={tr(lang, 'search')} placeholderTextColor={palette.textMuted} value={search} onChangeText={setSearch} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={[styles.empty, { color: palette.textMuted }]}>{tr(lang, 'noData')}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            onLongPress={() => setDeleteId(item.id)}
            style={[styles.expCard, { backgroundColor: palette.card, borderColor: palette.border }]}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[{ fontWeight: '700', color: palette.text, fontSize: FontSize.base }]}>{item.merchant}</Text>
                <Text style={[{ fontWeight: '700', color: Colors.error, fontSize: FontSize.sm }]}>{formatCurrency(item.amount)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                  {item.ref} · {lang === 'pt' ? item.categoryPt : item.category} · {formatDate(item.expenseDate, lang)}
                </Text>
                <Badge
                  label={lang === 'pt' ? item.statusPt : item.status}
                  variant={item.status === 'Approved' ? 'success' : item.status === 'Rejected' ? 'error' : 'warning'}
                />
              </View>
              {item.notes && <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: 4 }}>{item.notes}</Text>}
            </View>
          </TouchableOpacity>
        )}
      />

      <DeleteModal visible={!!deleteId} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} loading={deleting} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1,
  },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: FontSize.xl, fontWeight: '700' },
  newBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.md, paddingVertical: 10, borderBottomWidth: 1,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm },
  list: { padding: Spacing.md },
  empty: { textAlign: 'center', marginTop: 48 },
  expCard: {
    borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm,
  },
});
