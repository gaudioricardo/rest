import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../../stores/authStore';
import { useDataStore } from '../../../stores/dataStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { Colors, Spacing, Radius, FontSize } from '../../../shared/theme';
import { tr } from '../../../shared/i18n';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastContainer';
import { createExpense } from '../../../lib/db';
import { uploadReceiptImage } from '../../../lib/b2';

const CATEGORIES = [
  { en: 'Logistics', pt: 'Logística' },
  { en: 'Raw Materials', pt: 'Matéria Prima' },
  { en: 'Communication & Internet', pt: 'Comunicação e Internet' },
  { en: 'Transport', pt: 'Transporte' },
  { en: 'Office Supplies', pt: 'Material de Escritório' },
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
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast(lang === 'pt' ? 'Permissão negada' : 'Permission denied', undefined, 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast(lang === 'pt' ? 'Permissão negada' : 'Permission denied', undefined, 'error');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!merchant.trim() || !amount) {
      showToast('Erro', 'Preencha fornecedor e valor', 'error');
      return;
    }
    if (!userId) return;
    setLoading(true);
    try {
      let receiptImageUrl: string | undefined;
      if (receiptUri) {
        setUploading(true);
        try {
          receiptImageUrl = await uploadReceiptImage(receiptUri, userId);
        } catch (e) {
          showToast(
            lang === 'pt' ? 'Erro de upload' : 'Upload error',
            String(e),
            'error',
          );
          setUploading(false);
          setLoading(false);
          return;
        }
        setUploading(false);
      }

      await createExpense(userId, {
        merchant: merchant.trim(),
        category: category.en,
        categoryPt: category.pt,
        amount: parseFloat(amount.replace(',', '.')) || 0,
        expenseDate,
        notes: notes || undefined,
        receiptImageUrl,
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

          {/* Receipt image upload */}
          <View style={[styles.section, { borderColor: Colors.primary, borderStyle: 'dashed' }]}>
            <View style={styles.receiptHeader}>
              <Ionicons name="attach-outline" size={16} color={Colors.primary} />
              <Text style={[styles.sectionTitle, { color: Colors.primary, marginBottom: 0 }]}>
                {lang === 'pt' ? 'Comprovativo / Recibo (opcional)' : 'Receipt / Proof of Payment (optional)'}
              </Text>
            </View>

            {receiptUri ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: receiptUri }} style={styles.previewImage} resizeMode="cover" />
                <View style={styles.previewActions}>
                  <Text style={[styles.previewLabel, { color: palette.text }]}>
                    {lang === 'pt' ? 'Imagem seleccionada' : 'Image selected'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setReceiptUri(null)}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="close-circle" size={18} color="#ef4444" />
                    <Text style={styles.removeBtnText}>{lang === 'pt' ? 'Remover' : 'Remove'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.uploadBtns}>
                <TouchableOpacity
                  style={[styles.uploadBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
                  onPress={takePhoto}
                >
                  <Ionicons name="camera-outline" size={20} color={Colors.primary} />
                  <Text style={[styles.uploadBtnText, { color: Colors.primary }]}>
                    {lang === 'pt' ? 'Tirar Foto' : 'Take Photo'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.uploadBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
                  onPress={pickReceipt}
                >
                  <Ionicons name="image-outline" size={20} color={Colors.primary} />
                  <Text style={[styles.uploadBtnText, { color: Colors.primary }]}>
                    {lang === 'pt' ? 'Galeria' : 'Gallery'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {uploading && (
              <View style={styles.uploadingRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={[styles.uploadingText, { color: palette.text }]}>
                  {lang === 'pt' ? 'A enviar comprovativo...' : 'Uploading receipt...'}
                </Text>
              </View>
            )}
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
  receiptHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  uploadBtns: { flexDirection: 'row', gap: 10 },
  uploadBtn: {
    flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 16, borderRadius: Radius.md, borderWidth: 1,
  },
  uploadBtnText: { fontSize: 12, fontWeight: '600' },
  previewContainer: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  previewImage: { width: 72, height: 72, borderRadius: Radius.md },
  previewActions: { flex: 1, gap: 6 },
  previewLabel: { fontSize: 12, fontWeight: '600' },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  removeBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  uploadingText: { fontSize: 12 },
});
