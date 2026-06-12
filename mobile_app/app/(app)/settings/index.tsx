import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch,
  Modal, KeyboardAvoidingView, Platform, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../../stores/authStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { Colors, Spacing, Radius, FontSize } from '../../../shared/theme';
import { tr } from '../../../shared/i18n';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastContainer';
import type { BankAccount, MobileContact, SecondaryCompany } from '../../../shared/types';

const STEP_TITLES_PT = ['Dados da Empresa', 'Contactos', 'Contas Bancárias', 'Pag. Móveis', 'Marca'];
const STEP_TITLES_EN = ['Company Details', 'Contacts', 'Bank Accounts', 'Mobile Payments', 'Branding'];

export default function SettingsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { userId, userEmail, signOut } = useAuthStore();
  const { language, darkMode, company, saveSettings, setLanguage, setDarkMode } = useSettingsStore();

  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  // ─── Edit wizard states ────────────────────────────────────────────────────
  const [editVisible, setEditVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [nuit, setNuit] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [logoBase64, setLogoBase64] = useState<string | undefined>();
  const [stampBase64, setStampBase64] = useState<string | undefined>();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([{ bank: '', iban: '' }]);
  const [mobileContacts, setMobileContacts] = useState<MobileContact[]>([{ provider: 'M-Pesa', number: '' }]);

  // ─── Secondary company states ──────────────────────────────────────────────
  const [secVisible, setSecVisible] = useState(false);
  const [secSaving, setSecSaving] = useState(false);
  const [secName, setSecName] = useState('');
  const [secNuit, setSecNuit] = useState('');
  const [secAddress, setSecAddress] = useState('');
  const [secCity, setSecCity] = useState('');
  const [secPhone, setSecPhone] = useState('');
  const [secEmail, setSecEmail] = useState('');
  const [secLogo, setSecLogo] = useState<string | undefined>();
  const [secStamp, setSecStamp] = useState<string | undefined>();
  const [secBanks, setSecBanks] = useState<BankAccount[]>([{ bank: '', iban: '' }]);
  const [secMobile, setSecMobile] = useState<MobileContact[]>([{ provider: 'M-Pesa', number: '' }]);

  const openEditModal = () => {
    if (company) {
      setCompanyName(company.companyName ?? '');
      setNuit(company.nuit ?? '');
      setAddress(company.address ?? '');
      setCity(company.city ?? '');
      setPhone(company.phone ?? '');
      setEmail(company.email ?? '');
      setLogoBase64(company.logoBase64);
      setStampBase64(company.stampBase64);
      setBankAccounts(company.bankAccounts?.length ? company.bankAccounts : [{ bank: '', iban: '' }]);
      setMobileContacts(company.mobileContacts?.length ? company.mobileContacts : [{ provider: 'M-Pesa', number: '' }]);
    }
    setStep(0);
    setEditVisible(true);
  };

  const openSecModal = (editing: boolean) => {
    const s = company?.secondaryCompany;
    if (editing && s) {
      setSecName(s.companyName ?? '');
      setSecNuit(s.nuit ?? '');
      setSecAddress(s.address ?? '');
      setSecCity(s.city ?? '');
      setSecPhone(s.phone ?? '');
      setSecEmail(s.email ?? '');
      setSecLogo(s.logoBase64);
      setSecStamp(s.stampBase64);
      setSecBanks(s.bankAccounts?.length ? s.bankAccounts : [{ bank: '', iban: '' }]);
      setSecMobile(s.mobileContacts?.length ? s.mobileContacts : [{ provider: 'M-Pesa', number: '' }]);
    } else {
      setSecName(''); setSecNuit(''); setSecAddress(''); setSecCity('');
      setSecPhone(''); setSecEmail('');
      setSecLogo(undefined); setSecStamp(undefined);
      setSecBanks([{ bank: '', iban: '' }]);
      setSecMobile([{ provider: 'M-Pesa', number: '' }]);
    }
    setSecVisible(true);
  };

  const pickImage = async (setter: (b64: string) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true, quality: 0.7, mediaTypes: 'images',
    });
    if (!result.canceled && result.assets[0].base64) {
      setter(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSaveWizard = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await saveSettings(userId, {
        companyName, nuit, address, city, phone, email,
        logoBase64, stampBase64,
        bankAccounts: bankAccounts.filter(b => b.bank && b.iban),
        mobileContacts: mobileContacts.filter(m => m.number),
        setupComplete: true,
      });
      showToast(lang === 'pt' ? 'Configurações guardadas' : 'Settings saved', undefined, 'success');
      setEditVisible(false);
    } catch (e) {
      showToast('Erro', String(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecondary = async () => {
    if (!userId || !secName.trim()) return;
    setSecSaving(true);
    try {
      const sec: SecondaryCompany = {
        companyName: secName.trim(),
        nuit: secNuit.trim(),
        address: secAddress.trim(),
        city: secCity.trim(),
        phone: secPhone.trim(),
        email: secEmail.trim(),
        logoBase64: secLogo,
        stampBase64: secStamp,
        bankAccounts: secBanks.filter(b => b.bank || b.iban),
        mobileContacts: secMobile.filter(m => m.number),
      };
      await saveSettings(userId, { secondaryCompany: sec });
      showToast(lang === 'pt' ? 'Segunda empresa guardada' : 'Second company saved', undefined, 'success');
      setSecVisible(false);
    } catch (e) {
      showToast('Erro', String(e), 'error');
    } finally {
      setSecSaving(false);
    }
  };

  const handleDeleteSecondary = () => {
    Alert.alert(
      lang === 'pt' ? 'Remover Empresa' : 'Remove Company',
      lang === 'pt' ? 'Tem a certeza que deseja remover a segunda empresa?' : 'Are you sure you want to remove the second company?',
      [
        { text: lang === 'pt' ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'pt' ? 'Remover' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!userId) return;
            try {
              await saveSettings(userId, { secondaryCompany: null } as any);
              showToast(lang === 'pt' ? 'Empresa removida' : 'Company removed', undefined, 'info');
            } catch (e) {
              showToast('Erro', String(e), 'error');
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      lang === 'pt' ? 'Terminar Sessão' : 'Sign Out',
      lang === 'pt' ? 'Tem a certeza?' : 'Are you sure?',
      [
        { text: lang === 'pt' ? 'Cancelar' : 'Cancel', style: 'cancel' },
        { text: lang === 'pt' ? 'Sair' : 'Sign Out', style: 'destructive', onPress: () => signOut() },
      ]
    );
  };

  const stepTitles = lang === 'pt' ? STEP_TITLES_PT : STEP_TITLES_EN;

  const renderWizardStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <Input label={tr(lang, 'companyName')} value={companyName} onChangeText={setCompanyName} placeholder="Ex: GRM Lda." />
            <Input label={tr(lang, 'nuit')} value={nuit} onChangeText={setNuit} placeholder="000000000" keyboardType="numeric" />
            <Input label={tr(lang, 'address')} value={address} onChangeText={setAddress} placeholder="Av. Principal, 123" />
            <Input label={tr(lang, 'city')} value={city} onChangeText={setCity} placeholder="Maputo" />
          </>
        );
      case 1:
        return (
          <>
            <Input label={tr(lang, 'phone')} value={phone} onChangeText={setPhone} placeholder="+258 21 XXX XXX" keyboardType="phone-pad" />
            <Input label={tr(lang, 'email')} value={email} onChangeText={setEmail} placeholder="geral@empresa.com" keyboardType="email-address" autoCapitalize="none" />
          </>
        );
      case 2:
        return (
          <>
            {bankAccounts.map((acc, i) => (
              <View key={i} style={[S.multiItem, { borderColor: palette.border }]}>
                <View style={S.multiHeader}>
                  <Text style={[S.multiLabel, { color: palette.text }]}>{lang === 'pt' ? 'Banco' : 'Bank'} {i + 1}</Text>
                  {bankAccounts.length > 1 && (
                    <TouchableOpacity onPress={() => setBankAccounts(p => p.filter((_, ii) => ii !== i))}>
                      <Ionicons name="close-circle" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
                <Input label={lang === 'pt' ? 'Nome do Banco' : 'Bank Name'} value={acc.bank}
                  onChangeText={v => setBankAccounts(p => p.map((a, ii) => ii === i ? { ...a, bank: v } : a))}
                  placeholder="BCI, BIM, Millennium" containerStyle={{ marginBottom: 8 }} />
                <Input label="IBAN / NIB" value={acc.iban}
                  onChangeText={v => setBankAccounts(p => p.map((a, ii) => ii === i ? { ...a, iban: v } : a))}
                  placeholder="MZ59 XXXX..." containerStyle={{ marginBottom: 0 }} />
              </View>
            ))}
            <TouchableOpacity onPress={() => setBankAccounts(p => [...p, { bank: '', iban: '' }])}
              style={[S.addBtn, { borderColor: Colors.primary }]}>
              <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
              <Text style={{ color: Colors.primary, fontWeight: '600' }}>{lang === 'pt' ? 'Adicionar Banco' : 'Add Bank'}</Text>
            </TouchableOpacity>
          </>
        );
      case 3:
        return (
          <>
            {mobileContacts.map((mc, i) => (
              <View key={i} style={[S.multiItem, { borderColor: palette.border }]}>
                <View style={S.multiHeader}>
                  <Text style={[S.multiLabel, { color: palette.text }]}>{lang === 'pt' ? 'Carteira Móvel' : 'Mobile Wallet'} {i + 1}</Text>
                  {mobileContacts.length > 1 && (
                    <TouchableOpacity onPress={() => setMobileContacts(p => p.filter((_, ii) => ii !== i))}>
                      <Ionicons name="close-circle" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={S.providerRow}>
                  {['M-Pesa', 'E-Mola', 'Movitel', 'Vodacom'].map(p => (
                    <TouchableOpacity key={p}
                      onPress={() => setMobileContacts(prev => prev.map((m, ii) => ii === i ? { ...m, provider: p } : m))}
                      style={[S.providerBtn, {
                        borderColor: mc.provider === p ? Colors.primary : palette.border,
                        backgroundColor: mc.provider === p ? Colors.primary : palette.surface,
                      }]}>
                      <Text style={{ color: mc.provider === p ? '#fff' : palette.text, fontSize: 11, fontWeight: '600' }}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Input label={lang === 'pt' ? 'Número' : 'Number'} value={mc.number}
                  onChangeText={v => setMobileContacts(prev => prev.map((m, ii) => ii === i ? { ...m, number: v } : m))}
                  placeholder="+258 8X XXX XXXX" keyboardType="phone-pad" containerStyle={{ marginBottom: 0 }} />
              </View>
            ))}
            <TouchableOpacity onPress={() => setMobileContacts(p => [...p, { provider: 'M-Pesa', number: '' }])}
              style={[S.addBtn, { borderColor: Colors.secondary }]}>
              <Ionicons name="add-circle-outline" size={18} color={Colors.secondary} />
              <Text style={{ color: Colors.secondary, fontWeight: '600' }}>{lang === 'pt' ? 'Adicionar Pagamento' : 'Add Payment'}</Text>
            </TouchableOpacity>
          </>
        );
      case 4:
        return (
          <>
            <BrandingRow label={tr(lang, 'logo')} base64={logoBase64}
              onPick={() => pickImage(setLogoBase64)} onRemove={() => setLogoBase64(undefined)}
              palette={palette} lang={lang} />
            <BrandingRow label={tr(lang, 'stamp')} base64={stampBase64}
              onPick={() => pickImage(setStampBase64)} onRemove={() => setStampBase64(undefined)}
              palette={palette} lang={lang} />
          </>
        );
      default: return null;
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: palette.text }]}>{lang === 'pt' ? 'Configurações' : 'Settings'}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Perfil da Empresa ── */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.cardHead}>
            <Text style={[styles.cardTitle, { color: palette.text }]}>
              {lang === 'pt' ? 'Perfil da Empresa' : 'Company Profile'}
            </Text>
            <TouchableOpacity onPress={openEditModal} style={[styles.pill, { backgroundColor: Colors.primary }]}>
              <Ionicons name="pencil" size={12} color="#fff" />
              <Text style={styles.pillTxt}>{lang === 'pt' ? 'Editar' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.profileRow}>
            {company?.logoBase64
              ? <Image source={{ uri: company.logoBase64 }} style={styles.logo} resizeMode="contain" />
              : <View style={[styles.logoHolder, { backgroundColor: Colors.primary + '20' }]}>
                  <Ionicons name="business" size={28} color={Colors.primary} />
                </View>
            }
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', fontSize: FontSize.md, color: palette.text }}>{company?.companyName || '—'}</Text>
              <Text style={{ color: palette.textMuted, fontSize: FontSize.xs, fontFamily: 'monospace', marginTop: 2 }}>NUIT: {company?.nuit || '—'}</Text>
              {company?.city ? <Text style={{ color: palette.textSecondary, fontSize: FontSize.xs }}>{company.city}</Text> : null}
            </View>
          </View>

          {(company?.address || company?.email || company?.phone) ? (
            <View style={[styles.divSection, { borderTopColor: palette.border }]}>
              {company?.address ? <InfoRow icon="location-outline" text={company.address} palette={palette} /> : null}
              {company?.email   ? <InfoRow icon="mail-outline"     text={company.email}   palette={palette} /> : null}
              {company?.phone   ? <InfoRow icon="call-outline"     text={company.phone}   palette={palette} /> : null}
            </View>
          ) : null}

          {company?.bankAccounts && company.bankAccounts.length > 0 ? (
            <View style={[styles.divSection, { borderTopColor: palette.border }]}>
              <Text style={[styles.subLabel, { color: palette.textMuted }]}>{lang === 'pt' ? 'CONTAS BANCÁRIAS' : 'BANK ACCOUNTS'}</Text>
              {company.bankAccounts.map((b, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Ionicons name="card-outline" size={12} color={palette.textMuted} />
                  <Text style={{ color: palette.textSecondary, fontSize: FontSize.xs }}>
                    <Text style={{ fontWeight: '700' }}>{b.bank}</Text>{'  '}{b.iban}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {company?.mobileContacts && company.mobileContacts.length > 0 ? (
            <View style={[styles.divSection, { borderTopColor: palette.border }]}>
              <Text style={[styles.subLabel, { color: palette.textMuted }]}>{lang === 'pt' ? 'CARTEIRAS MÓVEIS' : 'MOBILE WALLETS'}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {company.mobileContacts.map((m, i) => (
                  <View key={i} style={[styles.chip, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                    <Text style={{ color: palette.text, fontSize: 11, fontWeight: '700' }}>{m.provider}</Text>
                    <Text style={{ color: palette.textSecondary, fontSize: 11 }}>  {m.number}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {/* ── 2.ª Empresa ── */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.cardHead}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: palette.text }]}>{lang === 'pt' ? '2.ª Empresa' : '2nd Company'}</Text>
              <Text style={{ color: palette.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>
                {lang === 'pt' ? 'Emissor alternativo para documentos' : 'Alternate issuer for documents'}
              </Text>
            </View>
            {!company?.secondaryCompany && (
              <TouchableOpacity onPress={() => openSecModal(false)} style={[styles.pill, { backgroundColor: Colors.secondary }]}>
                <Ionicons name="add" size={12} color="#fff" />
                <Text style={styles.pillTxt}>{lang === 'pt' ? 'Adicionar' : 'Add'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {company?.secondaryCompany ? (
            <>
              <View style={styles.profileRow}>
                {company.secondaryCompany.logoBase64
                  ? <Image source={{ uri: company.secondaryCompany.logoBase64 }} style={styles.logo} resizeMode="contain" />
                  : <View style={[styles.logoHolder, { backgroundColor: Colors.secondary + '20' }]}>
                      <Ionicons name="business" size={28} color={Colors.secondary} />
                    </View>
                }
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', fontSize: FontSize.md, color: palette.text }}>{company.secondaryCompany.companyName}</Text>
                  <Text style={{ color: palette.textMuted, fontSize: FontSize.xs, fontFamily: 'monospace', marginTop: 2 }}>NUIT: {company.secondaryCompany.nuit || '—'}</Text>
                  {company.secondaryCompany.city ? <Text style={{ color: palette.textSecondary, fontSize: FontSize.xs }}>{company.secondaryCompany.city}</Text> : null}
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: 4 }}>
                <TouchableOpacity onPress={() => openSecModal(true)} style={[styles.secBtn, { borderColor: palette.border, flex: 1 }]}>
                  <Ionicons name="pencil-outline" size={14} color={palette.text} />
                  <Text style={{ color: palette.text, fontSize: FontSize.xs, fontWeight: '600' }}>{lang === 'pt' ? 'Editar' : 'Edit'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDeleteSecondary} style={[styles.secBtn, { borderColor: Colors.error, backgroundColor: Colors.error + '10', flex: 1 }]}>
                  <Ionicons name="trash-outline" size={14} color={Colors.error} />
                  <Text style={{ color: Colors.error, fontSize: FontSize.xs, fontWeight: '600' }}>{lang === 'pt' ? 'Remover' : 'Remove'}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="business-outline" size={32} color={palette.border} />
              <Text style={{ color: palette.textMuted, fontSize: FontSize.sm, marginTop: 8, textAlign: 'center' }}>
                {lang === 'pt' ? 'Nenhuma segunda empresa configurada.' : 'No second company configured.'}
              </Text>
            </View>
          )}
        </View>

        {/* ── Preferências ── */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>{lang === 'pt' ? 'Preferências' : 'Preferences'}</Text>

          <View style={[styles.prefRow, { borderBottomColor: palette.border }]}>
            <View style={styles.prefLeft}>
              <Ionicons name={darkMode ? 'moon' : 'sunny-outline'} size={18} color={darkMode ? '#818cf8' : '#f59e0b'} />
              <Text style={{ color: palette.text, fontWeight: '600', fontSize: FontSize.sm }}>
                {lang === 'pt' ? 'Modo Escuro' : 'Dark Mode'}
              </Text>
            </View>
            <Switch value={darkMode} onValueChange={v => setDarkMode(v)} trackColor={{ true: Colors.primary, false: palette.border }} thumbColor="#fff" />
          </View>

          <View style={[styles.prefRow, { borderBottomWidth: 0 }]}>
            <View style={styles.prefLeft}>
              <Ionicons name="language-outline" size={18} color={palette.textSecondary} />
              <Text style={{ color: palette.text, fontWeight: '600', fontSize: FontSize.sm }}>Idioma / Language</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {(['pt', 'en'] as const).map(l => (
                <TouchableOpacity key={l} onPress={() => setLanguage(l)}
                  style={[styles.langBtn, {
                    backgroundColor: lang === l ? Colors.primary : palette.surface,
                    borderColor: lang === l ? Colors.primary : palette.border,
                  }]}>
                  <Text style={{ color: lang === l ? '#fff' : palette.text, fontWeight: '700', fontSize: 12 }}>{l.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Conta ── */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>{lang === 'pt' ? 'Conta' : 'Account'}</Text>
          {userEmail ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="person-circle-outline" size={18} color={palette.textSecondary} />
              <Text style={{ color: palette.textSecondary, fontSize: FontSize.sm }}>{userEmail}</Text>
            </View>
          ) : null}
          <TouchableOpacity onPress={handleSignOut} style={[styles.signOut, { borderColor: Colors.error }]}>
            <Ionicons name="log-out-outline" size={18} color={Colors.error} />
            <Text style={{ color: Colors.error, fontWeight: '700', fontSize: FontSize.sm }}>
              {lang === 'pt' ? 'Terminar Sessão' : 'Sign Out'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ══════════════ EDIT WIZARD MODAL ══════════════ */}
      <Modal visible={editVisible} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
          <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
            <TouchableOpacity onPress={() => setEditVisible(false)}>
              <Ionicons name="close" size={24} color={palette.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: palette.text }]}>{stepTitles[step]}</Text>
            <TouchableOpacity onPress={step < 4 ? () => setStep(s => s + 1) : handleSaveWizard}>
              <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: FontSize.base }}>
                {step < 4 ? (lang === 'pt' ? 'Próximo' : 'Next') : (lang === 'pt' ? 'Guardar' : 'Save')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.dotsRow, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
            {[0, 1, 2, 3, 4].map(i => (
              <TouchableOpacity key={i} onPress={() => setStep(i)}>
                <View style={[styles.dot, {
                  backgroundColor: i === step ? Colors.primary : i < step ? Colors.success : palette.border,
                  width: i === step ? 36 : 12,
                }]}>
                  {i === step && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{i + 1}</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={[styles.scroll, { gap: Spacing.sm }]} keyboardShouldPersistTaps="handled">
              {renderWizardStep()}
              <View style={styles.navBtns}>
                {step > 0 && (
                  <Button title={lang === 'pt' ? 'Anterior' : 'Previous'} onPress={() => setStep(s => s - 1)} variant="outline" style={{ flex: 1 }} />
                )}
                {step < 4
                  ? <Button title={lang === 'pt' ? 'Próximo' : 'Next'} onPress={() => setStep(s => s + 1)} style={{ flex: 1 }} />
                  : <Button title={lang === 'pt' ? 'Guardar' : 'Save'} onPress={handleSaveWizard} loading={saving} style={{ flex: 1 }}
                      icon={<Ionicons name="checkmark-circle-outline" size={18} color="#fff" />} />
                }
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ══════════════ SECONDARY COMPANY MODAL ══════════════ */}
      <Modal visible={secVisible} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
          <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
            <TouchableOpacity onPress={() => setSecVisible(false)}>
              <Ionicons name="close" size={24} color={palette.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: palette.text }]}>
              {company?.secondaryCompany
                ? (lang === 'pt' ? 'Editar 2.ª Empresa' : 'Edit 2nd Company')
                : (lang === 'pt' ? 'Adicionar 2.ª Empresa' : 'Add 2nd Company')}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={[styles.scroll, { gap: Spacing.sm }]} keyboardShouldPersistTaps="handled">

              <Text style={[styles.secHeader, { color: palette.textMuted }]}>{lang === 'pt' ? 'INFORMAÇÃO DA EMPRESA' : 'COMPANY INFORMATION'}</Text>
              <Input label={tr(lang, 'companyName')} value={secName} onChangeText={setSecName} placeholder="Segunda Empresa Lda." />
              <Input label="NUIT" value={secNuit} onChangeText={setSecNuit} placeholder="000000000" keyboardType="numeric" />
              <Input label={tr(lang, 'address')} value={secAddress} onChangeText={setSecAddress} placeholder="Av. Principal, 45" />
              <Input label={tr(lang, 'city')} value={secCity} onChangeText={setSecCity} placeholder="Beira" />

              <Text style={[styles.secHeader, { color: palette.textMuted }]}>CONTACTOS</Text>
              <Input label={tr(lang, 'phone')} value={secPhone} onChangeText={setSecPhone} placeholder="+258 23 XXX XXX" keyboardType="phone-pad" />
              <Input label={tr(lang, 'email')} value={secEmail} onChangeText={setSecEmail} placeholder="geral@empresa2.co.mz" keyboardType="email-address" autoCapitalize="none" />

              <Text style={[styles.secHeader, { color: palette.textMuted }]}>{lang === 'pt' ? 'CONTAS BANCÁRIAS' : 'BANK ACCOUNTS'}</Text>
              {secBanks.map((acc, i) => (
                <View key={i} style={[S.multiItem, { borderColor: palette.border }]}>
                  <View style={S.multiHeader}>
                    <Text style={[S.multiLabel, { color: palette.text }]}>{lang === 'pt' ? 'Banco' : 'Bank'} {i + 1}</Text>
                    {secBanks.length > 1 && (
                      <TouchableOpacity onPress={() => setSecBanks(p => p.filter((_, ii) => ii !== i))}>
                        <Ionicons name="close-circle" size={20} color={Colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Input label={lang === 'pt' ? 'Nome do Banco' : 'Bank Name'} value={acc.bank}
                    onChangeText={v => setSecBanks(p => p.map((a, ii) => ii === i ? { ...a, bank: v } : a))}
                    placeholder="BCI, BIM, Millennium" containerStyle={{ marginBottom: 8 }} />
                  <Input label="IBAN / NIB" value={acc.iban}
                    onChangeText={v => setSecBanks(p => p.map((a, ii) => ii === i ? { ...a, iban: v } : a))}
                    placeholder="MZ59 XXXX..." containerStyle={{ marginBottom: 0 }} />
                </View>
              ))}
              <TouchableOpacity onPress={() => setSecBanks(p => [...p, { bank: '', iban: '' }])}
                style={[S.addBtn, { borderColor: Colors.primary }]}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                <Text style={{ color: Colors.primary, fontWeight: '600' }}>{lang === 'pt' ? 'Adicionar Banco' : 'Add Bank'}</Text>
              </TouchableOpacity>

              <Text style={[styles.secHeader, { color: palette.textMuted }]}>{lang === 'pt' ? 'CARTEIRAS MÓVEIS' : 'MOBILE WALLETS'}</Text>
              {secMobile.map((mc, i) => (
                <View key={i} style={[S.multiItem, { borderColor: palette.border }]}>
                  <View style={S.multiHeader}>
                    <Text style={[S.multiLabel, { color: palette.text }]}>{lang === 'pt' ? 'Carteira Móvel' : 'Mobile Wallet'} {i + 1}</Text>
                    {secMobile.length > 1 && (
                      <TouchableOpacity onPress={() => setSecMobile(p => p.filter((_, ii) => ii !== i))}>
                        <Ionicons name="close-circle" size={20} color={Colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={S.providerRow}>
                    {['M-Pesa', 'E-Mola', 'Movitel', 'Vodacom'].map(p => (
                      <TouchableOpacity key={p}
                        onPress={() => setSecMobile(prev => prev.map((m, ii) => ii === i ? { ...m, provider: p } : m))}
                        style={[S.providerBtn, {
                          borderColor: mc.provider === p ? Colors.primary : palette.border,
                          backgroundColor: mc.provider === p ? Colors.primary : palette.surface,
                        }]}>
                        <Text style={{ color: mc.provider === p ? '#fff' : palette.text, fontSize: 11, fontWeight: '600' }}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Input label={lang === 'pt' ? 'Número' : 'Number'} value={mc.number}
                    onChangeText={v => setSecMobile(prev => prev.map((m, ii) => ii === i ? { ...m, number: v } : m))}
                    placeholder="+258 8X XXX XXXX" keyboardType="phone-pad" containerStyle={{ marginBottom: 0 }} />
                </View>
              ))}
              <TouchableOpacity onPress={() => setSecMobile(p => [...p, { provider: 'M-Pesa', number: '' }])}
                style={[S.addBtn, { borderColor: Colors.secondary }]}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.secondary} />
                <Text style={{ color: Colors.secondary, fontWeight: '600' }}>{lang === 'pt' ? 'Adicionar Pagamento' : 'Add Payment'}</Text>
              </TouchableOpacity>

              <Text style={[styles.secHeader, { color: palette.textMuted }]}>{lang === 'pt' ? 'ACTIVOS DE MARCA' : 'BRAND ASSETS'}</Text>
              <BrandingRow label={tr(lang, 'logo')} base64={secLogo}
                onPick={() => pickImage(setSecLogo)} onRemove={() => setSecLogo(undefined)}
                palette={palette} lang={lang} />
              <BrandingRow label={tr(lang, 'stamp')} base64={secStamp}
                onPick={() => pickImage(setSecStamp)} onRemove={() => setSecStamp(undefined)}
                palette={palette} lang={lang} />

              <Button
                title={lang === 'pt' ? 'Guardar Empresa' : 'Save Company'}
                onPress={handleSaveSecondary}
                loading={secSaving}
                disabled={!secName.trim()}
                icon={<Ionicons name="checkmark-circle-outline" size={18} color="#fff" />}
                style={{ marginTop: Spacing.sm }}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ icon, text, palette }: { icon: string; text: string; palette: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name={icon as any} size={13} color={palette.textMuted} />
      <Text style={{ color: palette.textSecondary, fontSize: FontSize.xs, flex: 1 }}>{text}</Text>
    </View>
  );
}

function BrandingRow({ label, base64, onPick, onRemove, palette, lang }: {
  label: string; base64?: string; onPick: () => void; onRemove: () => void; palette: any; lang: string;
}) {
  return (
    <View style={[B.box, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <View style={B.row}>
        {base64
          ? <Image source={{ uri: base64 }} style={B.img} resizeMode="contain" />
          : <View style={[B.placeholder, { borderColor: palette.border }]}>
              <Ionicons name="image-outline" size={24} color={palette.textMuted} />
            </View>
        }
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={{ fontWeight: '700', fontSize: FontSize.sm, color: palette.text }}>{label}</Text>
          {base64
            ? <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={onPick} style={[B.btn, { backgroundColor: Colors.primary }]}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>{lang === 'pt' ? 'Alterar' : 'Change'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onRemove} style={[B.btn, { backgroundColor: Colors.error + '15', borderColor: Colors.error, borderWidth: 1 }]}>
                  <Text style={{ color: Colors.error, fontWeight: '700', fontSize: 11 }}>{lang === 'pt' ? 'Remover' : 'Remove'}</Text>
                </TouchableOpacity>
              </View>
            : <TouchableOpacity onPress={onPick} style={[B.btn, { backgroundColor: Colors.primary, flexDirection: 'row', gap: 4, alignItems: 'center' }]}>
                <Ionicons name="cloud-upload-outline" size={12} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>{lang === 'pt' ? 'Carregar' : 'Upload'}</Text>
              </TouchableOpacity>
          }
        </View>
      </View>
    </View>
  );
}

const B = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  img: { width: 72, height: 72, borderRadius: Radius.md, borderWidth: 1, borderColor: '#e0dfdd', backgroundColor: '#fff' },
  placeholder: { width: 72, height: 72, borderRadius: Radius.md, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  btn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.md, alignSelf: 'flex-start' },
});

const S = StyleSheet.create({
  multiItem: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  multiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  multiLabel: { fontWeight: '700', fontSize: FontSize.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: Radius.md, marginBottom: Spacing.sm },
  providerRow: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  providerBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.md, borderWidth: 1 },
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1,
  },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: FontSize.lg, fontWeight: '700' },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 48 },
  card: { borderWidth: 1, borderRadius: Radius.xl, padding: Spacing.md, gap: Spacing.sm },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: FontSize.base, fontWeight: '700' },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.md, gap: 4 },
  pillTxt: { color: '#fff', fontWeight: '700', fontSize: 11 },
  profileRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  logo: { width: 60, height: 60, borderRadius: Radius.md, borderWidth: 1, borderColor: '#e0dfdd', backgroundColor: '#fff' },
  logoHolder: { width: 60, height: 60, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  divSection: { borderTopWidth: 1, paddingTop: Spacing.sm, gap: 4 },
  subLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.md, borderWidth: 1 },
  secBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1 },
  emptyBox: { alignItems: 'center', paddingVertical: Spacing.lg },
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5 },
  prefLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  langBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.md, borderWidth: 1 },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1.5, borderRadius: Radius.lg, marginTop: 4 },
  dotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 8, borderBottomWidth: 1 },
  dot: { height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', minWidth: 12 },
  navBtns: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  secHeader: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 4, marginBottom: 2 },
});
