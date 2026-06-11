import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '../../../stores/dataStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useAuthStore } from '../../../stores/authStore';
import { Colors, Spacing, Radius, FontSize } from '../../../shared/theme';
import { tr, formatCurrency, formatDate } from '../../../shared/i18n';
import { Badge, getQuoteVariant } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { DeleteModal } from '../../../components/ui/DeleteModal';
import { useToast } from '../../../components/ui/ToastContainer';
import { updateQuoteStatus, deleteQuote } from '../../../lib/db';
import { generateQuotePdf, sharePdf } from '../../../lib/pdf';

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { language, darkMode, company } = useSettingsStore();
  const { userId } = useAuthStore();
  const { quotes, loadQuotes } = useDataStore();

  const [loading, setLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  const quote = quotes.find((q) => q.id === id);
  if (!quote) return null;

  const items = quote.items ?? [];
  const subtotal = items.reduce((s, i) => {
    const v = i.quantity * i.unitPrice;
    return s + (isFinite(v) ? v : 0);
  }, 0);
  const tax = subtotal * 0.03;

  const handleApprove = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await updateQuoteStatus(quote.id, 'Approved');
      await loadQuotes(userId);
      showToast(lang === 'pt' ? 'Orçamento aprovado' : 'Quote approved', undefined, 'success');
    } catch { showToast('Erro', '', 'error'); }
    finally { setLoading(false); }
  };

  const handleReject = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await updateQuoteStatus(quote.id, 'Rejected');
      await loadQuotes(userId);
      showToast(lang === 'pt' ? 'Orçamento rejeitado' : 'Quote rejected', undefined, 'info');
    } catch { showToast('Erro', '', 'error'); }
    finally { setLoading(false); }
  };

  const handleExportPdf = async () => {
    if (!company) return;
    setLoading(true);
    try {
      const uri = await generateQuotePdf(quote, company, items);
      await sharePdf(uri);
    } catch (e) { showToast('Erro PDF', String(e), 'error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!userId) return;
    setDeleting(true);
    try {
      await deleteQuote(quote.id);
      await loadQuotes(userId);
      showToast(lang === 'pt' ? 'Orçamento eliminado' : 'Quote deleted', undefined, 'info');
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
        <Text style={[styles.title, { color: palette.text }]}>{quote.quoteNumber}</Text>
        <TouchableOpacity onPress={() => setShowDelete(true)}>
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.heroCard, { backgroundColor: Colors.secondary }]}>
          <Badge label={lang === 'pt' ? quote.statusPt : quote.status} variant={getQuoteVariant(quote.status)} />
          <Text style={styles.heroAmount}>{formatCurrency(quote.amount)}</Text>
          <Text style={styles.heroClient}>{quote.client}</Text>
          <Text style={styles.heroDate}>
            {formatDate(quote.issueDate, lang)} · {quote.validityDays} {lang === 'pt' ? 'dias' : 'days'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.textMuted }]}>CLIENTE</Text>
          <Text style={[styles.clientName, { color: palette.text }]}>{quote.client}</Text>
          {quote.clientNuit && <Text style={[styles.detail, { color: palette.textSecondary }]}>NUIT: {quote.clientNuit}</Text>}
          {quote.clientPhone && <Text style={[styles.detail, { color: palette.textSecondary }]}>{quote.clientPhone}</Text>}
        </View>

        {items.length > 0 && (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.cardTitle, { color: palette.textMuted }]}>ITENS</Text>
            {items.map((item, i) => (
              <View key={i} style={[styles.itemRow, { borderBottomColor: palette.border }]}>
                <Text style={{ flex: 1, color: palette.text, fontSize: FontSize.sm }}>{item.description}</Text>
                <Text style={{ color: palette.textSecondary, fontSize: FontSize.xs }}>{item.quantity} × {formatCurrency(item.unitPrice)}</Text>
                <Text style={{ color: palette.text, fontWeight: '700', minWidth: 80, textAlign: 'right' }}>{formatCurrency(item.quantity * item.unitPrice)}</Text>
              </View>
            ))}
            <View style={{ marginTop: 10, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: palette.textSecondary }}>Subtotal</Text>
                <Text style={{ color: palette.text, fontWeight: '600' }}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: palette.textSecondary }}>ISPC 3%</Text>
                <Text style={{ color: palette.text, fontWeight: '600' }}>{formatCurrency(tax)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: Colors.secondary, paddingTop: 8 }}>
                <Text style={{ color: Colors.secondary, fontWeight: '700', fontSize: FontSize.md }}>TOTAL</Text>
                <Text style={{ color: Colors.secondary, fontWeight: '700', fontSize: FontSize.md }}>{formatCurrency(quote.amount)}</Text>
              </View>
            </View>
          </View>
        )}

        {quote.notes && (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.cardTitle, { color: palette.textMuted }]}>NOTAS</Text>
            <Text style={{ color: palette.textSecondary, fontSize: FontSize.sm }}>{quote.notes}</Text>
          </View>
        )}

        <View style={styles.actions}>
          {quote.status === 'Pending' && (
            <>
              <Button title={lang === 'pt' ? 'Aprovar' : 'Approve'} onPress={handleApprove} loading={loading} style={{ flex: 1 }} />
              <Button title={lang === 'pt' ? 'Rejeitar' : 'Reject'} onPress={handleReject} variant="danger" style={{ flex: 1 }} />
            </>
          )}
          <Button title={tr(lang, 'exportPdf')} onPress={handleExportPdf} variant="outline" loading={loading} style={{ flex: 1 }}
            icon={<Ionicons name="share-outline" size={18} color={Colors.primary} />}
          />
        </View>
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
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: FontSize.lg, fontWeight: '700' },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
  heroCard: { borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', gap: 6 },
  heroAmount: { color: '#fff', fontSize: 32, fontWeight: '800', fontFamily: 'PlayfairDisplay_700Bold' },
  heroClient: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.md, fontWeight: '600' },
  heroDate: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.sm },
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, gap: 6 },
  cardTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  clientName: { fontWeight: '700', fontSize: FontSize.md },
  detail: { fontSize: FontSize.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 0.5 },
  actions: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
});
