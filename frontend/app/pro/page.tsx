"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import AuthModal from "../../components/layout/AuthModal";
import Footer from "../../components/layout/Footer";
import { Hero } from "../../components/landing/Hero";
import { Features } from "../../components/landing/Features";
import { Industries } from "../../components/landing/Industries";
import { Pricing } from "../../components/landing/Pricing";

export default function ProPage() {
  const router = useRouter();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [verifyMode, setVerifyMode] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [cancelNotice, setCancelNotice] = useState(false);

  const handleStart = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      // Giriş yok → normal kayıt/giriş; doğrulama sonrası bu fonksiyon
      // 'profile-updated' event'iyle tekrar çalışır (bkz. useEffect aşağıda)
      setVerifyMode(false);
      setVerifyEmail("");
      setIsAuthOpen(true);
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('email_verified')
      .eq('id', session.user.id)
      .maybeSingle();
    if (profile?.email_verified !== true) {
      // Giriş var ama OTP doğrulanmamış → doğrudan doğrulama ekranı
      setVerifyMode(true);
      setVerifyEmail(session.user.email || "");
      setIsAuthOpen(true);
      return;
    }

    // Zaten işletmesi olan sahip tekrar "Hemen Başla"ya basarsa panele gitsin
    const { data: existingShop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', session.user.id)
      .limit(1)
      .maybeSingle();
    if (existingShop) {
      router.push("/dashboard");
      return;
    }

    // Yeni işletme sahibi: önce promo kod / ödeme seçimini göster
    setPromoError(null);
    setShowPaywallModal(true);
  };

  // E-posta doğrulaması AuthModal içinde tamamlanınca (redirectAfterVerify
  // vermiyoruz — kullanıcı /pro'da kalsın), bu event'le akışı tekrar başlat
  useEffect(() => {
    const onProfileUpdated = () => { handleStart(); };
    window.addEventListener('profile-updated', onProfileUpdated);
    return () => window.removeEventListener('profile-updated', onProfileUpdated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stripe'tan "iptal" dönüşü (?billing=cancel) — bkz. api/billing/checkout cancel_url
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') === 'cancel') {
      window.history.replaceState({}, '', '/pro');
      setCancelNotice(true);
    }
  }, []);

  const handleRedeemPending = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code || promoBusy) return;
    setPromoBusy(true);
    setPromoError(null);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/promo/redeem-pending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ code }),
    });
    const json = await res.json().catch(() => ({}));
    setPromoBusy(false);
    if (json.ok) {
      router.push('/isletme-ekle?billing=success&promo=1');
      return;
    }
    const msgs: Record<string, string> = {
      invalid_code: 'Kod geçersiz. Kontrol edip tekrar dene.',
      expired_code: 'Bu kodun süresi dolmuş.',
      exhausted: 'Bu kod kullanım limitine ulaşmış.',
      already_used: 'Bu kodu zaten kullandınız.',
    };
    setPromoError(msgs[json.reason as string] || 'Kod uygulanamadı, tekrar deneyin.');
  };

  const handlePayWithCard = async () => {
    if (payBusy) return;
    setPayBusy(true);
    setPromoError(null);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      if (json.ok && json.url) {
        window.location.href = json.url;
        return;
      }
    } catch {
      // aşağıdaki hata mesajı gösterilir
    }
    setPayBusy(false);
    setPromoError('Ödeme sayfası açılamadı, tekrar deneyin.');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-[100] bg-white/90 backdrop-blur-xl border-b border-gray-100 px-6 md:px-16 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-12">
            <button
              onClick={() => router.push("/")}
              className="text-2xl font-black tracking-tighter uppercase text-black"
            >
              randezy<span className="text-[#00A3AD]">.pro</span>
            </button>
            <div className="hidden lg:flex items-center gap-8 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              <a href="#ozellikler" className="hover:text-black cursor-pointer transition-colors">Özellikler</a>
              <a href="#fiyatlandirma" className="hover:text-black cursor-pointer transition-colors">Fiyatlandırma</a>
              <button onClick={() => router.push("/")} className="hover:text-black cursor-pointer transition-colors">Müşteri Paneli</button>
            </div>
          </div>
          <button
            onClick={handleStart}
            className="bg-black text-white px-8 py-2.5 rounded-full text-[12px] font-black uppercase tracking-widest hover:bg-[#00A3AD] transition-all shadow-lg"
          >
            Hemen Başla
          </button>
        </div>
      </nav>

      {/* Navbar spacer */}
      <div className="h-[72px]" />

      {cancelNotice && (
        <div className="max-w-2xl mx-auto mt-6 px-6">
          <div className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-100 text-amber-700 text-[13px] font-bold rounded-2xl px-5 py-4">
            <span>Ödeme tamamlanmadı. Promo kodun varsa "Hemen Başla"ya basıp tekrar dene.</span>
            <button onClick={() => setCancelNotice(false)} className="text-amber-400 hover:text-amber-700 flex-shrink-0">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* SaaS Landing Page Sections */}
      <Hero onStart={handleStart} />

      <section id="ozellikler">
        <Features />
        <Industries />
      </section>

      <section id="fiyatlandirma">
        <Pricing onStart={handleStart} />
      </section>

      <Footer />
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        verificationOnly={verifyMode}
        initialEmail={verifyEmail}
      />

      {/* Promo kod / ödeme seçim modalı — işletme oluşturulmadan ÖNCE gösterilir */}
      {showPaywallModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] max-w-md w-full p-8 md:p-10 relative animate-in zoom-in duration-300">
            <button
              onClick={() => { setShowPaywallModal(false); setPromoInput(""); setPromoError(null); }}
              className="absolute top-6 right-6 text-gray-300 hover:text-black transition-colors"
            >
              <X size={24} />
            </button>
            <h3 className="text-2xl font-black uppercase tracking-tight mb-2 text-black">İşletmeni Randezy'e Taşı</h3>
            <p className="text-sm text-gray-400 font-medium mb-8">Devam etmeden önce bir seçenek seç.</p>

            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              Promo kodun var mı?
            </label>
            <div className="flex gap-2">
              <input
                value={promoInput}
                onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                onKeyDown={e => { if (e.key === 'Enter') handleRedeemPending(); }}
                placeholder="ÖRN. RANDEZY2026"
                maxLength={24}
                className="flex-1 min-w-0 px-4 py-3 bg-gray-50 rounded-2xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black tracking-widest uppercase"
              />
              <button
                onClick={handleRedeemPending}
                disabled={promoBusy || !promoInput.trim()}
                className="px-5 py-3 rounded-2xl bg-[#00A3AD] text-white text-[12px] font-black uppercase tracking-wide hover:bg-black transition-all disabled:opacity-40 flex-shrink-0"
              >
                {promoBusy ? '...' : 'Uygula'}
              </button>
            </div>
            {promoError && <p className="text-red-500 text-[12px] font-bold mt-2">{promoError}</p>}

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">veya</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <button
              onClick={handlePayWithCard}
              disabled={payBusy}
              className="w-full bg-black text-white py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest hover:bg-[#00A3AD] transition-all disabled:opacity-50"
            >
              {payBusy ? 'Yönlendiriliyor...' : '₺1.699/ay — Kart ile Öde'}
            </button>
            <p className="text-center text-[10px] text-gray-300 font-bold uppercase tracking-widest mt-4">
              Komisyonsuz sabit fiyat · İstediğin an devam edebilirsin
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
