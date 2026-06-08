import React from 'react';
import { View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

export function Card({ children, className = '', style }: CardProps) {
  return (
    <View
      className={`bg-white dark:bg-ugest-dark-surface rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 ${className}`}
      style={style}
    >
      {children}
    </View>
  );
}
