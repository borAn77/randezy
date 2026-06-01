'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const [consentError, setConsentError] = useState(false);
  const [accessToken, setAccessToken] = useState('');

  const writeConsent = async (token: string): Promise<boolean> => {
    const legalFlag = sessionStorage.getItem('randezy_legal_consent');
    if (legalFlag !== 'true') return true; // mevcut kullanıcı girişi — consent gerekmez

    const marketingRaw = sessionStorage.getItem('randezy_marketing_consent');
    const marketing = marketingRaw === 'true';

    sessionStorage.removeItem('randezy_legal_consent');
    sessionStorage.removeItem('randezy_marketing_consent');

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
      return res.ok;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const ok = await writeConsent(session.access_token);
        if (!ok) {
          setConsentError(true);
          setAccessToken(session.access_token);
          return;
        }
        router.replace('/');
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const ok = await writeConsent(session.access_token);
        if (!ok) {
          setConsentError(true);
          setAccessToken(session.access_token);
          return;
        }
        router.replace('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleRetry = async () => {
    setConsentError(false);
    const ok = await writeConsent(accessToken);
    if (ok) router.replace('/');
    else setConsentError(true);
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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Giriş yapılıyor...</p>
    </div>
  );
}
