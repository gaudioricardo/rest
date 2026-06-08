import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useInvoiceStore } from '../../../stores/invoiceStore';
import { useAuthStore } from '../../../stores/authStore';
import { useRealtimeInvoices } from '../../../hooks/useRealtimeInvoices';
import { DocumentListItem } from '../../../components/ui/DocumentListItem';
import { CardSkeleton } from '../../../components/ui/SkeletonLoader';

type Segment = 'invoices' | 'quotes' | 'receipts';

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'invoices', label: 'Facturas' },
  { key: 'quotes', label: 'Cotações' },
  { key: 'receipts', label: 'Recibos' },
];

export default function DocumentsScreen() {
  useRealtimeInvoices();
  const [active, setActive] = useState<Segment>('invoices');
  const user = useAuthStore(s => s.user);
  const { invoices, quotes, receipts, loading, loadAll } = useInvoiceStore();

  const items = useMemo(() => {
    if (active === 'invoices') return invoices;
    if (active === 'quotes') return quotes;
    return receipts;
  }, [active, invoices, quotes, receipts]);

  return (
    <SafeAreaView className="flex-1 bg-ugest-background dark:bg-ugest-dark-background" edges={['top']}>
      {/* Header */}
      <View className="px-4 pt-2 pb-4">
        <Text className="text-2xl font-montserrat text-primary-950 dark:text-white mb-4">Documentos</Text>

        {/* Segmented Control */}
        <View className="flex-row bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 gap-1">
          {SEGMENTS.map(s => (
            <TouchableOpacity
              key={s.key}
              onPress={() => setActive(s.key)}
              className={`flex-1 py-2.5 rounded-xl items-center ${active === s.key ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              activeOpacity={0.7}
            >
              <Text className={`text-sm font-inter-bold ${active === s.key ? 'text-primary-950 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => user && loadAll(user.id)} tintColor="#0c1c48" />}
      >
        {loading && !items.length
          ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          : items.length === 0
            ? (
              <View className="items-center py-16">
                <Feather name="folder" size={48} color="#d1d5db" />
                <Text className="text-gray-400 font-inter mt-3 text-base">
                  {active === 'invoices' ? 'Nenhuma factura' : active === 'quotes' ? 'Nenhuma cotação' : 'Nenhum recibo'}
                </Text>
              </View>
            )
            : (items as typeof invoices).map(item => {
                if (active === 'invoices') {
                  const inv = item as typeof invoices[0];
                  return (
                    <DocumentListItem
                      key={inv.id} prefix="INV" number={inv.invoiceNumber}
                      client={inv.client} date={inv.datePt} amount={inv.amount}
                      status={inv.status} statusPt={inv.statusPt}
                      onPress={() => router.push(`/(app)/invoice/${inv.id}`)}
                    />
                  );
                }
                if (active === 'quotes') {
                  const q = item as typeof quotes[0];
                  return (
                    <DocumentListItem
                      key={q.id} prefix="QT" number={q.quoteNumber}
                      client={q.client} date={q.datePt} amount={q.amount}
                      status={q.status} statusPt={q.statusPt}
                      onPress={() => router.push(`/(app)/quote/${q.id}`)}
                    />
                  );
                }
                const r = item as typeof receipts[0];
                return (
                  <DocumentListItem
                    key={r.id} prefix="REC" number={r.receiptNumber}
                    client={r.client} date={r.datePt} amount={r.amount}
                    status="Paid" statusPt="Pago"
                    onPress={() => router.push(`/(app)/receipt/${r.id}`)}
                  />
                );
              })
        }
        <View className="h-8" />
      </ScrollView>

      {/* FAB */}
      {active === 'invoices' && (
        <TouchableOpacity
          onPress={() => router.push('/(app)/invoice/new')}
          className="absolute bottom-6 right-4 w-14 h-14 bg-primary-950 rounded-full items-center justify-center shadow-xl"
          activeOpacity={0.85}
        >
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}
      {active === 'quotes' && (
        <TouchableOpacity
          onPress={() => router.push('/(app)/quote/new')}
          className="absolute bottom-6 right-4 w-14 h-14 bg-secondary-950 rounded-full items-center justify-center shadow-xl"
          activeOpacity={0.85}
        >
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
