import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabActions } from '@react-navigation/native';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { Colors } from '../../shared/theme';
import { useSettingsStore } from '../../stores/settingsStore';

// ─── Tune these values to adjust the bar's look and feel ─────────────────────
const BAR_HEIGHT = 68;        // total height of the bar pill (increased for label)
const BAR_RADIUS = 32;        // outer bar corner radius
const BAR_H_MARGIN = 14;      // gap between bar and screen edges
const BAR_BOTTOM_GAP = 10;    // gap between bar bottom and safe-area inset

// Clearance screens must add as paddingBottom so content clears the floating bar
export const TAB_BAR_BOTTOM_INSET = BAR_HEIGHT + BAR_BOTTOM_GAP * 2;
const ICON_SIZE = 20;         // icon size
const LABEL_SIZE = 9.5;       // static label font size (below icon)
// ─────────────────────────────────────────────────────────────────────────────

// Per-tab animated item
function TabItem({
  isFocused, options, label, showLabel, onPress, onLongPress, palette,
}: {
  isFocused: boolean;
  options: any;
  label: string;
  showLabel: boolean;
  onPress: () => void;
  onLongPress: () => void;
  palette: any;
}) {
  const iconColor = isFocused ? palette.accent : palette.textMuted;
  const labelColor = isFocused ? palette.accent : palette.textMuted;

  return (
    <View style={styles.itemWrap}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.72}
        style={styles.touch}
      >
        {/* Icon + label column */}
        <View style={styles.column}>
          {options.tabBarIcon?.({ focused: isFocused, color: iconColor, size: ICON_SIZE })}
          {showLabel && (
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { color: labelColor, fontWeight: isFocused ? '700' : '500' },
              ]}
            >
              {label}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

// Main floating bar
export function FloatingTabBar({ state, descriptors, navigation }: MaterialTopTabBarProps) {
  const { darkMode } = useSettingsStore();
  const palette = darkMode ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(insets.bottom, 0) + BAR_BOTTOM_GAP },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: palette.card,
            shadowColor: darkMode ? '#000' : Colors.primary,
            shadowOpacity: darkMode ? 0.5 : 0.16,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = (options.title ?? route.name) as string;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.dispatch(TabActions.jumpTo(route.name, route.params));
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TabItem
              key={route.key}
              isFocused={isFocused}
              options={options}
              label={label}
              showLabel={route.name !== 'more'}
              onPress={onPress}
              onLongPress={onLongPress}
              palette={palette}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: BAR_H_MARGIN,
    paddingTop: BAR_BOTTOM_GAP,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
    borderRadius: BAR_RADIUS,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 18,
    elevation: 14,
    alignItems: 'center',
  },
  itemWrap: {
    flex: 1,
    height: BAR_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  touch: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  column: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: LABEL_SIZE,
    overflow: 'hidden',
    letterSpacing: 0.1,
  },
});
