import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
  onPress?: () => void;
}

export const KpiCard: React.FC<Props> = ({
  title, value, icon, iconColor = Colors.primary, change, positive, onPress,
}) => {
  const dark = useSettingsStore((s) => s.darkMode);
  const palette = dark ? Colors.dark : Colors.light;

  const inner = (
    <>
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
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
        <Card style={styles.fill} padding={Spacing.md}>
          {inner}
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <Card style={styles.card} padding={Spacing.md}>
      {inner}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
  },
  fill: {
    flex: 1,
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
