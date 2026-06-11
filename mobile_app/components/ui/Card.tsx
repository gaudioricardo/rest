import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { Colors, Radius, Shadow, Spacing } from '../../shared/theme';
import { useSettingsStore } from '../../stores/settingsStore';

interface Props extends ViewProps {
  elevated?: boolean;
  padding?: number;
}

export const Card: React.FC<Props> = ({ elevated = true, padding = Spacing.md, style, ...props }) => {
  const dark = useSettingsStore((s) => s.darkMode);
  const palette = dark ? Colors.dark : Colors.light;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.card, borderColor: palette.border, padding },
        elevated && Shadow.md,
        style,
      ]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
});
