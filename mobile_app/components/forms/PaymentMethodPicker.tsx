import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { hapticLight } from '../../lib/haptics';

const methods = [
  { id: 'Cash', label: 'Dinheiro', icon: 'dollar-sign' as const },
  { id: 'Bank Transfer', label: 'Transferência Bancária', icon: 'credit-card' as const },
  { id: 'M-Pesa', label: 'M-Pesa', icon: 'smartphone' as const },
  { id: 'E-Mola', label: 'E-Mola', icon: 'smartphone' as const },
  { id: 'Movitel', label: 'Movitel Money', icon: 'smartphone' as const },
  { id: 'Vodacom', label: 'Vodacom M-Pesa', icon: 'smartphone' as const },
];

interface PaymentMethodPickerProps {
  visible: boolean;
  onSelect: (method: string) => void;
  onClose: () => void;
}

export function PaymentMethodPicker({ visible, onSelect, onClose }: PaymentMethodPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white dark:bg-gray-900 rounded-t-3xl pt-2 pb-8 px-4">
          <View className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
          <Text className="text-lg font-montserrat text-gray-900 dark:text-white mb-4">Método de Pagamento</Text>
          <ScrollView>
            {methods.map(m => (
              <TouchableOpacity
                key={m.id}
                onPress={() => { hapticLight(); onSelect(m.id); }}
                className="flex-row items-center gap-4 py-4 border-b border-gray-100 dark:border-gray-700"
              >
                <View className="w-10 h-10 bg-primary-50 dark:bg-primary-900 rounded-xl items-center justify-center">
                  <Feather name={m.icon} size={18} color="#0c1c48" />
                </View>
                <Text className="font-inter-medium text-gray-800 dark:text-gray-100">{m.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={onClose} className="mt-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 items-center">
            <Text className="font-inter-bold text-gray-600 dark:text-gray-300">Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
