import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { FRONTEND_URL } from '../config';

// Personel kod girişi — web /personel'in mobil karşılığı.
// Kod, Next.js API'sinde doğrulanır (/api/staff/login); başarıda App.tsx
// kodu AsyncStorage'a yazıp personel moduna geçer.

export default function StaffLoginScreen({ onSuccess, onBack }: {
  onSuccess: (code: string) => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${FRONTEND_URL}/api/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.detail || 'Giriş yapılamadı. Tekrar deneyin.');
        setLoading(false);
        return;
      }
      onSuccess(code.toUpperCase().trim());
    } catch {
      setError('Bağlantı hatası. İnternetini kontrol edip tekrar dene.');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.logo}>Randezy</Text>
        <Text style={styles.subtitle}>Personel Girişi</Text>
        <Text style={styles.hint}>
          İşletme sahibinin sana verdiği giriş kodunu yaz — takvimin karşında.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="RDZ-XXXX-XXXX"
          placeholderTextColor="#94a3b8"
          value={code}
          onChangeText={(t) => { setCode(t.toUpperCase()); setError(null); }}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, (loading || code.trim().length < 8) && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading || code.trim().length < 8}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Giriş Yap</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backLink} onPress={onBack} disabled={loading}>
          <Text style={styles.backLinkText}>← İşletme girişine dön</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footNote}>
        Kodun yok mu? İşletme sahibi panelindeki Personel sekmesinden oluşturabilir.
      </Text>
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
    marginBottom: 12,
  },
  hint: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    color: '#1e293b',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  error: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backLink: {
    marginTop: 18,
    alignItems: 'center',
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  footNote: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});
