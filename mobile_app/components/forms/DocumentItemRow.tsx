import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DocumentItem, StockItem } from '../../shared/types';
import { Colors, Radius, Spacing, FontSize } from '../../shared/theme';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatCurrency } from '../../shared/i18n';

interface Props {
  item: DocumentItem;
  index: number;
  onChange: (index: number, field: keyof DocumentItem, value: string) => void;
  onRemove: (index: number) => void;
  stockItems?: StockItem[];
}

export const DocumentItemRow: React.FC<Props> = ({ item, index, onChange, onRemove, stockItems }) => {
  const dark = useSettingsStore((s) => s.darkMode);
  const palette = dark ? Colors.dark : Colors.light;

  const [qtyText, setQtyText] = useState(item.quantity > 0 ? String(item.quantity) : '');
  const [priceText, setPriceText] = useState(item.unitPrice > 0 ? String(item.unitPrice) : '');
  const [suggestion, setSuggestion] = useState<StockItem | null>(null);

  const total = isFinite(item.quantity * item.unitPrice) ? item.quantity * item.unitPrice : 0;

  const handleDescChange = (v: string) => {
    onChange(index, 'description', v);
    if (stockItems && v.trim().length >= 1) {
      const q = v.toLowerCase();
      const match = stockItems.find((s) => s.name.toLowerCase().startsWith(q));
      setSuggestion(match && match.name.toLowerCase() !== q ? match : null);
    } else {
      setSuggestion(null);
    }
  };

  const acceptSuggestion = () => {
    if (!suggestion) return;
    onChange(index, 'description', suggestion.name);
    const p = String(suggestion.price);
    setPriceText(p);
    onChange(index, 'unitPrice', p);
    setSuggestion(null);
  };

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
        <View style={styles.descCol}>
          <TextInput
            style={[styles.descInput, { color: palette.text, borderColor: suggestion ? Colors.secondary : palette.border }]}
            placeholder="Descrição do item"
            placeholderTextColor={palette.textMuted}
            value={item.description}
            onChangeText={handleDescChange}
            onBlur={() => { setTimeout(() => setSuggestion(null), 150); }}
          />
          {suggestion && (
            <TouchableOpacity
              onPress={acceptSuggestion}
              activeOpacity={0.75}
              style={[styles.suggestion, { backgroundColor: Colors.secondary + '14', borderColor: Colors.secondary + '50' }]}
            >
              <Ionicons name="storefront-outline" size={11} color={Colors.secondary} />
              <Text numberOfLines={1} style={styles.suggestionText}>
                <Text style={{ color: palette.textMuted }}>{item.description}</Text>
                <Text style={{ color: palette.secondaryAccent, fontWeight: '700' }}>
                  {suggestion.name.slice(item.description.length)}
                </Text>
              </Text>
              <Text style={[styles.suggestionPrice, { color: palette.secondaryAccent }]}>
                {formatCurrency(suggestion.price)}
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
          <Text style={[styles.total, { color: palette.accent }]}>{formatCurrency(total)}</Text>
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
    alignItems: 'flex-start',
    gap: 8,
  },
  descCol: {
    flex: 1,
    gap: 4,
  },
  descInput: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: FontSize.sm,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  suggestionText: {
    flex: 1,
    fontSize: FontSize.xs,
  },
  suggestionPrice: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  remove: {
    padding: 2,
    marginTop: 6,
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
