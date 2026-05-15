"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  Calendar, TrendingUp, Users, Shield, Star, ArrowRight, 
  CheckCircle2, Zap, Clock, BarChart3, Phone, Wallet,
  AlertCircle, Target, ChevronRight, Plus, Bell, Search, User,
  MoreHorizontal
} from "lucide-react";

export default function RandezyPro() {
  const router = useRouter();
  const [shopCount, setShopCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ days: 46, hours: 13, minutes: 28, seconds: 17 });
  const spotsLeft = 23;

  // Sayaç Animasyonu
  useEffect(() => {
    const timer = setInterval(() => {
      setShopCount(prev => prev < 310 ? prev + 3 : 310);
    }, 20);
    return () => clearInterval(timer);
  }, []);

  // Geri Sayım Mantığı
  useEffect(() => {
    const target = new Date("2026-06-30T23:59:59");
    const interval = setInterval(() => {
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) { clearInterval(interval); return; }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60)
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#000] text-white selection:bg-[#00A3AD] selection:text-white font-sans">
      
      {/* 🧭 NAVIGATION */}
      <nav className="fixed top-0 w-full z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 md:px-16 py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-12">
            <span className="text-2xl font-black tracking-tighter uppercase text-white">
              RANDEZY<span className="text-[#00A3AD]">.PRO</span>
            </span>
            <div className="hidden lg:flex items-center gap-8 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
              <span className="hover:text-white cursor-pointer transition-colors">ÖZELLİKLER</span>
              <span className="hover:text-white cursor-pointer transition-colors">FİYATLANDIRMA</span>
              <span className="hover:text-white cursor-pointer transition-colors">DESTEK</span>
            </div>
          </div>
          <button 
            onClick={() => router.push("/isletme-ekle")}
            className="bg-white text-black px-8 py-2.5 rounded-full text-[12px] font-black uppercase tracking-widest hover:bg-[#00A3AD] hover:text-white transition-all shadow-lg"
          >
            ÜCRETSİZ BAŞLA
          </button>
        </div>
      </nav>

      {/* ⚡ HERO SECTION (Booksy Arrangement) */}
      <section className="relative pt-44 pb-32 px-6 md:px-16 overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#00A3AD]/5 rounded-full blur-[150px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr,1fr] gap-20 items-center">
          
          {/* SOL: METİNLER */}
          <div className="z-10 text-left">
            <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-2 rounded-full mb-10">
              <div className="w-1.5 h-1.5 bg-[#00A3AD] rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 leading-none">
                TÜRKİYE'NİN EN MODERN İŞLETME PLATFORMU
              </span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black leading-[0.92] tracking-tighter mb-10 uppercase text-white">
              TELEFONU KAPAT, <br />
              <span className="text-[#00A3AD]">İŞİNİ BÜYÜT.</span>
            </h1>
            
            <p className="text-lg md:text-xl font-medium text-gray-400 mb-12 max-w-xl leading-relaxed">
              Müşterilerinizin 7/24 randevu almasını sağlayın, takviminizi saniyeler içinde yönetin. <span className="text-white font-bold">{shopCount} bin+</span> profesyonel arasına şimdi katılın.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 mb-16">
              <button 
                onClick={() => router.push("/isletme-ekle")}
                className="group bg-white text-black px-14 py-6 rounded-full font-black text-sm uppercase tracking-widest hover:bg-[#00A3AD] hover:text-white transition-all shadow-2xl flex items-center gap-4"
              >
                HEMEN ÜCRETSİZ DENE <ChevronRight size={20} className="group-hover:translate-x-2 transition-transform" />
              </button>
            </div>

            {/* Campaign Countdown */}
            <div className="flex items-center gap-5">
              <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest leading-none">KONTENJAN BİTİŞ:</span>
              <div className="flex gap-2">
                {[timeLeft.days, timeLeft.hours, timeLeft.minutes, timeLeft.seconds].map((v, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl min-w-[60px] text-center">
                    <p className="text-xl font-black text-[#00A3AD] tabular-nums leading-none">{String(v).padStart(2,'0')}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SAĞ: PROFESYONEL TELEFON MOCKUP */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#00A3AD]/10 rounded-full blur-[100px] pointer-events-none"></div>
            
            {/* iPhone Kasa */}
            <div className="relative w-[320px] h-[660px] bg-[#0a0a0a] rounded-[3.5rem] p-3 border-[9px] border-[#1a1a1a] shadow-[0_50px_100px_-20px_rgba(0,163,173,0.25)]">
              {/* Screen İçeriği */}
              <div className="w-full h-full bg-[#f9f9f9] rounded-[2.8rem] overflow-hidden flex flex-col text-black">
                {/* App Header */}
                <div className="p-6 pt-12 bg-white border-b border-gray-100 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">DÜKKAN YÖNETİMİ</span>
                    <span className="text-base font-black text-black leading-none tracking-tight">Randezy Barber</span>
                  </div>
                  <div className="w-10 h-10 bg-[#00A3AD] rounded-full flex items-center justify-center text-white"><User size={20}/></div>
                </div>

                {/* Randevu Kartları */}
                <div className="flex-grow p-4 space-y-3 overflow-y-auto">
                  <div className="flex justify-between items-center px-1 mb-2 mt-2">
                    <span className="text-[11px] font-black uppercase text-gray-400 tracking-wider">BUGÜN</span>
                    <MoreHorizontal size={16} className="text-gray-300" />
                  </div>
                  
                  {[
                    { t: "09:30", n: "Caner Aydın", s: "Saç Kesimi", c: "border-[#00A3AD]" },
                    { t: "11:00", n: "Mert Demir", s: "Sakal Bakımı", c: "border-black" },
                    { t: "13:30", n: "Selim Akın", s: "Komple Bakım", c: "border-[#00A3AD]" },
                    { t: "15:00", n: "Ahmet Yılmaz", s: "Cilt Bakımı", c: "border-black" },
                  ].map((item, idx) => (
                    <div key={idx} className={`p-4 bg-white border border-gray-100 border-l-[6px] rounded-2xl shadow-sm ${item.c}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-bold text-[#00A3AD] mb-0.5">{item.t}</p>
                          <p className="text-sm font-black text-black">{item.n}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{item.s}</p>
                        </div>
                        <CheckCircle2 size={16} className="text-[#00A3AD] opacity-20" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* App Navigation */}
                <div className="p-6 bg-white border-t border-gray-100 flex justify-around items-center">
                  <Calendar size={22} className="text-[#00A3AD]" />
                  <TrendingUp size={22} className="text-gray-300" />
                  <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shadow-lg -mt-10 border-4 border-white"><Plus /></div>
                  <Users size={22} className="text-gray-300" />
                  <BarChart3 size={22} className="text-gray-300" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 📊 STATS (Pure Black) */}
      <section className="py-24 border-y border-white/5 bg-black">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
          {[
            { n: "%100", l: "DOLULUK ORANI" },
            { n: "2.4 S", l: "GÜNLÜK ZAMAN TASARRUFU" },
            { n: "%0", l: "HATALI RANDEVU" },
            { n: "7/24", l: "KESİNTİSİZ HİZMET" }
          ].map((s, i) => (
            <div key={i} className="group">
              <p className="text-5xl font-black text-white group-hover:text-[#00A3AD] transition-colors tracking-tighter mb-2">{s.n}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 🏷️ PRICING: WHITE INVESTOR CARD */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto bg-white rounded-[4rem] p-12 md:p-20 text-black relative shadow-2xl overflow-hidden selection:bg-black selection:text-white border-2 border-gray-50">
          <div className="absolute top-0 right-12 bg-black text-white px-8 py-3 rounded-bl-3xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
            SINIRLI KONTENJAN • {spotsLeft} YER KALDI
          </div>
          
          <div className="text-center mb-12 pt-4">
            <h3 className="text-4xl font-black uppercase tracking-tighter mb-4 text-black leading-none">ŞİMDİ ÜCRETSİZ KATIL</h3>
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest leading-relaxed">
              İLK 100 İŞLETME İÇİN ÖMÜR BOYU ÜCRETSİZ PANEL <br />
              <span className="text-gray-300 line-through text-xs tracking-normal">Normal Fiyat: ₺1.799/ay</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5 mb-14 border-y border-gray-100 py-12">
            {["Sınırsız Randevu", "Online Ödeme", "Gelir Analizleri", "Otomatik SMS", "Yorum Sistemi", "CRM Paneli"].map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <CheckCircle2 size={20} className="text-[#00A3AD] flex-shrink-0" />
                <span className="text-[11px] font-black uppercase tracking-tight text-black">{item}</span>
              </div>
            ))}
          </div>

          <button 
            onClick={() => router.push("/isletme-ekle")}
            className="w-full bg-black text-white py-7 rounded-full font-black uppercase tracking-[0.2em] text-xs hover:bg-[#00A3AD] transition-all shadow-xl"
          >
            İŞLETMENİ ÜCRETSİZ EKLE
          </button>
        </div>
      </section>

      {/* 🏁 FOOTER */}
      <footer className="py-20 border-t border-white/5 bg-black text-center">
        <p className="text-xl font-black tracking-tighter uppercase mb-10 text-white">RANDEZY<span className="text-[#00A3AD]">.PRO</span></p>
        <div className="flex justify-center gap-10 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
          <span className="hover:text-white cursor-pointer">GİZLİLİK</span>
          <span className="hover:text-white cursor-pointer">ŞARTLAR</span>
          <span className="hover:text-[#00A3AD] cursor-pointer" onClick={() => router.push("/")}>MÜŞTERİ PANELİ</span>
        </div>
      </footer>

    </div>
  );
}