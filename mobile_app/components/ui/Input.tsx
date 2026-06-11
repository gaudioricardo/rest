import React, { forwardRef } from 'react';
import {
  TextInput, TextInputProps, View, Text,
  StyleSheet, ViewStyle,
} from 'react-native';
import { Colors, Radius, Spacing, FontSize } from '../../shared/theme';
import { useSettingsStore } from '../../stores/settingsStore';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<TextInput, Props>(
  ({ label, error, containerStyle, leftIcon, rightIcon, style, ...props }, ref) => {
    const dark = useSettingsStore((s) => s.darkMode);
    const palette = dark ? Colors.dark : Colors.light;

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text style={[styles.label, { color: palette.textSecondary }]}>{label}</Text>
        )}
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: palette.inputBg,
              borderColor: error ? Colors.error : palette.border,
            },
          ]}
        >
          {leftIcon && <View style={styles.icon}>{leftIcon}</View>}
          <TextInput
            ref={ref}
            placeholderTextColor={palette.textMuted}
            style={[
              styles.input,
              { color: palette.text },
              leftIcon ? { paddingLeft: 0 } : null,
              style,
            ]}
            {...props}
          />
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </View>
        {error && (
          <Text style={styles.error}>{error}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: FontSize.base,
  },
  icon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  error: {
    color: Colors.error,
    fontSize: FontSize.xs,
    marginTop: 4,
  },
});
