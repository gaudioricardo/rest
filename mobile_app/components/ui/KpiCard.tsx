import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: keyof typeof Feather.glyphMap;
  iconColor?: string;
  iconBg?: string;
  onPress?: () => void;
}

export function KpiCard({ label, value, sub, icon, iconColor = '#0c1c48', iconBg = '#e8ecf5', onPress }: KpiCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex-1 border border-gray-100 dark:border-gray-700 active:scale-95"
      activeOpacity={0.85}
      disabled={!onPress}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="rounded-xl p-2" style={{ backgroundColor: iconBg }}>
          <Feather name={icon} size={18} color={iconColor} />
        </View>
      </View>
      <Text className="text-2xl font-inter-bold text-gray-900 dark:text-white mb-1" numberOfLines={1}>{value}</Text>
      <Text className="text-xs font-inter-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</Text>
      {sub && <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</Text>}
    </TouchableOpacity>
  );
}
