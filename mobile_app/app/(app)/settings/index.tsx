import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../../stores/authStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../../shared/theme';
import { tr } from '../../../shared/i18n';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastContainer';
import type { BankAccount, MobileContact } from '../../../shared/types';

const STEPS = ['company', 'contacts', 'bank', 'mobile', 'branding'];

export default function SettingsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { userId } = useAuthStore();
  const { language, darkMode, company, saveSettings } = useSettingsStore();

  const palette = darkMode ? Colors.dark : Colors.light;
  const lang = language;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Company fields
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

  useEffect(() => {
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
  }, [company]);

  const pickImage = async (setter: (b64: string) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true, quality: 0.7,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled && result.assets[0].base64) {
      setter(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await saveSettings(userId, {
        companyName, nuit, address, city, phone, email,
        logoBase64, stampBase64,
        bankAccounts: bankAccounts.filter((b) => b.bank && b.iban),
        mobileContacts: mobileContacts.filter((m) => m.number),
        setupComplete: true,
      });
      showToast(
        lang === 'pt' ? 'Configurações guardadas' : 'Settings saved',
        undefined, 'success'
      );
      router.back();
    } catch (e) {
      showToast('Erro', String(e), 'error');
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = [
    lang === 'pt' ? 'Dados da Empresa' : 'Company Details',
    lang === 'pt' ? 'Contactos' : 'Contact Methods',
    lang === 'pt' ? 'Contas Bancárias' : 'Bank Accounts',
    lang === 'pt' ? 'Pagamentos Móvel' : 'Mobile Payments',
    lang === 'pt' ? 'Imagem' : 'Branding',
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: palette.text }]}>{tr(lang, 'companySetup')}</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: FontSize.base }}>
            {tr(lang, 'save')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Step Pills */}
      <View style={[styles.stepsRow, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
        {STEPS.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => setStep(i)}>
            <View style={[
              styles.stepDot,
              { backgroundColor: i === step ? Colors.primary : i < step ? Colors.success : palette.border }
            ]}>
              {i < step ? (
                <Ionicons name="checkmark" size={12} color="#fff" />
              ) : (
                <Text style={{ color: i === step ? '#fff' : palette.textMuted, fontSize: 11, fontWeight: '700' }}>{i + 1}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
        <View style={[styles.stepLine, { backgroundColor: palette.border }]} />
      </View>

      <Text style={[styles.stepTitle, { color: palette.text }]}>{stepTitles[step]}</Text>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Step 0: Company */}
          {step === 0 && (
            <>
              <Input label={tr(lang, 'companyName')} value={companyName} onChangeText={setCompanyName} placeholder="Ex: GRM Lda." />
              <Input label={tr(lang, 'nuit')} value={nuit} onChangeText={setNuit} placeholder="000000000" keyboardType="numeric" />
              <Input label={tr(lang, 'address')} value={address} onChangeText={setAddress} placeholder="Rua, Nº" />
              <Input label={tr(lang, 'city')} value={city} onChangeText={setCity} placeholder="Maputo" />
            </>
          )}

          {/* Step 1: Contact */}
          {step === 1 && (
            <>
              <Input label={tr(lang, 'phone')} value={phone} onChangeText={setPhone} placeholder="+258 21 XXX XXX" keyboardType="phone-pad" />
              <Input label={tr(lang, 'email')} value={email} onChangeText={setEmail} placeholder="geral@empresa.com" keyboardType="email-address" autoCapitalize="none" />
            </>
          )}

          {/* Step 2: Bank Accounts */}
          {step === 2 && (
            <>
              {bankAccounts.map((acc, i) => (
                <View key={i} style={[styles.multiItem, { borderColor: palette.border }]}>
                  <View style={styles.multiItemHeader}>
                    <Text style={[styles.multiItemLabel, { color: palette.text }]}>
                      {lang === 'pt' ? 'Banco' : 'Bank'} {i + 1}
                    </Text>
                    {bankAccounts.length > 1 && (
                      <TouchableOpacity onPress={() => setBankAccounts((p) => p.filter((_, ii) => ii !== i))}>
                        <Ionicons name="close-circle" size={20} color={Colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Input
                    label={lang === 'pt' ? 'Nome do Banco' : 'Bank Name'}
                    value={acc.bank}
                    onChangeText={(v) => setBankAccounts((p) => p.map((a, ii) => ii === i ? { ...a, bank: v } : a))}
                    placeholder="Ex: BCI, BIM, Millennium"
                    containerStyle={{ marginBottom: 8 }}
                  />
                  <Input
                    label="IBAN / NIB"
                    value={acc.iban}
                    onChangeText={(v) => setBankAccounts((p) => p.map((a, ii) => ii === i ? { ...a, iban: v } : a))}
                    placeholder="MZ59 XXXX XXXX XXXX XXXX XXXX X"
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              ))}
              <TouchableOpacity
                onPress={() => setBankAccounts((p) => [...p, { bank: '', iban: '' }])}
                style={[styles.addBtn, { borderColor: Colors.primary }]}
              >
                <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                <Text style={{ color: Colors.primary, fontWeight: '600' }}>
                  {lang === 'pt' ? 'Adicionar Banco' : 'Add Bank'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step 3: Mobile Payments */}
          {step === 3 && (
            <>
              {mobileContacts.map((mc, i) => (
                <View key={i} style={[styles.multiItem, { borderColor: palette.border }]}>
                  <View style={styles.multiItemHeader}>
                    <Text style={[styles.multiItemLabel, { color: palette.text }]}>
                      {lang === 'pt' ? 'Pagamento Móvel' : 'Mobile Payment'} {i + 1}
                    </Text>
                    {mobileContacts.length > 1 && (
                      <TouchableOpacity onPress={() => setMobileContacts((p) => p.filter((_, ii) => ii !== i))}>
                        <Ionicons name="close-circle" size={20} color={Colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.providerRow}>
                    {['M-Pesa', 'E-Mola', 'Movitel', 'Vodacom'].map((p) => (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setMobileContacts((prev) => prev.map((m, ii) => ii === i ? { ...m, provider: p } : m))}
                        style={[styles.providerBtn, {
                          borderColor: mc.provider === p ? Colors.primary : palette.border,
                          backgroundColor: mc.provider === p ? Colors.primary : palette.surface,
                        }]}
                      >
                        <Text style={{ color: mc.provider === p ? '#fff' : palette.text, fontSize: 11, fontWeight: '600' }}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Input
                    label={lang === 'pt' ? 'Número' : 'Number'}
                    value={mc.number}
                    onChangeText={(v) => setMobileContacts((prev) => prev.map((m, ii) => ii === i ? { ...m, number: v } : m))}
                    placeholder="+258 8X XXX XXXX"
                    keyboardType="phone-pad"
                    containerStyle={{ marginBottom: 0 }}
                  />
                </View>
              ))}
              <TouchableOpacity
                onPress={() => setMobileContacts((p) => [...p, { provider: 'M-Pesa', number: '' }])}
                style={[styles.addBtn, { borderColor: Colors.secondary }]}
              >
                <Ionicons name="add-circle-outline" size={18} color={Colors.secondary} />
                <Text style={{ color: Colors.secondary, fontWeight: '600' }}>
                  {lang === 'pt' ? 'Adicionar Pagamento' : 'Add Payment'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step 4: Branding */}
          {step === 4 && (
            <>
              <View style={[styles.brandingBox, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                <Text style={[styles.brandingLabel, { color: palette.text }]}>
                  {tr(lang, 'logo')}
                </Text>
                {logoBase64 ? (
                  // eslint-disable-next-line @typescript-eslint/no-var-requires
                  <View style={styles.imagePreview}>
                    <Text style={{ color: Colors.success, fontSize: 12 }}>✓ Logo carregado</Text>
                    <TouchableOpacity onPress={() => setLogoBase64(undefined)}>
                      <Ionicons name="close-circle" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ) : null}
                <Button
                  title={lang === 'pt' ? 'Escolher Logo' : 'Choose Logo'}
                  onPress={() => pickImage(setLogoBase64)}
                  variant="outline"
                  size="sm"
                  icon={<Ionicons name="image-outline" size={16} color={Colors.primary} />}
                />
              </View>

              <View style={[styles.brandingBox, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                <Text style={[styles.brandingLabel, { color: palette.text }]}>
                  {tr(lang, 'stamp')}
                </Text>
                {stampBase64 ? (
                  <View style={styles.imagePreview}>
                    <Text style={{ color: Colors.success, fontSize: 12 }}>✓ Carimbo carregado</Text>
                    <TouchableOpacity onPress={() => setStampBase64(undefined)}>
                      <Ionicons name="close-circle" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ) : null}
                <Button
                  title={lang === 'pt' ? 'Escolher Carimbo' : 'Choose Stamp'}
                  onPress={() => pickImage(setStampBase64)}
                  variant="outline"
                  size="sm"
                  icon={<Ionicons name="create-outline" size={16} color={Colors.primary} />}
                />
              </View>
            </>
          )}

          {/* Navigation Buttons */}
          <View style={styles.navBtns}>
            {step > 0 && (
              <Button
                title={lang === 'pt' ? 'Anterior' : 'Previous'}
                onPress={() => setStep((s) => s - 1)}
                variant="outline"
                style={{ flex: 1 }}
              />
            )}
            {step < STEPS.length - 1 ? (
              <Button
                title={lang === 'pt' ? 'Próximo' : 'Next'}
                onPress={() => setStep((s) => s + 1)}
                style={{ flex: 1 }}
              />
            ) : (
              <Button
                title={tr(lang, 'save')}
                onPress={handleSave}
                loading={loading}
                style={{ flex: 1 }}
                icon={<Ionicons name="checkmark-circle-outline" size={18} color="#fff" />}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1,
  },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: FontSize.lg, fontWeight: '700' },
  stepsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md, gap: 24, borderBottomWidth: 1, position: 'relative',
  },
  stepDot: {
    width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', zIndex: 1,
  },
  stepLine: {
    position: 'absolute', height: 1, left: 40, right: 40, top: '50%',
  },
  stepTitle: {
    fontFamily: 'PlayfairDisplay_700Bold', fontSize: FontSize.lg, fontWeight: '700',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 4,
  },
  scroll: { padding: Spacing.md, paddingBottom: 48 },
  multiItem: {
    borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md,
  },
  multiItemHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  multiItemLabel: { fontWeight: '700', fontSize: FontSize.sm },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  providerRow: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  providerBtn: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.md, borderWidth: 1,
  },
  brandingBox: {
    borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, gap: 8,
  },
  brandingLabel: { fontWeight: '700', fontSize: FontSize.sm },
  imagePreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtns: {
    flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg,
  },
});
