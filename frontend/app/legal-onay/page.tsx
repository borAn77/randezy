'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function LegalOnayPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [kvkkConsent, setKvkkConsent] = useState(false);
  const [internationalConsent, setInternationalConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.replace('/');
        return;
      }
      setUser(currentUser);
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kvkkConsent || !internationalConsent) {
      setError('Zorunlu onay kutucuklarını işaretleyin.');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Giriş yapılmadı.');
        setLoading(false);
        return;
      }

      const documents = ['kullanici_sozlesmesi_v1', 'kvkk_v1', 'yurtdisi_aktarim_v1'];
      if (marketingConsent) documents.push('ticari_ileti_v1');

      const res = await fetch('/api/legal-consents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ documents, marketing_consent: marketingConsent }),
      });

      if (!res.ok) {
        setError('Onay kaydı oluşturulamadı. Tekrar deneyin.');
        setLoading(false);
        return;
      }

      router.push('/');
    } catch {
      setError('Bir hata oluştu. Tekrar deneyin.');
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Yükleniyor...</div>;
  }

  return (
    <main className="min-h-screen bg-[#F9F9F9]">
      <nav className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-lg font-black tracking-tighter uppercase text-black hover:text-[#00A3AD] transition-colors">
            randezy
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pt-28 pb-20">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-black mb-2">Yasal Onaylar</h1>
          <p className="text-sm text-gray-400 font-medium">Devam etmek için lütfen zorunlu onayları verin.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-7 border border-gray-100 space-y-6">
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={kvkkConsent}
                onChange={e => setKvkkConsent(e.target.checked)}
                className="mt-0.5 flex-shrink-0 accent-[#00A3AD]"
              />
              <span className="text-[13px] font-medium text-gray-600 leading-relaxed">
                <Link href="/kullanici-sozlesmesi" target="_blank" className="font-black text-[#00A3AD] hover:underline">Kullanıcı Sözleşmesi</Link>'ni kabul ediyorum ve{" "}
                <Link href="/kvkk" target="_blank" className="font-black text-[#00A3AD] hover:underline">KVKK Aydınlatma Metni</Link>'ni okudum. <span className="text-red-400">*</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={internationalConsent}
                onChange={e => setInternationalConsent(e.target.checked)}
                className="mt-0.5 flex-shrink-0 accent-[#00A3AD]"
              />
              <span className="text-[13px] font-medium text-gray-600 leading-relaxed">
                Kişisel verilerimin, hizmetin sağlanması amacıyla HM MARKETING SP. Z O.O. ve Randezy'nin kullandığı yurt dışındaki hizmet sağlayıcılarla paylaşılabileceğini okudum ve açık rıza gösteriyorum. <span className="text-red-400">*</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={e => setMarketingConsent(e.target.checked)}
                className="mt-0.5 flex-shrink-0 accent-[#00A3AD]"
              />
              <span className="text-[13px] font-medium text-gray-500 leading-relaxed">
                Randezy'den kampanya ve duyurular için{" "}
                <Link href="/ticari-ileti-izni" target="_blank" className="text-gray-700 hover:underline">ticari elektronik ileti</Link>{" "}
                almak istiyorum. (İsteğe bağlı)
              </span>
            </label>
          </div>

          {error && <p className="text-sm font-bold text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || !kvkkConsent || !internationalConsent}
            className="w-full bg-[#00A3AD] text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl hover:bg-black transition-all disabled:opacity-40"
          >
            {loading ? "Onaylanıyor..." : "Onayları Kabul Et"}
          </button>
        </form>
      </div>
    </main>
  );
}
