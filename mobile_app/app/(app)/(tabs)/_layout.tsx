import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hapticLight } from '../../../lib/haptics';

function TabBarIcon({ name, color, focused }: { name: keyof typeof Feather.glyphMap; color: string; focused: boolean }) {
  return (
    <View className={`items-center justify-center p-1 rounded-xl ${focused ? 'bg-primary-50 dark:bg-primary-900/30' : ''}`}>
      <Feather name={name} size={22} color={color} />
    </View>
  );
}

function FabButton() {
  const [open, setOpen] = useState(false);

  const actions = [
    { label: 'Nova Factura', icon: 'file-text' as const, route: '/(app)/invoice/new' },
    { label: 'Nova Cotação', icon: 'clipboard' as const, route: '/(app)/quote/new' },
    { label: 'Registar Despesa', icon: 'shopping-bag' as const, route: null },
    { label: 'Adicionar Cliente', icon: 'user-plus' as const, route: null },
  ];

  return (
    <>
      <TouchableOpacity
        onPress={() => { hapticLight(); setOpen(true); }}
        className="w-14 h-14 bg-secondary-950 rounded-full items-center justify-center shadow-lg -mt-6"
        activeOpacity={0.85}
      >
        <Feather name="plus" size={26} color="#fff" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/50" onTouchEnd={() => setOpen(false)}>
          <SafeAreaView edges={['bottom']}>
            <View className="mx-4 mb-4 bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl">
              <View className="px-5 pt-5 pb-2">
                <Text className="font-montserrat text-primary-950 dark:text-white text-lg">Criar documento</Text>
              </View>
              {actions.map((a, i) => (
                <TouchableOpacity
                  key={a.label}
                  onPress={() => {
                    hapticLight();
                    setOpen(false);
                    if (a.route) router.push(a.route as never);
                    else Alert.alert('Em breve', 'Esta funcionalidade estará disponível em breve.');
                  }}
                  className={`flex-row items-center gap-4 px-5 py-4 ${i < actions.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}
                >
                  <View className="w-10 h-10 bg-primary-50 dark:bg-primary-900 rounded-xl items-center justify-center">
                    <Feather name={a.icon} size={18} color="#0c1c48" />
                  </View>
                  <Text className="font-inter-medium text-gray-800 dark:text-gray-100 text-base">{a.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setOpen(false)}
                className="mx-5 my-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 items-center"
              >
                <Text className="font-inter-bold text-gray-600 dark:text-gray-300">Cancelar</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
          height: 64,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#0c1c48',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documentos',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="file-text" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="fab"
        options={{
          title: '',
          tabBarIcon: () => <FabButton />,
          tabBarLabel: () => null,
        }}
        listeners={{ tabPress: (e) => { e.preventDefault(); } }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clientes',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="users" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Mais',
          tabBarIcon: ({ color, focused }) => <TabBarIcon name="grid" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen name="chat" options={{ href: null }} />
    </Tabs>
  );
}
