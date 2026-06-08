import React, { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[{ width: width as number, height, borderRadius, backgroundColor: '#e5e7eb', opacity }, style]}
    />
  );
}

export function CardSkeleton() {
  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
      <View className="flex-row items-center gap-3 mb-3">
        <Skeleton width={40} height={40} borderRadius={20} />
        <View className="flex-1 gap-2">
          <Skeleton height={14} width="60%" />
          <Skeleton height={12} width="40%" />
        </View>
        <Skeleton width={70} height={22} borderRadius={11} />
      </View>
      <View className="flex-row justify-between">
        <Skeleton height={12} width="30%" />
        <Skeleton height={14} width="25%" />
      </View>
    </View>
  );
}

export function KpiSkeleton() {
  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex-1 border border-gray-100 dark:border-gray-700">
      <Skeleton height={12} width="50%" style={{ marginBottom: 8 }} />
      <Skeleton height={24} width="70%" style={{ marginBottom: 6 }} />
      <Skeleton height={10} width="40%" />
    </View>
  );
}
