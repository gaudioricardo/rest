import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabActions } from '@react-navigation/native';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { Colors } from '../../shared/theme';
import { useSettingsStore } from '../../stores/settingsStore';

// ─── Tune these values to adjust the bar's look and feel ─────────────────────
const BAR_HEIGHT = 62;        // total height of the bar pill
const BAR_RADIUS = 32;        // outer bar corner radius
const BAR_H_MARGIN = 14;      // gap between bar and screen edges
const BAR_BOTTOM_GAP = 10;    // gap between bar bottom and safe-area inset
const PILL_RADIUS = 22;       // active tab inner pill corner radius
const PILL_V_INSET = 8;       // vertical padding inside active pill
const PILL_H_INSET = 8;       // horizontal padding inside active pill
const ICON_SIZE = 21;         // icon size
const LABEL_SIZE = 11;        // active label font size
const ACTIVE_FLEX = 2.6;      // flex weight of active tab (inactive = 1)
const LABEL_MAX_W = 96;       // max animated width for active label text
const SPRING = { mass: 0.7, damping: 16, stiffness: 210 } as const;
// ─────────────────────────────────────────────────────────────────────────────

// Per-tab animated item
function TabItem({
  isFocused, options, label, onPress, onLongPress, palette,
}: {
  isFocused: boolean;
  options: any;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
  palette: any;
}) {
  const progress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isFocused ? 1 : 0, SPRING);
  }, [isFocused]);

  // Active tab expands its flex weight to make room for the label
  const containerAnim = useAnimatedStyle(() => ({
    flex: interpolate(progress.value, [0, 1], [1, ACTIVE_FLEX]),
  }));

  // Pill background fades in
  const pillAnim = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  // Label slides out from behind the icon
  const labelAnim = useAnimatedStyle(() => ({
    opacity: progress.value,
    maxWidth: interpolate(progress.value, [0, 1], [0, LABEL_MAX_W]),
    marginLeft: interpolate(progress.value, [0, 1], [0, 5]),
  }));

  const iconColor = isFocused ? palette.accent : palette.textMuted;

  return (
    <Animated.View style={[styles.itemWrap, containerAnim]}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.72}
        style={styles.touch}
      >
        {/* Active pill background */}
        <Animated.View
          style={[
            styles.pill,
            pillAnim,
            { backgroundColor: palette.accent + '22' },
          ]}
        />

        {/* Icon + label row */}
        <View style={styles.row}>
          {options.tabBarIcon?.({ focused: isFocused, color: iconColor, size: ICON_SIZE })}
          <Animated.Text
            numberOfLines={1}
            style={[
              styles.label,
              labelAnim,
              { color: palette.accent },
            ]}
          >
            {label}
          </Animated.Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
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
        {
          backgroundColor: 'transparent',
          paddingBottom: Math.max(insets.bottom, 0) + BAR_BOTTOM_GAP,
        },
      ]}
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
    paddingHorizontal: BAR_H_MARGIN,
    paddingTop: BAR_BOTTOM_GAP,
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
  pill: {
    position: 'absolute',
    top: PILL_V_INSET,
    bottom: PILL_V_INSET,
    left: PILL_H_INSET,
    right: PILL_H_INSET,
    borderRadius: PILL_RADIUS,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: LABEL_SIZE,
    overflow: 'hidden',
  },
});
