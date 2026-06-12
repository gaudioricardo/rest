import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { updateInvoice } from '../../../lib/db';
import type { DocumentItem } from '../../../shared/types';

const TAX_RATE = 0.03;

export default function EditInvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { userId } = useAuthStore();
  const { invoices, loadInvoices, stockItems } = useDataStore();
  const { language, darkMode, company } = useSettingsStore();

  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  const invoice = invoices.find((inv) => inv.id === id);

  const [client, setClient] = useState(invoice?.client ?? '');
  const [clientNuit, setClientNuit] = useState(invoice?.clientNuit ?? '');
  const [clientPhone, setClientPhone] = useState(invoice?.clientPhone ?? '');
  const [clientEmail, setClientEmail] = useState(invoice?.clientEmail ?? '');
  const [issueDate, setIssueDate] = useState(invoice?.issueDate ?? new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? '');
  const [notes, setNotes] = useState(invoice?.notes ?? '');
  const [useSecondary, setUseSecondary] = useState(invoice?.companyProfileId === 'secondary');
  const [items, setItems] = useState<DocumentItem[]>(
    invoice?.items && invoice.items.length > 0
      ? invoice.items
      : [{ description: '', quantity: 1, unitPrice: 0 }]
  );
  const [loading, setLoading] = useState(false);

  if (!invoice) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
        <Text style={{ color: palette.text, padding: Spacing.md }}>Factura não encontrada.</Text>
      </SafeAreaView>
    );
  }

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

  const handleSave = async () => {
    if (!client.trim()) {
      showToast('Erro', lang === 'pt' ? 'Insira o nome do cliente' : 'Enter client name', 'error');
      return;
    }
    if (!userId) return;
    setLoading(true);
    try {
      await updateInvoice(
        invoice.id,
        {
          client: client.trim(),
          clientNuit: clientNuit || undefined,
          clientPhone: clientPhone || undefined,
          clientEmail: clientEmail || undefined,
          issueDate,
          dueDate: dueDate || undefined,
          amount: total,
          companyProfileId: useSecondary ? 'secondary' : 'primary',
          notes: notes || undefined,
        },
        items.filter((i) => i.description.trim())
      );
      await loadInvoices(userId);
      showToast(
        lang === 'pt' ? 'Factura actualizada' : 'Invoice updated',
        undefined,
        'success'
      );
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
        <Text style={[styles.title, { color: palette.text }]}>
          {lang === 'pt' ? 'Editar Factura' : 'Edit Invoice'}
        </Text>
        <Button title={tr(lang, 'save')} onPress={handleSave} loading={loading} size="sm" />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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

          <View style={[styles.section, { borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              {lang === 'pt' ? 'Dados do Cliente' : 'Client Info'}
            </Text>
            <Input label={tr(lang, 'clientName')} value={client} onChangeText={setClient} placeholder="Nome completo" />
            <Input label={tr(lang, 'nuit')} value={clientNuit} onChangeText={setClientNuit} placeholder="000000000" keyboardType="numeric" />
            <Input label={tr(lang, 'phone')} value={clientPhone} onChangeText={setClientPhone} placeholder="+258 8X XXX XXXX" keyboardType="phone-pad" />
            <Input label={tr(lang, 'email')} value={clientEmail} onChangeText={setClientEmail} placeholder="email@cliente.com" keyboardType="email-address" autoCapitalize="none" />
          </View>

          <View style={[styles.section, { borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              {lang === 'pt' ? 'Datas' : 'Dates'}
            </Text>
            <Input label={tr(lang, 'issueDate')} value={issueDate} onChangeText={setIssueDate} placeholder="YYYY-MM-DD" />
            <Input label={tr(lang, 'dueDate')} value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD (opcional)" />
          </View>

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
                onRemove={(idx) => {
                  if (items.length > 1) setItems((p) => p.filter((_, ii) => ii !== idx));
                }}
                stockItems={stockItems}
              />
            ))}
            <TouchableOpacity
              onPress={() => setItems((p) => [...p, { description: '', quantity: 1, unitPrice: 0 }])}
              style={[styles.addItemBtn, { borderColor: Colors.primary }]}
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
              <Text style={{ color: Colors.primary, fontWeight: '600', fontSize: 13 }}>
                {tr(lang, 'addItem')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.totalsBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.totalRow}>
              <Text style={{ color: palette.textSecondary }}>{tr(lang, 'subtotal')}</Text>
              <Text style={{ color: palette.text, fontWeight: '600' }}>{formatCurrency(subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={{ color: palette.textSecondary }}>{tr(lang, 'tax')}</Text>
              <Text style={{ color: palette.text, fontWeight: '600' }}>{formatCurrency(tax)}</Text>
            </View>
            <View style={[styles.totalRow, styles.totalFinal]}>
              <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: FontSize.md }}>TOTAL</Text>
              <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: FontSize.md }}>{formatCurrency(total)}</Text>
            </View>
          </View>

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
  section: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: 4 },
  sectionTitle: { fontWeight: '700', fontSize: FontSize.sm, marginBottom: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: FontSize.sm, flex: 1 },
  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: Radius.md,
  },
  totalsBox: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalFinal: { borderTopWidth: 2, borderTopColor: Colors.primary, paddingTop: 10, marginTop: 4 },
});
