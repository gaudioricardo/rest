import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '../../shared/theme';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

const VARIANTS: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: '#dcfce7', text: Colors.success },
  warning: { bg: '#fef9c3', text: Colors.warning },
  error: { bg: '#fee2e2', text: Colors.error },
  info: { bg: '#e0f2fe', text: Colors.info },
  default: { bg: '#f1f5f9', text: '#64748b' },
};

interface Props {
  label: string;
  variant?: BadgeVariant;
}

export const Badge: React.FC<Props> = ({ label, variant = 'default' }) => {
  const { bg, text } = VARIANTS[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
};

export const getInvoiceVariant = (status: string): BadgeVariant => {
  if (status === 'Paid' || status === 'Pago') return 'success';
  if (status === 'Overdue' || status === 'Vencido') return 'error';
  return 'warning';
};

export const getQuoteVariant = (status: string): BadgeVariant => {
  if (status === 'Approved' || status === 'Aprovado') return 'success';
  if (status === 'Rejected' || status === 'Rejeitado') return 'error';
  if (status === 'Liquidado') return 'info';
  return 'warning';
};

export const getStockVariant = (status: string): BadgeVariant => {
  if (status === 'In Stock' || status === 'Em Stock') return 'success';
  if (status === 'Out of Stock' || status === 'Sem Stock') return 'error';
  return 'warning';
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
