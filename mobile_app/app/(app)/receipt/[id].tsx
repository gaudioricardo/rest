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
import { Button } from '../../../components/ui/Button';
import { DeleteModal } from '../../../components/ui/DeleteModal';
import { useToast } from '../../../components/ui/ToastContainer';
import { deleteReceipt } from '../../../lib/db';
import { generateReceiptPdf, sharePdf } from '../../../lib/pdf';

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { language, darkMode, company } = useSettingsStore();
  const { userId } = useAuthStore();
  const { receipts, loadReceipts } = useDataStore();

  const [loading, setLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  const receipt = receipts.find((r) => r.id === id);
  if (!receipt) return null;

  const handleExportPdf = async () => {
    if (!company) return;
    setLoading(true);
    try {
      const uri = await generateReceiptPdf(receipt, company);
      await sharePdf(uri, `${receipt.receiptNumber}.pdf`);
    } catch (e) { showToast('Erro PDF', String(e), 'error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!userId) return;
    setDeleting(true);
    try {
      await deleteReceipt(receipt.id);
      await loadReceipts(userId);
      showToast(lang === 'pt' ? 'Recibo eliminado' : 'Receipt deleted', undefined, 'info');
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
        <Text style={[styles.title, { color: palette.text }]}>{receipt.receiptNumber}</Text>
        <TouchableOpacity onPress={() => setShowDelete(true)}>
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.heroCard, { backgroundColor: Colors.error }]}>
          <Text style={styles.heroLabel}>RECIBO</Text>
          <Text style={styles.heroAmount}>{formatCurrency(receipt.amount)}</Text>
          <Text style={styles.heroClient}>{receipt.client}</Text>
          <Text style={styles.heroDate}>{formatDate(receipt.paymentDate, lang)}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: palette.textMuted }]}>{lang === 'pt' ? 'Método' : 'Method'}</Text>
            <Text style={[styles.value, { color: palette.text }]}>{lang === 'pt' ? receipt.methodPt : receipt.method}</Text>
          </View>
          {receipt.invoiceRef && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: palette.textMuted }]}>{tr(lang, 'invoiceRef')}</Text>
              <Text style={[styles.value, { color: palette.text }]}>{receipt.invoiceRef}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: palette.textMuted }]}>{tr(lang, 'paymentDate')}</Text>
            <Text style={[styles.value, { color: palette.text }]}>{formatDate(receipt.paymentDate, lang)}</Text>
          </View>
          {receipt.notes && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: palette.textMuted }]}>Notas</Text>
              <Text style={[styles.value, { color: palette.textSecondary }]}>{receipt.notes}</Text>
            </View>
          )}
        </View>

        <Button
          title={tr(lang, 'exportPdf')}
          onPress={handleExportPdf}
          variant="outline"
          loading={loading}
          icon={<Ionicons name="share-outline" size={18} color={Colors.primary} />}
        />
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
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  heroAmount: { color: '#fff', fontSize: 36, fontWeight: '800', fontFamily: 'PlayfairDisplay_700Bold' },
  heroClient: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.md, fontWeight: '600' },
  heroDate: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.sm },
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, gap: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { fontSize: FontSize.sm, flex: 1 },
  value: { fontSize: FontSize.sm, fontWeight: '600', flex: 2, textAlign: 'right' },
});
