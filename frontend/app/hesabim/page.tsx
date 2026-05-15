"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Navbar from "../../components/layout/Navbar";
import {
  User, Calendar, Shield, Trash2, ChevronRight,
  Store, TrendingUp, Users, Settings, PlusCircle
} from "lucide-react";

export default function HesabimPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profil");

  useEffect(() => {
    const getInitialData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(prof);
      }
      setLoading(false);
    };
    getInitialData();
  }, []);

  const isOwner = profile?.role === 'business_owner';

  const handleDeleteAccount = async () => {
    const confirmDelete = confirm("HESABINI SİLMEK İSTEDİĞİNE EMİN MİSİN? Bu işlem geri alınamaz.");
    if (confirmDelete) {
      setLoading(true);
      await supabase.from('profiles').delete().eq('id', user.id);
      await supabase.auth.signOut();
      window.location.href = "/";
    }
  };

  if (loading) return (
    <div className="h-screen bg-[#0a0a0a] flex items-center justify-center font-black uppercase tracking-widest text-[#00A3AD] italic animate-pulse">
      Yükleniyor...
    </div>
  );

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />

      <div className="max-w-[1200px] mx-auto pt-44 pb-20 px-10 flex flex-col lg:flex-row gap-10">

        {/* SOL PANEL */}
        <aside className="w-full lg:w-80 space-y-4">
          {/* Avatar Kart */}
          <div className="bg-[#141414] border border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-[#00A3AD] flex items-center justify-center text-3xl font-black text-white shadow-xl mb-4 uppercase">
              {profile?.first_name?.[0] || user?.email?.[0]}
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">
              {profile?.first_name} {profile?.last_name}
            </h2>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
              {user?.email}
            </p>
            {isOwner && (
              <span className="mt-4 px-4 py-1.5 bg-[#00A3AD]/10 text-[#00A3AD] text-[9px] font-black uppercase rounded-full border border-[#00A3AD]/20">
                İşletme Sahibi
              </span>
            )}
          </div>

          {/* Nav */}
          <nav className="bg-[#141414] border border-white/5 rounded-[2.5rem] overflow-hidden p-2 space-y-1">
            <button
              onClick={() => setActiveTab("profil")}
              className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${activeTab === 'profil' ? 'bg-[#00A3AD] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <div className="flex items-center gap-3">
                <User size={16} />
                <span className="text-[11px] font-black uppercase tracking-widest">Profil Bilgileri</span>
              </div>
              <ChevronRight size={14} />
            </button>

            {isOwner && (
              <>
                <button
                  onClick={() => setActiveTab("isletme-yonetimi")}
                  className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${activeTab === 'isletme-yonetimi' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <div className="flex items-center gap-3">
                    <Store size={16} />
                    <span className="text-[11px] font-black uppercase tracking-widest">İşletme Yönetimi</span>
                  </div>
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setActiveTab("isletme-randevular")}
                  className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${activeTab === 'isletme-randevular' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <div className="flex items-center gap-3">
                    <Calendar size={16} />
                    <span className="text-[11px] font-black uppercase tracking-widest">Gelen Randevular</span>
                  </div>
                  <ChevronRight size={14} />
                </button>
              </>
            )}

            {!isOwner && (
              <button
                onClick={() => setActiveTab("randevularim")}
                className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${activeTab === 'randevularim' ? 'bg-[#00A3AD] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                <div className="flex items-center gap-3">
                  <Calendar size={16} />
                  <span className="text-[11px] font-black uppercase tracking-widest">Randevularım</span>
                </div>
                <ChevronRight size={14} />
              </button>
            )}

            <button
              onClick={() => setActiveTab("guvenlik")}
              className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${activeTab === 'guvenlik' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <div className="flex items-center gap-3">
                <Shield size={16} />
                <span className="text-[11px] font-black uppercase tracking-widest">Güvenlik</span>
              </div>
              <ChevronRight size={14} />
            </button>
          </nav>

          <button
            onClick={handleDeleteAccount}
            className="w-full flex items-center gap-3 px-8 py-4 text-red-500 hover:bg-red-500/10 rounded-[2rem] transition-all border border-red-500/10"
          >
            <Trash2 size={16} />
            <span className="text-[11px] font-black uppercase tracking-widest">Hesabı Sil</span>
          </button>
        </aside>

        {/* SAĞ İÇERİK */}
        <section className="flex-1">

          {/* TAB: PROFİL */}
          {activeTab === "profil" && (
            <div className="bg-[#141414] border border-white/5 rounded-[3.5rem] p-12 animate-in fade-in duration-500">
              <header className="mb-12">
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Profil Bilgileri</h1>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">Kişisel detaylarını buradan yönetebilirsin.</p>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-16">
                {[
                  { label: "Ad", value: profile?.first_name },
                  { label: "Soyad", value: profile?.last_name },
                  { label: "E-Posta", value: user?.email, muted: true },
                  { label: "Telefon", value: profile?.phone },
                  { label: "Yaş", value: profile?.age }
                ].map((field, i) => (
                  <div key={i} className="space-y-2">
                    <label className="text-[10px] font-black text-[#00A3AD] uppercase tracking-widest">{field.label}</label>
                    <p className={`text-lg font-bold border-b border-white/5 pb-3 ${field.muted ? 'text-gray-500' : 'text-white'}`}>
                      {field.value || "-"}
                    </p>
                  </div>
                ))}
              </div>
              <button className="mt-14 bg-white text-black px-12 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-[#00A3AD] hover:text-white transition-all shadow-xl">
                Bilgileri Güncelle
              </button>
            </div>
          )}

          {/* TAB: İŞLETME YÖNETİMİ */}
          {activeTab === "isletme-yonetimi" && isOwner && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#00A3AD]/10 border border-[#00A3AD]/20 p-8 rounded-[2.5rem]">
                  <TrendingUp className="mb-4 text-[#00A3AD]" size={24} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Aylık Kazanç</p>
                  <h4 className="text-4xl font-black mt-2 text-white tracking-tighter">₺12.450</h4>
                </div>
                <div className="bg-[#141414] border border-white/5 p-8 rounded-[2.5rem]">
                  <Users className="mb-4 text-[#00A3AD]" size={24} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Aktif Müşteriler</p>
                  <h4 className="text-4xl font-black mt-2 text-white tracking-tighter">128</h4>
                </div>
                <div className="bg-[#141414] border border-white/5 p-8 rounded-[2.5rem]">
                  <Calendar className="mb-4 text-[#00A3AD]" size={24} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Yeni Randevu</p>
                  <h4 className="text-4xl font-black mt-2 text-white tracking-tighter">14</h4>
                </div>
              </div>

              <div className="bg-[#141414] border border-white/5 rounded-[3.5rem] p-12">
                <h3 className="text-2xl font-black uppercase tracking-tighter text-white mb-8">Hızlı İşlemler</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-white/5 rounded-[2rem] flex justify-between items-center group cursor-pointer hover:bg-white/10 transition-all border border-white/5">
                    <span className="font-black uppercase text-[11px] tracking-widest text-gray-300">Dükkan Durumu (Açık)</span>
                    <div className="w-12 h-6 bg-[#00A3AD] rounded-full relative">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div className="p-6 bg-white/5 rounded-[2rem] flex justify-between items-center group cursor-pointer hover:bg-white/10 transition-all border border-white/5">
                    <span className="font-black uppercase text-[11px] tracking-widest text-gray-300">Yeni Hizmet Ekle</span>
                    <PlusCircle size={20} className="text-[#00A3AD]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "randevularim" && (
            <div className="bg-[#141414] border border-white/5 rounded-[3.5rem] p-12 text-center py-40">
              <p className="font-black uppercase text-gray-600 tracking-[0.3em] italic">Randevu geçmişin temiz.</p>
            </div>
          )}
          {activeTab === "isletme-randevular" && (
            <div className="bg-[#141414] border border-white/5 rounded-[3.5rem] p-12 text-center py-40">
              <p className="font-black uppercase text-gray-600 tracking-[0.3em] italic">Henüz yeni randevu gelmedi.</p>
            </div>
          )}
          {activeTab === "guvenlik" && (
            <div className="bg-[#141414] border border-white/5 rounded-[3.5rem] p-12">
              <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Güvenlik</h1>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-12">Şifre ve hesap güvenliği.</p>
              <button className="bg-white text-black px-12 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-[#00A3AD] hover:text-white transition-all">
                Şifre Değiştir
              </button>
            </div>
          )}

        </section>
      </div>
    </main>
  );
}
