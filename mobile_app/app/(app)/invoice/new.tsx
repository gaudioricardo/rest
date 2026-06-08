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
import { useSettingsStore } from '../../../stores/settingsStore';
import { DocumentItem } from '../../../shared/types';
import { DocumentItemRow } from '../../../components/forms/DocumentItemRow';
import { ClientAutocomplete } from '../../../components/forms/ClientAutocomplete';
import { supabase } from '../../../lib/supabase';
import { getNextSeqNumber, mapInvoice } from '../../../shared/db';
import { hapticSuccess, hapticError } from '../../../lib/haptics';

function formatMZN(v: number) {
  return v.toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MZN';
}

export default function NewInvoiceScreen() {
  const user = useAuthStore(s => s.user);
  const { invoices, loadAll } = useInvoiceStore();
  const company = useSettingsStore(s => s.company);

  const [client, setClient] = useState('');
  const [clientNuit, setClientNuit] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [dueDate, setDueDate] = useState('');
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

  const addItem = () => setItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!client.trim()) { Alert.alert('Erro', 'Nome do cliente obrigatório.'); return; }
    if (items.some(i => !i.description.trim())) { Alert.alert('Erro', 'Todos os itens precisam de descrição.'); return; }
    if (!user) return;

    setLoading(true);
    try {
      const seq = await getNextSeqNumber('invoices', user.id);
      const today = new Date().toISOString().slice(0, 10);

      const { data: invData, error: invErr } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          seq_number: seq,
          client: client.trim(),
          client_nuit: clientNuit.trim() || null,
          client_phone: clientPhone.trim() || null,
          client_email: clientEmail.trim() || null,
          issue_date: today,
          due_date: dueDate || null,
          amount: total,
          status: 'Pending',
          notes: notes.trim() || null,
          company_profile_id: 'primary',
        })
        .select()
        .single();

      if (invErr || !invData) throw new Error(invErr?.message ?? 'Erro ao criar factura');

      const invId = (invData as Record<string, unknown>).id as string;

      if (items.length > 0) {
        await supabase.from('invoice_items').insert(
          items.map(item => ({
            invoice_id: invId,
            user_id: user.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice,
          }))
        );
      }

      // Auto-register client
      const existingClient = await supabase
        .from('debt_clients')
        .select('id')
        .eq('user_id', user.id)
        .ilike('full_name', client.trim())
        .maybeSingle();

      if (!existingClient.data) {
        await supabase.from('debt_clients').insert({
          user_id: user.id,
          full_name: client.trim(),
          email: clientEmail.trim() || null,
          movitel_number: '',
          vodacom_number: clientPhone.trim() || '',
          address: '',
          status: 'Pendente',
        });
      }

      await loadAll(user.id);
      hapticSuccess();
      router.replace(`/(app)/invoice/${invId}`);
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
        <Text className="flex-1 font-montserrat text-xl text-primary-950 dark:text-white">Nova Factura</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Client */}
          <Text className="font-inter-bold text-gray-700 dark:text-gray-300 mb-2 text-sm uppercase tracking-wide">Cliente</Text>
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700 gap-3">
            <ClientAutocomplete
              value={client}
              onChange={(name, opt) => {
                setClient(name);
                if (opt?.email) setClientEmail(opt.email);
                if (opt?.phone) setClientPhone(opt.phone ?? '');
                if (opt?.nuit) setClientNuit(opt.nuit ?? '');
              }}
            />
            <TextInput
              value={clientNuit}
              onChangeText={setClientNuit}
              placeholder="NUIT (opcional)"
              placeholderTextColor="#9ca3af"
              className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 font-inter text-gray-800 dark:text-gray-100 text-sm border border-gray-200 dark:border-gray-600"
            />
            <TextInput
              value={clientPhone}
              onChangeText={setClientPhone}
              placeholder="Telefone (opcional)"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 font-inter text-gray-800 dark:text-gray-100 text-sm border border-gray-200 dark:border-gray-600"
            />
            <TextInput
              value={clientEmail}
              onChangeText={setClientEmail}
              placeholder="Email (opcional)"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 font-inter text-gray-800 dark:text-gray-100 text-sm border border-gray-200 dark:border-gray-600"
            />
            <TextInput
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="Data de vencimento (AAAA-MM-DD)"
              placeholderTextColor="#9ca3af"
              className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 font-inter text-gray-800 dark:text-gray-100 text-sm border border-gray-200 dark:border-gray-600"
            />
          </View>

          {/* Items */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-inter-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Itens</Text>
            <TouchableOpacity onPress={addItem} className="flex-row items-center gap-1 py-1 px-3 bg-primary-950 rounded-full">
              <Feather name="plus" size={14} color="#fff" />
              <Text className="text-xs font-inter-bold text-white">Adicionar</Text>
            </TouchableOpacity>
          </View>
          <View className="mb-4">
            {items.map((item, i) => (
              <DocumentItemRow
                key={i} item={item} index={i}
                onChange={updateItem}
                onRemove={removeItem}
              />
            ))}
          </View>

          {/* Totals preview */}
          <View className="bg-primary-950 rounded-2xl p-4 mb-4">
            <View className="flex-row justify-between mb-1">
              <Text className="font-inter text-primary-200 text-sm">Subtotal</Text>
              <Text className="font-inter-medium text-white text-sm">{formatMZN(subtotal)}</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="font-inter text-primary-200 text-sm">ISPC (3%)</Text>
              <Text className="font-inter-medium text-white text-sm">{formatMZN(ispc)}</Text>
            </View>
            <View className="flex-row justify-between pt-2 border-t border-primary-800">
              <Text className="font-inter-bold text-white text-base">TOTAL</Text>
              <Text className="font-inter-bold text-white text-xl">{formatMZN(total)}</Text>
            </View>
          </View>

          {/* Notes */}
          <Text className="font-inter-bold text-gray-700 dark:text-gray-300 mb-2 text-sm uppercase tracking-wide">Notas</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notas adicionais (opcional)"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 font-inter text-gray-800 dark:text-gray-100 text-sm border border-gray-100 dark:border-gray-700 mb-6"
          />
        </ScrollView>

        <View className="px-4 pb-6">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className="flex-row items-center justify-center gap-2 py-4 rounded-2xl bg-primary-950 active:opacity-80"
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Feather name="check" size={20} color="#fff" />
            }
            <Text className="font-inter-bold text-white text-base">
              {loading ? 'A criar...' : 'Criar Factura'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
