import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useClientStore } from '../../../stores/clientStore';
import { useInvoiceStore } from '../../../stores/invoiceStore';
import { getInitials } from '../../../shared/db';
import { Badge, statusToBadgeVariant } from '../../../components/ui/Badge';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clients = useClientStore(s => s.clients);
  const invoices = useInvoiceStore(s => s.invoices);
  const quotes = useInvoiceStore(s => s.quotes);

  const client = clients.find(c => c.id === id);

  const clientDocs = useMemo(() => {
    if (!client) return [];
    const name = client.fullName.toLowerCase();
    const invs = invoices
      .filter(i => i.client.toLowerCase() === name)
      .map(i => ({ type: 'Factura', number: i.invoiceNumber, date: i.datePt, amount: i.amount, status: i.status, statusPt: i.statusPt }));
    const qs = quotes
      .filter(q => q.client.toLowerCase() === name)
      .map(q => ({ type: 'Cotação', number: q.quoteNumber, date: q.datePt, amount: q.amount, status: q.status, statusPt: q.statusPt }));
    return [...invs, ...qs].sort((a, b) => b.date.localeCompare(a.date));
  }, [client, invoices, quotes]);

  if (!client) return null;

  const phone = client.vodacomNumber || client.movitelNumber;
  const initials = getInitials(client.fullName);

  return (
    <SafeAreaView className="flex-1 bg-ugest-background dark:bg-ugest-dark-background" edges={['top']}>
      <View className="flex-row items-center px-4 pt-2 pb-4 gap-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Feather name="arrow-left" size={22} color="#0c1c48" />
        </TouchableOpacity>
        <Text className="flex-1 font-montserrat text-xl text-primary-950 dark:text-white">Cliente</Text>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Profile */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-5 mb-4 border border-gray-100 dark:border-gray-700 items-center">
          <View className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 items-center justify-center mb-3">
            <Text className="font-inter-bold text-primary-950 dark:text-primary-100 text-xl">{initials}</Text>
          </View>
          <Text className="font-montserrat text-xl text-gray-900 dark:text-white text-center">{client.fullName}</Text>
          <View className={`mt-2 px-3 py-1 rounded-full ${client.status === 'Pendente' ? 'bg-amber-100' : 'bg-emerald-100'}`}>
            <Text className={`text-xs font-inter-extrabold ${client.status === 'Pendente' ? 'text-amber-800' : 'text-emerald-800'}`}>
              {client.status}
            </Text>
          </View>

          <View className="w-full mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 gap-2">
            {phone && <Text className="text-sm font-inter text-gray-600 dark:text-gray-300">📱 {phone}</Text>}
            {client.email && <Text className="text-sm font-inter text-gray-600 dark:text-gray-300">✉️ {client.email}</Text>}
            {client.address && <Text className="text-sm font-inter text-gray-600 dark:text-gray-300">📍 {client.address}</Text>}
          </View>
        </View>

        {/* Actions */}
        {phone && (
          <View className="flex-row gap-2 mb-4">
            <TouchableOpacity
              onPress={() => Linking.openURL(`sms:+258${phone.replace(/\D/g, '')}`)}
              className="flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/30"
            >
              <Feather name="message-square" size={16} color="#1d4ed8" />
              <Text className="font-inter-bold text-blue-700 dark:text-blue-300 text-sm">SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Linking.openURL(`whatsapp://send?phone=+258${phone.replace(/\D/g, '')}`)}
              className="flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-xl bg-green-50 dark:bg-green-900/30"
            >
              <Feather name="smartphone" size={16} color="#15803d" />
              <Text className="font-inter-bold text-green-700 dark:text-green-300 text-sm">WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:+258${phone.replace(/\D/g, '')}`)}
              className="px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 items-center justify-center"
            >
              <Feather name="phone" size={16} color="#374151" />
            </TouchableOpacity>
          </View>
        )}

        {/* Timeline */}
        <Text className="font-inter-extrabold text-xs uppercase tracking-widest text-gray-400 mb-3">
          Histórico de Documentos ({clientDocs.length})
        </Text>
        {clientDocs.length === 0
          ? <Text className="text-gray-400 font-inter text-center py-8">Nenhum documento associado</Text>
          : clientDocs.map((doc, i) => (
            <View key={i} className="flex-row items-center gap-3 mb-3">
              <View className="w-1.5 self-stretch bg-gray-200 dark:bg-gray-700 rounded-full" />
              <View className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="font-inter-bold text-gray-900 dark:text-white text-sm">{doc.number}</Text>
                  <Badge label={doc.statusPt} variant={statusToBadgeVariant(doc.status)} size="sm" />
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs font-inter text-gray-400">{doc.type} · {doc.date}</Text>
                  <Text className="text-xs font-inter-bold text-gray-700 dark:text-gray-200">
                    {doc.amount.toLocaleString('pt-MZ', { minimumFractionDigits: 0 })} MZN
                  </Text>
                </View>
              </View>
            </View>
          ))
        }
      </ScrollView>
    </SafeAreaView>
  );
}
