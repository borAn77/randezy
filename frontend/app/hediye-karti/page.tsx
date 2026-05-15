"use client";
import Navbar from "../../components/layout/Navbar";
import { Gift, Check, ArrowRight, Zap } from "lucide-react";

const cards = [
  { 
    amount: "1.000", 
    title: "Silver Edition", 
    desc: "Küçük bir jest, büyük bir değişim.",
    color: "bg-white",
    textColor: "text-black",
    badge: "Popüler"
  },
  { 
    amount: "5.000", 
    title: "Gold Premium", 
    desc: "Sıkı bir bakım serüveni için ideal.",
    color: "bg-[#00A3AD]",
    textColor: "text-white",
    badge: "En İyi Değer"
  },
  { 
    amount: "10.000", 
    title: "Black Diamond", 
    desc: "Sınır tanımayan bir stil deneyimi.",
    color: "bg-black",
    textColor: "text-white",
    badge: "Elite VIP"
  }
];

export default function HediyeKartiPage() {
  return (
    <main className="min-h-screen bg-[#F9F9F9]">
      <Navbar />
      
      <div className="max-w-6xl mx-auto pt-44 pb-20 px-6">
        {/* Başlık Bölümü */}
        <header className="text-center mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 mb-4">
            <Zap size={14} className="text-[#00A3AD] fill-[#00A3AD]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Randezy Gift Experience</span>
          </div>
          <h1 className="text-6xl font-black uppercase tracking-tighter text-black">Stil Hediye Et</h1>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest italic max-w-lg mx-auto leading-relaxed">
            Sevdiklerine sadece bir randevu değil, kusursuz bir deneyim armağan et.
          </p>
        </header>

        {/* Kartlar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {cards.map((card, index) => (
            <div 
              key={index} 
              className={`${card.color} ${card.textColor} rounded-[3rem] p-12 shadow-2xl flex flex-col justify-between h-[550px] transition-all hover:-translate-y-4 group relative overflow-hidden`}
            >
              {/* Kart Dokusu Dekorasyonu */}
              <div className="absolute -right-10 -top-10 opacity-5 group-hover:scale-125 transition-transform duration-700">
                <Gift size={250} />
              </div>

              <div>
                <div className="flex justify-between items-start mb-8">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border ${card.textColor === 'text-white' ? 'border-white/20' : 'border-black/10'}`}>
                    {card.badge}
                  </span>
                  <Gift size={24} className={card.textColor === 'text-white' ? 'opacity-50' : 'opacity-20'} />
                </div>
                
                <h3 className="text-xs font-black uppercase tracking-[0.4em] opacity-60 mb-2">{card.title}</h3>
                <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black tracking-tighter">{card.amount}</span>
                    <span className="text-xl font-black tracking-tighter opacity-60 ml-1">TL</span>
                </div>
                <p className="mt-6 text-sm font-medium opacity-70 leading-relaxed">{card.desc}</p>
                
                <ul className="mt-10 space-y-4">
                  {["Tüm işletmelerde geçerli", "1 yıl kullanım süresi", "Öncelikli rezervasyon"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${card.textColor === 'text-white' ? 'border-white/20' : 'border-black/10'}`}>
                        <Check size={10} />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <button className={`w-full py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3
                ${card.textColor === 'text-white' ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-[#00A3AD]'}`}>
                Kartı Satın Al <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>

        <p className="mt-20 text-center text-gray-300 text-[10px] font-black uppercase tracking-[0.4em]">
          * Satın alınan dijital kartlar anında e-posta adresine teslim edilir.
        </p>
      </div>
    </main>
  );
}