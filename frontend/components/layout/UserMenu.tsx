"use client";
import { useState, useRef } from "react";
import Link from "next/link"; 
import { supabase } from "../../lib/supabase";
import { User, Calendar, Gift, LogOut, ChevronDown } from "lucide-react"; // ✂️ Settings buradan silindi

export default function UserMenu({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0];

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div 
      className="relative" 
      onMouseLeave={handleMouseLeave} 
      onMouseEnter={handleMouseEnter}
    >
      <button 
        className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl transition-all duration-500 border
          ${isOpen 
            ? 'bg-white/10 border-white/20 shadow-[0_0_25px_rgba(255,255,255,0.1)] backdrop-blur-md' 
            : 'bg-transparent border-transparent hover:bg-white/5'}
        `}
      >
        <div className="w-7 h-7 rounded-full bg-[#00A3AD] flex items-center justify-center text-[11px] font-black shadow-lg text-white uppercase">
          {displayName[0]}
        </div>
        <span className="text-[13px] font-black uppercase tracking-widest text-white">
          {displayName}
        </span>
        <ChevronDown size={14} className={`text-white/50 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="absolute h-4 w-full top-full left-0 bg-transparent" />
          
          <div className="absolute top-[calc(100%+8px)] right-0 w-60 bg-white/95 backdrop-blur-2xl rounded-[2rem] py-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 animate-in fade-in slide-in-from-top-3 duration-300 z-[60] overflow-hidden">
            <div className="px-6 py-2 mb-2 border-b border-gray-100/50">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.25em]">Profil Yönetimi</p>
            </div>

            {[
              { icon: <User size={16} />, label: "Hesabım", link: "/hesabim" },
              { icon: <Calendar size={16} />, label: "Randevularım", link: "/randevularim" },
              { icon: <Gift size={16} />, label: "Hediye Kartı", link: "/hediye-karti" },
              // ✂️ Ayarlar satırı buradan tamamen kaldırıldı
            ].map((item) => (
              <Link 
                href={item.link}
                key={item.label}
                className="w-full flex items-center gap-4 px-6 py-3.5 text-black hover:bg-[#00A3AD] hover:text-white transition-all duration-300 group"
              >
                <span className="text-gray-400 group-hover:text-white transition-colors">{item.icon}</span>
                <span className="text-[12px] font-black uppercase tracking-widest">{item.label}</span>
              </Link>
            ))}

            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-6 py-4 mt-2 border-t border-gray-100 text-red-500 hover:bg-red-50 transition-all duration-300 group"
            >
              <LogOut size={16} className="group-hover:translate-x-1 transition-transform" />
              <span className="text-[12px] font-black uppercase tracking-widest">Çıkış Yap</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}