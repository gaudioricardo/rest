import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, FontSize } from '../../shared/theme';
import { useSettingsStore } from '../../stores/settingsStore';
import { Badge, type BadgeVariant } from './Badge';

interface Props {
  number: string;
  client: string;
  initials: string;
  avatarColor: string;
  date: string;
  amount: string;
  statusLabel: string;
  statusVariant: BadgeVariant;
  onPress: () => void;
  onLongPress?: () => void;
}

export const DocumentListItem: React.FC<Props> = ({
  number, client, initials, avatarColor, date, amount,
  statusLabel, statusVariant, onPress, onLongPress,
}) => {
  const dark = useSettingsStore((s) => s.darkMode);
  const palette = dark ? Colors.dark : Colors.light;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
      style={[styles.item, { backgroundColor: palette.card, borderColor: palette.border }]}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.initials}>{initials}</Text>
      </View>
      <View style={styles.main}>
        <View style={styles.row}>
          <Text style={[styles.number, { color: palette.textSecondary }]}>{number}</Text>
          <Text style={[styles.amount, { color: palette.text }]}>{amount}</Text>
        </View>
        <Text style={[styles.client, { color: palette.text }]} numberOfLines={1}>{client}</Text>
        <View style={styles.row}>
          <Text style={[styles.date, { color: palette.textMuted }]}>{date}</Text>
          <Badge label={statusLabel} variant={statusVariant} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  initials: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
  main: {
    flex: 1,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  number: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  client: {
    fontSize: FontSize.base,
    fontWeight: '600',
  },
  date: {
    fontSize: FontSize.xs,
  },
  amount: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
