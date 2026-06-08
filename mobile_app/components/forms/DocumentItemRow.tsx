import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DocumentItem } from '../../shared/types';

interface DocumentItemRowProps {
  item: DocumentItem;
  index: number;
  onChange: (index: number, field: keyof DocumentItem, value: string) => void;
  onRemove: (index: number) => void;
}

export function DocumentItemRow({ item, index, onChange, onRemove }: DocumentItemRowProps) {
  const total = item.quantity * item.unitPrice;

  return (
    <View className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 mb-2">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-inter-bold text-gray-500 dark:text-gray-400 uppercase">Item {index + 1}</Text>
        <TouchableOpacity onPress={() => onRemove(index)} className="p-1">
          <Feather name="trash-2" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <TextInput
        value={item.description}
        onChangeText={v => onChange(index, 'description', v)}
        placeholder="Descrição do produto/serviço"
        placeholderTextColor="#9ca3af"
        className="bg-white dark:bg-gray-600 rounded-lg px-3 py-2.5 text-sm font-inter text-gray-900 dark:text-white mb-2 border border-gray-200 dark:border-gray-500"
      />

      <View className="flex-row gap-2">
        <View className="flex-1">
          <Text className="text-xs font-inter-medium text-gray-500 dark:text-gray-400 mb-1">Quantidade</Text>
          <TextInput
            value={String(item.quantity)}
            onChangeText={v => onChange(index, 'quantity', v)}
            keyboardType="numeric"
            className="bg-white dark:bg-gray-600 rounded-lg px-3 py-2.5 text-sm font-inter text-gray-900 dark:text-white border border-gray-200 dark:border-gray-500"
          />
        </View>
        <View className="flex-1">
          <Text className="text-xs font-inter-medium text-gray-500 dark:text-gray-400 mb-1">Preço Unit. (MZN)</Text>
          <TextInput
            value={String(item.unitPrice)}
            onChangeText={v => onChange(index, 'unitPrice', v)}
            keyboardType="decimal-pad"
            className="bg-white dark:bg-gray-600 rounded-lg px-3 py-2.5 text-sm font-inter text-gray-900 dark:text-white border border-gray-200 dark:border-gray-500"
          />
        </View>
      </View>

      <View className="flex-row justify-end mt-2">
        <Text className="text-xs font-inter-medium text-gray-500 dark:text-gray-400">Total: </Text>
        <Text className="text-xs font-inter-bold text-primary-950 dark:text-blue-400">
          {total.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MZN
        </Text>
      </View>
    </View>
  );
}
