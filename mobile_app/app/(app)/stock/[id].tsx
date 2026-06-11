import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '../../../stores/dataStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useAuthStore } from '../../../stores/authStore';
import { Colors, Spacing, Radius, FontSize } from '../../../shared/theme';
import { tr, formatCurrency } from '../../../shared/i18n';
import { Badge, getStockVariant } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { DeleteModal } from '../../../components/ui/DeleteModal';
import { useToast } from '../../../components/ui/ToastContainer';
import { updateStockItem, deleteStockItem } from '../../../lib/db';

export default function StockDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { language, darkMode } = useSettingsStore();
  const { userId } = useAuthStore();
  const { stockItems, loadStock } = useDataStore();

  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  const item = stockItems.find((s) => s.id === id);
  const [editing, setEditing] = useState(false);
  const [stockLevel, setStockLevel] = useState(String(item?.stockLevel ?? 0));
  const [price, setPrice] = useState(String(item?.price ?? 0));
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!item) return null;

  const pct = item.maxStock > 0 ? Math.min(100, (item.stockLevel / item.maxStock) * 100) : 0;

  const handleUpdate = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await updateStockItem(item.id, {
        stockLevel: parseInt(stockLevel) || 0,
        price: parseFloat(price) || 0,
      });
      await loadStock(userId);
      setEditing(false);
      showToast(lang === 'pt' ? 'Stock actualizado' : 'Stock updated', undefined, 'success');
    } catch { showToast('Erro', '', 'error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!userId) return;
    setDeleting(true);
    try {
      await deleteStockItem(item.id);
      await loadStock(userId);
      showToast(lang === 'pt' ? 'Item eliminado' : 'Item deleted', undefined, 'info');
      router.back();
    } catch { showToast('Erro', '', 'error'); }
    finally { setDeleting(false); setShowDelete(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>{item.name}</Text>
        <TouchableOpacity onPress={() => setShowDelete(true)}>
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={[styles.name, { color: palette.text }]}>{item.name}</Text>
            <Badge label={lang === 'pt' ? item.statusPt : item.status} variant={getStockVariant(item.status)} />
          </View>
          <Text style={[styles.sku, { color: palette.textMuted }]}>{item.sku}</Text>
          <Text style={[styles.cat, { color: palette.textSecondary }]}>
            {lang === 'pt' ? item.categoryPt : item.category} · {lang === 'pt' ? item.warehousePt : item.warehouse}
          </Text>
          <Text style={[styles.price, { color: Colors.primary }]}>{formatCurrency(item.price)}</Text>

          <View style={[styles.progressBg, { backgroundColor: palette.surface }]}>
            <View style={[styles.progressFill, {
              width: `${pct}%` as any,
              backgroundColor: item.status === 'Out of Stock' ? Colors.error : item.status === 'Low Stock' ? Colors.warning : Colors.success,
            }]} />
          </View>
          <Text style={[styles.levels, { color: palette.textSecondary }]}>
            {item.stockLevel} / {item.maxStock} {lang === 'pt' ? 'unidades' : 'units'} ({Math.round(pct)}%)
          </Text>
        </View>

        {editing ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.cardTitle, { color: palette.text }]}>
              {lang === 'pt' ? 'Actualizar Stock' : 'Update Stock'}
            </Text>
            <Input
              label={tr(lang, 'stockLevel')}
              value={stockLevel}
              onChangeText={setStockLevel}
              keyboardType="numeric"
            />
            <Input
              label={lang === 'pt' ? 'Preço (MT)' : 'Price (MT)'}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title={tr(lang, 'cancel')} onPress={() => setEditing(false)} variant="outline" style={{ flex: 1 }} />
              <Button title={tr(lang, 'save')} onPress={handleUpdate} loading={loading} style={{ flex: 1 }} />
            </View>
          </View>
        ) : (
          <Button
            title={lang === 'pt' ? 'Editar Stock' : 'Edit Stock'}
            onPress={() => setEditing(true)}
            variant="outline"
            icon={<Ionicons name="pencil-outline" size={18} color={Colors.primary} />}
          />
        )}
      </ScrollView>

      <DeleteModal visible={showDelete} onConfirm={handleDelete} onCancel={() => setShowDelete(false)} loading={deleting} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1,
  },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: FontSize.lg, fontWeight: '700', flex: 1, marginHorizontal: 8 },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, gap: 6 },
  cardTitle: { fontWeight: '700', fontSize: FontSize.base, marginBottom: 8 },
  name: { fontWeight: '700', fontSize: FontSize.md, flex: 1 },
  sku: { fontSize: 12 },
  cat: { fontSize: FontSize.sm },
  price: { fontWeight: '700', fontSize: FontSize.md },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  levels: { fontSize: 12, marginTop: 4, textAlign: 'right' },
});
