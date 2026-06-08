import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../../stores/authStore';
import { useInvoiceStore } from '../../../stores/invoiceStore';
import { DocumentItem } from '../../../shared/types';
import { DocumentItemRow } from '../../../components/forms/DocumentItemRow';
import { ClientAutocomplete } from '../../../components/forms/ClientAutocomplete';
import { supabase } from '../../../lib/supabase';
import { getNextSeqNumber } from '../../../shared/db';
import { hapticSuccess, hapticError } from '../../../lib/haptics';

function formatMZN(v: number) {
  return v.toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MZN';
}

export default function NewQuoteScreen() {
  const user = useAuthStore(s => s.user);
  const { loadAll } = useInvoiceStore();

  const [client, setClient] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [validityDays, setValidityDays] = useState('15');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DocumentItem[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [loading, setLoading] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const ispc = subtotal * 0.03;
  const total = subtotal + ispc;

  const updateItem = (index: number, field: keyof DocumentItem, value: string) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      if (field === 'quantity') return { ...item, quantity: parseInt(value) || 0 };
      if (field === 'unitPrice') return { ...item, unitPrice: parseFloat(value) || 0 };
      return { ...item, [field]: value };
    }));
  };

  const handleSubmit = async () => {
    if (!client.trim()) { Alert.alert('Erro', 'Nome do cliente obrigatório.'); return; }
    if (items.some(i => !i.description.trim())) { Alert.alert('Erro', 'Todos os itens precisam de descrição.'); return; }
    if (!user) return;

    setLoading(true);
    try {
      const seq = await getNextSeqNumber('quotes', user.id);
      const today = new Date().toISOString().slice(0, 10);

      const { data: qData, error: qErr } = await supabase
        .from('quotes')
        .insert({
          user_id: user.id,
          seq_number: seq,
          client: client.trim(),
          client_phone: clientPhone.trim() || null,
          client_email: clientEmail.trim() || null,
          issue_date: today,
          validity_days: parseInt(validityDays) || 15,
          amount: total,
          status: 'Pending',
          notes: notes.trim() || null,
          company_profile_id: 'primary',
        })
        .select()
        .single();

      if (qErr || !qData) throw new Error(qErr?.message ?? 'Erro ao criar cotação');

      const qId = (qData as Record<string, unknown>).id as string;

      await supabase.from('quote_items').insert(
        items.map(item => ({
          quote_id: qId,
          user_id: user.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        }))
      );

      await loadAll(user.id);
      hapticSuccess();
      router.replace(`/(app)/quote/${qId}`);
    } catch (e) {
      hapticError();
      Alert.alert('Erro', e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-ugest-background dark:bg-ugest-dark-background" edges={['top']}>
      <View className="flex-row items-center px-4 pt-2 pb-4 gap-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Feather name="x" size={22} color="#0c1c48" />
        </TouchableOpacity>
        <Text className="flex-1 font-montserrat text-xl text-primary-950 dark:text-white">Nova Cotação</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text className="font-inter-bold text-gray-700 dark:text-gray-300 mb-2 text-sm uppercase tracking-wide">Cliente</Text>
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700 gap-3">
            <ClientAutocomplete value={client} onChange={(name, opt) => {
              setClient(name);
              if (opt?.email) setClientEmail(opt.email);
              if (opt?.phone) setClientPhone(opt.phone ?? '');
            }} />
            <TextInput
              value={clientPhone} onChangeText={setClientPhone}
              placeholder="Telefone (opcional)" placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 font-inter text-gray-800 dark:text-gray-100 text-sm border border-gray-200 dark:border-gray-600"
            />
            <TextInput
              value={clientEmail} onChangeText={setClientEmail}
              placeholder="Email (opcional)" placeholderTextColor="#9ca3af"
              keyboardType="email-address" autoCapitalize="none"
              className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 font-inter text-gray-800 dark:text-gray-100 text-sm border border-gray-200 dark:border-gray-600"
            />
            <TextInput
              value={validityDays} onChangeText={setValidityDays}
              placeholder="Validade (dias)" placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 font-inter text-gray-800 dark:text-gray-100 text-sm border border-gray-200 dark:border-gray-600"
            />
          </View>

          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-inter-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Itens</Text>
            <TouchableOpacity onPress={() => setItems(p => [...p, { description: '', quantity: 1, unitPrice: 0 }])}
              className="flex-row items-center gap-1 py-1 px-3 bg-secondary-950 rounded-full">
              <Feather name="plus" size={14} color="#fff" />
              <Text className="text-xs font-inter-bold text-white">Adicionar</Text>
            </TouchableOpacity>
          </View>
          <View className="mb-4">
            {items.map((item, i) => (
              <DocumentItemRow key={i} item={item} index={i} onChange={updateItem}
                onRemove={(idx) => setItems(p => p.filter((_, j) => j !== idx))} />
            ))}
          </View>

          <View className="bg-secondary-950 rounded-2xl p-4 mb-4">
            <View className="flex-row justify-between mb-1">
              <Text className="font-inter text-yellow-100 text-sm">Subtotal</Text>
              <Text className="font-inter-medium text-white text-sm">{formatMZN(subtotal)}</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="font-inter text-yellow-100 text-sm">ISPC (3%)</Text>
              <Text className="font-inter-medium text-white text-sm">{formatMZN(ispc)}</Text>
            </View>
            <View className="flex-row justify-between pt-2 border-t border-yellow-900">
              <Text className="font-inter-bold text-white text-base">TOTAL</Text>
              <Text className="font-inter-bold text-white text-xl">{formatMZN(total)}</Text>
            </View>
          </View>

          <TextInput
            value={notes} onChangeText={setNotes}
            placeholder="Notas (opcional)" placeholderTextColor="#9ca3af"
            multiline numberOfLines={3} textAlignVertical="top"
            className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 font-inter text-gray-800 dark:text-gray-100 text-sm border border-gray-100 dark:border-gray-700 mb-6"
          />
        </ScrollView>

        <View className="px-4 pb-6">
          <TouchableOpacity onPress={handleSubmit} disabled={loading}
            className="flex-row items-center justify-center gap-2 py-4 rounded-2xl bg-secondary-950 active:opacity-80"
            activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Feather name="check" size={20} color="#fff" />}
            <Text className="font-inter-bold text-white text-base">{loading ? 'A criar...' : 'Criar Cotação'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
