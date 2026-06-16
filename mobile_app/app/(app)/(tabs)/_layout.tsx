import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { withLayoutContext } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../shared/theme';
import { useSettingsStore } from '../../../stores/settingsStore';
import { tr } from '../../../shared/i18n';
import { FloatingTabBar } from '../../../components/ui/TabBar';

const { Navigator } = createMaterialTopTabNavigator();
const MaterialTabs = withLayoutContext(Navigator);

export default function TabsLayout() {
  const { language } = useSettingsStore();

  return (
    <MaterialTabs
      id={undefined}
      tabBarPosition="bottom"
      tabBar={(props) => <FloatingTabBar {...props} />}
      style={{ backgroundColor: 'transparent' }}
      sceneContainerStyle={{ backgroundColor: 'transparent' }}
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
      }}
    >
      <MaterialTabs.Screen
        name="index"
        options={{
          title: tr(language, 'dashboard'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="grid-outline" size={21} color={color} />
          ),
        }}
      />
      <MaterialTabs.Screen
        name="invoices"
        options={{
          title: tr(language, 'invoices'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="document-text-outline" size={21} color={color} />
          ),
        }}
      />
      <MaterialTabs.Screen
        name="quotes"
        options={{
          title: tr(language, 'quotes'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="clipboard-outline" size={21} color={color} />
          ),
        }}
      />
      <MaterialTabs.Screen
        name="receipts"
        options={{
          title: tr(language, 'receipts'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="receipt-outline" size={21} color={color} />
          ),
        }}
      />
      <MaterialTabs.Screen
        name="clients"
        options={{
          title: tr(language, 'clients'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="people-outline" size={21} color={color} />
          ),
        }}
      />
      <MaterialTabs.Screen
        name="reports"
        options={{
          title: tr(language, 'reports'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="bar-chart-outline" size={21} color={color} />
          ),
        }}
      />
      <MaterialTabs.Screen
        name="more"
        options={{
          title: tr(language, 'more'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="menu-outline" size={21} color={color} />
          ),
        }}
      />
    </MaterialTabs>
  );
}
