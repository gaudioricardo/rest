import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch,
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
import { DocumentItemRow } from '../../../components/forms/DocumentItemRow';
import { useToast } from '../../../components/ui/ToastContainer';
import { createInvoice, updateQuoteStatus } from '../../../lib/db';
import type { DocumentItem } from '../../../shared/types';

const TAX_RATE = 0.03;

export default function NewInvoiceScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { userId } = useAuthStore();
  const { loadInvoices, loadQuotes, loadClients, quotes, stockItems } = useDataStore();
  const { language, darkMode, company } = useSettingsStore();

  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  const [client, setClient] = useState('');
  const [clientNuit, setClientNuit] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [useSecondary, setUseSecondary] = useState(false);
  const [items, setItems] = useState<DocumentItem[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  const openQuotes = quotes.filter((q) => q.status === 'Approved' || q.status === 'Pending');

  const handleSelectQuote = (quoteId: string) => {
    const q = quotes.find((qt) => qt.id === quoteId);
    if (!q) return;
    setSelectedQuoteId(quoteId);
    setClient(q.client);
    setClientNuit(q.clientNuit ?? '');
    setClientPhone(q.clientPhone ?? '');
    setClientEmail(q.clientEmail ?? '');
    setNotes(q.notes ?? '');
    setUseSecondary(q.companyProfileId === 'secondary');
    if (q.items && q.items.length > 0) {
      setItems(q.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })));
    }
  };

  const subtotal = items.reduce((s, i) => {
    const v = i.quantity * i.unitPrice;
    return s + (isFinite(v) ? v : 0);
  }, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const handleItemChange = (index: number, field: keyof DocumentItem, value: string) => {
    setItems((prev) => {
      const updated = [...prev];
      if (field === 'quantity' || field === 'unitPrice') {
        (updated[index] as any)[field] = parseFloat(value.replace(',', '.')) || 0;
      } else {
        (updated[index] as any)[field] = value;
      }
      return updated;
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!client.trim()) { showToast(lang === 'pt' ? 'Erro' : 'Error', lang === 'pt' ? 'Insira o nome do cliente' : 'Enter client name', 'error'); return; }
    if (!userId) return;

    setLoading(true);
    try {
      await createInvoice(
        userId,
        {
          client: client.trim(),
          clientNuit: clientNuit || undefined,
          clientPhone: clientPhone || undefined,
          clientEmail: clientEmail || undefined,
          issueDate,
          dueDate: dueDate || undefined,
          amount: total,
          status: 'Pending',
          companyProfileId: useSecondary ? 'secondary' : 'primary',
          notes: notes || undefined,
        },
        items.filter((i) => i.description.trim())
      );
      await loadInvoices(userId);
      await loadClients(userId);
      if (selectedQuoteId) {
        await updateQuoteStatus(selectedQuoteId, 'Liquidado');
        await loadQuotes(userId);
      }
      showToast(
        lang === 'pt' ? 'Factura criada' : 'Invoice created',
        undefined,
        'success'
      );
      router.back();
    } catch (e) {
      showToast(lang === 'pt' ? 'Erro' : 'Error', String(e), 'error');
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
        <Text style={[styles.title, { color: palette.text }]}>{tr(lang, 'newInvoice')}</Text>
        <Button title={tr(lang, 'save')} onPress={handleSubmit} loading={loading} size="sm" />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Convert from Quote */}
          {openQuotes.length > 0 && (
            <View style={[styles.section, { borderColor: Colors.secondary + '60' }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="clipboard-outline" size={15} color={Colors.secondary} />
                <Text style={[styles.sectionTitle, { color: palette.text, marginBottom: 0 }]}>
                  {lang === 'pt' ? 'Converter Cotação' : 'Convert from Quote'}
                </Text>
              </View>
              <Text style={[styles.sectionHint, { color: palette.textMuted }]}>
                {lang === 'pt'
                  ? 'Seleccione uma cotação para pré-preencher a factura'
                  : 'Select a quote to pre-fill the invoice'}
              </Text>
              {openQuotes.slice(0, 5).map((q) => (
                <TouchableOpacity
                  key={q.id}
                  onPress={() => handleSelectQuote(q.id)}
                  activeOpacity={0.75}
                  style={[
                    styles.quoteOption,
                    {
                      borderColor: selectedQuoteId === q.id ? Colors.primary : palette.border,
                      backgroundColor: selectedQuoteId === q.id ? Colors.primary + '10' : palette.surface,
                    },
                  ]}
                >
                  <View style={styles.quoteOptionLeft}>
                    <Text style={[styles.quoteNum, { color: selectedQuoteId === q.id ? palette.accent : palette.text }]}>
                      {q.quoteNumber}
                    </Text>
                    <Text style={[styles.quoteClient, { color: palette.textSecondary }]} numberOfLines={1}>
                      {q.client}
                    </Text>
                  </View>
                  <View style={styles.quoteOptionRight}>
                    <Text style={[styles.quoteAmount, { color: palette.accent }]}>
                      {formatCurrency(q.amount)}
                    </Text>
                    <Text style={[styles.quoteItems, { color: palette.textMuted }]}>
                      {(q.items?.length ?? 0)} {lang === 'pt' ? 'item(s)' : 'item(s)'}
                    </Text>
                  </View>
                  {selectedQuoteId === q.id && (
                    <Ionicons name="checkmark-circle" size={18} color={palette.accent} style={{ marginLeft: 6 }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Company Profile */}
          {company?.secondaryCompany && (
            <View style={[styles.section, { borderColor: palette.border }]}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>
                {lang === 'pt' ? 'Empresa' : 'Company'}
              </Text>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: palette.textSecondary }]}>
                  {useSecondary ? company.secondaryCompany.companyName : company.companyName}
                </Text>
                <Switch
                  value={useSecondary}
                  onValueChange={setUseSecondary}
                  trackColor={{ true: Colors.secondary, false: palette.border }}
                />
              </View>
            </View>
          )}

          {/* Client */}
          <View style={[styles.section, { borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              {lang === 'pt' ? 'Dados do Cliente' : 'Client Info'}
            </Text>
            <Input label={tr(lang, 'clientName')} value={client} onChangeText={setClient} placeholder="Nome completo" />
            <Input label={tr(lang, 'nuit')} value={clientNuit} onChangeText={setClientNuit} placeholder="000000000" keyboardType="numeric" />
            <Input label={tr(lang, 'phone')} value={clientPhone} onChangeText={setClientPhone} placeholder="+258 8X XXX XXXX" keyboardType="phone-pad" />
            <Input label={tr(lang, 'email')} value={clientEmail} onChangeText={setClientEmail} placeholder="email@cliente.com" keyboardType="email-address" autoCapitalize="none" />
          </View>

          {/* Dates */}
          <View style={[styles.section, { borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              {lang === 'pt' ? 'Datas' : 'Dates'}
            </Text>
            <Input label={tr(lang, 'issueDate')} value={issueDate} onChangeText={setIssueDate} placeholder="YYYY-MM-DD" />
            <Input label={tr(lang, 'dueDate')} value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD (opcional)" />
          </View>

          {/* Items */}
          <View style={[styles.section, { borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              {lang === 'pt' ? 'Itens / Serviços' : 'Items / Services'}
            </Text>
            {items.map((item, i) => (
              <DocumentItemRow
                key={i}
                item={item}
                index={i}
                onChange={handleItemChange}
                onRemove={removeItem}
                stockItems={stockItems}
              />
            ))}
            <TouchableOpacity
              onPress={addItem}
              style={[styles.addItemBtn, { borderColor: palette.accent }]}
            >
              <Ionicons name="add-circle-outline" size={18} color={palette.accent} />
              <Text style={{ color: palette.accent, fontWeight: '600', fontSize: 13 }}>
                {tr(lang, 'addItem')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Totals */}
          <View style={[styles.totalsBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.totalRow}>
              <Text style={{ color: palette.textSecondary }}>{tr(lang, 'subtotal')}</Text>
              <Text style={{ color: palette.text, fontWeight: '600' }}>{formatCurrency(subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={{ color: palette.textSecondary }}>{tr(lang, 'tax')}</Text>
              <Text style={{ color: palette.text, fontWeight: '600' }}>{formatCurrency(tax)}</Text>
            </View>
            <View style={[styles.totalRow, styles.totalFinal, { borderTopColor: palette.accent }]}>
              <Text style={{ color: palette.accent, fontWeight: '700', fontSize: FontSize.md }}>TOTAL</Text>
              <Text style={{ color: palette.accent, fontWeight: '700', fontSize: FontSize.md }}>{formatCurrency(total)}</Text>
            </View>
          </View>

          {/* Notes */}
          <View style={[styles.section, { borderColor: palette.border }]}>
            <Input
              label={tr(lang, 'notes')}
              value={notes}
              onChangeText={setNotes}
              placeholder={lang === 'pt' ? 'Observações (opcional)' : 'Notes (optional)'}
              multiline
              numberOfLines={3}
              style={{ height: 80, textAlignVertical: 'top' }}
            />
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
  section: {
    borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: 4,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  sectionTitle: { fontWeight: '700', fontSize: FontSize.sm, marginBottom: 8 },
  sectionHint: { fontSize: FontSize.xs, marginBottom: 8 },
  quoteOption: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: Radius.md,
    paddingVertical: 10, paddingHorizontal: Spacing.sm,
    marginBottom: 6,
  },
  quoteOptionLeft: { flex: 1, gap: 2 },
  quoteOptionRight: { alignItems: 'flex-end', gap: 2 },
  quoteNum: { fontWeight: '700', fontSize: FontSize.sm },
  quoteClient: { fontSize: FontSize.xs },
  quoteAmount: { fontWeight: '700', fontSize: FontSize.sm },
  quoteItems: { fontSize: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: FontSize.sm, flex: 1 },
  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: Radius.md,
  },
  totalsBox: {
    borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: 8,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalFinal: {
    borderTopWidth: 2, paddingTop: 10, marginTop: 4,
  },
});
