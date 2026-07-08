import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }: { navigation?: { navigate: (screen: string) => void } }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'E-posta ve şifre gerekli.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) Alert.alert('Giriş başarısız', error.message);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const redirectTo = 'randezy-business://auth/callback';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data?.url) {
        Alert.alert('Giriş başarısız', error?.message ?? 'Google girişi başlatılamadı.');
        return;
      }

      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (res.type !== 'success' || !res.url) return; // kullanıcı pencereyi kapattı

      const { queryParams } = Linking.parse(res.url);
      const code = queryParams?.code;
      if (typeof code !== 'string') {
        Alert.alert('Giriş başarısız', 'Google yanıtı doğrulanamadı.');
        return;
      }

      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
      if (sessionError) {
        Alert.alert('Giriş başarısız', sessionError.message);
        return;
      }
      // Session kurulunca App.tsx içindeki onAuthStateChange ekranı geçirir.
    } catch (e) {
      Alert.alert('Giriş başarısız', (e as Error).message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        Alert.alert('Giriş başarısız', 'Apple kimlik doğrulaması alınamadı.');
        return;
      }
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) {
        Alert.alert('Giriş başarısız', error.message);
        return;
      }
      // Apple, ad-soyadı sadece ilk girişte döndürür — profildeki tam adı o an kaydediyoruz.
      const fullName = credential.fullName
        ? `${credential.fullName.givenName ?? ''} ${credential.fullName.familyName ?? ''}`.trim()
        : '';
      if (fullName && data.user) {
        await supabase.from('profiles').upsert(
          { id: data.user.id, email: data.user.email, full_name: fullName },
          { onConflict: 'id' }
        );
      }
      // Session kurulunca App.tsx içindeki onAuthStateChange ekranı geçirir.
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') return; // kullanıcı vazgeçti
      Alert.alert('Giriş başarısız', e?.message ?? 'Bilinmeyen hata');
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.logo}>Randezy</Text>
        <Text style={styles.subtitle}>İşletme Paneli</Text>

        <TextInput
          style={styles.input}
          placeholder="E-posta"
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Şifre"
          placeholderTextColor="#94a3b8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading || googleLoading || appleLoading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Giriş Yap</Text>}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}
          disabled={loading || googleLoading || appleLoading}
        >
          {googleLoading
            ? <ActivityIndicator color="#6366f1" />
            : <Text style={styles.googleButtonText}>Google ile Giriş Yap</Text>}
        </TouchableOpacity>

        {appleAvailable && (
          appleLoading ? (
            <View style={[styles.appleButton, styles.appleButtonLoading]}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={10}
              style={styles.appleButton}
              onPress={handleAppleLogin}
            />
          )
        )}

        {/* Personel: kodla giriş (ayrı salt-okunur takvim modu) */}
        <TouchableOpacity
          style={styles.staffLink}
          onPress={() => navigation?.navigate('PersonelGiris')}
          disabled={loading || googleLoading || appleLoading}
        >
          <Text style={styles.staffLinkText}>
            Personel misin? <Text style={styles.staffLinkBold}>Kodla giriş yap</Text>
          </Text>
        </TouchableOpacity>

        {/* İşletme kaydı web'de yapılıyor; uygulamayı ilk indirenler için yönlendirme */}
        <TouchableOpacity
          style={styles.signupLink}
          onPress={() => Linking.openURL('https://www.randezy.com/isletme-ekle')}
          disabled={loading || googleLoading || appleLoading}
        >
          <Text style={styles.staffLinkText}>
            İşletmeniz yok mu? <Text style={styles.staffLinkBold}>Hemen kaydolun</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#6366f1',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 28,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: '#94a3b8',
  },
  googleButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#334155',
    fontSize: 16,
    fontWeight: '600',
  },
  appleButton: {
    width: '100%',
    height: 48,
    marginTop: 12,
  },
  appleButtonLoading: {
    backgroundColor: '#000',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffLink: {
    marginTop: 18,
    alignItems: 'center',
  },
  signupLink: {
    marginTop: 14,
    alignItems: 'center',
  },
  staffLinkText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  staffLinkBold: {
    color: '#6366f1',
    fontWeight: '700',
  },
});
