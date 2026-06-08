import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useInvoiceStore } from '../../../stores/invoiceStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useAuthStore } from '../../../stores/authStore';
import { Badge, statusToBadgeVariant } from '../../../components/ui/Badge';
import { PaymentMethodPicker } from '../../../components/forms/PaymentMethodPicker';
import { shareInvoicePDF } from '../../../lib/pdf';
import { hapticSuccess, hapticError } from '../../../lib/haptics';

function formatMZN(v: number) {
  return v.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MZN';
}

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const invoices = useInvoiceStore(s => s.invoices);
  const markPaid = useInvoiceStore(s => s.markPaid);
  const user = useAuthStore(s => s.user);
  const company = useSettingsStore(s => s.company);

  const invoice = invoices.find(i => i.id === id);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  if (!invoice) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#0c1c48" />
      </SafeAreaView>
    );
  }

  const items = invoice.items ?? [];
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const ispc = subtotal * 0.03;
  const total = subtotal + ispc;

  const handlePDF = async () => {
    if (!company) return;
    setPdfLoading(true);
    try {
      await shareInvoicePDF(invoice, company);
    } catch (e) {
      hapticError();
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleMarkPaid = async (method: string) => {
    if (!user) return;
    setPickerOpen(false);
    setPayLoading(true);
    const receipt = await markPaid(invoice.id, method, user.id);
    setPayLoading(false);
    if (receipt) {
      hapticSuccess();
      Alert.alert('Pagamento registado', `Recibo ${receipt.receiptNumber} gerado com sucesso.`);
    } else {
      hapticError();
      Alert.alert('Erro', 'Não foi possível registar o pagamento.');
    }
  };

  const isPending = invoice.status === 'Pending' || invoice.status === 'Overdue';

  return (
    <SafeAreaView className="flex-1 bg-ugest-background dark:bg-ugest-dark-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-2 pb-4 gap-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Feather name="arrow-left" size={22} color="#0c1c48" />
        </TouchableOpacity>
        <Text className="flex-1 font-montserrat text-xl text-primary-950 dark:text-white">{invoice.invoiceNumber}</Text>
        <Badge label={invoice.statusPt} variant={statusToBadgeVariant(invoice.status)} />
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Client card */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
          <Text className="text-xs font-inter-extrabold uppercase tracking-widest text-gray-400 mb-2">Cliente</Text>
          <Text className="font-inter-bold text-gray-900 dark:text-white text-lg">{invoice.client}</Text>
          {invoice.clientNuit && <Text className="text-sm font-inter text-gray-500 dark:text-gray-400">NUIT: {invoice.clientNuit}</Text>}
          {invoice.clientPhone && <Text className="text-sm font-inter text-gray-500 dark:text-gray-400">{invoice.clientPhone}</Text>}
          {invoice.clientEmail && <Text className="text-sm font-inter text-gray-500 dark:text-gray-400">{invoice.clientEmail}</Text>}
          <View className="flex-row gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <View>
              <Text className="text-xs text-gray-400 font-inter">Emissão</Text>
              <Text className="text-sm font-inter-medium text-gray-700 dark:text-gray-200">{invoice.datePt}</Text>
            </View>
            {invoice.dueDate && (
              <View>
                <Text className="text-xs text-gray-400 font-inter">Vencimento</Text>
                <Text className="text-sm font-inter-medium text-gray-700 dark:text-gray-200">{invoice.dueDate}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Items */}
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

        {/* Totals */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
          <View className="flex-row justify-between py-2">
            <Text className="font-inter text-gray-600 dark:text-gray-300">Subtotal</Text>
            <Text className="font-inter-medium text-gray-800 dark:text-gray-100">{formatMZN(subtotal)}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-t border-gray-100 dark:border-gray-700">
            <Text className="font-inter text-gray-600 dark:text-gray-300">ISPC (3%)</Text>
            <Text className="font-inter-medium text-gray-800 dark:text-gray-100">{formatMZN(ispc)}</Text>
          </View>
          <View className="flex-row justify-between py-3 mt-1 border-t-2 border-primary-100 dark:border-primary-900">
            <Text className="font-inter-bold text-primary-950 dark:text-white text-base">TOTAL</Text>
            <Text className="font-inter-bold text-primary-950 dark:text-white text-lg">{formatMZN(total)}</Text>
          </View>
        </View>

        {/* Company payment info */}
        {company && (company.bankAccounts?.length > 0 || company.mobileContacts?.length > 0) && (
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
            <Text className="text-xs font-inter-extrabold uppercase tracking-widest text-gray-400 mb-3">Dados de Pagamento</Text>
            {company.bankAccounts?.map((b, i) => (
              <Text key={i} className="text-sm font-inter text-gray-700 dark:text-gray-200 mb-1">
                🏦 {b.bank}: {b.iban}
              </Text>
            ))}
            {company.mobileContacts?.map((m, i) => (
              <Text key={i} className="text-sm font-inter text-gray-700 dark:text-gray-200 mb-1">
                📱 {m.provider}: {m.number}
              </Text>
            ))}
          </View>
        )}

        {invoice.notes && (
          <View className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 mb-3 border border-amber-100 dark:border-amber-800">
            <Text className="text-xs font-inter-extrabold uppercase tracking-widest text-amber-600 mb-1">Notas</Text>
            <Text className="text-sm font-inter text-amber-800 dark:text-amber-200">{invoice.notes}</Text>
          </View>
        )}
      </ScrollView>

      {/* Actions */}
      <View className="px-4 pb-6 pt-2 gap-3">
        <TouchableOpacity
          onPress={handlePDF}
          disabled={pdfLoading}
          className="flex-row items-center justify-center gap-2 py-4 rounded-2xl border-2 border-primary-950 dark:border-primary-200 active:opacity-70"
          activeOpacity={0.8}
        >
          {pdfLoading
            ? <ActivityIndicator size="small" color="#0c1c48" />
            : <Feather name="download" size={18} color="#0c1c48" />
          }
          <Text className="font-inter-bold text-primary-950 dark:text-white">Gerar e Partilhar PDF</Text>
        </TouchableOpacity>

        {isPending && (
          <TouchableOpacity
            onPress={() => setPickerOpen(true)}
            disabled={payLoading}
            className="flex-row items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-600 active:opacity-70"
            activeOpacity={0.85}
          >
            {payLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Feather name="check-circle" size={18} color="#fff" />
            }
            <Text className="font-inter-bold text-white">Marcar como Pago</Text>
          </TouchableOpacity>
        )}
      </View>

      <PaymentMethodPicker
        visible={pickerOpen}
        onSelect={handleMarkPaid}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}
