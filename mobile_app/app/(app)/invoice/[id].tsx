import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '../../../stores/dataStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useAuthStore } from '../../../stores/authStore';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../../shared/theme';
import { tr, formatCurrency, formatDate } from '../../../shared/i18n';
import { Badge, getInvoiceVariant } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { DeleteModal } from '../../../components/ui/DeleteModal';
import { useToast } from '../../../components/ui/ToastContainer';
import { updateInvoiceStatus, deleteInvoice, createReceipt } from '../../../lib/db';
import { generateInvoicePdf, sharePdf } from '../../../lib/pdf';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { language, darkMode, company } = useSettingsStore();
  const { userId } = useAuthStore();
  const { invoices, loadInvoices, loadReceipts, loadClients } = useDataStore();

  const [loading, setLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPdfOptions, setShowPdfOptions] = useState(false);

  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  const invoice = invoices.find((i) => i.id === id);
  if (!invoice) return null;

  const items = invoice.items ?? [];
  const subtotal = items.reduce((s, i) => {
    const v = i.quantity * i.unitPrice;
    return s + (isFinite(v) ? v : 0);
  }, 0);
  const tax = subtotal * 0.03;
  const total = invoice.amount;

  const handleMarkPaid = async () => {
    if (!userId || !company) return;
    setLoading(true);
    try {
      await updateInvoiceStatus(invoice.id, 'Paid');
      await createReceipt(userId, {
        client: invoice.client,
        amount: invoice.amount,
        method: 'Bank Transfer',
        methodPt: 'Transferência Bancária',
        paymentDate: new Date().toISOString().slice(0, 10),
        invoiceRef: invoice.invoiceNumber,
        invoiceId: invoice.id,
        companyProfileId: invoice.companyProfileId,
      });
      await loadInvoices(userId);
      await loadReceipts(userId);
      await loadClients(userId);
      showToast(lang === 'pt' ? 'Factura marcada como paga' : 'Invoice marked as paid', undefined, 'success');
    } catch {
      showToast('Erro', '', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async (taxType: 'none' | 'ispc' | 'iva' = 'ispc', includeStamp = true) => {
    if (!company) return;
    setLoading(true);
    try {
      const uri = await generateInvoicePdf(invoice, company, items, { taxType, includeStamp });
      await sharePdf(uri);
    } catch (e) {
      showToast('Erro PDF', String(e), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!userId) return;
    setDeleting(true);
    try {
      await deleteInvoice(invoice.id);
      await loadInvoices(userId);
      showToast(lang === 'pt' ? 'Factura eliminada' : 'Invoice deleted', undefined, 'info');
      router.back();
    } catch {
      showToast('Erro', '', 'error');
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: palette.text }]}>{invoice.invoiceNumber}</Text>
        <TouchableOpacity onPress={() => setShowDelete(true)}>
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Status & Amount */}
        <View style={[styles.heroCard, { backgroundColor: Colors.primary }]}>
          <View style={styles.heroBadge}>
            <Badge
              label={lang === 'pt' ? invoice.statusPt : invoice.status}
              variant={getInvoiceVariant(invoice.status)}
            />
          </View>
          <Text style={styles.heroAmount}>{formatCurrency(invoice.amount)}</Text>
          <Text style={styles.heroClient}>{invoice.client}</Text>
          <Text style={styles.heroDate}>
            {formatDate(invoice.issueDate, lang)}
            {invoice.dueDate ? ` → ${formatDate(invoice.dueDate, lang)}` : ''}
          </Text>
        </View>

        {/* Client Details */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.textMuted }]}>
            {lang === 'pt' ? 'CLIENTE' : 'CLIENT'}
          </Text>
          <Text style={[styles.clientName, { color: palette.text }]}>{invoice.client}</Text>
          {invoice.clientNuit && (
            <Text style={[styles.detail, { color: palette.textSecondary }]}>NUIT: {invoice.clientNuit}</Text>
          )}
          {invoice.clientPhone && (
            <Text style={[styles.detail, { color: palette.textSecondary }]}>{invoice.clientPhone}</Text>
          )}
          {invoice.clientEmail && (
            <Text style={[styles.detail, { color: palette.textSecondary }]}>{invoice.clientEmail}</Text>
          )}
        </View>

        {/* Items */}
        {items.length > 0 && (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.cardTitle, { color: palette.textMuted }]}>
              {lang === 'pt' ? 'ITENS' : 'ITEMS'}
            </Text>
            {items.map((item, i) => (
              <View key={i} style={[styles.itemRow, { borderBottomColor: palette.border }]}>
                <Text style={[{ flex: 1, color: palette.text, fontSize: FontSize.sm }]}>{item.description}</Text>
                <Text style={[{ color: palette.textSecondary, fontSize: FontSize.xs }]}>
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                </Text>
                <Text style={[{ color: palette.text, fontWeight: '700', fontSize: FontSize.sm, minWidth: 80, textAlign: 'right' }]}>
                  {formatCurrency(item.quantity * item.unitPrice)}
                </Text>
              </View>
            ))}
            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={{ color: palette.textSecondary }}>{tr(lang, 'subtotal')}</Text>
                <Text style={{ color: palette.text, fontWeight: '600' }}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={{ color: palette.textSecondary }}>ISPC 3%</Text>
                <Text style={{ color: palette.text, fontWeight: '600' }}>{formatCurrency(tax)}</Text>
              </View>
              <View style={[styles.totalRow, { borderTopWidth: 2, borderTopColor: Colors.primary, marginTop: 6, paddingTop: 8 }]}>
                <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: FontSize.md }}>TOTAL</Text>
                <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: FontSize.md }}>{formatCurrency(total)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Notes */}
        {invoice.notes && (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.cardTitle, { color: palette.textMuted }]}>
              {lang === 'pt' ? 'NOTAS' : 'NOTES'}
            </Text>
            <Text style={[{ color: palette.textSecondary, fontSize: FontSize.sm }]}>{invoice.notes}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {invoice.status !== 'Paid' && (
            <Button
              title={tr(lang, 'markPaid')}
              onPress={handleMarkPaid}
              loading={loading}
              style={{ flex: 1 }}
              icon={<Ionicons name="checkmark-circle-outline" size={18} color="#fff" />}
            />
          )}
          <Button
            title={tr(lang, 'exportPdf')}
            onPress={() => handleExportPdf()}
            variant="outline"
            loading={loading}
            style={{ flex: 1 }}
            icon={<Ionicons name="share-outline" size={18} color={Colors.primary} />}
          />
        </View>
      </ScrollView>

      <DeleteModal
        visible={showDelete}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        loading={deleting}
      />
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
  heroCard: {
    borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', gap: 6,
  },
  heroBadge: { alignSelf: 'flex-end' },
  heroAmount: { color: '#fff', fontSize: 32, fontWeight: '800', fontFamily: 'PlayfairDisplay_700Bold' },
  heroClient: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.md, fontWeight: '600' },
  heroDate: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.sm },
  card: {
    borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, gap: 6,
  },
  cardTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  clientName: { fontWeight: '700', fontSize: FontSize.md },
  detail: { fontSize: FontSize.sm },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, borderBottomWidth: 0.5,
  },
  totalsSection: { marginTop: 8, gap: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: Spacing.md },
});
