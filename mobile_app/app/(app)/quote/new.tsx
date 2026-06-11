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
import { createQuote } from '../../../lib/db';
import type { DocumentItem } from '../../../shared/types';

export default function NewQuoteScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { userId } = useAuthStore();
  const { loadQuotes, loadClients } = useDataStore();
  const { language, darkMode, company } = useSettingsStore();

  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  const [client, setClient] = useState('');
  const [clientNuit, setClientNuit] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [validityDays, setValidityDays] = useState('15');
  const [notes, setNotes] = useState('');
  const [useSecondary, setUseSecondary] = useState(false);
  const [items, setItems] = useState<DocumentItem[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ]);
  const [loading, setLoading] = useState(false);

  const subtotal = items.reduce((s, i) => {
    const v = i.quantity * i.unitPrice;
    return s + (isFinite(v) ? v : 0);
  }, 0);
  const tax = subtotal * 0.03;
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

  const handleSubmit = async () => {
    if (!client.trim()) {
      showToast('Erro', 'Insira o nome do cliente', 'error');
      return;
    }
    if (!userId) return;
    setLoading(true);
    try {
      await createQuote(
        userId,
        {
          client: client.trim(),
          clientNuit: clientNuit || undefined,
          clientPhone: clientPhone || undefined,
          clientEmail: clientEmail || undefined,
          issueDate,
          validityDays: parseInt(validityDays) || 15,
          amount: total,
          status: 'Pending',
          companyProfileId: useSecondary ? 'secondary' : 'primary',
          notes: notes || undefined,
        },
        items.filter((i) => i.description.trim())
      );
      await loadQuotes(userId);
      await loadClients(userId);
      showToast(lang === 'pt' ? 'Orçamento criado' : 'Quote created', undefined, 'success');
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
        <Text style={[styles.title, { color: palette.text }]}>{tr(lang, 'newQuote')}</Text>
        <Button title={tr(lang, 'save')} onPress={handleSubmit} loading={loading} size="sm" />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {company?.secondaryCompany && (
            <View style={[styles.section, { borderColor: palette.border }]}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Empresa</Text>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: palette.textSecondary }]}>
                  {useSecondary ? company.secondaryCompany.companyName : company.companyName}
                </Text>
                <Switch value={useSecondary} onValueChange={setUseSecondary} trackColor={{ true: Colors.secondary, false: palette.border }} />
              </View>
            </View>
          )}

          <View style={[styles.section, { borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Cliente</Text>
            <Input label={tr(lang, 'clientName')} value={client} onChangeText={setClient} placeholder="Nome completo" />
            <Input label={tr(lang, 'nuit')} value={clientNuit} onChangeText={setClientNuit} placeholder="NUIT" keyboardType="numeric" />
            <Input label={tr(lang, 'phone')} value={clientPhone} onChangeText={setClientPhone} placeholder="Telefone" keyboardType="phone-pad" />
            <Input label={tr(lang, 'email')} value={clientEmail} onChangeText={setClientEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" />
          </View>

          <View style={[styles.section, { borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Datas</Text>
            <Input label={tr(lang, 'issueDate')} value={issueDate} onChangeText={setIssueDate} placeholder="YYYY-MM-DD" />
            <Input label={tr(lang, 'validityDays')} value={validityDays} onChangeText={setValidityDays} keyboardType="numeric" placeholder="15" />
          </View>

          <View style={[styles.section, { borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Itens</Text>
            {items.map((item, i) => (
              <DocumentItemRow key={i} item={item} index={i} onChange={handleItemChange} onRemove={(idx) => {
                if (items.length > 1) setItems((p) => p.filter((_, ii) => ii !== idx));
              }} />
            ))}
            <TouchableOpacity
              onPress={() => setItems((p) => [...p, { description: '', quantity: 1, unitPrice: 0 }])}
              style={[styles.addItemBtn, { borderColor: Colors.secondary }]}
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.secondary} />
              <Text style={{ color: Colors.secondary, fontWeight: '600', fontSize: 13 }}>{tr(lang, 'addItem')}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.totalsBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.totalRow}>
              <Text style={{ color: palette.textSecondary }}>{tr(lang, 'subtotal')}</Text>
              <Text style={{ color: palette.text, fontWeight: '600' }}>{formatCurrency(subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={{ color: palette.textSecondary }}>ISPC 3%</Text>
              <Text style={{ color: palette.text, fontWeight: '600' }}>{formatCurrency(tax)}</Text>
            </View>
            <View style={[styles.totalRow, { borderTopWidth: 2, borderTopColor: Colors.secondary, marginTop: 4, paddingTop: 8 }]}>
              <Text style={{ color: Colors.secondary, fontWeight: '700', fontSize: FontSize.md }}>TOTAL</Text>
              <Text style={{ color: Colors.secondary, fontWeight: '700', fontSize: FontSize.md }}>{formatCurrency(total)}</Text>
            </View>
          </View>

          <View style={[styles.section, { borderColor: palette.border }]}>
            <Input label={tr(lang, 'notes')} value={notes} onChangeText={setNotes} placeholder="Observações (opcional)" multiline numberOfLines={3} style={{ height: 80, textAlignVertical: 'top' }} />
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
});
