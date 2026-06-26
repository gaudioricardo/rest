import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useDataStore } from '../../../stores/dataStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { Colors, Spacing, FontSize, Radius } from '../../../shared/theme';
import { tr, formatCurrency } from '../../../shared/i18n';
import { generateFilteredReportPdf, sharePdf } from '../../../lib/pdf';
import { TAB_BAR_BOTTOM_INSET } from '../../../components/ui/TabBar';
import type { Invoice, Quote, Receipt, Expense } from '../../../shared/types';

type FilterPeriod = '1m' | '3m' | 'custom';

function inRange(dateStr: string | undefined, from: Date, to: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  return !isNaN(d.getTime()) && d >= from && d <= to;
}

function fmtDate(s?: string): string {
  if (!s) return '—';
  try { return new Date(s + 'T00:00:00').toLocaleDateString('pt-MZ'); } catch { return s; }
}

function buildCsv(
  invoices: Invoice[],
  quotes: Quote[],
  receipts: Receipt[],
  expenses: Expense[],
  periodLabel: string
): string {
  const sep = ';';
  const nl = '\n';
  let csv = `RELATÓRIO FINANCEIRO${nl}Período: ${periodLabel}${nl}${nl}`;

  // Invoices
  csv += `FACTURAS${nl}`;
  csv += `Nº${sep}Cliente${sep}Data Emissão${sep}Vencimento${sep}Valor${sep}Estado${nl}`;
  invoices.forEach(i => {
    csv += `${i.invoiceNumber}${sep}${i.client}${sep}${fmtDate(i.issueDate)}${sep}${fmtDate(i.dueDate)}${sep}${i.amount.toFixed(2)}${sep}${i.statusPt}${nl}`;
  });
  const totalInv = invoices.reduce((s, i) => s + i.amount, 0);
  csv += `${sep}${sep}${sep}Total:${sep}${totalInv.toFixed(2)}${sep}${nl}${nl}`;

  // Quotes
  csv += `COTAÇÕES${nl}`;
  csv += `Nº${sep}Cliente${sep}Data Emissão${sep}Validade (dias)${sep}Valor${sep}Estado${nl}`;
  quotes.forEach(q => {
    csv += `${q.quoteNumber}${sep}${q.client}${sep}${fmtDate(q.issueDate)}${sep}${q.validityDays}${sep}${q.amount.toFixed(2)}${sep}${q.statusPt}${nl}`;
  });
  const totalQt = quotes.reduce((s, q) => s + q.amount, 0);
  csv += `${sep}${sep}${sep}Total:${sep}${totalQt.toFixed(2)}${sep}${nl}${nl}`;

  // Receipts
  csv += `RECIBOS${nl}`;
  csv += `Nº${sep}Cliente${sep}Data Pagamento${sep}Ref. Factura${sep}Método${sep}Valor${nl}`;
  receipts.forEach(r => {
    csv += `${r.receiptNumber}${sep}${r.client}${sep}${fmtDate(r.paymentDate)}${sep}${r.invoiceRef || '—'}${sep}${r.methodPt}${sep}${r.amount.toFixed(2)}${nl}`;
  });
  const totalRec = receipts.reduce((s, r) => s + r.amount, 0);
  csv += `${sep}${sep}${sep}${sep}Total:${sep}${totalRec.toFixed(2)}${nl}${nl}`;

  // Expenses
  csv += `DESPESAS${nl}`;
  csv += `Ref${sep}Comerciante${sep}Categoria${sep}Data${sep}Valor${sep}Estado${nl}`;
  expenses.forEach(e => {
    csv += `${e.ref}${sep}${e.merchant}${sep}${e.categoryPt}${sep}${fmtDate(e.expenseDate)}${sep}${e.amount.toFixed(2)}${sep}${e.statusPt}${nl}`;
  });
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
  csv += `${sep}${sep}${sep}Total:${sep}${totalExp.toFixed(2)}${sep}${nl}${nl}`;

  // Balance
  csv += `SALDO CONTABILÍSTICO${nl}`;
  csv += `Facturado${sep}Recebido${sep}Despesas${sep}Resultado Líquido${nl}`;
  const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
  csv += `${totalInv.toFixed(2)}${sep}${totalPaid.toFixed(2)}${sep}${totalExp.toFixed(2)}${sep}${(totalPaid - totalExp).toFixed(2)}${nl}`;

  return csv;
}

