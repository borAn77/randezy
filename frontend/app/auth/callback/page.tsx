'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const [consentError, setConsentError] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [loadingStep, setLoadingStep] = useState('checking');

  const checkAndWriteConsent = async (token: string): Promise<{ ok: boolean; needsConsent: boolean }> => {
    const legalFlag = sessionStorage.getItem('randezy_legal_consent');

    // Register modundan geldiyse consent yaz
    if (legalFlag === 'true') {
      const marketingRaw = sessionStorage.getItem('randezy_marketing_consent');
      const marketing = marketingRaw === 'true';
      sessionStorage.removeItem('randezy_legal_consent');
      sessionStorage.removeItem('randezy_marketing_consent');

      setLoadingStep('writing');
      try {
        const documents = ['kullanici_sozlesmesi_v1', 'kvkk_v1', 'yurtdisi_aktarim_v1'];
        if (marketing) documents.push('ticari_ileti_v1');
        const res = await fetch('/api/legal-consents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ documents, marketing_consent: marketing }),
        });
        return { ok: res.ok, needsConsent: false };
      } catch {
        return { ok: false, needsConsent: false };
      }
    }

    // Mevcut kullanıcıysa required consent var mı kontrol et
    setLoadingStep('checking');
    try {
      const res = await fetch('/api/legal-consents?required=true', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      return { ok: true, needsConsent: !data.hasRequired };
    } catch {
      return { ok: true, needsConsent: true };
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const result = await checkAndWriteConsent(session.access_token);
        if (!result.ok) {
          setConsentError(true);
          setAccessToken(session.access_token);
          return;
        }
        if (result.needsConsent) {
          router.replace('/legal-onay');
        } else {
          router.replace('/');
        }
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const result = await checkAndWriteConsent(session.access_token);
        if (!result.ok) {
          setConsentError(true);
          setAccessToken(session.access_token);
          return;
        }
        if (result.needsConsent) {
          router.replace('/legal-onay');
        } else {
          router.replace('/');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleRetry = async () => {
    setConsentError(false);
    const result = await checkAndWriteConsent(accessToken);
    if (!result.ok) {
      setConsentError(true);
    } else if (result.needsConsent) {
      router.replace('/legal-onay');
    } else {
      router.replace('/');
    }
  };

  if (consentError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, padding: 24, textAlign: 'center' }}>
        <p style={{ fontWeight: 900, fontSize: 16 }}>Yasal onay kaydı oluşturulamadı.</p>
        <p style={{ color: '#888', fontSize: 13 }}>Lütfen tekrar deneyin. Sorun devam ederse destek@randezy.com adresine yazın.</p>
        <button onClick={handleRetry} style={{ background: '#00A3AD', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 12, fontWeight: 900, cursor: 'pointer', fontSize: 13 }}>
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 24, backgroundColor: '#F9F9F9' }}>
      {/* Randezy Logo */}
      <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, color: '#0C0C0D' }}>
        randezy
      </div>

      {/* Spinner */}
      <div style={{
        width: 48,
        height: 48,
        border: '4px solid #E5E5E5',
        borderTop: '4px solid #00A3AD',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />

      {/* Loading steps */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0C0C0D', margin: 0 }}>
          {loadingStep === 'writing' ? 'Onaylar kaydediliyor...' : 'Giriş yapılıyor...'}
        </p>
        <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
          {loadingStep === 'writing' ? 'Lütfen bekleyin' : 'Yasal onaylar kontrol ediliyor...'}
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
