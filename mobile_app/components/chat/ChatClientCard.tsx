import React from 'react';
import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DebtClient } from '../../shared/types';
import { getInitials } from '../../shared/db';
import { hapticLight } from '../../lib/haptics';

interface ChatClientCardProps {
  client: DebtClient;
  onSettle?: (client: DebtClient) => void;
}

function buildWhatsAppMessage(client: DebtClient): string {
  return encodeURIComponent(
    `Olá ${client.fullName},\n\nEstamos a entrar em contacto relativamente ao pagamento pendente na nossa empresa.\n\nPor favor, entre em contacto connosco para regularizar a situação.\n\nObrigado.`
  );
}

function buildSmsMessage(client: DebtClient): string {
  return encodeURIComponent(
    `Olá ${client.fullName}, há um pagamento pendente. Contacte-nos para regularizar. Obrigado.`
  );
}

export function ChatClientCard({ client, onSettle }: ChatClientCardProps) {
  const phone = client.vodacomNumber || client.movitelNumber;
  const initials = getInitials(client.fullName);
  const isPending = client.status === 'Pendente';

  const openWhatsApp = () => {
    hapticLight();
    const num = phone.replace(/\D/g, '');
    const msg = buildWhatsAppMessage(client);
    Linking.openURL(`whatsapp://send?phone=+258${num}&text=${msg}`).catch(() => {
      Alert.alert('WhatsApp não encontrado', 'Instale o WhatsApp para usar esta funcionalidade.');
    });
  };

  const openSms = () => {
    hapticLight();
    const num = phone.replace(/\D/g, '');
    const msg = buildSmsMessage(client);
    Linking.openURL(`sms:+258${num}?body=${msg}`);
  };

  const openPhone = () => {
    hapticLight();
    const num = phone.replace(/\D/g, '');
    Linking.openURL(`tel:+258${num}`);
  };

  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
      <View className="flex-row items-center gap-3 mb-3">
        <View className="w-11 h-11 rounded-full bg-primary-100 dark:bg-primary-900 items-center justify-center">
          <Text className="font-inter-bold text-primary-950 dark:text-primary-100 text-sm">{initials}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-inter-bold text-gray-900 dark:text-white" numberOfLines={1}>{client.fullName}</Text>
          {phone ? <Text className="text-xs text-gray-500 dark:text-gray-400 font-inter">{phone}</Text> : null}
          {client.email ? <Text className="text-xs text-gray-400 font-inter">{client.email}</Text> : null}
        </View>
        <View className={`px-2 py-1 rounded-full ${isPending ? 'bg-amber-100' : 'bg-emerald-100'}`}>
          <Text className={`text-[10px] font-inter-extrabold uppercase ${isPending ? 'text-amber-800' : 'text-emerald-800'}`}>
            {client.status}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        {phone ? (
          <>
            <TouchableOpacity
              onPress={openSms}
              className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30"
            >
              <Feather name="message-square" size={14} color="#1d4ed8" />
              <Text className="text-xs font-inter-bold text-blue-700 dark:text-blue-300">SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openWhatsApp}
              className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-50 dark:bg-green-900/30"
            >
              <Feather name="smartphone" size={14} color="#15803d" />
              <Text className="text-xs font-inter-bold text-green-700 dark:text-green-300">WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openPhone}
              className="flex-row items-center justify-center px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700"
            >
              <Feather name="phone" size={14} color="#374151" />
            </TouchableOpacity>
          </>
        ) : null}
        {isPending && onSettle && (
          <TouchableOpacity
            onPress={() => onSettle(client)}
            className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary-950"
          >
            <Feather name="check-circle" size={14} color="#fff" />
            <Text className="text-xs font-inter-bold text-white">Liquidar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
