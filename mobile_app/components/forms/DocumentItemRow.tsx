import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DocumentItem } from '../../shared/types';
import { Colors, Radius, Spacing, FontSize } from '../../shared/theme';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatCurrency } from '../../shared/i18n';

interface Props {
  item: DocumentItem;
  index: number;
  onChange: (index: number, field: keyof DocumentItem, value: string) => void;
  onRemove: (index: number) => void;
}

export const DocumentItemRow: React.FC<Props> = ({ item, index, onChange, onRemove }) => {
  const dark = useSettingsStore((s) => s.darkMode);
  const palette = dark ? Colors.dark : Colors.light;

  const [qtyText, setQtyText] = useState(item.quantity > 0 ? String(item.quantity) : '');
  const [priceText, setPriceText] = useState(item.unitPrice > 0 ? String(item.unitPrice) : '');

  const total = isFinite(item.quantity * item.unitPrice) ? item.quantity * item.unitPrice : 0;

  const handleQtyChange = (v: string) => {
    setQtyText(v);
    onChange(index, 'quantity', v.replace(',', '.'));
  };

  const handlePriceChange = (v: string) => {
    setPriceText(v);
    onChange(index, 'unitPrice', v.replace(',', '.'));
  };

  return (
    <View style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.top}>
        <TextInput
          style={[styles.descInput, { color: palette.text, borderColor: palette.border }]}
          placeholder="Descrição do item"
          placeholderTextColor={palette.textMuted}
          value={item.description}
          onChangeText={(v) => onChange(index, 'description', v)}
        />
        <TouchableOpacity onPress={() => onRemove(index)} style={styles.remove}>
          <Ionicons name="close-circle" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>
      <View style={styles.bottom}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: palette.textMuted }]}>Qtd</Text>
          <TextInput
            style={[styles.numInput, { color: palette.text, borderColor: palette.border }]}
            keyboardType="decimal-pad"
            value={qtyText}
            onChangeText={handleQtyChange}
            placeholder="1"
            placeholderTextColor={palette.textMuted}
          />
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: palette.textMuted }]}>P. Unit. (MT)</Text>
          <TextInput
            style={[styles.numInput, { color: palette.text, borderColor: palette.border }]}
            keyboardType="decimal-pad"
            value={priceText}
            onChangeText={handlePriceChange}
            placeholder="0"
            placeholderTextColor={palette.textMuted}
          />
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: palette.textMuted }]}>Total</Text>
          <Text style={[styles.total, { color: Colors.primary }]}>{formatCurrency(total)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: 8,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  descInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: FontSize.sm,
  },
  remove: {
    padding: 2,
  },
  bottom: {
    flexDirection: 'row',
    gap: 8,
  },
  field: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: FontSize.xs,
  },
  numInput: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  total: {
    fontWeight: '700',
    fontSize: FontSize.sm,
    paddingVertical: 6,
    textAlign: 'center',
  },
});
