import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../../stores/authStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { fetchStock, fetchExpenses } from '../../../shared/db';
import { StockItem, Expense } from '../../../shared/types';
import { Badge, statusToBadgeVariant } from '../../../components/ui/Badge';
import { supabase } from '../../../lib/supabase';

type Section = 'menu' | 'stock' | 'expenses';

export default function MoreScreen() {
  const user = useAuthStore(s => s.user);
  const { signOut } = useAuthStore();
  const company = useSettingsStore(s => s.company);

  const [section, setSection] = useState<Section>('menu');
  const [stock, setStock] = useState<StockItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSection = async (s: Section) => {
    if (!user) return;
    setLoading(true);
    setSection(s);
    if (s === 'stock') setStock(await fetchStock(user.id));
    if (s === 'expenses') setExpenses(await fetchExpenses(user.id));
    setLoading(false);
  };

  const menuItems = [
    { icon: 'package' as const, label: 'Inventário', sub: `${stock.length} itens`, onPress: () => loadSection('stock') },
    { icon: 'shopping-bag' as const, label: 'Despesas', sub: 'Ver e registar despesas', onPress: () => loadSection('expenses') },
    { icon: 'message-circle' as const, label: 'Chat Hub', sub: 'Comunicar com clientes', onPress: () => router.push('/(app)/(tabs)/chat') },
    { icon: 'settings' as const, label: 'Configurações', sub: 'Empresa, tema, idioma', onPress: () => router.push('/(app)/settings') },
    { icon: 'log-out' as const, label: 'Terminar sessão', sub: '', onPress: () => {
      Alert.alert('Sair', 'Tem a certeza?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: signOut },
      ]);
    }},
  ];

  if (section === 'stock') return (
    <SafeAreaView className="flex-1 bg-ugest-background dark:bg-ugest-dark-background" edges={['top']}>
      <View className="flex-row items-center px-4 pt-2 pb-4 gap-3">
        <TouchableOpacity onPress={() => setSection('menu')} className="p-1">
          <Feather name="arrow-left" size={22} color="#0c1c48" />
        </TouchableOpacity>
        <Text className="text-xl font-montserrat text-primary-950 dark:text-white">Inventário</Text>
      </View>
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadSection('stock')} tintColor="#0c1c48" />}
      >
        {stock.map(item => (
          <View key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-2 border border-gray-100 dark:border-gray-700">
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1">
                <Text className="font-inter-bold text-gray-900 dark:text-white">{item.name}</Text>
                <Text className="text-xs font-inter text-gray-400">SKU: {item.sku}</Text>
              </View>
              <Badge label={item.statusPt} variant={statusToBadgeVariant(item.status)} />
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm font-inter text-gray-600 dark:text-gray-300">
                {item.stockLevel} / {item.maxStock} unidades
              </Text>
              <Text className="text-sm font-inter-bold text-primary-950 dark:text-primary-200">
                {item.price.toLocaleString('pt-MZ')} MZN
              </Text>
            </View>
            <View className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-600 rounded-full overflow-hidden">
              <View
                className={`h-full rounded-full ${item.status === 'Out of Stock' ? 'bg-red-500' : item.status === 'Low Stock' ? 'bg-orange-400' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, (item.stockLevel / item.maxStock) * 100)}%` }}
              />
            </View>
          </View>
        ))}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );

  if (section === 'expenses') return (
    <SafeAreaView className="flex-1 bg-ugest-background dark:bg-ugest-dark-background" edges={['top']}>
      <View className="flex-row items-center px-4 pt-2 pb-4 gap-3">
        <TouchableOpacity onPress={() => setSection('menu')} className="p-1">
          <Feather name="arrow-left" size={22} color="#0c1c48" />
        </TouchableOpacity>
        <Text className="text-xl font-montserrat text-primary-950 dark:text-white">Despesas</Text>
      </View>
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadSection('expenses')} tintColor="#0c1c48" />}
      >
        {expenses.map(exp => (
          <View key={exp.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-2 border border-gray-100 dark:border-gray-700">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="font-inter-bold text-gray-900 dark:text-white">{exp.merchant}</Text>
                <Text className="text-xs font-inter text-gray-400">{exp.ref} · {exp.categoryPt}</Text>
                <Text className="text-xs font-inter text-gray-400">{exp.datePt}</Text>
              </View>
              <View className="items-end gap-1">
                <Text className="font-inter-bold text-red-600 dark:text-red-400">
                  {exp.amount.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MZN
                </Text>
                <Badge label={exp.statusPt} variant={statusToBadgeVariant(exp.status)} size="sm" />
              </View>
            </View>
          </View>
        ))}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );

  return (
    <SafeAreaView className="flex-1 bg-ugest-background dark:bg-ugest-dark-background" edges={['top']}>
      <View className="px-4 pt-2 pb-4">
        <Text className="text-2xl font-montserrat text-primary-950 dark:text-white">Mais</Text>
        {company && (
          <Text className="text-sm font-inter text-gray-500 dark:text-gray-400 mt-0.5">{company.companyName}</Text>
        )}
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <View className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden mb-4">
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              onPress={item.onPress}
              className={`flex-row items-center gap-4 px-4 py-4 ${i < menuItems.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}
              activeOpacity={0.7}
            >
              <View className={`w-10 h-10 rounded-xl items-center justify-center ${item.label === 'Terminar sessão' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-primary-50 dark:bg-primary-900/30'}`}>
                <Feather name={item.icon} size={18} color={item.label === 'Terminar sessão' ? '#ef4444' : '#0c1c48'} />
              </View>
              <View className="flex-1">
                <Text className={`font-inter-medium ${item.label === 'Terminar sessão' ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-100'}`}>
                  {item.label}
                </Text>
                {item.sub ? <Text className="text-xs font-inter text-gray-400 mt-0.5">{item.sub}</Text> : null}
              </View>
              {item.label !== 'Terminar sessão' && <Feather name="chevron-right" size={16} color="#9ca3af" />}
            </TouchableOpacity>
          ))}
        </View>
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
