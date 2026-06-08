import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Feather } from '@expo/vector-icons';

interface ClientOption {
  name: string;
  nuit?: string;
  phone?: string;
  email?: string;
}

interface ClientAutocompleteProps {
  value: string;
  onChange: (name: string, client?: ClientOption) => void;
  placeholder?: string;
}

export function ClientAutocomplete({ value, onChange, placeholder = 'Nome do cliente' }: ClientAutocompleteProps) {
  const user = useAuthStore(s => s.user);
  const [suggestions, setSuggestions] = useState<ClientOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!value || value.length < 2 || !user) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('debt_clients')
        .select('full_name, email')
        .eq('user_id', user.id)
        .ilike('full_name', `%${value}%`)
        .limit(6);
      if (data && data.length > 0) {
        setSuggestions(data.map(d => ({ name: d.full_name as string, email: d.email as string })));
        setOpen(true);
      } else {
        setOpen(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <View>
      <View className="flex-row items-center bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 px-3">
        <Feather name="user" size={16} color="#9ca3af" />
        <TextInput
          value={value}
          onChangeText={v => onChange(v)}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          className="flex-1 py-3 px-2 text-sm font-inter text-gray-900 dark:text-white"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => { onChange(''); setOpen(false); }}>
            <Feather name="x" size={16} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>
      {open && (
        <View className="mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 shadow-lg z-50 max-h-40">
          <FlatList
            data={suggestions}
            keyExtractor={i => i.name}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="px-4 py-3 border-b border-gray-100 dark:border-gray-700"
                onPress={() => { onChange(item.name, item); setOpen(false); }}
              >
                <Text className="font-inter-medium text-sm text-gray-900 dark:text-white">{item.name}</Text>
                {item.email && <Text className="text-xs text-gray-400 font-inter">{item.email}</Text>}
              </TouchableOpacity>
            )}
            scrollEnabled={false}
          />
        </View>
      )}
    </View>
  );
}
