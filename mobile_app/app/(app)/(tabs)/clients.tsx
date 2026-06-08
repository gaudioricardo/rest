import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, Alert, SectionList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClientStore } from '../../../stores/clientStore';
import { useAuthStore } from '../../../stores/authStore';
import { useRealtimeClients } from '../../../hooks/useRealtimeClients';
import { ChatClientCard } from '../../../components/chat/ChatClientCard';
import { CardSkeleton } from '../../../components/ui/SkeletonLoader';
import { DebtClient } from '../../../shared/types';
import { hapticSuccess } from '../../../lib/haptics';

export default function ClientsScreen() {
  useRealtimeClients();
  const user = useAuthStore(s => s.user);
  const { clients, loading, loadClients, markSettled } = useClientStore();

  const sections = useMemo(() => {
    const pending = clients.filter(c => c.status === 'Pendente');
    const settled = clients.filter(c => c.status === 'Liquidado');
    return [
      ...(pending.length ? [{ title: 'Pendentes', data: pending }] : []),
      ...(settled.length ? [{ title: 'Liquidados', data: settled }] : []),
    ];
  }, [clients]);

  const handleSettle = (client: DebtClient) => {
    Alert.alert(
      'Liquidar cliente',
      `Marcar ${client.fullName} como Liquidado?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Liquidar', style: 'destructive',
          onPress: async () => {
            await markSettled(client.id, user?.id ?? '');
            hapticSuccess();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-ugest-background dark:bg-ugest-dark-background" edges={['top']}>
      <View className="px-4 pt-2 pb-2">
        <Text className="text-2xl font-montserrat text-primary-950 dark:text-white">Clientes</Text>
        <Text className="text-sm font-inter text-gray-500 dark:text-gray-400 mt-0.5">
          {clients.filter(c => c.status === 'Pendente').length} pendentes
        </Text>
      </View>

      {loading && !clients.length
        ? (
          <ScrollView className="flex-1 px-4">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </ScrollView>
        )
        : clients.length === 0
          ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-400 font-inter text-base">Nenhum cliente registado</Text>
            </View>
          )
          : (
            <SectionList
              className="flex-1 px-4"
              sections={sections}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <ChatClientCard client={item} onSettle={item.status === 'Pendente' ? handleSettle : undefined} />
              )}
              renderSectionHeader={({ section: { title, data } }) => (
                <View className="flex-row items-center gap-2 py-2">
                  <Text className="font-inter-extrabold uppercase text-xs tracking-widest text-gray-500 dark:text-gray-400">
                    {title}
                  </Text>
                  <View className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  <Text className="text-xs text-gray-400 font-inter">{data.length}</Text>
                </View>
              )}
              refreshControl={
                <RefreshControl
                  refreshing={loading}
                  onRefresh={() => user && loadClients(user.id)}
                  tintColor="#0c1c48"
                />
              }
              contentContainerStyle={{ paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
            />
          )
      }
    </SafeAreaView>
  );
}
