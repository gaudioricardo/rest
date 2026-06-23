import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { useDataStore } from '../../stores/dataStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { Colors, Spacing, Radius, FontSize } from '../../shared/theme';
import { formatCurrency } from '../../shared/i18n';
import { sharePdf } from '../../lib/pdf';
import { fetchReceiptLocalUri } from '../../lib/b2';

function AuthReceiptImage({ b2Url, onPress }: { b2Url: string; onPress: (localUri: string) => void }) {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    console.log('[AuthReceiptImage] fetching:', b2Url);
    fetchReceiptLocalUri(b2Url)
      .then(uri => {
        console.log('[AuthReceiptImage] OK:', uri);
        if (!cancelled) setLocalUri(uri);
      })
      .catch((e: unknown) => {
        console.error('[AuthReceiptImage] FAILED:', e instanceof Error ? e.message : e);
        if (!cancelled) setErr(true);
      });
    return () => { cancelled = true; };
  }, [b2Url]);

  if (err) {
    return (
      <View style={{ width: 130, height: 90, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
        <Ionicons name="alert-circle-outline" size={22} color="#94a3b8" />
      </View>
    );
  }
  if (!localUri) {
    return (
      <View style={{ width: 130, height: 90, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
        <ActivityIndicator size="small" color="#94a3b8" />
      </View>
    );
  }
  return (
    <TouchableOpacity onPress={() => onPress(localUri)} activeOpacity={0.8}>
      <Image source={{ uri: localUri }} style={s.receiptImg} resizeMode="cover" />
    </TouchableOpacity>
  );
}

const { width: SCREEN_W } = Dimensions.get('window');

const CAT_COLORS = ['#0369a1', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2'];
const PT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

type MetricsPeriod = '1m' | '3m' | '6m' | 'custom';
type Palette = typeof Colors.light | typeof Colors.dark;

function inRange(dateStr: string | undefined, from: Date, to: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  return !isNaN(d.getTime()) && d >= from && d <= to;
}

function monthKey(str: string): string { return str.slice(0, 7); }

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const label = PT_MONTHS[parseInt(m, 10) - 1];
  return y !== String(new Date().getFullYear()) ? `${label}'${y.slice(2)}` : label;
}

// ─── Donut chart (react-native-svg stroke-dasharray) ─────────────────────────
function DonutChart({ data, size = 90, palette }: {
  data: { name: string; pct: number; color: string }[];
  size?: number;
  palette: Palette;
}) {
  const r = 32;
  const C = 2 * Math.PI * r;
  let cumPct = 0;
  const hasData = data.some(d => d.pct > 0);

  return (
    <Svg viewBox="0 0 100 100" width={size} height={size}>
      <SvgCircle cx="50" cy="50" r={r} fill="none" stroke={palette.border} strokeWidth="20" />
      {hasData && data.map(d => {
        if (d.pct <= 0) return null;
        const start = cumPct;
        cumPct += d.pct;
        const dash = (d.pct / 100) * C;
        return (
          <SvgCircle
            key={d.name}
            cx="50" cy="50" r={r}
            fill="none"
            stroke={d.color}
            strokeWidth="20"
            strokeDasharray={`${dash} ${C}`}
            rotation={-90 + (start / 100) * 360}
            origin="50,50"
          />
        );
      })}
    </Svg>
  );
}

export default function MetricsScreen() {
  const router = useRouter();
  const { language, darkMode, company } = useSettingsStore();
  const { invoices, quotes, receipts, expenses } = useDataStore();
  const lang = language;
  const palette = darkMode ? Colors.dark : Colors.light;

  const [period, setPeriod] = useState<MetricsPeriod>('3m');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [customFrom, setCustomFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d; });
  const [customTo, setCustomTo] = useState(() => new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  void quotes;

  const today = useMemo(() => {
    const d = new Date(); d.setHours(23, 59, 59, 999); return d;
  }, []);

  const { from, to } = useMemo(() => {
    if (period === 'custom') {
      const f = new Date(customFrom); f.setHours(0, 0, 0, 0);
      const t = new Date(customTo); t.setHours(23, 59, 59, 999);
      return { from: f, to: t };
    }
    const days = period === '1m' ? 30 : period === '3m' ? 90 : 180;
    const f = new Date(today);
    f.setDate(f.getDate() - days);
    f.setHours(0, 0, 0, 0);
    return { from: f, to: today };
  }, [period, today, customFrom, customTo]);

  const periodLabel = useMemo(() => {
    const fmt = (d: Date) => d.toLocaleDateString('pt-MZ');
    return `${fmt(from)} — ${fmt(to)}`;
  }, [from, to]);

  const filteredInvoices = useMemo(() => invoices.filter(i => inRange(i.issueDate, from, to)), [invoices, from, to]);
  const filteredReceipts = useMemo(() => receipts.filter(r => inRange(r.paymentDate, from, to)), [receipts, from, to]);
  const filteredExpenses = useMemo(() => expenses.filter(e => inRange(e.expenseDate, from, to)), [expenses, from, to]);

  const totalInvoiced   = filteredInvoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid       = filteredInvoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
  const totalReceipts   = filteredReceipts.reduce((s, r) => s + r.amount, 0);
  const totalExpenses   = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const netResult       = totalReceipts - totalExpenses;
  const collectionRate  = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;
  const expensesWithReceipts = filteredExpenses.filter(e => e.receiptImageUrl);

  const monthlyData = useMemo(() => {
    const allKeys: string[] = [];
    const cur = new Date(from); cur.setDate(1);
    const endM = new Date(to); endM.setDate(1);
    while (cur <= endM) {
      allKeys.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
      cur.setMonth(cur.getMonth() + 1);
    }
    const map = new Map<string, { a: number; b: number }>(allKeys.map(k => [k, { a: 0, b: 0 }]));
    filteredInvoices.forEach(i => {
      if (!i.issueDate) return;
      const k = monthKey(i.issueDate);
      const v = map.get(k); if (v) map.set(k, { ...v, a: v.a + i.amount });
    });
    filteredExpenses.forEach(e => {
      if (!e.expenseDate) return;
      const k = monthKey(e.expenseDate);
      const v = map.get(k); if (v) map.set(k, { ...v, b: v.b + e.amount });
    });
    return allKeys.map(k => ({ key: k, label: monthLabel(k), ...map.get(k)! }));
  }, [filteredInvoices, filteredExpenses, from, to]);

  const systemEntryKey = useMemo(() => {
    const allDates = [
      ...invoices.map(i => i.issueDate),
      ...expenses.map(e => e.expenseDate),
    ].filter((d): d is string => !!d).sort();
    return allDates.length > 0 ? monthKey(allDates[0]) : null;
  }, [invoices, expenses]);

  const peakIdx = useMemo(() => {
    let maxVal = 0, idx = -1;
    monthlyData.forEach((d, i) => { if (d.a > maxVal) { maxVal = d.a; idx = i; } });
    return idx;
  }, [monthlyData]);

  const entryIdx = useMemo(() => {
    if (!systemEntryKey) return -1;
    return monthlyData.findIndex(d => d.key === systemEntryKey);
  }, [monthlyData, systemEntryKey]);

  const expenseCategories = useMemo(() => {
    const map = new Map<string, number>();
    filteredExpenses.forEach(e => { map.set(e.categoryPt, (map.get(e.categoryPt) ?? 0) + e.amount); });
    const total = filteredExpenses.reduce((s, e) => s + e.amount, 0) || 1;
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([name, val], i) => ({
        name, total: val,
        pct: Math.round((val / total) * 100),
        color: CAT_COLORS[i % CAT_COLORS.length],
      }));
  }, [filteredExpenses]);

  const productData = useMemo(() => {
    const map = new Map<string, number>();
    filteredInvoices.forEach(inv => {
      (inv.items ?? []).forEach(item => {
        map.set(item.description, (map.get(item.description) ?? 0) + item.quantity);
      });
    });
    const arr = Array.from(map.entries()).filter(([, q]) => q > 0).map(([desc, qty]) => ({ desc, qty }));
    const sorted = [...arr].sort((a, b) => b.qty - a.qty);
    return { top: sorted.slice(0, 5), bottom: [...sorted].reverse().slice(0, 5) };
  }, [filteredInvoices]);

  const paymentMethods = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    filteredReceipts.forEach(r => {
      const cur = map.get(r.methodPt) ?? { count: 0, total: 0 };
      map.set(r.methodPt, { count: cur.count + 1, total: cur.total + r.amount });
    });
    const totalAmt = filteredReceipts.reduce((s, r) => s + r.amount, 0) || 1;
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([method, v], i) => ({
        method, ...v,
        pct: Math.round((v.total / totalAmt) * 100),
        color: CAT_COLORS[i % CAT_COLORS.length],
      }));
  }, [filteredReceipts]);

  const maxMonthly = useMemo(() => Math.max(...monthlyData.flatMap(d => [d.a, d.b]), 1), [monthlyData]);

  async function handlePdf() {
    setGeneratingPdf(true);
    try {
      const companyName = company?.companyName ?? '';
      const nuit = company?.nuit ?? '';

      const kpiRows = [
        [lang === 'pt' ? 'Resultado Líquido' : 'Net Result', formatCurrency(netResult)],
        [lang === 'pt' ? 'Total Facturado' : 'Total Invoiced', formatCurrency(totalInvoiced)],
        [lang === 'pt' ? 'Total Recebido' : 'Total Received', formatCurrency(totalReceipts)],
        [lang === 'pt' ? 'Total Despesas' : 'Total Expenses', formatCurrency(totalExpenses)],
        [lang === 'pt' ? 'Taxa de Cobrança' : 'Collection Rate', `${collectionRate}%`],
        [lang === 'pt' ? 'Comprovativos Anexados' : 'Receipts Attached', String(expensesWithReceipts.length)],
      ];

      const catRows = expenseCategories
        .map(c => `<tr><td>${c.name}</td><td>${formatCurrency(c.total)}</td><td>${c.pct}%</td></tr>`)
        .join('');

      const productRows = productData.top
        .map((p, i) => `<tr><td>${i + 1}.</td><td>${p.desc}</td><td>${p.qty}×</td></tr>`)
        .join('');

      const methodRows = paymentMethods
        .map(m => `<tr><td>${m.method}</td><td>${m.count}</td><td>${formatCurrency(m.total)}</td><td>${m.pct}%</td></tr>`)
        .join('');

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 32px; color: #1e293b; }
  h1 { color: #0c1c48; font-size: 22px; margin-bottom: 4px; }
  .sub { color: #64748b; font-size: 12px; margin-bottom: 24px; }
  h2 { color: #0c1c48; font-size: 14px; margin: 24px 0 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #0c1c48; color: #fff; padding: 8px 10px; text-align: left; }
  td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; }
  tr:nth-child(even) td { background: #f8fafc; }
  .net-pos { color: #059669; font-weight: 800; }
  .net-neg { color: #dc2626; font-weight: 800; }
</style>
</head><body>
<h1>Resultados e Métricas</h1>
<div class="sub">${companyName}${nuit ? ` — NUIT: ${nuit}` : ''} | ${periodLabel}</div>

<h2>${lang === 'pt' ? 'Indicadores-Chave' : 'Key Performance Indicators'}</h2>
<table>
  <tr><th>${lang === 'pt' ? 'Indicador' : 'Indicator'}</th><th>${lang === 'pt' ? 'Valor' : 'Value'}</th></tr>
  ${kpiRows.map(([k, v]) => `<tr><td>${k}</td><td${k.includes('Resultado') || k.includes('Net') ? ` class="${netResult >= 0 ? 'net-pos' : 'net-neg'}"` : ''}>${v}</td></tr>`).join('')}
</table>

${expenseCategories.length > 0 ? `
<h2>${lang === 'pt' ? 'Despesas por Categoria' : 'Expenses by Category'}</h2>
<table>
  <tr><th>${lang === 'pt' ? 'Categoria' : 'Category'}</th><th>${lang === 'pt' ? 'Valor' : 'Amount'}</th><th>%</th></tr>
  ${catRows}
</table>` : ''}

${productData.top.length > 0 ? `
<h2>${lang === 'pt' ? 'Produtos Mais Vendidos' : 'Top Selling Products'}</h2>
<table>
  <tr><th>#</th><th>${lang === 'pt' ? 'Produto' : 'Product'}</th><th>${lang === 'pt' ? 'Qtd' : 'Qty'}</th></tr>
  ${productRows}
</table>` : ''}

${paymentMethods.length > 0 ? `
<h2>${lang === 'pt' ? 'Métodos de Pagamento' : 'Payment Methods'}</h2>
<table>
  <tr><th>${lang === 'pt' ? 'Método' : 'Method'}</th><th>${lang === 'pt' ? 'Qtd' : 'Count'}</th><th>${lang === 'pt' ? 'Total' : 'Total'}</th><th>%</th></tr>
  ${methodRows}
</table>` : ''}

${expensesWithReceipts.length > 0 ? `
<h2>${lang === 'pt' ? 'Despesas com Comprovativos' : 'Expenses with Receipts'}</h2>
<table>
  <tr><th>Ref</th><th>${lang === 'pt' ? 'Comerciante' : 'Merchant'}</th><th>${lang === 'pt' ? 'Valor' : 'Amount'}</th></tr>
  ${expensesWithReceipts.map(e => `<tr><td>${e.ref}</td><td>${e.merchant}</td><td>${formatCurrency(e.amount)}</td></tr>`).join('')}
</table>` : ''}

</body></html>`;

      const result = await Print.printToFileAsync({ html, base64: false });
      const dateStr = new Date().toISOString().slice(0, 10);
      await sharePdf(result.uri, `Metricas_${dateStr}.pdf`);
    } catch {
      Alert.alert(lang === 'pt' ? 'Erro' : 'Error', lang === 'pt' ? 'Falha ao gerar PDF.' : 'Failed to generate PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  }

  const kpis = [
    { label: lang === 'pt' ? 'Resultado Líquido' : 'Net Result', value: formatCurrency(netResult), color: netResult >= 0 ? Colors.success : Colors.error },
    { label: lang === 'pt' ? 'Facturado' : 'Invoiced', value: formatCurrency(totalInvoiced), color: Colors.info },
    { label: lang === 'pt' ? 'Recebido' : 'Received', value: formatCurrency(totalReceipts), color: '#0891b2' },
    { label: lang === 'pt' ? 'Despesas' : 'Expenses', value: formatCurrency(totalExpenses), color: Colors.warning },
    { label: lang === 'pt' ? 'Taxa Cobrança' : 'Collection', value: `${collectionRate}%`, color: collectionRate >= 70 ? Colors.success : Colors.warning },
    { label: lang === 'pt' ? 'Comprovativos' : 'Receipts', value: String(expensesWithReceipts.length), color: '#7c3aed' },
  ];

  const periodOptions: { key: MetricsPeriod; label: string }[] = [
    { key: '1m', label: lang === 'pt' ? 'Último mês' : 'Last 30d' },
    { key: '3m', label: lang === 'pt' ? 'Últimos 3 meses' : 'Last 3mo' },
    { key: '6m', label: lang === 'pt' ? 'Últimos 6 meses' : 'Last 6mo' },
    { key: 'custom', label: lang === 'pt' ? 'Personalizado' : 'Custom' },
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: palette.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: palette.text }]}>
            {lang === 'pt' ? 'Resultados e Métricas' : 'Results & Metrics'}
          </Text>
          <Text style={[s.subtitle, { color: palette.textMuted }]}>{periodLabel}</Text>
        </View>
        <TouchableOpacity
          onPress={handlePdf}
          disabled={generatingPdf}
          style={[s.pdfBtn, { backgroundColor: Colors.primary, opacity: generatingPdf ? 0.6 : 1 }]}
        >
          {generatingPdf
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Ionicons name="document-text-outline" size={14} color="#fff" /><Text style={s.pdfBtnText}>PDF</Text></>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Period selector */}
        <View style={[s.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[s.sectionLabel, { color: palette.textMuted }]}>
            {lang === 'pt' ? 'PERÍODO' : 'PERIOD'}
          </Text>
          <View style={s.pillRow}>
            {periodOptions.map(o => (
              <TouchableOpacity
                key={o.key}
                onPress={() => setPeriod(o.key)}
                style={[s.pill, period === o.key
                  ? { backgroundColor: Colors.secondary }
                  : { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 }
                ]}
              >
                <Text style={[s.pillText, { color: period === o.key ? '#fff' : palette.textSecondary }]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {period === 'custom' && (
            <View style={s.customDateRow}>
              <TouchableOpacity
                style={[s.datePickerBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
                onPress={() => setShowFromPicker(true)}
              >
                <Ionicons name="calendar-outline" size={12} color={palette.textMuted} />
                <Text style={[s.datePickerText, { color: palette.text }]}>
                  {customFrom.toLocaleDateString('pt-MZ')}
                </Text>
              </TouchableOpacity>
              <Text style={[s.dateSep, { color: palette.textMuted }]}>→</Text>
              <TouchableOpacity
                style={[s.datePickerBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
                onPress={() => setShowToPicker(true)}
              >
                <Ionicons name="calendar-outline" size={12} color={palette.textMuted} />
                <Text style={[s.datePickerText, { color: palette.text }]}>
                  {customTo.toLocaleDateString('pt-MZ')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {showFromPicker && (
            <DateTimePicker
              value={customFrom}
              mode="date"
              display="default"
              maximumDate={customTo}
              onChange={(_e, d) => { setShowFromPicker(false); if (d) setCustomFrom(d); }}
            />
          )}
          {showToPicker && (
            <DateTimePicker
              value={customTo}
              mode="date"
              display="default"
              minimumDate={customFrom}
              maximumDate={new Date()}
              onChange={(_e, d) => { setShowToPicker(false); if (d) setCustomTo(d); }}
            />
          )}
        </View>

        {/* KPI Cards */}
        <View style={s.kpiGrid}>
          {kpis.map(k => (
            <View key={k.label} style={[s.kpiCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[s.kpiLabel, { color: palette.textMuted }]}>{k.label}</Text>
              <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
            </View>
          ))}
        </View>

        {/* Monthly Chart */}
        <View style={[s.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[s.sectionTitle, { color: palette.text }]}>
            {lang === 'pt' ? 'Receitas vs Despesas por Mês' : 'Revenue vs Expenses by Month'}
          </Text>
          {monthlyData.length === 0 ? (
            <Text style={[s.empty, { color: palette.textMuted }]}>{lang === 'pt' ? 'Sem dados.' : 'No data.'}</Text>
          ) : (
            <>
              <View style={s.legendRow}>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: '#0369a1' }]} />
                  <Text style={[s.legendText, { color: palette.textMuted }]}>{lang === 'pt' ? 'Receitas' : 'Revenue'}</Text>
                </View>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: '#ea580c' }]} />
                  <Text style={[s.legendText, { color: palette.textMuted }]}>{lang === 'pt' ? 'Despesas' : 'Expenses'}</Text>
                </View>
                {peakIdx >= 0 && (
                  <View style={s.legendItem}>
                    <Text style={s.peakStar}>★</Text>
                    <Text style={[s.legendText, { color: '#f59e0b' }]}>{lang === 'pt' ? 'Pico' : 'Peak'}</Text>
                  </View>
                )}
                {entryIdx >= 0 && (
                  <View style={s.legendItem}>
                    <Text style={{ fontSize: 9, color: '#059669' }}>▶</Text>
                    <Text style={[s.legendText, { color: '#059669' }]}>{lang === 'pt' ? 'Entrada' : 'Entry'}</Text>
                  </View>
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={[s.chartArea, { width: Math.max(SCREEN_W - 64, monthlyData.length * 72) }]}>
                  {monthlyData.map((d, i) => {
                    const hA = (d.a / maxMonthly) * 100;
                    const hB = (d.b / maxMonthly) * 100;
                    const isPeak = i === peakIdx && d.a > 0;
                    const isEntry = i === entryIdx;
                    return (
                      <View
                        key={d.label}
                        style={[s.barGroup, isEntry && { backgroundColor: 'rgba(5,150,105,0.08)', borderRadius: 4 }]}
                      >
                        {isPeak && <Text style={s.peakStar}>★</Text>}
                        <View style={s.barsContainer}>
                          <View style={[s.bar, { height: `${Math.max(hA, 2)}%` as unknown as number, backgroundColor: isPeak ? '#f59e0b' : '#0369a1' }]} />
                          <View style={[s.bar, { height: `${Math.max(hB, 2)}%` as unknown as number, backgroundColor: '#ea580c' }]} />
                        </View>
                        <Text style={[s.barLabel, { color: palette.textMuted }]}>{d.label}</Text>
                        {isEntry && <Text style={s.entryMarker}>▶</Text>}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          )}
        </View>

        {/* Pie charts: Expense Categories + Payment Methods — side by side */}
        <View style={s.twoCol}>

          {/* Despesas por Categoria */}
          <View style={[s.halfCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[s.sectionTitle, { color: palette.text }]}>
              {lang === 'pt' ? 'Categorias' : 'Categories'}
            </Text>
            {expenseCategories.length === 0 ? (
              <Text style={[s.empty, { color: palette.textMuted }]}>{lang === 'pt' ? 'Sem dados.' : 'No data.'}</Text>
            ) : (
              <>
                <View style={s.pieCenter}>
                  <DonutChart data={expenseCategories} size={90} palette={palette} />
                </View>
                <View style={s.pieLegend}>
                  {expenseCategories.map(cat => (
                    <View key={cat.name} style={s.pieLegendRow}>
                      <View style={[s.pieDot, { backgroundColor: cat.color }]} />
                      <Text style={[s.pieLegendName, { color: palette.text }]} numberOfLines={1}>{cat.name}</Text>
                      <Text style={[s.pieLegendPct, { color: palette.textMuted }]}>{cat.pct}%</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* Métodos de Pagamento */}
          <View style={[s.halfCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[s.sectionTitle, { color: palette.text }]}>
              {lang === 'pt' ? 'Pagamentos' : 'Payments'}
            </Text>
            {paymentMethods.length === 0 ? (
              <Text style={[s.empty, { color: palette.textMuted }]}>{lang === 'pt' ? 'Sem dados.' : 'No data.'}</Text>
            ) : (
              <>
                <View style={s.pieCenter}>
                  <DonutChart
                    data={paymentMethods.map(m => ({ name: m.method, pct: m.pct, color: m.color }))}
                    size={90}
                    palette={palette}
                  />
                </View>
                <View style={s.pieLegend}>
                  {paymentMethods.map(m => (
                    <View key={m.method} style={s.pieLegendRow}>
                      <View style={[s.pieDot, { backgroundColor: m.color }]} />
                      <Text style={[s.pieLegendName, { color: palette.text }]} numberOfLines={1}>{m.method}</Text>
                      <Text style={[s.pieLegendPct, { color: palette.textMuted }]}>{m.count}×</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

        </View>

        {/* Products: most + least sold side by side */}
        <View style={s.twoCol}>
          {[
            { title: lang === 'pt' ? '🏆 Mais Vendidos' : '🏆 Most Sold', data: productData.top, color: Colors.info },
            { title: lang === 'pt' ? '📉 Menos Vendidos' : '📉 Least Sold', data: productData.bottom, color: Colors.warning },
          ].map(section => (
            <View key={section.title} style={[s.halfCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[s.sectionTitle, { color: palette.text, marginBottom: 8 }]}>{section.title}</Text>
              {section.data.length === 0 ? (
                <Text style={[s.empty, { color: palette.textMuted }]}>{lang === 'pt' ? 'Sem dados.' : 'No data.'}</Text>
              ) : (
                section.data.map((p, i) => (
                  <View key={p.desc} style={s.productRow}>
                    <Text style={[s.productRank, { color: palette.textMuted }]}>{i + 1}.</Text>
                    <Text style={[s.productName, { color: palette.text }]} numberOfLines={2}>{p.desc}</Text>
                    <View style={[s.productBadge, { backgroundColor: section.color + '22' }]}>
                      <Text style={[s.productQty, { color: section.color }]}>{p.qty}×</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          ))}
        </View>

        {/* Receipt Images */}
        <View style={[s.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={s.sectionHeaderRow}>
            <Text style={[s.sectionTitle, { color: palette.text }]}>
              {lang === 'pt' ? 'Comprovativos de Despesas' : 'Expense Receipts'}
            </Text>
            <View style={[s.countBadge, { backgroundColor: '#7c3aed22' }]}>
              <Text style={[s.countText, { color: '#7c3aed' }]}>{expensesWithReceipts.length}</Text>
            </View>
          </View>
          {expensesWithReceipts.length === 0 ? (
            <Text style={[s.empty, { color: palette.textMuted }]}>
              {lang === 'pt' ? 'Sem comprovativos neste período.' : 'No receipts in this period.'}
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.receiptScroll}>
              {expensesWithReceipts.map(exp => (
                <View
                  key={exp.id}
                  style={[s.receiptThumb, { borderColor: palette.border }]}
                >
                  <AuthReceiptImage b2Url={exp.receiptImageUrl!} onPress={setPreviewImg} />
                  <View style={s.receiptInfo}>
                    <Text style={[s.receiptRef, { color: palette.text }]}>{exp.ref}</Text>
                    <Text style={[s.receiptMerchant, { color: palette.textMuted }]} numberOfLines={1}>{exp.merchant}</Text>
                    <Text style={[s.receiptAmt, { color: Colors.warning }]}>{formatCurrency(exp.amount)}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

      </ScrollView>

      {/* Full-screen receipt preview */}
      <Modal visible={!!previewImg} transparent animationType="fade" onRequestClose={() => setPreviewImg(null)}>
        <View style={s.previewOverlay}>
          <TouchableOpacity style={s.previewClose} onPress={() => setPreviewImg(null)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          {previewImg && (
            <Image source={{ uri: previewImg }} style={s.previewImg} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, gap: Spacing.sm,
  },
  backBtn: { padding: 4 },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: FontSize.lg, fontWeight: '700' },
  subtitle: { fontSize: FontSize.xs, marginTop: 2 },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.sm, minWidth: 52, justifyContent: 'center' },
  pdfBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 48 },

  card: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  sectionTitle: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  empty: { fontSize: FontSize.xs, fontStyle: 'italic' },

  pillRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm },
  pillText: { fontSize: 12, fontWeight: '600' },

  customDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm, borderWidth: 1 },
  datePickerText: { fontSize: 12, fontWeight: '600' },
  dateSep: { fontSize: 12 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  kpiCard: { flex: 1, minWidth: '45%', padding: Spacing.sm, borderRadius: Radius.md, borderWidth: 1 },
  kpiLabel: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
  kpiValue: { fontSize: 13, fontWeight: '800' },

  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 8, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 11, fontWeight: '600' },

  chartArea: { flexDirection: 'row', alignItems: 'flex-end', height: 88, gap: 6, paddingBottom: 28 },
  barGroup: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' },
  barsContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 58 },
  bar: { width: 10, borderRadius: 2, minHeight: 2 },
  barLabel: { fontSize: 8, fontWeight: '600', position: 'absolute', bottom: 10, textAlign: 'center' },
  peakStar: { position: 'absolute', top: 0, left: 0, right: 0, textAlign: 'center' as const, fontSize: 9, color: '#f59e0b' },
  entryMarker: { position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center' as const, fontSize: 7, color: '#059669', fontWeight: '800' as const },

  twoCol: { flexDirection: 'row', gap: Spacing.sm },
  halfCard: { flex: 1, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.sm },

  // Pie chart styles
  pieCenter: { alignItems: 'center', marginVertical: 8 },
  pieLegend: { gap: 5 },
  pieLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pieDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  pieLegendName: { flex: 1, fontSize: 10, fontWeight: '600' },
  pieLegendPct: { fontSize: 10, fontWeight: '700' },

  productRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginBottom: 6 },
  productRank: { fontSize: 10, fontWeight: '700', width: 16 },
  productName: { flex: 1, fontSize: 11, fontWeight: '600' },
  productBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  productQty: { fontSize: 10, fontWeight: '800' },

  receiptScroll: { marginTop: 4 },
  receiptThumb: { width: 130, marginRight: 10, borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden' },
  receiptImg: { width: 130, height: 90 },
  receiptInfo: { padding: 8, gap: 2 },
  receiptRef: { fontSize: 10, fontWeight: '700' },
  receiptMerchant: { fontSize: 10 },
  receiptAmt: { fontSize: 11, fontWeight: '800' },

  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 11, fontWeight: '700' },

  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  previewClose: { position: 'absolute', top: 48, right: 20, zIndex: 10 },
  previewImg: { width: SCREEN_W - 32, height: SCREEN_W * 1.2 },
});
