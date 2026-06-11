import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { Colors, Radius, Shadow, Spacing } from '../../shared/theme';
import { Ionicons } from '@expo/vector-icons';

export interface ToastData {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'info';
}

interface Props {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<Props> = ({ toast, onDismiss }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 20, duration: 200, useNativeDriver: true }),
      ]).start(() => onDismiss(toast.id));
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const borderColor =
    toast.type === 'success' ? Colors.success :
    toast.type === 'error' ? Colors.error : Colors.info;

  const icon =
    toast.type === 'success' ? 'checkmark-circle' :
    toast.type === 'error' ? 'close-circle' : 'information-circle';

  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }], borderLeftColor: borderColor }]}>
      <Ionicons name={icon as any} size={20} color={borderColor} />
      <View style={styles.content}>
        <Text style={styles.title}>{toast.title}</Text>
        {toast.description && <Text style={styles.desc}>{toast.description}</Text>}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    ...Shadow.lg,
    gap: 10,
    maxWidth: 340,
  },
  content: { flex: 1 },
  title: { fontWeight: '600', fontSize: 14, color: '#1b1b1f' },
  desc: { fontSize: 12, color: '#77757f', marginTop: 2 },
});
