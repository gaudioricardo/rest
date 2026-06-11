import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../stores/authStore';
import { useDataStore } from '../../../stores/dataStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { Colors, Spacing, Radius, FontSize } from '../../../shared/theme';
import { tr } from '../../../shared/i18n';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastContainer';
import { createStockItem } from '../../../lib/db';

const CATEGORIES = [
  { en: 'Hardware', pt: 'Hardware' },
  { en: 'Accessories', pt: 'Acessórios' },
  { en: 'Structural', pt: 'Estrutural' },
  { en: 'Infrastructure', pt: 'Infraestrutura' },
];

const WAREHOUSES = [
  { en: 'Primary Hub (Maputo)', pt: 'Hub Principal (Maputo)' },
  { en: 'Beira Annex', pt: 'Anexo de Beira' },
];

export default function NewStockScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { userId } = useAuthStore();
  const { loadStock } = useDataStore();
  const { language, darkMode } = useSettingsStore();
  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [warehouse, setWarehouse] = useState(WAREHOUSES[0]);
  const [stockLevel, setStockLevel] = useState('');
  const [maxStock, setMaxStock] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !stockLevel || !maxStock) {
      showToast('Erro', 'Preencha nome, stock e máximo', 'error');
      return;
    }
    if (!userId) return;
    setLoading(true);
    try {
      await createStockItem(userId, {
        name: name.trim(),
        sku: sku.trim(),
        category: category.en,
        categoryPt: category.pt,
        stockLevel: parseInt(stockLevel) || 0,
        maxStock: parseInt(maxStock) || 0,
        price: parseFloat(price) || 0,
        warehouse: warehouse.en,
        warehousePt: warehouse.pt,
      });
      await loadStock(userId);
      showToast(lang === 'pt' ? 'Item adicionado' : 'Item added', undefined, 'success');
      router.back();
    } catch (e) {
      showToast('Erro', String(e), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: palette.text }]}>{tr(lang, 'newStock')}</Text>
        <Button title={tr(lang, 'save')} onPress={handleSubmit} loading={loading} size="sm" />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.section, { borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Produto</Text>
            <Input label={lang === 'pt' ? 'Nome do Produto' : 'Product Name'} value={name} onChangeText={setName} placeholder="Ex: Cabo HDMI" />
            <Input label={tr(lang, 'sku')} value={sku} onChangeText={setSku} placeholder="SKU-001" />
            <Input label={lang === 'pt' ? 'Preço (MT)' : 'Price (MT)'} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="0.00" />
          </View>

          <View style={[styles.section, { borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Stock</Text>
            <Input label={tr(lang, 'stockLevel')} value={stockLevel} onChangeText={setStockLevel} keyboardType="numeric" placeholder="0" />
            <Input label={tr(lang, 'maxStock')} value={maxStock} onChangeText={setMaxStock} keyboardType="numeric" placeholder="100" />
          </View>

          <View style={[styles.section, { borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>{tr(lang, 'category')}</Text>
            <View style={styles.optGrid}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.en}
                  onPress={() => setCategory(c)}
                  style={[styles.optBtn, { borderColor: category.en === c.en ? Colors.primary : palette.border, backgroundColor: category.en === c.en ? Colors.primary : palette.surface }]}
                >
                  <Text style={{ color: category.en === c.en ? '#fff' : palette.text, fontSize: 12, fontWeight: '600' }}>
                    {lang === 'pt' ? c.pt : c.en}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.section, { borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>{tr(lang, 'warehouse')}</Text>
            <View style={styles.optGrid}>
              {WAREHOUSES.map((w) => (
                <TouchableOpacity
                  key={w.en}
                  onPress={() => setWarehouse(w)}
                  style={[styles.optBtn, { borderColor: warehouse.en === w.en ? Colors.secondary : palette.border, backgroundColor: warehouse.en === w.en ? Colors.secondary : palette.surface }]}
                >
                  <Text style={{ color: warehouse.en === w.en ? '#fff' : palette.text, fontSize: 12, fontWeight: '600' }}>
                    {lang === 'pt' ? w.pt : w.en}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1,
  },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: FontSize.lg, fontWeight: '700' },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 48 },
  section: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: 4 },
  sectionTitle: { fontWeight: '700', fontSize: FontSize.sm, marginBottom: 8 },
  optGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.md, borderWidth: 1 },
});
