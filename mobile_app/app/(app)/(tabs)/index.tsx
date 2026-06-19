import React from 'react';
import {
  View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '../../../stores/dataStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useAuthStore } from '../../../stores/authStore';
import { Colors, Spacing, FontSize } from '../../../shared/theme';
import { tr, formatCurrency, formatDate } from '../../../shared/i18n';
import { KpiCard } from '../../../components/ui/KpiCard';
import { Card } from '../../../components/ui/Card';
import { Badge, getInvoiceVariant } from '../../../components/ui/Badge';
import { generateReportPdf, sharePdf } from '../../../lib/pdf';
import { useToast } from '../../../components/ui/ToastContainer';
import { TAB_BAR_BOTTOM_INSET } from '../../../components/ui/TabBar';

const DOT_N = 4;

type Palette = typeof Colors.light | typeof Colors.dark;

function KpiSkeleton({ palette }: { palette: Palette }) {
  const anims = React.useRef(
    Array.from({ length: DOT_N }, () => new Animated.Value(0))
  ).current;

  React.useEffect(() => {
    const anis = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 130),
          Animated.timing(a, { toValue: -7, duration: 280, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay((DOT_N - i) * 130),
        ])
      )
    );
    anis.forEach(a => a.start());
    return () => anis.forEach(a => a.stop());
  }, []);

  return (
    <View style={[sk.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={[sk.iconBox, { backgroundColor: palette.surface }]} />
      <View style={sk.dotsRow}>
        {anims.map((anim, i) => (
          <Animated.View key={i} style={[sk.dot, { transform: [{ translateY: anim }] }]} />
        ))}
      </View>
      <View style={[sk.titleBar, { backgroundColor: palette.surface }]} />
    </View>
  );
}

function TransactionSkeleton({ palette }: { palette: Palette }) {
  const fade = React.useRef(new Animated.Value(0.3)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    ).start();
    return () => fade.stopAnimation();
  }, []);
  return (
    <>
      {[0, 1, 2, 3, 4].map(i => (
        <Animated.View key={i} style={[sk.txRow, { borderBottomColor: palette.border, opacity: fade }]}>
          <View style={[sk.txAvatar, { backgroundColor: palette.surface }]} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={[sk.txLineA, { backgroundColor: palette.surface }]} />
            <View style={[sk.txLineB, { backgroundColor: palette.surface }]} />
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View style={[sk.txAmount, { backgroundColor: palette.surface }]} />
            <View style={[sk.txBadge, { backgroundColor: palette.surface }]} />
          </View>
        </Animated.View>
      ))}
    </>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { language, darkMode, company } = useSettingsStore();
  const { userId } = useAuthStore();
  const { invoices, quotes, receipts, stockItems, expenses, loadAll, loading } = useDataStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const [generatingReport, setGeneratingReport] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (userId) loadAll(userId);
    }, [userId])
  );

  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

  const salesToday = invoices
    .filter((i) => i.status === 'Paid' && i.issueDate >= todayStr)
    .reduce((s, i) => s + i.amount, 0);

  const monthlyRevenue = invoices
    .filter((i) => i.status === 'Paid' && i.issueDate >= monthStart)
    .reduce((s, i) => s + i.amount, 0);

  const pendingCount = invoices.filter((i) => i.status === 'Pending' || i.status === 'Overdue').length;
  const pendingAmount = invoices
    .filter((i) => i.status === 'Pending' || i.status === 'Overdue')
    .reduce((s, i) => s + i.amount, 0);

  const lowStockCount = stockItems.filter((s) => s.status === 'Low Stock' || s.status === 'Out of Stock').length;

  const recentInvoices = invoices.slice(0, 5);
  const criticalStock = stockItems
    .filter((s) => s.status !== 'In Stock')
    .slice(0, 3);

  const onRefresh = async () => {
    if (!userId) return;
    setRefreshing(true);
    await loadAll(userId);
    setRefreshing(false);
  };

  const handleGenerateReport = async () => {
    if (!company) return;
    setGeneratingReport(true);
    try {
      const uri = await generateReportPdf(company, invoices, quotes, receipts, expenses);
      await sharePdf(uri);
    } catch {
      showToast('Erro', 'Erro ao gerar relatório', 'error');
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={[styles.topBar, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        <Image
          source={darkMode ? require('../../../assets/dark.png') : require('../../../assets/Logo_extended.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <TouchableOpacity onPress={() => router.push('/(app)/settings')} hitSlop={8}>
          <Ionicons name="settings-outline" size={22} color={palette.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* KPIs */}
        <View style={styles.kpiGrid}>
          {loading && !refreshing ? (
            <><KpiSkeleton palette={palette} /><KpiSkeleton palette={palette} /></>
          ) : (
            <>
              <KpiCard title={tr(lang, 'salesToday')} value={formatCurrency(salesToday)} icon="cash-outline" iconColor={Colors.success} />
              <KpiCard title={tr(lang, 'monthlyRevenue')} value={formatCurrency(monthlyRevenue)} icon="trending-up-outline" iconColor={Colors.primary} />
            </>
          )}
        </View>
        <View style={styles.kpiGrid}>
          {loading && !refreshing ? (
            <><KpiSkeleton palette={palette} /><KpiSkeleton palette={palette} /></>
          ) : (
            <>
              <KpiCard title={tr(lang, 'pendingInvoices')} value={`${pendingCount} · ${formatCurrency(pendingAmount)}`} icon="time-outline" iconColor={Colors.warning} />
              <KpiCard title={tr(lang, 'lowStockItems')} value={String(lowStockCount)} icon="warning-outline" iconColor={Colors.error} />
            </>
          )}
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: palette.text }]}>{tr(lang, 'quickActions')}</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
            onPress={() => router.push('/(app)/invoice/new')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>{tr(lang, 'newInvoice')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.secondary }]}
            onPress={() => router.push('/(app)/stock/new')}
          >
            <Ionicons name="cube-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>{lang === 'pt' ? 'Adicionar Stock' : 'Add Stock'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#0369a1' }]}
            onPress={handleGenerateReport}
            disabled={generatingReport}
          >
            <Ionicons name="document-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>{tr(lang, 'generateReport')}</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <Text style={[styles.sectionTitle, { color: palette.text }]}>{tr(lang, 'recentTransactions')}</Text>
        <Card padding={0} style={{ overflow: 'hidden' }}>
          {loading && !refreshing ? (
            <TransactionSkeleton palette={palette} />
          ) : recentInvoices.length === 0 ? (
            <Text style={[styles.empty, { color: palette.textMuted }]}>{tr(lang, 'noData')}</Text>
          ) : (
            recentInvoices.map((inv, i) => (
              <TouchableOpacity
                key={inv.id}
                onPress={() => router.push(`/(app)/invoice/${inv.id}`)}
                style={[
                  styles.transRow,
                  { borderBottomColor: palette.border },
                  i < recentInvoices.length - 1 && { borderBottomWidth: 1 },
                ]}
              >
                <View style={[styles.avatar, { backgroundColor: inv.logoBg }]}>
                  <Text style={styles.avatarText}>{inv.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.clientName, { color: palette.text }]}>{inv.client}</Text>
                  <Text style={[styles.invNum, { color: palette.textMuted }]}>
                    {inv.invoiceNumber} · {formatDate(inv.issueDate, lang)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[styles.amount, { color: palette.text }]}>{formatCurrency(inv.amount)}</Text>
                  <Badge
                    label={lang === 'pt' ? inv.statusPt : inv.status}
                    variant={getInvoiceVariant(inv.status)}
                  />
                </View>
              </TouchableOpacity>
            ))
          )}
        </Card>

        {/* Critical Stock */}
        {criticalStock.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>{tr(lang, 'criticalStock')}</Text>
            <Card>
              {criticalStock.map((item, i) => (
                <View key={item.id} style={[styles.stockRow, i < criticalStock.length - 1 && { marginBottom: 12 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stockName, { color: palette.text }]}>{item.name}</Text>
                    <Text style={[styles.stockSku, { color: palette.textMuted }]}>{item.sku}</Text>
                    <View style={[styles.progressBg, { backgroundColor: palette.surface }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${item.maxStock > 0 ? Math.min(100, (item.stockLevel / item.maxStock) * 100) : 0}%`,
                            backgroundColor: item.status === 'Out of Stock' ? Colors.error : Colors.warning,
                          } as any,
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={[styles.stockLevel, { color: palette.textSecondary }]}>
                    {item.stockLevel}/{item.maxStock}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerLogo: {
    width: 100,
    height: 36,
  },
  scroll: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: TAB_BAR_BOTTOM_INSET },
  kpiGrid: { flexDirection: 'row', gap: Spacing.sm },
  sectionTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: FontSize.md,
    fontWeight: '700',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    flex: 1,
    minWidth: 100,
  },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '600', flexShrink: 1 },
  empty: { padding: Spacing.lg, textAlign: 'center', fontSize: FontSize.sm },
  transRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  clientName: { fontWeight: '600', fontSize: FontSize.sm },
  invNum: { fontSize: 11, marginTop: 2 },
  amount: { fontWeight: '700', fontSize: FontSize.sm },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stockName: { fontWeight: '600', fontSize: FontSize.sm },
  stockSku: { fontSize: 11 },
  progressBg: {
    height: 6, borderRadius: 3, marginTop: 4, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  stockLevel: { fontSize: 12, fontWeight: '600', minWidth: 48, textAlign: 'right' },
});

const sk = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.md,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 10, marginBottom: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    height: 24,
    marginBottom: 10,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#805522',
  },
  titleBar: {
    height: 8, borderRadius: 4, width: '60%',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
  },
  txAvatar: { width: 40, height: 40, borderRadius: 20 },
  txLineA: { height: 10, borderRadius: 5, width: '70%' },
  txLineB: { height: 8, borderRadius: 4, width: '45%' },
  txAmount: { height: 10, borderRadius: 5, width: 60 },
  txBadge: { height: 18, borderRadius: 9, width: 50 },
});
