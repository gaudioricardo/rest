import React, { useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../../stores/authStore';
import { useInvoiceStore } from '../../../stores/invoiceStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { KpiCard } from '../../../components/ui/KpiCard';
import { KpiSkeleton, CardSkeleton } from '../../../components/ui/SkeletonLoader';
import { useRealtimeInvoices } from '../../../hooks/useRealtimeInvoices';
import { DocumentListItem } from '../../../components/ui/DocumentListItem';

function formatMZN(v: number) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M MZN';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'k MZN';
  return v.toLocaleString('pt-MZ') + ' MZN';
}

export default function DashboardScreen() {
  useRealtimeInvoices();

  const user = useAuthStore(s => s.user);
  const company = useSettingsStore(s => s.company);
  const { invoices, quotes, loading, loadAll } = useInvoiceStore();

  const onRefresh = useCallback(() => {
    if (user) loadAll(user.id);
  }, [user]);

  const kpis = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const monthRevenue = invoices
      .filter(i => i.status === 'Paid' && new Date(i.issueDate).getMonth() === month && new Date(i.issueDate).getFullYear() === year)
      .reduce((s, i) => s + i.amount, 0);

    const pending = invoices.filter(i => i.status === 'Pending' || i.status === 'Overdue');
    const activeQuotes = quotes.filter(q => q.status === 'Pending');

    return { monthRevenue, pendingCount: pending.length, quotesCount: activeQuotes.length };
  }, [invoices, quotes]);

  const recent = useMemo(() => invoices.slice(0, 5), [invoices]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-ugest-background dark:bg-ugest-dark-background" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#0c1c48" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-gray-500 dark:text-gray-400 font-inter text-sm">{greeting}</Text>
            <Text className="text-2xl font-montserrat text-primary-950 dark:text-white" numberOfLines={1}>
              {company?.companyName ?? 'Ugest ERP'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(app)/settings')}
            className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 items-center justify-center shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <Feather name="settings" size={18} color="#0c1c48" />
          </TouchableOpacity>
        </View>

        {/* KPIs */}
        {loading && !invoices.length ? (
          <View className="flex-row gap-3 mb-3">
            <KpiSkeleton /><KpiSkeleton />
          </View>
        ) : (
          <>
            <View className="flex-row gap-3 mb-3">
              <KpiCard
                label="Receita do mês"
                value={formatMZN(kpis.monthRevenue)}
                icon="trending-up"
                iconColor="#065f46"
                iconBg="#d1fae5"
                onPress={() => router.push('/(app)/(tabs)/documents')}
              />
              <KpiCard
                label="Facturas pendentes"
                value={String(kpis.pendingCount)}
                icon="clock"
                iconColor="#92400e"
                iconBg="#fef3c7"
                onPress={() => router.push('/(app)/(tabs)/documents')}
              />
            </View>
            <View className="flex-row gap-3 mb-6">
              <KpiCard
                label="Cotações activas"
                value={String(kpis.quotesCount)}
                icon="clipboard"
                iconColor="#1d4ed8"
                iconBg="#dbeafe"
                onPress={() => router.push('/(app)/(tabs)/documents')}
              />
              <KpiCard
                label="Documentos totais"
                value={String(invoices.length)}
                icon="file-text"
                iconColor="#0c1c48"
                iconBg="#e8ecf5"
              />
            </View>
          </>
        )}

        {/* Recent */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="font-montserrat text-gray-900 dark:text-white text-base">Recentes</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/documents')}>
            <Text className="font-inter-medium text-primary-950 dark:text-primary-200 text-sm">Ver todos</Text>
          </TouchableOpacity>
        </View>

        {loading && !invoices.length
          ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
          : recent.length === 0
            ? (
              <View className="items-center py-12">
                <Feather name="inbox" size={40} color="#d1d5db" />
                <Text className="text-gray-400 font-inter mt-3">Nenhuma factura ainda</Text>
              </View>
            )
            : recent.map(inv => (
              <DocumentListItem
                key={inv.id}
                prefix="INV"
                number={inv.invoiceNumber}
                client={inv.client}
                date={inv.datePt}
                amount={inv.amount}
                status={inv.status}
                statusPt={inv.statusPt}
                onPress={() => router.push(`/(app)/invoice/${inv.id}`)}
              />
            ))
        }
      </ScrollView>
    </SafeAreaView>
  );
}
