import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { Colors, Spacing, Radius, FontSize } from '../../shared/theme';
import { tr } from '../../shared/i18n';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuthStore();
  const { language, setLanguage, darkMode } = useSettingsStore();
  const palette = darkMode ? Colors.dark : Colors.light;

  const lang = language;

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!email || !password) { setError('Preencha todos os campos.'); return; }
    if (!isLogin && !name) { setError('Insira o seu nome.'); return; }
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }

    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, name);
        setSuccess(lang === 'pt' ? 'Conta criada! Verifique o seu email.' : 'Account created! Check your email.');
        setIsLogin(true);
      }
    } catch (e: any) {
      setError(lang === 'pt' ? 'Credenciais inválidas' : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setLanguage(lang === 'pt' ? 'en' : 'pt')}
              style={[styles.langBtn, { borderColor: palette.border }]}
            >
              <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '600' }}>
                {lang === 'pt' ? 'EN' : 'PT'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Logo */}
          <View style={styles.logoBlock}>
            <Text style={[styles.logoText, { color: Colors.primary }]}>Rest</Text>
            <Text style={[styles.tagline, { color: Colors.secondary }]}>
              {lang === 'pt' ? 'Onde o crescimento encontra espaço' : 'Where growth finds space'}
            </Text>
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            {/* Tabs */}
            <View style={[styles.tabs, { backgroundColor: palette.surface }]}>
              {[
                { key: true, label: tr(lang, 'login') },
                { key: false, label: tr(lang, 'signup') },
              ].map(({ key, label }) => (
                <TouchableOpacity
                  key={String(key)}
                  onPress={() => { setIsLogin(key); setError(''); setSuccess(''); }}
                  style={[
                    styles.tab,
                    isLogin === key && { backgroundColor: palette.card, ...shadowSm },
                  ]}
                >
                  <Text style={[styles.tabText, { color: isLogin === key ? Colors.primary : palette.textMuted }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ marginTop: Spacing.lg }}>
              {!isLogin && (
                <Input
                  label={tr(lang, 'fullName')}
                  placeholder={lang === 'pt' ? 'João Silva' : 'John Smith'}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              )}
              <Input
                label={tr(lang, 'email')}
                placeholder="email@empresa.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                label={tr(lang, 'password')}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {error ? (
                <View style={[styles.alert, { backgroundColor: '#fee2e2', borderColor: Colors.error }]}>
                  <Text style={{ color: Colors.error, fontSize: 13 }}>{error}</Text>
                </View>
              ) : null}

              {success ? (
                <View style={[styles.alert, { backgroundColor: '#dcfce7', borderColor: Colors.success }]}>
                  <Text style={{ color: Colors.success, fontSize: 13 }}>{success}</Text>
                </View>
              ) : null}

              <Button
                title={isLogin ? tr(lang, 'login') : tr(lang, 'signup')}
                onPress={handleSubmit}
                loading={loading}
                style={{ marginTop: 4 }}
              />

              <TouchableOpacity
                onPress={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
                style={styles.switchLink}
              >
                <Text style={{ color: palette.textMuted, fontSize: 13 }}>
                  {isLogin ? tr(lang, 'noAccount') : tr(lang, 'hasAccount')}
                  <Text style={{ color: Colors.primary, fontWeight: '600' }}>
                    {' '}{isLogin ? tr(lang, 'signup') : tr(lang, 'login')}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const shadowSm = { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 };

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  langBtn: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  logoBlock: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoText: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 42,
    letterSpacing: 2,
  },
  tagline: {
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  tabText: {
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
  alert: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  switchLink: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
});
