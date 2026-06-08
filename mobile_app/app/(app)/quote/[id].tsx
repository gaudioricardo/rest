import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useInvoiceStore } from '../../../stores/invoiceStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { Badge, statusToBadgeVariant } from '../../../components/ui/Badge';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { hapticSuccess, hapticError } from '../../../lib/haptics';

function formatMZN(v: number) {
  return v.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MZN';
}

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const quotes = useInvoiceStore(s => s.quotes);
  const { loadAll } = useInvoiceStore();
  const user = useAuthStore(s => s.user);
  const company = useSettingsStore(s => s.company);

  const quote = quotes.find(q => q.id === id);
  const [approving, setApproving] = useState(false);

  if (!quote) return (
    <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
      <ActivityIndicator size="large" color="#0c1c48" />
    </SafeAreaView>
  );

  const items = quote.items ?? [];
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const ispc = subtotal * 0.03;
  const total = subtotal + ispc;

  const handleApprove = async () => {
    if (!user) return;
    Alert.alert('Aprovar cotação', `Confirmar aprovação de ${quote.quoteNumber}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprovar', onPress: async () => {
          setApproving(true);
          const { error } = await supabase
            .from('quotes')
            .update({ status: 'Approved' })
            .eq('id', id);
          if (error) {
            hapticError();
            Alert.alert('Erro', error.message);
          } else {
            hapticSuccess();
            await loadAll(user.id);
          }
          setApproving(false);
        },
      },
    ]);
  };

  const handleReject = async () => {
    if (!user) return;
    Alert.alert('Rejeitar cotação', `Confirmar rejeição de ${quote.quoteNumber}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rejeitar', style: 'destructive', onPress: async () => {
          await supabase.from('quotes').update({ status: 'Rejected' }).eq('id', id);
          hapticSuccess();
          await loadAll(user.id);
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-ugest-background dark:bg-ugest-dark-background" edges={['top']}>
      <View className="flex-row items-center px-4 pt-2 pb-4 gap-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Feather name="arrow-left" size={22} color="#0c1c48" />
        </TouchableOpacity>
        <Text className="flex-1 font-montserrat text-xl text-primary-950 dark:text-white">{quote.quoteNumber}</Text>
        <Badge label={quote.statusPt} variant={statusToBadgeVariant(quote.status)} />
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
          <Text className="text-xs font-inter-extrabold uppercase tracking-widest text-gray-400 mb-2">Cliente</Text>
          <Text className="font-inter-bold text-gray-900 dark:text-white text-lg">{quote.client}</Text>
          {quote.clientNuit && <Text className="text-sm font-inter text-gray-500 dark:text-gray-400">NUIT: {quote.clientNuit}</Text>}
          {quote.clientPhone && <Text className="text-sm font-inter text-gray-500 dark:text-gray-400">{quote.clientPhone}</Text>}
          <View className="flex-row gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <View>
              <Text className="text-xs text-gray-400 font-inter">Emissão</Text>
              <Text className="text-sm font-inter-medium text-gray-700 dark:text-gray-200">{quote.datePt}</Text>
            </View>
            <View>
              <Text className="text-xs text-gray-400 font-inter">Validade</Text>
              <Text className="text-sm font-inter-medium text-gray-700 dark:text-gray-200">{quote.validityDays} dias</Text>
            </View>
          </View>
        </View>

        {items.length > 0 && (
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
            <Text className="text-xs font-inter-extrabold uppercase tracking-widest text-gray-400 mb-3">Itens</Text>
            {items.map((item, i) => (
              <View key={i} className={`flex-row items-start gap-2 ${i < items.length - 1 ? 'mb-3 pb-3 border-b border-gray-100 dark:border-gray-700' : ''}`}>
                <View className="flex-1">
                  <Text className="font-inter-medium text-gray-800 dark:text-gray-100 text-sm">{item.description}</Text>
                  <Text className="text-xs text-gray-400 font-inter">{item.quantity} × {formatMZN(item.unitPrice)}</Text>
                </View>
                <Text className="font-inter-bold text-gray-900 dark:text-white text-sm">{formatMZN(item.quantity * item.unitPrice)}</Text>
              </View>
            ))}
          </View>
        )}

        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
          <View className="flex-row justify-between py-2">
            <Text className="font-inter text-gray-600 dark:text-gray-300">Subtotal</Text>
            <Text className="font-inter-medium text-gray-800 dark:text-gray-100">{formatMZN(subtotal)}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-t border-gray-100 dark:border-gray-700">
            <Text className="font-inter text-gray-600 dark:text-gray-300">ISPC (3%)</Text>
            <Text className="font-inter-medium text-gray-800 dark:text-gray-100">{formatMZN(ispc)}</Text>
          </View>
          <View className="flex-row justify-between py-3 mt-1 border-t-2 border-secondary-100 dark:border-secondary-900">
            <Text className="font-inter-bold text-secondary-950 dark:text-white text-base">TOTAL</Text>
            <Text className="font-inter-bold text-secondary-950 dark:text-white text-lg">{formatMZN(total)}</Text>
          </View>
        </View>
      </ScrollView>

      {quote.status === 'Pending' && (
        <View className="px-4 pb-6 pt-2 flex-row gap-3">
          <TouchableOpacity
            onPress={handleReject}
            className="flex-1 py-4 rounded-2xl border-2 border-red-500 items-center justify-center"
            activeOpacity={0.8}
          >
            <Text className="font-inter-bold text-red-600">Rejeitar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleApprove}
            disabled={approving}
            className="flex-1 py-4 rounded-2xl bg-emerald-600 items-center justify-center flex-row gap-2"
            activeOpacity={0.85}
          >
            {approving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Feather name="check" size={18} color="#fff" />
            }
            <Text className="font-inter-bold text-white">Aprovar</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
