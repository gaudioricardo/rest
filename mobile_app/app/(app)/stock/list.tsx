import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '../../../stores/dataStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useAuthStore } from '../../../stores/authStore';
import { Colors, Spacing, FontSize, Radius } from '../../../shared/theme';
import { tr, formatCurrency } from '../../../shared/i18n';
import { Badge, getStockVariant } from '../../../components/ui/Badge';
import { DeleteModal } from '../../../components/ui/DeleteModal';
import { useToast } from '../../../components/ui/ToastContainer';
import { deleteStockItem } from '../../../lib/db';
import { generateStockPdf, generateStockROIPdf, sharePdf } from '../../../lib/pdf';

export default function StockListScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { language, darkMode, company } = useSettingsStore();
  const { userId } = useAuthStore();
  const { stockItems, generalSales, loadStock } = useDataStore();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingRoi, setExportingRoi] = useState(false);

  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  const filtered = stockItems.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportPdf = async () => {
    if (!company || exporting) return;
    setExporting(true);
    try {
      const uri = await generateStockPdf(filtered, company, language);
      const filename = `Stock_${new Date().toISOString().slice(0, 10)}.pdf`;
      await sharePdf(uri, filename);
    } catch {
      showToast(language === 'pt' ? 'Erro ao gerar PDF' : 'Failed to generate PDF', '', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportROI = async () => {
    if (!company || exportingRoi) return;
    setExportingRoi(true);
    try {
      const uri = await generateStockROIPdf(filtered, generalSales, company, language);
      const filename = `Stock_ROI_${new Date().toISOString().slice(0, 10)}.pdf`;
      await sharePdf(uri, filename);
    } catch {
      showToast(language === 'pt' ? 'Erro ao gerar relatório ROI' : 'Failed to generate ROI report', '', 'error');
    } finally {
      setExportingRoi(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !userId) return;
    setDeleting(true);
    try {
      await deleteStockItem(deleteId);
      await loadStock(userId);
      showToast(lang === 'pt' ? 'Item eliminado' : 'Item deleted', undefined, 'info');
    } catch { showToast('Erro', '', 'error'); }
    finally { setDeleting(false); setDeleteId(null); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: palette.text }]}>{tr(lang, 'stock')}</Text>
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
            onPress={handleExportROI}
            disabled={exportingRoi}
            style={[styles.iconBtn, { backgroundColor: '#f0fdf4', borderColor: '#16a34a' }]}
          >
            {exportingRoi
              ? <ActivityIndicator size={14} color="#16a34a" />
              : <Ionicons name="bar-chart-outline" size={17} color="#16a34a" />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: Colors.primary }]}
            onPress={() => router.push('/(app)/stock/new')}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
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
            style={[styles.stockCard, { backgroundColor: palette.card, borderColor: palette.border }]}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={[{ fontWeight: '700', fontSize: FontSize.base, color: palette.text }]}>{item.name}</Text>
                <Badge label={lang === 'pt' ? item.statusPt : item.status} variant={getStockVariant(item.status)} />
              </View>
              <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>
                {item.sku} · {lang === 'pt' ? item.categoryPt : item.category} · {lang === 'pt' ? item.warehousePt : item.warehouse}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={[styles.progressBg, { backgroundColor: palette.surface }]}>
                  <View style={[styles.progressFill, {
                    width: `${item.maxStock > 0 ? Math.min(100, (item.stockLevel / item.maxStock) * 100) : 0}%` as any,
                    backgroundColor: item.status === 'Out of Stock' ? Colors.error : item.status === 'Low Stock' ? Colors.warning : Colors.success,
                  }]} />
                </View>
                <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '600', minWidth: 60, textAlign: 'right' }}>
                  {item.stockLevel}/{item.maxStock}
                </Text>
              </View>
              <Text style={{ color: palette.accent, fontWeight: '700', fontSize: FontSize.sm, marginTop: 4 }}>
                {formatCurrency(item.price)}
              </Text>
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
  iconBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.md, paddingVertical: 10, borderBottomWidth: 1,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm },
  list: { padding: Spacing.md },
  empty: { textAlign: 'center', marginTop: 48, fontSize: FontSize.sm },
  stockCard: {
    borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  progressBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', marginRight: 8 },
  progressFill: { height: '100%', borderRadius: 3 },
});