export default function ReportsScreen() {
  const router = useRouter();
  const { language, darkMode, company } = useSettingsStore();
  const companySettings = company ?? { companyName: '', nuit: '', address: '', city: '', phone: '', email: '', bankAccounts: [], mobileContacts: [], setupComplete: false };
  const { invoices, quotes, receipts, expenses, generalSales } = useDataStore();
  const lang = language;
  const palette = darkMode ? Colors.dark : Colors.light;

  const [period, setPeriod] = useState<FilterPeriod>('1m');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState(new Date().toISOString().slice(0, 10));
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingCsv, setLoadingCsv] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  const { from, to } = useMemo(() => {
    if (period === '1m') {
      const f = new Date(today);
      f.setDate(f.getDate() - 30);
      f.setHours(0, 0, 0, 0);
      return { from: f, to: today };
    }
    if (period === '3m') {
      const f = new Date(today);
      f.setDate(f.getDate() - 90);
      f.setHours(0, 0, 0, 0);
      return { from: f, to: today };
    }
    const f = customFrom ? new Date(customFrom + 'T00:00:00') : new Date('2000-01-01');
    const toD = customTo ? new Date(customTo + 'T23:59:59') : today;
    return { from: f, to: toD };
  }, [period, customFrom, customTo, today]);

  const periodLabel = useMemo(() => {
    const fmt = (d: Date) => d.toLocaleDateString('pt-MZ');
    return `${fmt(from)} — ${fmt(to)}`;
  }, [from, to]);

  const filteredInvoices = useMemo(() => invoices.filter(i => inRange(i.issueDate, from, to)), [invoices, from, to]);
  const filteredQuotes   = useMemo(() => quotes.filter(q => inRange(q.issueDate, from, to)), [quotes, from, to]);
  const filteredReceipts = useMemo(() => receipts.filter(r => inRange(r.paymentDate, from, to)), [receipts, from, to]);
  const filteredExpenses = useMemo(() => expenses.filter(e => inRange(e.expenseDate, from, to)), [expenses, from, to]);
  const filteredGenSales = useMemo(() => generalSales.filter(s => inRange(s.saleDate, from, to)), [generalSales, from, to]);

  const totalInvoiced = filteredInvoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid     = filteredInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
  const totalPending  = filteredInvoices.filter(i => i.status === 'Pending').reduce((s, i) => s + i.amount, 0);
  const totalOverdue  = filteredInvoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + i.amount, 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const totalReceipts = filteredReceipts.reduce((s, r) => s + r.amount, 0);
  const totalQuotes   = filteredQuotes.reduce((s, q) => s + q.amount, 0);
  const totalGenSales = filteredGenSales.reduce((s, sv) => s + sv.totalAmount, 0);
  const netResult     = totalPaid + totalGenSales - totalExpenses;

  async function handlePdf() {
    setLoadingPdf(true);
    try {
      const uri = await generateFilteredReportPdf(
        companySettings,
        filteredInvoices, filteredQuotes, filteredReceipts, filteredExpenses,
        periodLabel
      );
      const dateStr = new Date().toISOString().slice(0, 10);
      await sharePdf(uri, `Relatorio_${dateStr}.pdf`);
    } catch (e) {
      Alert.alert('Erro', 'Falha ao gerar PDF.');
    } finally {
      setLoadingPdf(false);
    }
  }

  async function handleCsv() {
    setLoadingCsv(true);
    try {
      const csv = buildCsv(filteredInvoices, filteredQuotes, filteredReceipts, filteredExpenses, periodLabel);
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `Relatorio_${dateStr}.csv`;
      const fileUri = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, '﻿' + csv, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: filename });
      }
    } catch (e) {
      Alert.alert('Erro', 'Falha ao gerar CSV.');
    } finally {
      setLoadingCsv(false);
    }
  }

  const periodFilters: { key: FilterPeriod; label: string }[] = [
    { key: '1m', label: lang === 'pt' ? 'Último mês' : 'Last 30d' },
    { key: '3m', label: lang === 'pt' ? 'Últimos 3 meses' : 'Last 3mo' },
    { key: 'custom', label: lang === 'pt' ? 'Personalizado' : 'Custom' },
  ];

  const kpis = [
    { label: lang === 'pt' ? 'Facturado' : 'Invoiced', value: formatCurrency(totalInvoiced), color: Colors.info },
    { label: lang === 'pt' ? 'Recebido' : 'Received', value: formatCurrency(totalPaid), color: Colors.success },
    { label: lang === 'pt' ? 'Pendente' : 'Pending', value: formatCurrency(totalPending), color: Colors.warning },
    { label: lang === 'pt' ? 'Vencido' : 'Overdue', value: formatCurrency(totalOverdue), color: Colors.error },
    { label: lang === 'pt' ? 'Cotações' : 'Quotes', value: formatCurrency(totalQuotes), color: Colors.secondary },
    { label: lang === 'pt' ? 'Recibos' : 'Receipts', value: formatCurrency(totalReceipts), color: '#059669' },
    { label: lang === 'pt' ? 'Vendas Gerais' : 'Gen. Sales', value: formatCurrency(totalGenSales), color: '#7c3aed' },
    { label: lang === 'pt' ? 'Despesas' : 'Expenses', value: formatCurrency(totalExpenses), color: '#ea580c' },
    { label: lang === 'pt' ? 'Resultado' : 'Net', value: formatCurrency(netResult), color: netResult >= 0 ? Colors.success : Colors.error },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: TAB_BAR_BOTTOM_INSET + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
          <View>
            <Text style={[styles.title, { color: palette.text }]}>
              {lang === 'pt' ? 'Relatórios' : 'Reports'}
            </Text>
            <Text style={[styles.subtitle, { color: palette.textMuted }]}>
              {lang === 'pt' ? 'Resumo contabilístico' : 'Accounting summary'}
            </Text>
          </View>
          <View style={styles.exportRow}>
            <TouchableOpacity
              onPress={handleCsv}
              disabled={loadingCsv}
              style={[styles.exportBtn, { backgroundColor: '#059669' }]}
            >
              {loadingCsv ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="grid-outline" size={14} color="#fff" />
                  <Text style={styles.exportBtnText}>CSV</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePdf}
              disabled={loadingPdf}
              style={[styles.exportBtn, { backgroundColor: Colors.primary }]}
            >
              {loadingPdf ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={14} color="#fff" />
                  <Text style={styles.exportBtnText}>PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Period Filter */}
        <View style={[styles.filterCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.filterLabel, { color: palette.textMuted }]}>
            {lang === 'pt' ? 'PERÍODO' : 'PERIOD'}
          </Text>
          <View style={styles.pillRow}>
            {periodFilters.map(pf => (
              <TouchableOpacity
                key={pf.key}
                onPress={() => setPeriod(pf.key)}
                style={[
                  styles.pill,
                  period === pf.key
                    ? { backgroundColor: Colors.secondary }
                    : { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 },
                ]}
              >
                <Text style={[
                  styles.pillText,
                  { color: period === pf.key ? '#fff' : palette.textSecondary },
                ]}>
                  {pf.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.periodLabel, { color: palette.accent }]}>{periodLabel}</Text>
        </View>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          {kpis.map(k => (
            <View key={k.label} style={[styles.kpiCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.kpiLabel, { color: palette.textMuted }]}>{k.label}</Text>
              <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
            </View>
          ))}
        </View>

        {/* Invoices Section */}
        <ReportSection
          title={lang === 'pt' ? 'Facturas' : 'Invoices'}
          count={filteredInvoices.length}
          total={formatCurrency(totalInvoiced)}
          palette={palette}
          color="#0369a1"
          statusItems={[
            { label: lang === 'pt' ? 'Pagas' : 'Paid', count: filteredInvoices.filter(i => i.status === 'Paid').length, color: Colors.success },
            { label: lang === 'pt' ? 'Pendentes' : 'Pending', count: filteredInvoices.filter(i => i.status === 'Pending').length, color: Colors.warning },
            { label: lang === 'pt' ? 'Vencidas' : 'Overdue', count: filteredInvoices.filter(i => i.status === 'Overdue').length, color: Colors.error },
          ]}
          rows={filteredInvoices.slice(0, 20).map(i => ({
            id: i.invoiceNumber,
            label: i.client,
            date: fmtDate(i.issueDate),
            value: formatCurrency(i.amount),
            status: i.statusPt,
            statusColor: i.status === 'Paid' ? Colors.success : i.status === 'Overdue' ? Colors.error : Colors.warning,
          }))}
          lang={lang}
        />

        {/* Quotes Section */}
        <ReportSection
          title={lang === 'pt' ? 'Cotações' : 'Quotes'}
          count={filteredQuotes.length}
          total={formatCurrency(totalQuotes)}
          palette={palette}
          color={Colors.secondary}
          statusItems={[
            { label: lang === 'pt' ? 'Aprovadas' : 'Approved', count: filteredQuotes.filter(q => q.status === 'Approved').length, color: Colors.info },
            { label: lang === 'pt' ? 'Pendentes' : 'Pending', count: filteredQuotes.filter(q => q.status === 'Pending').length, color: Colors.warning },
            { label: lang === 'pt' ? 'Rejeitadas' : 'Rejected', count: filteredQuotes.filter(q => q.status === 'Rejected').length, color: Colors.error },
            { label: 'Liquidadas', count: filteredQuotes.filter(q => q.status === 'Liquidado').length, color: '#7c3aed' },
          ]}
          rows={filteredQuotes.slice(0, 20).map(q => ({
            id: q.quoteNumber,
            label: q.client,
            date: fmtDate(q.issueDate),
            value: formatCurrency(q.amount),
            status: q.statusPt,
            statusColor: q.status === 'Approved' ? Colors.info : q.status === 'Rejected' ? Colors.error : q.status === 'Liquidado' ? '#7c3aed' : Colors.warning,
          }))}
          lang={lang}
        />

        {/* Receipts Section */}
        <ReportSection
          title={lang === 'pt' ? 'Recibos' : 'Receipts'}
          count={filteredReceipts.length}
          total={formatCurrency(totalReceipts)}
          palette={palette}
          color={Colors.success}
          rows={filteredReceipts.slice(0, 20).map(r => ({
            id: r.receiptNumber,
            label: r.client,
            date: fmtDate(r.paymentDate),
            value: formatCurrency(r.amount),
            status: r.methodPt,
            statusColor: Colors.success,
          }))}
          lang={lang}
        />

        {/* Expenses Section */}
        <ReportSection
          title={lang === 'pt' ? 'Despesas' : 'Expenses'}
          count={filteredExpenses.length}
          total={formatCurrency(totalExpenses)}
          palette={palette}
          color="#ea580c"
          statusItems={[
            { label: lang === 'pt' ? 'Aprovadas' : 'Approved', count: filteredExpenses.filter(e => e.status === 'Approved').length, color: Colors.success },
            { label: lang === 'pt' ? 'Pendentes' : 'Pending', count: filteredExpenses.filter(e => e.status === 'Pending').length, color: Colors.warning },
          ]}
          rows={filteredExpenses.slice(0, 20).map(e => ({
            id: e.ref,
            label: e.merchant,
            date: fmtDate(e.expenseDate),
            value: formatCurrency(e.amount),
            status: e.categoryPt,
            statusColor: '#ea580c',
          }))}
          lang={lang}
        />

        {/* Resultados e Métricas */}
        <TouchableOpacity
          onPress={() => router.push('/(app)/metrics' as any)}
          style={[styles.metricsCard, { backgroundColor: Colors.secondary }]}
          activeOpacity={0.85}
        >
          <View style={styles.metricsLeft}>
            <Ionicons name="analytics-outline" size={22} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.metricsTitle}>
                {lang === 'pt' ? 'Resultados e Métricas' : 'Results & Metrics'}
              </Text>
              <Text style={styles.metricsSub}>
                {lang === 'pt' ? 'Gráficos, top produtos, comprovativos e mais' : 'Charts, top products, receipts and more'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* Balance Footer */}
        <View style={[styles.balanceCard, { backgroundColor: Colors.primary }]}>
          <Text style={styles.balanceTitle}>
            {lang === 'pt' ? 'SALDO CONTABILÍSTICO' : 'ACCOUNTING BALANCE'}
          </Text>
          <Text style={styles.balancePeriod}>{periodLabel}</Text>
          <View style={styles.balanceRow}>
            {[
              { label: lang === 'pt' ? 'Facturado' : 'Invoiced', val: totalInvoiced, color: '#93c5fd' },
              { label: lang === 'pt' ? 'Recebido' : 'Received', val: totalPaid, color: '#86efac' },
              { label: lang === 'pt' ? 'Vendas Gerais' : 'Gen. Sales', val: totalGenSales, color: '#c4b5fd' },
              { label: lang === 'pt' ? 'Despesas' : 'Expenses', val: totalExpenses, color: '#fca5a5' },
              { label: lang === 'pt' ? 'Resultado' : 'Net', val: netResult, color: netResult >= 0 ? '#86efac' : '#fca5a5' },
            ].map(item => (
              <View key={item.label} style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>{item.label}</Text>
                <Text style={[styles.balanceValue, { color: item.color }]}>
                  {formatCurrency(item.val)}
                </Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Section Component ─────────────────────────────────────────────────────────

interface SectionRow {
  id: string;
  label: string;
  date: string;
  value: string;
  status: string;
  statusColor: string;
}

interface StatusItem { label: string; count: number; color: string; }

type Palette = typeof Colors.light | typeof Colors.dark;

interface ReportSectionProps {
  title: string;
  count: number;
  total: string;
  palette: Palette;
  color: string;
  statusItems?: StatusItem[];
  rows: SectionRow[];
  lang: 'en' | 'pt';
}

function ReportSection({ title, count, total, palette, color, statusItems, rows, lang }: ReportSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <View style={[styles.section, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <TouchableOpacity
        onPress={() => setCollapsed(c => !c)}
        style={styles.sectionHeader}
        activeOpacity={0.7}
      >
        <View style={styles.sectionLeft}>
          <View style={[styles.sectionDot, { backgroundColor: color }]} />
          <Text style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>
          <View style={[styles.countBadge, { backgroundColor: palette.surface }]}>
            <Text style={[styles.countText, { color: palette.textMuted }]}>{count}</Text>
          </View>
        </View>
        <View style={styles.sectionRight}>
          <Text style={[styles.sectionTotal, { color }]}>{total}</Text>
          <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-down'} size={14} color={palette.textMuted} />
        </View>
      </TouchableOpacity>

      {!collapsed && (
        <>
          {statusItems && statusItems.some(s => s.count > 0) && (
            <View style={[styles.statusRow, { borderBottomColor: palette.border }]}>
              {statusItems.filter(s => s.count > 0).map(s => (
                <View key={s.label} style={styles.statusChip}>
                  <Text style={[styles.statusCount, { color: s.color }]}>{s.count}×</Text>
                  <Text style={[styles.statusLabel, { color: palette.textMuted }]}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}
          {rows.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              {lang === 'pt' ? 'Sem registos neste período.' : 'No records in this period.'}
            </Text>
          ) : (
            rows.map((row, i) => (
              <View key={row.id + i} style={[styles.row, { borderBottomColor: palette.border }]}>
                <View style={styles.rowLeft}>
                  <Text style={[styles.rowId, { color }]}>{row.id}</Text>
                  <Text style={[styles.rowLabel, { color: palette.text }]} numberOfLines={1}>{row.label}</Text>
                  <Text style={[styles.rowDate, { color: palette.textMuted }]}>{row.date}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowValue, { color: palette.text }]}>{row.value}</Text>
                  <Text style={[styles.rowStatus, { color: row.statusColor }]}>{row.status}</Text>
                </View>
              </View>
            ))
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.md, gap: Spacing.md },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  title: { fontSize: FontSize.lg, fontWeight: '800' },
  subtitle: { fontSize: FontSize.xs, marginTop: 2 },
  exportRow: { flexDirection: 'row', gap: Spacing.xs },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  exportBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  filterCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  filterLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  pillRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm },
  pillText: { fontSize: 12, fontWeight: '600' },
  periodLabel: { fontSize: 11, fontWeight: '600', fontStyle: 'italic' },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  kpiLabel: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
  kpiValue: { fontSize: 13, fontWeight: '800' },

  section: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flex: 1 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 11, fontWeight: '600' },
  sectionRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTotal: { fontSize: 13, fontWeight: '800' },

  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusCount: { fontSize: 11, fontWeight: '800' },
  statusLabel: { fontSize: 11 },

  emptyText: { textAlign: 'center', padding: Spacing.md, fontSize: 12, fontStyle: 'italic' },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  rowLeft: { flex: 1, gap: 2 },
  rowId: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  rowLabel: { fontSize: 12, fontWeight: '600' },
  rowDate: { fontSize: 10 },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  rowValue: { fontSize: 12, fontWeight: '700' },
  rowStatus: { fontSize: 10, fontWeight: '600' },

  balanceCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  balanceTitle: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  balancePeriod: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  balanceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: 4 },
  balanceItem: { flex: 1, minWidth: '40%' },
  balanceLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },

  metricsCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricsLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  metricsTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  metricsSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
});
