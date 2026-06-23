import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Modal, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '../../../stores/dataStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useAuthStore } from '../../../stores/authStore';
import { Colors, Spacing, Radius, FontSize } from '../../../shared/theme';
import { formatCurrency, formatDate } from '../../../shared/i18n';
import { DeleteModal } from '../../../components/ui/DeleteModal';
import { useToast } from '../../../components/ui/ToastContainer';
import { deleteExpense } from '../../../lib/db';
import { fetchReceiptLocalUri } from '../../../lib/b2';

const SCREEN_W = Dimensions.get('window').width;

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { language, darkMode } = useSettingsStore();
  const { userId } = useAuthStore();
  const { expenses, loadExpenses } = useDataStore();

  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState(false);

  const lang = language;
  const palette = darkMode ? Colors.dark : Colors.light;
  const expense = expenses.find((e) => e.id === id);

  if (!expense) return null;

  const statusColor = expense.status === 'Approved'
    ? Colors.success
    : expense.status === 'Rejected'
    ? Colors.error
    : Colors.warning;

  const handleDelete = async () => {
    if (!userId) return;
    setDeleting(true);
    try {
      await deleteExpense(expense.id);
      await loadExpenses(userId);
      showToast(lang === 'pt' ? 'Despesa eliminada' : 'Expense deleted', undefined, 'info');
      router.back();
    } catch {
      showToast('Erro', '', 'error');
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const handleViewReceipt = async () => {
    if (!expense.receiptImageUrl) return;
    setReceiptLoading(true);
    setReceiptError(false);
    console.log('[ExpenseDetail] handleViewReceipt started, url:', expense.receiptImageUrl);
    try {
      const localUri = await fetchReceiptLocalUri(expense.receiptImageUrl);
      console.log('[ExpenseDetail] fetchReceiptLocalUri OK:', localUri);
      setPreviewUri(localUri);
    } catch (err) {
      console.error('[ExpenseDetail] fetchReceiptLocalUri FAILED:', err instanceof Error ? err.message : err);
      setReceiptError(true);
      showToast(lang === 'pt' ? 'Erro ao carregar comprovativo' : 'Could not load receipt', '', 'error');
    } finally {
      setReceiptLoading(false);
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: palette.background }]}>

      {/* Header */}
      <View style={[s.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: palette.text }]}>{expense.ref}</Text>
        <TouchableOpacity onPress={() => setShowDelete(true)} style={s.headerBtn}>
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero card */}
        <View style={[s.hero, { backgroundColor: Colors.secondary }]}>
          <Text style={s.heroLabel}>{lang === 'pt' ? 'DESPESA' : 'EXPENSE'}</Text>
          <Text style={s.heroAmount}>{formatCurrency(expense.amount)}</Text>
          <Text style={s.heroMerchant}>{expense.merchant}</Text>
          <Text style={s.heroDate}>{formatDate(expense.expenseDate, lang)}</Text>
          <View style={[s.heroBadge, { backgroundColor: 'rgba(0,0,0,0.25)' }]}>
            <Text style={s.heroBadgeText}>
              {lang === 'pt' ? expense.statusPt : expense.status}
            </Text>
          </View>
        </View>

        {/* Info card */}
        <View style={[s.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Row label={lang === 'pt' ? 'Referência' : 'Reference'} value={expense.ref} palette={palette} mono />
          <Row label={lang === 'pt' ? 'Categoria' : 'Category'} value={lang === 'pt' ? expense.categoryPt : expense.category} palette={palette} />
          <Row label={lang === 'pt' ? 'Data' : 'Date'} value={formatDate(expense.expenseDate, lang)} palette={palette} />
          <Row
            label={lang === 'pt' ? 'Estado' : 'Status'}
            value={lang === 'pt' ? expense.statusPt : expense.status}
            palette={palette}
            valueColor={statusColor}
          />
          {expense.notes && (
            <View style={s.notesRow}>
              <Text style={[s.rowLabel, { color: palette.textMuted }]}>{lang === 'pt' ? 'Notas' : 'Notes'}</Text>
              <Text style={[s.notes, { color: palette.textSecondary }]}>{expense.notes}</Text>
            </View>
          )}
        </View>

        {/* Comprovativo section */}
        <View style={[s.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={s.receiptHeader}>
            <Ionicons name="receipt-outline" size={16} color={Colors.secondary} />
            <Text style={[s.receiptTitle, { color: palette.text }]}>
              {lang === 'pt' ? 'Comprovativo' : 'Receipt'}
            </Text>
          </View>

          {expense.receiptImageUrl ? (
            <TouchableOpacity
              style={[s.receiptBtn, { borderColor: palette.border, backgroundColor: palette.surface, opacity: receiptLoading ? 0.6 : 1 }]}
              onPress={handleViewReceipt}
              disabled={receiptLoading}
              activeOpacity={0.7}
            >
              {receiptLoading
                ? <ActivityIndicator size="small" color={Colors.secondary} />
                : <Ionicons name={receiptError ? 'alert-circle-outline' : 'eye-outline'} size={18} color={receiptError ? Colors.error : Colors.secondary} />
              }
              <Text style={[s.receiptBtnText, { color: receiptError ? Colors.error : Colors.secondary }]}>
                {receiptLoading
                  ? (lang === 'pt' ? 'A carregar…' : 'Loading…')
                  : receiptError
                  ? (lang === 'pt' ? 'Tentar novamente' : 'Retry')
                  : (lang === 'pt' ? 'Ver comprovativo' : 'View receipt')}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={[s.noReceipt, { backgroundColor: palette.surface }]}>
              <Ionicons name="image-outline" size={22} color={palette.textMuted} />
              <Text style={[s.noReceiptText, { color: palette.textMuted }]}>
                {lang === 'pt' ? 'Sem comprovativo anexado' : 'No receipt attached'}
              </Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Full-screen receipt preview */}
      <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <View style={s.previewOverlay}>
          <TouchableOpacity style={s.previewClose} onPress={() => setPreviewUri(null)} activeOpacity={0.8}>
            <Ionicons name="close-circle" size={38} color="#fff" />
          </TouchableOpacity>
          {previewUri && (
            <Image
              source={{ uri: previewUri }}
              style={s.previewImg}
              resizeMode="contain"
            />
          )}
          <View style={s.previewLabel}>
            <Ionicons name="receipt-outline" size={13} color="rgba(255,255,255,0.5)" />
            <Text style={s.previewLabelText}>{expense.ref} · {expense.merchant}</Text>
          </View>
        </View>
      </Modal>

      <DeleteModal
        visible={showDelete}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        loading={deleting}
      />
    </SafeAreaView>
  );
}

function Row({
  label, value, palette, mono, valueColor,
}: {
  label: string;
  value: string;
  palette: typeof Colors.light;
  mono?: boolean;
  valueColor?: string;
}) {
  return (
    <View style={s.infoRow}>
      <Text style={[s.rowLabel, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[s.rowValue, { color: valueColor ?? palette.text, fontFamily: mono ? 'monospace' : undefined }]}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1,
  },
  headerBtn: { width: 36, alignItems: 'center' },
  headerTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: FontSize.lg, fontWeight: '700', flex: 1, textAlign: 'center' },

  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 48 },

  hero: {
    borderRadius: Radius.xl, padding: Spacing.lg,
    alignItems: 'center', gap: 6,
  },
  heroLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  heroAmount: { color: '#fff', fontSize: 38, fontWeight: '800', fontFamily: 'PlayfairDisplay_700Bold' },
  heroMerchant: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.md, fontWeight: '600', textAlign: 'center' },
  heroDate: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.sm, marginTop: 2 },
  heroBadge: { marginTop: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  heroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  card: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, gap: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rowLabel: { fontSize: FontSize.sm, flex: 1 },
  rowValue: { fontSize: FontSize.sm, fontWeight: '600', flex: 2, textAlign: 'right' },
  notesRow: { gap: 4 },
  notes: { fontSize: FontSize.sm, lineHeight: 20 },

  receiptHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  receiptTitle: { fontSize: FontSize.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  receiptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1, borderRadius: Radius.md,
    paddingVertical: 12, paddingHorizontal: Spacing.md,
  },
  receiptBtnText: { fontSize: FontSize.sm, fontWeight: '700' },
  noReceipt: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: Radius.md, paddingVertical: 14,
  },
  noReceiptText: { fontSize: FontSize.sm },

  previewOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.93)',
    justifyContent: 'center', alignItems: 'center',
  },
  previewClose: { position: 'absolute', top: 52, right: 18, zIndex: 10 },
  previewImg: { width: SCREEN_W - 24, height: SCREEN_W * 1.3 },
  previewLabel: {
    position: 'absolute', bottom: 40,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  previewLabelText: { color: 'rgba(255,255,255,0.45)', fontSize: 11 },
});
