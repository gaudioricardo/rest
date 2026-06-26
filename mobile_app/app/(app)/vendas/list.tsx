import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '../../../stores/dataStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useAuthStore } from '../../../stores/authStore';
import { Colors, Spacing, FontSize, Radius } from '../../../shared/theme';
import { formatCurrency } from '../../../shared/i18n';
import { DeleteModal } from '../../../components/ui/DeleteModal';
import { useToast } from '../../../components/ui/ToastContainer';
import { deleteGeneralSale } from '../../../lib/db';
import { generateGeneralSalesPdf, sharePdf } from '../../../lib/pdf';
import type { GeneralSale } from '../../../shared/types';

export default function VendasListScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { language, darkMode, company } = useSettingsStore();
  const { userId } = useAuthStore();
  const { generalSales, loadGeneralSales, loadStock } = useDataStore();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const palette = darkMode ? Colors.dark : Colors.light;
  const isEn = language === 'en';

  useFocusEffect(
    React.useCallback(() => {
      if (userId) loadGeneralSales(userId);
    }, [userId])
  );

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = generalSales.filter(s => s.saleDate === todayStr);
  const todayTotal = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);

  const handleExportPdf = async () => {
    if (!company || exporting) return;
    setExporting(true);
    try {
      const uri = await generateGeneralSalesPdf(generalSales, company, language);
      const filename = `Vendas_Gerais_${new Date().toISOString().slice(0, 10)}.pdf`;
      await sharePdf(uri, filename);
    } catch {
      showToast(isEn ? 'Failed to generate PDF' : 'Erro ao gerar PDF', '', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !userId) return;
    setDeleting(true);
    try {
      await deleteGeneralSale(deleteId);
      await loadGeneralSales(userId);
      showToast(isEn ? 'Sale deleted' : 'Venda eliminada', '', 'info');
    } catch {
      showToast('Erro', '', 'error');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const renderItem = ({ item }: { item: GeneralSale }) => (
    <TouchableOpacity
      onLongPress={() => setDeleteId(item.id)}
      style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={[styles.ref, { color: palette.accent }]}>{item.ref}</Text>
        <Text style={[styles.total, { color: palette.text }]}>{formatCurrency(item.totalAmount)}</Text>
      </View>
      <Text style={[styles.productName, { color: palette.text }]}>{item.productName}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={[styles.meta, { color: palette.textMuted }]}>
          {item.sku || '—'} · {item.quantity}× {formatCurrency(item.unitPrice)} · {item.paymentMethod}
        </Text>
        <Text style={[styles.meta, { color: palette.textMuted }]}>{isEn ? item.date : item.datePt}</Text>
      </View>
      {item.notes ? <Text style={[styles.notes, { color: palette.textMuted }]}>{item.notes}</Text> : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: palette.text }]}>{isEn ? 'General Sales' : 'Vendas Gerais'}</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={handleExportPdf}
            disabled={exporting}
            style={[styles.iconBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            {exporting
              ? <ActivityIndicator size={14} color={palette.textMuted} />
              : <Ionicons name="share-outline" size={17} color={palette.accent} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: Colors.primary }]}
            onPress={() => router.push('/(app)/vendas/new')}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Today's summary */}
      <View style={[styles.todayCard, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        <Text style={[styles.todayLabel, { color: palette.textMuted }]}>{isEn ? "Today's Revenue" : 'Receita de Hoje'}</Text>
        <Text style={[styles.todayValue, { color: palette.text }]}>{formatCurrency(todayTotal)}</Text>
        <Text style={[styles.todayMeta, { color: palette.textMuted }]}>{todaySales.length} {isEn ? 'sales' : 'vendas'}</Text>
      </View>

      <FlatList
        data={generalSales}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: palette.textMuted }]}>
            {isEn ? 'No sales yet. Tap + to register a sale.' : 'Nenhuma venda registada. Toque + para registar.'}
          </Text>
        }
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
  iconBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  newBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  todayCard: {
    padding: Spacing.md, borderBottomWidth: 1,
  },
  todayLabel: { fontSize: FontSize.xs, fontWeight: '600', marginBottom: 2 },
  todayValue: { fontSize: 22, fontWeight: '800', fontFamily: 'PlayfairDisplay_700Bold' },
  todayMeta: { fontSize: FontSize.xs, marginTop: 2 },
  list: { padding: Spacing.md, gap: Spacing.sm },
  card: {
    borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md,
  },
  ref: { fontSize: 11, fontFamily: 'monospace', fontWeight: '700' },
  total: { fontSize: FontSize.base, fontWeight: '800' },
  productName: { fontSize: FontSize.sm, fontWeight: '600' },
  meta: { fontSize: 11 },
  notes: { fontSize: 10, marginTop: 4, fontStyle: 'italic' },
  empty: { textAlign: 'center', marginTop: 48, fontSize: FontSize.sm, paddingHorizontal: Spacing.lg },
});
