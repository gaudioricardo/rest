import React from 'react';
import { View, ViewProps } from 'react-native';
import { useSettingsStore } from '../../stores/settingsStore';
import { Colors } from '../../shared/theme';

interface Props extends ViewProps {
  variant?: 'background' | 'surface' | 'card';
}

export const ThemedView: React.FC<Props> = ({ variant = 'background', style, ...props }) => {
  const darkMode = useSettingsStore((s) => s.darkMode);
  const palette = darkMode ? Colors.dark : Colors.light;

  const bg =
    variant === 'card' ? palette.card :
    variant === 'surface' ? palette.surface :
    palette.background;

  return <View style={[{ backgroundColor: bg }, style]} {...props} />;
};
