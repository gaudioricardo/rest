import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '../../../stores/dataStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useAuthStore } from '../../../stores/authStore';
import { Colors, Spacing, FontSize, Radius } from '../../../shared/theme';
import { formatCurrency } from '../../../shared/i18n';
import { useToast } from '../../../components/ui/ToastContainer';
import { createGeneralSale } from '../../../lib/db';
import type { StockItem, PaymentMethod } from '../../../shared/types';

export default function NewVendaScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { language, darkMode } = useSettingsStore();
  const { userId } = useAuthStore();
  const { stockItems, loadGeneralSales, loadStock } = useDataStore();

  const palette = darkMode ? Colors.dark : Colors.light;
  const isEn = language === 'en';

  const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(null);
  const [productName, setProductName] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Físico');
  const [notes, setNotes] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const handleSelectProduct = (item: StockItem) => {
    setSelectedProduct(item);
    setProductName(item.name);
    setSku(item.sku);
    setUnitPrice(String(item.price));
    setShowPicker(false);
  };

  const handleClearProduct = () => {
    setSelectedProduct(null);
    setProductName('');
    setSku('');
    setUnitPrice('');
  };

  const computedTotal = (parseInt(quantity) || 0) * (parseFloat(unitPrice) || 0);

  const handleSubmit = async () => {
    if (!productName.trim() || !unitPrice.trim()) {
      showToast(isEn ? 'Fill product name and price' : 'Preencha o nome do produto e o preço', '', 'error');
      return;
    }
    const qty = parseInt(quantity) || 1;
    const price = parseFloat(unitPrice);
    if (isNaN(price) || price <= 0) {
      showToast(isEn ? 'Invalid price' : 'Preço inválido', '', 'error');
      return;
    }
    if (!userId) return;

    setSubmitting(true);
    try {
      const result = await createGeneralSale({
        userId,
        productId: selectedProduct?.id,
        productName: productName.trim(),
        sku: sku.trim(),
        quantity: qty,
        unitPrice: price,
        saleDate,
        paymentMethod,
        notes: notes.trim() || undefined,
      });

      if (result) {
        await loadGeneralSales(userId);
        if (selectedProduct) await loadStock(userId);
        showToast(isEn ? 'Sale registered' : 'Venda registada', '', 'success');
        router.back();
      } else {
        showToast(isEn ? 'Failed to register sale' : 'Erro ao registar venda', '', 'error');
      }
    } catch {
      showToast(isEn ? 'Unexpected error' : 'Erro inesperado', '', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={palette.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: palette.text }]}>{isEn ? 'New Sale' : 'Nova Venda'}</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Product picker */}
          <Text style={[styles.label, { color: palette.textMuted }]}>
            {isEn ? 'STOCK PRODUCT (OPTIONAL)' : 'PRODUTO DO STOCK (OPCIONAL)'}
          </Text>
          <TouchableOpacity
            style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border }]}
            onPress={() => setShowPicker(v => !v)}
          >
            <Text style={{ color: selectedProduct ? palette.text : palette.textMuted, fontSize: FontSize.sm }}>
              {selectedProduct
                ? `${selectedProduct.name} (${selectedProduct.sku}) — Stock: ${selectedProduct.stockLevel}`
                : isEn ? '— Free entry (no stock link) —' : '— Entrada livre (sem ligação ao stock) —'}
            </Text>
            <Ionicons name={showPicker ? 'chevron-up' : 'chevron-down'} size={16} color={palette.textMuted} />
          </TouchableOpacity>

          {showPicker && (
            <View style={[styles.pickerList, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <TouchableOpacity
                style={[styles.pickerItem, { borderBottomColor: palette.border }]}
                onPress={handleClearProduct}
              >
                <Text style={{ color: palette.textMuted, fontSize: FontSize.sm, fontStyle: 'italic' }}>
                  {isEn ? '— No stock link —' : '— Sem ligação ao stock —'}
                </Text>
              </TouchableOpacity>
              {stockItems.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.pickerItem, { borderBottomColor: palette.border }]}
                  onPress={() => handleSelectProduct(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickerItemName, { color: palette.text }]}>{item.name}</Text>
                    <Text style={{ color: palette.textMuted, fontSize: 11 }}>
                      {item.sku} · Stock: {item.stockLevel} · {formatCurrency(item.price)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Product name */}
          <Text style={[styles.label, { color: palette.textMuted }]}>
            {isEn ? 'PRODUCT NAME *' : 'NOME DO PRODUTO *'}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
            value={productName}
            onChangeText={setProductName}
            placeholder={isEn ? 'Product name...' : 'Nome do produto...'}
            placeholderTextColor={palette.textMuted}
          />

          {/* SKU + Quantity row */}
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: palette.textMuted }]}>SKU</Text>
              <TextInput
                style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
                value={sku}
                onChangeText={setSku}
                placeholder="SKU-001"
                placeholderTextColor={palette.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: palette.textMuted }]}>
                {isEn ? 'QUANTITY *' : 'QUANTIDADE *'}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor={palette.textMuted}
              />
            </View>
          </View>

          {/* Unit price */}
          <Text style={[styles.label, { color: palette.textMuted }]}>
            {isEn ? 'UNIT PRICE (MT) *' : 'PREÇO UNITÁRIO (MT) *'}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
            value={unitPrice}
            onChangeText={setUnitPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={palette.textMuted}
          />

          {/* Computed total */}
          {computedTotal > 0 && (
            <View style={[styles.totalRow, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={{ color: palette.textMuted, fontSize: FontSize.sm }}>Total:</Text>
              <Text style={{ color: palette.text, fontSize: FontSize.md, fontWeight: '800' }}>
                {formatCurrency(computedTotal)}
              </Text>
            </View>
          )}

          {/* Sale date */}
          <Text style={[styles.label, { color: palette.textMuted }]}>
            {isEn ? 'SALE DATE' : 'DATA DA VENDA'}
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
            value={saleDate}
            onChangeText={setSaleDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={palette.textMuted}
          />

          {/* Payment method */}
          <Text style={[styles.label, { color: palette.textMuted }]}>
            {isEn ? 'PAYMENT METHOD' : 'MÉTODO DE PAGAMENTO'}
          </Text>
          <View style={styles.methodRow}>
            {(['Físico', 'M-Pesa', 'E-mola', 'Banco'] as PaymentMethod[]).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setPaymentMethod(m)}
                style={[
                  styles.methodBtn,
                  { borderColor: paymentMethod === m ? Colors.primary : palette.border },
                  paymentMethod === m && { backgroundColor: Colors.primary },
                ]}
              >
                <Text style={[
                  styles.methodBtnText,
                  { color: paymentMethod === m ? '#fff' : palette.textMuted },
                ]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={[styles.label, { color: palette.textMuted }]}>
            {isEn ? 'NOTES (OPTIONAL)' : 'NOTAS (OPCIONAL)'}
          </Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
            value={notes}
            onChangeText={setNotes}
            placeholder={isEn ? 'Optional notes...' : 'Notas opcionais...'}
            placeholderTextColor={palette.textMuted}
            multiline
            numberOfLines={3}
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: Colors.primary, opacity: submitting ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={styles.submitText}>
              {submitting
                ? (isEn ? 'Registering...' : 'A registar...')
                : (isEn ? 'Register Sale' : 'Registar Venda')}
            </Text>
          </TouchableOpacity>
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
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: FontSize.xl, fontWeight: '700' },
  scroll: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 40 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4, marginTop: 8 },
  input: {
    borderWidth: 1, borderRadius: Radius.md, padding: 12, fontSize: FontSize.sm,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  textArea: { height: 72, textAlignVertical: 'top' },
  pickerList: {
    borderWidth: 1, borderRadius: Radius.md, overflow: 'hidden', marginTop: 4, marginBottom: 4,
  },
  pickerItem: {
    padding: 12, borderBottomWidth: 1,
  },
  pickerItemName: { fontWeight: '600', fontSize: FontSize.sm },
  totalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: Radius.md, padding: 12,
  },
  methodRow: { flexDirection: 'row', gap: 8 },
  methodBtn: {
    flex: 1, paddingVertical: 10, borderWidth: 1.5, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  methodBtnText: { fontSize: 11, fontWeight: '700' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderRadius: Radius.md, marginTop: Spacing.md,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: FontSize.base },
});
