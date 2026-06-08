import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

const variantStyles: Record<string, { container: string; text: string }> = {
  primary: { container: 'bg-primary-950 active:bg-primary-900', text: 'text-white' },
  secondary: { container: 'bg-secondary-950 active:bg-secondary-900', text: 'text-white' },
  outline: { container: 'bg-transparent border border-primary-950 active:bg-primary-50', text: 'text-primary-950' },
  ghost: { container: 'bg-transparent active:bg-gray-100', text: 'text-primary-950' },
  danger: { container: 'bg-red-600 active:bg-red-700', text: 'text-white' },
};

const sizeStyles = {
  sm: { container: 'px-3 py-2 rounded-lg', text: 'text-sm' },
  md: { container: 'px-5 py-3 rounded-xl', text: 'text-base' },
  lg: { container: 'px-6 py-4 rounded-2xl', text: 'text-lg' },
};

export function Button({
  label, onPress, variant = 'primary', size = 'md',
  loading, disabled, style, textStyle, icon,
}: ButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      className={`${v.container} ${s.container} flex-row items-center justify-center gap-2 ${isDisabled ? 'opacity-50' : ''}`}
      style={style}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' || variant === 'ghost' ? '#0c1c48' : '#fff'} />
      ) : icon}
      <Text className={`${v.text} ${s.text} font-inter-bold`} style={textStyle}>{label}</Text>
    </TouchableOpacity>
  );
}
