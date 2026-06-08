import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useClientStore } from '../../../stores/clientStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useRealtimeClients } from '../../../hooks/useRealtimeClients';
import { ChatClientCard } from '../../../components/chat/ChatClientCard';
import { MessageTemplates } from '../../../components/chat/MessageTemplates';
import { DebtClient } from '../../../shared/types';

export default function ChatScreen() {
  useRealtimeClients();
  const [search, setSearch] = useState('');
  const [templatesClient, setTemplatesClient] = useState<DebtClient | null>(null);
  const { clients } = useClientStore();
  const lang = useSettingsStore(s => s.language);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients.filter(c => c.status === 'Pendente');
    return clients.filter(c =>
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.movitelNumber.includes(search) ||
      c.vodacomNumber.includes(search)
    );
  }, [clients, search]);

  const handleSend = (client: DebtClient, message: string) => {
    const phone = (client.vodacomNumber || client.movitelNumber).replace(/\D/g, '');
    if (!phone) { Alert.alert('Sem número', 'Este cliente não tem número de telefone.'); return; }
    Linking.openURL(`whatsapp://send?phone=+258${phone}&text=${encodeURIComponent(message)}`).catch(() => {
      Linking.openURL(`sms:+258${phone}?body=${encodeURIComponent(message)}`);
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-ugest-background dark:bg-ugest-dark-background" edges={['top']}>
      <View className="px-4 pt-2 pb-4">
        <Text className="text-2xl font-montserrat text-primary-950 dark:text-white mb-3">Chat Hub</Text>
        <View className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-3">
          <Feather name="search" size={16} color="#9ca3af" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Pesquisar cliente..."
            placeholderTextColor="#9ca3af"
            className="flex-1 py-3 px-2 font-inter text-gray-800 dark:text-gray-100 text-sm"
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {search.length === 0 && (
          <Text className="font-inter-extrabold text-xs uppercase tracking-widest text-gray-400 mb-3">
            Clientes Pendentes
          </Text>
        )}

        {filtered.length === 0
          ? (
            <View className="items-center py-16">
              <Feather name="message-circle" size={40} color="#d1d5db" />
              <Text className="text-gray-400 font-inter mt-3">Nenhum cliente encontrado</Text>
            </View>
          )
          : filtered.map(client => (
            <ChatClientCard
              key={client.id}
              client={client}
              onSettle={() => setTemplatesClient(client)}
            />
          ))
        }
      </ScrollView>

      {templatesClient && (
        <MessageTemplates
          visible={!!templatesClient}
          clientName={templatesClient.fullName}
          lang={lang}
          onSend={(msg) => { if (templatesClient) handleSend(templatesClient, msg); }}
          onClose={() => setTemplatesClient(null)}
        />
      )}
    </SafeAreaView>
  );
}
