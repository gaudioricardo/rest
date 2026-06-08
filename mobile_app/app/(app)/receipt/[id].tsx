import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useInvoiceStore } from '../../../stores/invoiceStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { shareReceiptPDF } from '../../../lib/pdf';
import { hapticError } from '../../../lib/haptics';

function formatMZN(v: number) {
  return v.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MZN';
}

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const receipts = useInvoiceStore(s => s.receipts);
  const company = useSettingsStore(s => s.company);
  const [pdfLoading, setPdfLoading] = useState(false);

  const receipt = receipts.find(r => r.id === id);

  if (!receipt) return (
    <SafeAreaView className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#0c1c48" />
    </SafeAreaView>
  );

  const handlePDF = async () => {
    if (!company) return;
    setPdfLoading(true);
    try {
      await shareReceiptPDF(receipt, company);
    } catch {
      hapticError();
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-ugest-background dark:bg-ugest-dark-background" edges={['top']}>
      <View className="flex-row items-center px-4 pt-2 pb-4 gap-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Feather name="arrow-left" size={22} color="#0c1c48" />
        </TouchableOpacity>
        <Text className="flex-1 font-montserrat text-xl text-primary-950 dark:text-white">{receipt.receiptNumber}</Text>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Payment confirmed banner */}
        <View className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 mb-4 items-center">
          <View className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900 rounded-full items-center justify-center mb-3">
            <Feather name="check-circle" size={28} color="#065f46" />
          </View>
          <Text className="font-inter-extrabold text-2xl text-emerald-800 dark:text-emerald-200">
            {formatMZN(receipt.amount)}
          </Text>
          <Text className="font-inter text-emerald-700 dark:text-emerald-300 text-sm mt-1">
            Pagamento recebido de {receipt.client}
          </Text>
        </View>

        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
          {[
            { label: 'Data', value: receipt.datePt },
            { label: 'Método', value: receipt.methodPt },
            { label: 'Ref. Factura', value: receipt.invoiceRef },
            { label: 'Cliente', value: receipt.client },
          ].map(row => (
            <View key={row.label} className="flex-row justify-between py-3 border-b border-gray-50 dark:border-gray-700">
              <Text className="font-inter text-gray-500 dark:text-gray-400 text-sm">{row.label}</Text>
              <Text className="font-inter-medium text-gray-800 dark:text-gray-100 text-sm">{row.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="px-4 pb-6">
        <TouchableOpacity
          onPress={handlePDF}
          disabled={pdfLoading}
          className="flex-row items-center justify-center gap-2 py-4 rounded-2xl border-2 border-emerald-600 active:opacity-70"
          activeOpacity={0.8}
        >
          {pdfLoading
            ? <ActivityIndicator size="small" color="#065f46" />
            : <Feather name="download" size={18} color="#065f46" />
          }
          <Text className="font-inter-bold text-emerald-700">Partilhar Recibo PDF</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
