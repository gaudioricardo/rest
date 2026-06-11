import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle,
} from 'react-native';
import { Colors, Radius, Spacing } from '../../shared/theme';
import { useSettingsStore } from '../../stores/settingsStore';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<Props> = ({
  title, onPress, variant = 'primary', size = 'md',
  loading, disabled, style, textStyle, icon,
}) => {
  const dark = useSettingsStore((s) => s.darkMode);

  const bg = variant === 'primary' ? Colors.primary
    : variant === 'secondary' ? Colors.secondary
    : variant === 'danger' ? Colors.error
    : variant === 'outline' ? 'transparent'
    : 'transparent';

  const borderColor = variant === 'outline'
    ? (dark ? Colors.dark.border : Colors.light.border)
    : 'transparent';

  const textColor = (variant === 'outline' || variant === 'ghost')
    ? (dark ? Colors.dark.text : Colors.primary)
    : '#ffffff';

  const pad = size === 'sm' ? Spacing.sm : size === 'lg' ? Spacing.lg : Spacing.md;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 17 : 15;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor, paddingHorizontal: pad, paddingVertical: pad * 0.6 },
        variant === 'outline' && { borderWidth: 1 },
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: textColor, fontSize }, textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    gap: 6,
  },
  text: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
