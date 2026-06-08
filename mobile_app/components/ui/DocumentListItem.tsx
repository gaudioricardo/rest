import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Badge, statusToBadgeVariant } from './Badge';
import { useSettingsStore } from '../../stores/settingsStore';

interface DocumentListItemProps {
  prefix: string;          // 'INV' | 'QT' | 'REC'
  number: string;          // 'INV-0042'
  client: string;
  date: string;            // formatted
  amount: number;
  status: string;
  statusPt: string;
  onPress: () => void;
}

function formatMZN(v: number) {
  return v.toLocaleString('pt-MZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' MZN';
}

const prefixColors: Record<string, string> = {
  INV: '#0c1c48', QT: '#805522', REC: '#065f46', EXP: '#7c3aed',
};

export function DocumentListItem({ prefix, number, client, date, amount, status, statusPt, onPress }: DocumentListItemProps) {
  const lang = useSettingsStore(s => s.language);
  const displayStatus = lang === 'pt' ? statusPt : status;
  const variant = statusToBadgeVariant(status);
  const color = prefixColors[prefix] ?? '#0c1c48';

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 mb-2 border border-gray-100 dark:border-gray-700 flex-row items-center gap-3"
      activeOpacity={0.75}
    >
      <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: color + '18' }}>
        <Text className="text-xs font-inter-extrabold" style={{ color }}>{prefix}</Text>
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2 mb-0.5">
          <Text className="font-inter-bold text-gray-900 dark:text-white text-sm">{number}</Text>
          <Badge label={displayStatus} variant={variant} size="sm" />
        </View>
        <Text className="text-gray-500 dark:text-gray-400 text-xs font-inter" numberOfLines={1}>{client}</Text>
      </View>
      <View className="items-end">
        <Text className="font-inter-bold text-gray-900 dark:text-white text-sm">{formatMZN(amount)}</Text>
        <Text className="text-gray-400 text-xs font-inter mt-0.5">{date}</Text>
      </View>
    </TouchableOpacity>
  );
}
