"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import AuthModal from "../../components/layout/AuthModal";
import { Hero } from "../../components/landing/Hero";
import { Stats } from "../../components/landing/Stats";
import { Features } from "../../components/landing/Features";
import { Industries } from "../../components/landing/Industries";
import { Pricing } from "../../components/landing/Pricing";

export default function ProPage() {
  const router = useRouter();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const pendingRedirect = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && pendingRedirect.current) {
        pendingRedirect.current = false;
        router.push("/isletme-ekle");
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const handleStart = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.push("/isletme-ekle");
    } else {
      pendingRedirect.current = true;
      setIsAuthOpen(true);
    }
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
            Ücretsiz Başla
          </button>
        </div>
      </nav>

      {/* Navbar spacer */}
      <div className="h-[72px]" />

      {/* SaaS Landing Page Sections */}
      <Hero onStart={handleStart} />

      <section id="ozellikler">
        <Stats />
        <Features />
        <Industries />
      </section>

      <section id="fiyatlandirma">
        <Pricing onStart={handleStart} />
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-gray-100 bg-white text-center">
        <p className="text-xl font-black tracking-tighter uppercase mb-8 text-black">
          randezy<span className="text-[#00A3AD]">.pro</span>
        </p>
        <div className="flex justify-center gap-10 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          <span className="hover:text-black cursor-pointer transition-colors">Gizlilik</span>
          <span className="hover:text-black cursor-pointer transition-colors">Şartlar</span>
          <button onClick={() => router.push("/")} className="hover:text-[#00A3AD] cursor-pointer transition-colors">Müşteri Paneli</button>
        </div>
      </footer>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}
