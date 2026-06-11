import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../stores/authStore';
import { useDataStore } from '../../../stores/dataStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { Colors, Spacing, Radius, FontSize } from '../../../shared/theme';
import { tr, formatCurrency } from '../../../shared/i18n';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastContainer';
import { createReceipt } from '../../../lib/db';

const PAYMENT_METHODS = [
  { en: 'Bank Transfer', pt: 'Transferência Bancária' },
  { en: 'M-Pesa', pt: 'M-Pesa' },
  { en: 'E-Mola', pt: 'E-Mola' },
  { en: 'Cash', pt: 'Dinheiro' },
];

export default function NewReceiptScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { userId } = useAuthStore();
  const { loadReceipts, loadInvoices, invoices } = useDataStore();
  const { language, darkMode } = useSettingsStore();

  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  const [client, setClient] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceRef, setInvoiceRef] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const pendingInvoices = invoices.filter((i) => i.status === 'Pending' || i.status === 'Overdue');

  const handleSelectInvoice = (invId: string) => {
    const inv = invoices.find((i) => i.id === invId);
    if (inv) {
      setSelectedInvoice(invId);
      setClient(inv.client);
      setAmount(String(inv.amount));
      setInvoiceRef(inv.invoiceNumber);
    }
  };

  const handleSubmit = async () => {
    if (!client.trim() || !amount) {
      showToast('Erro', 'Preencha cliente e valor', 'error');
      return;
    }
    if (!userId) return;
    setLoading(true);
    try {
      await createReceipt(userId, {
        client: client.trim(),
        amount: parseFloat(amount.replace(',', '.')) || 0,
        method: method.en,
        methodPt: method.pt,
        paymentDate,
        invoiceRef,
        invoiceId: selectedInvoice ?? undefined,
        notes: notes || undefined,
      });
      await loadReceipts(userId);
      await loadInvoices(userId);
      showToast(lang === 'pt' ? 'Recibo criado' : 'Receipt created', undefined, 'success');
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
        <Text style={[styles.title, { color: palette.text }]}>{tr(lang, 'newReceipt')}</Text>
        <Button title={tr(lang, 'save')} onPress={handleSubmit} loading={loading} size="sm" />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Pending Invoices Quick Select */}
          {pendingInvoices.length > 0 && (
            <View style={[styles.section, { borderColor: palette.border }]}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>
                {lang === 'pt' ? 'Factura Pendente' : 'Pending Invoice'}
              </Text>
              {pendingInvoices.slice(0, 5).map((inv) => (
                <TouchableOpacity
                  key={inv.id}
                  onPress={() => handleSelectInvoice(inv.id)}
                  style={[
                    styles.invOption,
                    {
                      borderColor: selectedInvoice === inv.id ? Colors.primary : palette.border,
                      backgroundColor: selectedInvoice === inv.id ? Colors.primary + '10' : palette.surface,
                    },
                  ]}
                >
                  <Text style={{ color: palette.text, fontWeight: '600', fontSize: 13 }}>{inv.invoiceNumber}</Text>
                  <Text style={{ color: palette.textSecondary, fontSize: 12 }}>{inv.client}</Text>
                  <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 13 }}>{formatCurrency(inv.amount)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={[styles.section, { borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              {lang === 'pt' ? 'Dados do Recibo' : 'Receipt Details'}
            </Text>
            <Input label={tr(lang, 'clientName')} value={client} onChangeText={setClient} placeholder="Nome do cliente" />
            <Input label={lang === 'pt' ? 'Valor (MT)' : 'Amount (MT)'} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0.00" />
            <Input label={tr(lang, 'invoiceRef')} value={invoiceRef} onChangeText={setInvoiceRef} placeholder="INV-0001 (opcional)" />
            <Input label={tr(lang, 'paymentDate')} value={paymentDate} onChangeText={setPaymentDate} placeholder="YYYY-MM-DD" />
          </View>

          {/* Payment Method */}
          <View style={[styles.section, { borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>{tr(lang, 'paymentMethod')}</Text>
            <View style={styles.methodGrid}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.en}
                  onPress={() => setMethod(m)}
                  style={[
                    styles.methodBtn,
                    {
                      borderColor: method.en === m.en ? Colors.primary : palette.border,
                      backgroundColor: method.en === m.en ? Colors.primary : palette.surface,
                    },
                  ]}
                >
                  <Text style={{ color: method.en === m.en ? '#fff' : palette.text, fontWeight: '600', fontSize: 12 }}>
                    {lang === 'pt' ? m.pt : m.en}
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
  invOption: {
    borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: 6,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodBtn: {
    flex: 1, minWidth: 100, paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1, borderRadius: Radius.md, alignItems: 'center',
  },
});
