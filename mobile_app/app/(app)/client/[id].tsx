import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '../../../stores/dataStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useAuthStore } from '../../../stores/authStore';
import { Colors, Spacing, Radius, FontSize } from '../../../shared/theme';
import { tr, formatDate } from '../../../shared/i18n';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { DeleteModal } from '../../../components/ui/DeleteModal';
import { useToast } from '../../../components/ui/ToastContainer';
import { updateDebtClientStatus, deleteDebtClient } from '../../../lib/db';
import { getInitials, getAvatarColor } from '../../../shared/theme';

function toWAPhone(phone: string) {
  const clean = phone.replace(/[\s\-\(\)]/g, '');
  if (clean.startsWith('+')) return clean.slice(1);
  if (clean.startsWith('258')) return clean;
  if (clean.startsWith('0')) return '258' + clean.slice(1);
  return '258' + clean;
}

function ContactActions({ phone, palette }: { phone: string; palette: any }) {
  return (
    <View style={styles.contactActions}>
      <TouchableOpacity
        onPress={() => Linking.openURL(`tel:${phone}`)}
        style={[styles.contactBtn, { backgroundColor: '#22c55e18' }]}
      >
        <Ionicons name="call" size={17} color="#22c55e" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => Linking.openURL(`whatsapp://send?phone=${toWAPhone(phone)}`)}
        style={[styles.contactBtn, { backgroundColor: '#25D36618' }]}
      >
        <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => Linking.openURL(`sms:${phone}`)}
        style={[styles.contactBtn, { backgroundColor: Colors.primary + '18' }]}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={17} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { language, darkMode } = useSettingsStore();
  const { userId } = useAuthStore();
  const { debtClients, invoices, loadClients } = useDataStore();

  const [loading, setLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  const client = debtClients.find((c) => c.id === id);
  if (!client) return null;

  const clientInvoices = invoices.filter(
    (inv) => inv.client.toLowerCase() === client.fullName.toLowerCase()
  );

  const primaryPhone = client.movitelNumber || client.vodacomNumber || '';

  const handleSettle = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await updateDebtClientStatus(client.id, 'Liquidado');
      await loadClients(userId);
      showToast(lang === 'pt' ? 'Cliente liquidado' : 'Client settled', undefined, 'success');
    } catch { showToast('Erro', '', 'error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!userId) return;
    setDeleting(true);
    try {
      await deleteDebtClient(client.id);
      await loadClients(userId);
      showToast(lang === 'pt' ? 'Cliente eliminado' : 'Client deleted', undefined, 'info');
      router.back();
    } catch { showToast('Erro', '', 'error'); }
    finally { setDeleting(false); setShowDelete(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: palette.text }]}>{tr(lang, 'clients')}</Text>
        <TouchableOpacity onPress={() => setShowDelete(true)}>
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: palette.card }]}>
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(client.fullName) }]}>
            <Text style={styles.initials}>{getInitials(client.fullName)}</Text>
          </View>
          <Text style={[styles.name, { color: palette.text }]}>{client.fullName}</Text>
          <Badge label={client.status} variant={client.status === 'Liquidado' ? 'success' : 'warning'} />
          {client.createdAt && (
            <Text style={[styles.joined, { color: palette.textMuted }]}>
              {lang === 'pt' ? 'Desde' : 'Since'}: {formatDate(client.createdAt, lang)}
            </Text>
          )}

          {/* Quick-action buttons below avatar */}
          {!!primaryPhone && (
            <View style={styles.quickActions}>
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${primaryPhone}`)}
                style={[styles.quickBtn, { backgroundColor: '#22c55e18' }]}
              >
                <Ionicons name="call" size={22} color="#22c55e" />
                <Text style={[styles.quickLabel, { color: '#22c55e' }]}>
                  {lang === 'pt' ? 'Ligar' : 'Call'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => Linking.openURL(`whatsapp://send?phone=${toWAPhone(primaryPhone)}`)}
                style={[styles.quickBtn, { backgroundColor: '#25D36618' }]}
              >
                <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                <Text style={[styles.quickLabel, { color: '#25D366' }]}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => Linking.openURL(`sms:${primaryPhone}`)}
                style={[styles.quickBtn, { backgroundColor: Colors.primary + '18' }]}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors.primary} />
                <Text style={[styles.quickLabel, { color: Colors.primary }]}>SMS</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Contacts card */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.textMuted }]}>CONTACTOS</Text>

          {client.movitelNumber ? (
            <View style={styles.contactRow}>
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={16} color={palette.textMuted} />
                <Text style={[styles.infoText, { color: palette.text }]}>
                  Movitel: {client.movitelNumber}
                </Text>
              </View>
              <ContactActions phone={client.movitelNumber} palette={palette} />
            </View>
          ) : null}

          {client.vodacomNumber ? (
            <View style={styles.contactRow}>
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={16} color={palette.textMuted} />
                <Text style={[styles.infoText, { color: palette.text }]}>
                  Vodacom: {client.vodacomNumber}
                </Text>
              </View>
              <ContactActions phone={client.vodacomNumber} palette={palette} />
            </View>
          ) : null}

          {client.email ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(`mailto:${client.email}`)}
              style={styles.infoRow}
            >
              <Ionicons name="mail-outline" size={16} color={palette.textMuted} />
              <Text style={[styles.infoText, { color: palette.text }]}>{client.email}</Text>
              <Ionicons name="open-outline" size={13} color={palette.textMuted} />
            </TouchableOpacity>
          ) : null}

          {client.address ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={palette.textMuted} />
              <Text style={[styles.infoText, { color: palette.text }]}>{client.address}</Text>
            </View>
          ) : null}
        </View>

        {/* Invoices */}
        {clientInvoices.length > 0 && (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.cardTitle, { color: palette.textMuted }]}>FACTURAS</Text>
            {clientInvoices.slice(0, 5).map((inv) => (
              <TouchableOpacity
                key={inv.id}
                onPress={() => router.push(`/(app)/invoice/${inv.id}`)}
                style={[styles.invRow, { borderBottomColor: palette.border }]}
              >
                <Text style={{ fontWeight: '600', color: palette.text, fontSize: FontSize.sm }}>{inv.invoiceNumber}</Text>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>{formatDate(inv.issueDate, lang)}</Text>
                <Badge
                  label={lang === 'pt' ? inv.statusPt : inv.status}
                  variant={inv.status === 'Paid' ? 'success' : inv.status === 'Overdue' ? 'error' : 'warning'}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {client.status === 'Pendente' && (
          <Button
            title={tr(lang, 'settleClient')}
            onPress={handleSettle}
            loading={loading}
            icon={<Ionicons name="checkmark-circle-outline" size={18} color="#fff" />}
          />
        )}
      </ScrollView>

      <DeleteModal visible={showDelete} onConfirm={handleDelete} onCancel={() => setShowDelete(false)} loading={deleting} />
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
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
  profileCard: {
    borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', gap: 8,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  initials: { color: '#fff', fontWeight: '700', fontSize: 28 },
  name: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: FontSize.xl, fontWeight: '700', textAlign: 'center' },
  joined: { fontSize: 12 },
  // Quick-action row inside profile card
  quickActions: {
    flexDirection: 'row', gap: 10, marginTop: 8,
  },
  quickBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: Radius.lg, gap: 4,
  },
  quickLabel: { fontSize: 11, fontWeight: '700' },
  // Contacts card
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, gap: 10 },
  cardTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  contactRow: { gap: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: FontSize.sm, flex: 1 },
  contactActions: { flexDirection: 'row', gap: 8, paddingLeft: 24 },
  contactBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  invRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 0.5, gap: 8,
  },
});
