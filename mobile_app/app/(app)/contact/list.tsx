import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '../../../stores/dataStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useAuthStore } from '../../../stores/authStore';
import { Colors, Spacing, FontSize, Radius } from '../../../shared/theme';
import { tr } from '../../../shared/i18n';
import { DeleteModal } from '../../../components/ui/DeleteModal';
import { useToast } from '../../../components/ui/ToastContainer';
import { deleteContact } from '../../../lib/db';
import { getInitials } from '../../../shared/theme';

export default function ContactListScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { language, darkMode } = useSettingsStore();
  const { userId } = useAuthStore();
  const { contacts, loadContacts } = useDataStore();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteId || !userId) return;
    setDeleting(true);
    try {
      await deleteContact(deleteId);
      await loadContacts(userId);
      showToast(lang === 'pt' ? 'Contacto eliminado' : 'Contact deleted', undefined, 'info');
    } catch { showToast('Erro', '', 'error'); }
    finally { setDeleting(false); setDeleteId(null); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: palette.text }]}>{tr(lang, 'contacts')}</Text>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: '#0369a1' }]}
          onPress={() => router.push('/(app)/contact/new')}
        >
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBar, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
        <Ionicons name="search-outline" size={16} color={palette.textMuted} />
        <TextInput style={[styles.searchInput, { color: palette.text }]} placeholder={tr(lang, 'search')} placeholderTextColor={palette.textMuted} value={search} onChangeText={setSearch} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={[styles.empty, { color: palette.textMuted }]}>{tr(lang, 'noData')}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            onLongPress={() => setDeleteId(item.id)}
            style={[styles.contactCard, { backgroundColor: palette.card, borderColor: palette.border }]}
          >
            <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}>
              <Text style={styles.initials}>{getInitials(item.name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[{ fontWeight: '700', color: palette.text, fontSize: FontSize.base }]}>{item.name}</Text>
              <Text style={[{ color: palette.textSecondary, fontSize: 12 }]}>
                {lang === 'pt' ? item.rolePt : item.role}{item.company ? ` · ${item.company}` : ''}
              </Text>
              {item.phone && <Text style={[{ color: palette.textMuted, fontSize: 12 }]}>{item.phone}</Text>}
              {item.email && <Text style={[{ color: palette.textMuted, fontSize: 12 }]}>{item.email}</Text>}
            </View>
          </TouchableOpacity>
        )}
      />

      <DeleteModal visible={!!deleteId} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} loading={deleting} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1,
  },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: FontSize.xl, fontWeight: '700' },
  newBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.md, paddingVertical: 10, borderBottomWidth: 1,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm },
  list: { padding: Spacing.md },
  empty: { textAlign: 'center', marginTop: 48 },
  contactCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  initials: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
