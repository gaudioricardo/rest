import React from 'react';
import { View, Text } from 'react-native';

type BadgeVariant = 'paid' | 'pending' | 'overdue' | 'approved' | 'rejected' | 'liquidado' | 'low' | 'out';

const styles: Record<BadgeVariant, string> = {
  paid:      'bg-emerald-100 dark:bg-emerald-900',
  pending:   'bg-amber-100 dark:bg-amber-900',
  overdue:   'bg-red-100 dark:bg-red-900',
  approved:  'bg-emerald-100 dark:bg-emerald-900',
  rejected:  'bg-red-100 dark:bg-red-900',
  liquidado: 'bg-blue-100 dark:bg-blue-900',
  low:       'bg-orange-100 dark:bg-orange-900',
  out:       'bg-red-100 dark:bg-red-900',
};

const textStyles: Record<BadgeVariant, string> = {
  paid:      'text-emerald-800 dark:text-emerald-100',
  pending:   'text-amber-800 dark:text-amber-100',
  overdue:   'text-red-800 dark:text-red-100',
  approved:  'text-emerald-800 dark:text-emerald-100',
  rejected:  'text-red-800 dark:text-red-100',
  liquidado: 'text-blue-800 dark:text-blue-100',
  low:       'text-orange-800 dark:text-orange-100',
  out:       'text-red-800 dark:text-red-100',
};

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
  size?: 'sm' | 'md';
}

export function Badge({ label, variant, size = 'md' }: BadgeProps) {
  return (
    <View className={`${styles[variant]} px-2 py-0.5 rounded-full`}>
      <Text className={`${textStyles[variant]} font-inter-extrabold uppercase tracking-wide ${size === 'sm' ? 'text-[9px]' : 'text-[10px]'}`}>
        {label}
      </Text>
    </View>
  );
}

export function statusToBadgeVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    Paid: 'paid', Pago: 'paid',
    Pending: 'pending', Pendente: 'pending',
    Overdue: 'overdue', Vencido: 'overdue',
    Approved: 'approved', Aprovado: 'approved',
    Rejected: 'rejected', Rejeitado: 'rejected',
    Liquidado: 'liquidado',
    'Low Stock': 'low', 'Stock Baixo': 'low',
    'Out of Stock': 'out', 'Sem Stock': 'out',
  };
  return map[status] ?? 'pending';
}
