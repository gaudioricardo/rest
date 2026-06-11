import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, Shadow } from '../../shared/theme';
import { useSettingsStore } from '../../stores/settingsStore';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export const ScreenHeader: React.FC<Props> = ({ title, subtitle, showBack, rightAction }) => {
  const router = useRouter();
  const dark = useSettingsStore((s) => s.darkMode);
  const palette = dark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
      {showBack && (
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </TouchableOpacity>
      )}
      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: palette.textMuted }]}>{subtitle}</Text>}
      </View>
      {rightAction && <View style={styles.right}>{rightAction}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    ...Shadow.sm,
    gap: Spacing.sm,
  },
  back: {
    padding: 4,
  },
  titleBlock: { flex: 1 },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  right: {},
});
