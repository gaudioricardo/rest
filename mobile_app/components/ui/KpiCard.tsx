import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { Colors, FontSize, Spacing } from '../../shared/theme';
import { useSettingsStore } from '../../stores/settingsStore';

interface Props {
  title: string;
  value: string;
  icon: string;
  iconColor?: string;
  change?: string;
  positive?: boolean;
}

export const KpiCard: React.FC<Props> = ({
  title, value, icon, iconColor = Colors.primary, change, positive,
}) => {
  const dark = useSettingsStore((s) => s.darkMode);
  const palette = dark ? Colors.dark : Colors.light;

  return (
    <Card style={styles.card} padding={Spacing.md}>
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: iconColor + '18' }]}>
          <Ionicons name={icon as any} size={22} color={iconColor} />
        </View>
        {change && (
          <Text style={[styles.change, { color: positive ? Colors.success : Colors.error }]}>
            {change}
          </Text>
        )}
      </View>
      <Text style={[styles.value, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.title, { color: palette.textMuted }]}>{title}</Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  change: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  value: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
});
