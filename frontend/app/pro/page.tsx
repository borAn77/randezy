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

    // Yeni işletme sahibi: Stripe'ın kendi ödeme sayfasına gönder.
    // Orada "Promosyon kodu ekle" alanı var (RANDEZY2026 gibi kodlar için) —
    // geçerli %100 indirimli kod girilirse kart bile istenmez.
    // Ödeme başlatılamazsa akış kesilmesin, işletme formuna devam edilsin.
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.ok && json.url) {
        window.location.href = json.url;
        return;
      }
    } catch {
      // sessizce devam — aşağıdaki fallback çalışır
    }
    router.push("/isletme-ekle");
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
            <span>Ödeme tamamlanmadı. "Hemen Başla"ya basıp tekrar deneyebilirsin.</span>
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
    </div>
  );
}
