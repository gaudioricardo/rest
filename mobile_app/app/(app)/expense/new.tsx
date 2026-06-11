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
import { createExpense } from '../../../lib/db';

const CATEGORIES = [
  { en: 'Logistics', pt: 'Logística' },
  { en: 'Office Supplies', pt: 'Material de Escritório' },
  { en: 'Cloud Infrastructure', pt: 'Infraestrutura Cloud' },
  { en: 'Other', pt: 'Outro' },
];

export default function NewExpenseScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { userId } = useAuthStore();
  const { loadExpenses } = useDataStore();
  const { language, darkMode } = useSettingsStore();
  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!merchant.trim() || !amount) {
      showToast('Erro', 'Preencha fornecedor e valor', 'error');
      return;
    }
    if (!userId) return;
    setLoading(true);
    try {
      await createExpense(userId, {
        merchant: merchant.trim(),
        category: category.en,
        categoryPt: category.pt,
        amount: parseFloat(amount.replace(',', '.')) || 0,
        expenseDate,
        notes: notes || undefined,
      });
      await loadExpenses(userId);
      showToast(lang === 'pt' ? 'Despesa registada' : 'Expense recorded', undefined, 'success');
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
        <Text style={[styles.title, { color: palette.text }]}>{tr(lang, 'newExpense')}</Text>
        <Button title={tr(lang, 'save')} onPress={handleSubmit} loading={loading} size="sm" />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.section, { borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Despesa</Text>
            <Input label={tr(lang, 'merchant')} value={merchant} onChangeText={setMerchant} placeholder="Ex: Shoprite" />
            <Input label={lang === 'pt' ? 'Valor (MT)' : 'Amount (MT)'} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0.00" />
            <Input label={tr(lang, 'expenseDate')} value={expenseDate} onChangeText={setExpenseDate} placeholder="YYYY-MM-DD" />
          </View>

          <View style={[styles.section, { borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>{tr(lang, 'category')}</Text>
            <View style={styles.optGrid}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.en}
                  onPress={() => setCategory(c)}
                  style={[styles.optBtn, {
                    borderColor: category.en === c.en ? Colors.secondary : palette.border,
                    backgroundColor: category.en === c.en ? Colors.secondary : palette.surface,
                  }]}
                >
                  <Text style={{ color: category.en === c.en ? '#fff' : palette.text, fontSize: 12, fontWeight: '600' }}>
                    {lang === 'pt' ? c.pt : c.en}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.section, { borderColor: palette.border }]}>
            <Input label={tr(lang, 'notes')} value={notes} onChangeText={setNotes} placeholder="Observações (opcional)" multiline numberOfLines={3} style={{ height: 72, textAlignVertical: 'top' }} />
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
