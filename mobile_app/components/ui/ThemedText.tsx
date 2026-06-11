import React from 'react';
import { Text, TextProps } from 'react-native';
import { useSettingsStore } from '../../stores/settingsStore';
import { Colors, FontSize } from '../../shared/theme';

interface Props extends TextProps {
  variant?: 'default' | 'secondary' | 'muted' | 'title' | 'heading';
}

export const ThemedText: React.FC<Props> = ({ variant = 'default', style, ...props }) => {
  const darkMode = useSettingsStore((s) => s.darkMode);
  const palette = darkMode ? Colors.dark : Colors.light;

  const color =
    variant === 'secondary' ? palette.textSecondary :
    variant === 'muted' ? palette.textMuted :
    palette.text;

  const fontFamily =
    variant === 'title' ? 'PlayfairDisplay_700Bold' :
    variant === 'heading' ? 'PlayfairDisplay_600SemiBold' :
    undefined;

  const fontSize =
    variant === 'title' ? FontSize.xl :
    variant === 'heading' ? FontSize.lg :
    FontSize.base;

  return (
    <Text
      style={[{ color, fontFamily, fontSize }, style]}
      {...props}
    />
  );
};
