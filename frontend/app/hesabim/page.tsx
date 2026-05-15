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

  if (loading) return <div className="h-screen flex items-center justify-center font-black uppercase tracking-widest text-gray-400 italic animate-pulse">Yükleniyor...</div>;

  return (
    <main className="min-h-screen bg-[#F9F9F9] text-[#111]">
      <Navbar />

      <div className="max-w-[1200px] mx-auto pt-44 pb-20 px-10 flex flex-col lg:flex-row gap-16">
        
        {/* SOL PANEL (Sidebar) */}
        <aside className="w-full lg:w-80 space-y-8">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-[#00A3AD] flex items-center justify-center text-3xl font-black text-white shadow-xl mb-4 uppercase">
              {profile?.first_name?.[0] || user?.email?.[0]}
            </div>
            <h2 className="text-2xl font-black text-black uppercase tracking-tighter">
              {profile?.first_name} {profile?.last_name}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              {user?.email}
            </p>
            {isOwner && (
              <span className="mt-4 px-4 py-1 bg-[#E6F6F7] text-[#00A3AD] text-[9px] font-black uppercase rounded-full">
                İşletme Sahibi
              </span>
            )}
          </div>

          <nav className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-gray-100 p-2">
            <button 
              onClick={() => setActiveTab("profil")}
              className={`w-full flex items-center justify-between px-6 py-5 rounded-2xl transition-all ${activeTab === 'profil' ? 'bg-[#00A3AD] text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-4">
                <User size={18} />
                <span className="text-[11px] font-black uppercase tracking-widest">Profil Bilgileri</span>
              </div>
              <ChevronRight size={14} />
            </button>

            {/* SADECE İŞLETME SAHİPLERİNE GÖZÜKEN BUTONLAR */}
            {isOwner && (
              <>
                <button 
                  onClick={() => setActiveTab("isletme-yonetimi")}
                  className={`w-full flex items-center justify-between px-6 py-5 rounded-2xl transition-all mt-2 ${activeTab === 'isletme-yonetimi' ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <Store size={18} />
                    <span className="text-[11px] font-black uppercase tracking-widest">İşletme Yönetimi</span>
                  </div>
                  <ChevronRight size={14} />
                </button>
                <button 
                  onClick={() => setActiveTab("isletme-randevular")}
                  className={`w-full flex items-center justify-between px-6 py-5 rounded-2xl transition-all mt-2 ${activeTab === 'isletme-randevular' ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <Calendar size={18} />
                    <span className="text-[11px] font-black uppercase tracking-widest">Gelen Randevular</span>
                  </div>
                  <ChevronRight size={14} />
                </button>
              </>
            )}

            {!isOwner && (
               <button 
               onClick={() => setActiveTab("randevularim")}
               className={`w-full flex items-center justify-between px-6 py-5 rounded-2xl transition-all mt-2 ${activeTab === 'randevularim' ? 'bg-[#00A3AD] text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
             >
               <div className="flex items-center gap-4">
                 <Calendar size={18} />
                 <span className="text-[11px] font-black uppercase tracking-widest">Randevularım</span>
               </div>
               <ChevronRight size={14} />
             </button>
            )}

            <button 
              onClick={() => setActiveTab("guvenlik")}
              className={`w-full flex items-center justify-between px-6 py-5 rounded-2xl transition-all mt-2 ${activeTab === 'guvenlik' ? 'bg-gray-100 text-black' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-4">
                <Shield size={18} />
                <span className="text-[11px] font-black uppercase tracking-widest">Güvenlik</span>
              </div>
              <ChevronRight size={14} />
            </button>
          </nav>

          <button onClick={handleDeleteAccount} className="w-full flex items-center gap-4 px-8 py-5 text-red-400 hover:bg-red-50 rounded-[2.5rem] transition-all group">
            <Trash2 size={18} />
            <span className="text-[11px] font-black uppercase tracking-widest text-left">Hesabı Sil</span>
          </button>
        </aside>

        {/* SAĞ İÇERİK ALANI */}
        <section className="flex-1">
          
          {/* TAB: PROFİL BİLGİLERİ */}
          {activeTab === "profil" && (
            <div className="bg-white rounded-[3.5rem] p-16 shadow-2xl border border-gray-100 animate-in fade-in duration-500">
              <header className="mb-12">
                <h1 className="text-4xl font-black text-black uppercase tracking-tighter mb-2">Profil Bilgileri</h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] italic">Kişisel detaylarını buradan yönetebilirsin.</p>
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
                    <p className={`text-lg font-bold border-b-2 border-gray-50 pb-3 ${field.muted ? 'text-gray-400' : 'text-black'}`}>
                      {field.value || "-"}
                    </p>
                  </div>
                ))}
              </div>
              <button className="mt-16 bg-black text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-[#00A3AD] transition-all shadow-xl">Bilgileri Güncelle</button>
            </div>
          )}

          {/* TAB: İŞLETME YÖNETİMİ (SADECE PATRONLAR) */}
          {activeTab === "isletme-yonetimi" && isOwner && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black text-white p-8 rounded-[2.5rem] shadow-2xl">
                  <TrendingUp className="mb-4 text-[#00A3AD]" size={28} />
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Aylık Kazanç</p>
                  <h4 className="text-4xl font-black mt-2 tracking-tighter">₺12.450</h4>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                  <Users className="mb-4 text-[#00A3AD]" size={28} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Aktif Müşteriler</p>
                  <h4 className="text-4xl font-black mt-2 text-black tracking-tighter">128</h4>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                  <Calendar className="mb-4 text-[#00A3AD]" size={28} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Yeni Randevu</p>
                  <h4 className="text-4xl font-black mt-2 text-black tracking-tighter">14</h4>
                </div>
              </div>

              <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl border border-gray-100">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-black">Hızlı İşlemler</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-8 bg-gray-50 rounded-[2rem] flex justify-between items-center group cursor-pointer hover:bg-black transition-all">
                    <span className="font-black uppercase text-[11px] tracking-widest text-gray-600 group-hover:text-white">Dükkan Durumu (Açık)</span>
                    <div className="w-12 h-6 bg-[#00A3AD] rounded-full relative"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
                  </div>
                  <div className="p-8 bg-gray-50 rounded-[2rem] flex justify-between items-center group cursor-pointer hover:bg-black transition-all">
                    <span className="font-black uppercase text-[11px] tracking-widest text-gray-600 group-hover:text-white">Yeni Hizmet Ekle</span>
                    <PlusCircle size={24} className="text-[#00A3AD]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DİĞER TABLAR İÇİN YER TUTUCULAR */}
          {activeTab === "randevularim" && <div className="text-center py-40 font-black uppercase text-gray-300 tracking-[0.3em] italic">Randevu geçmişin temiz.</div>}
          {activeTab === "isletme-randevular" && <div className="text-center py-40 font-black uppercase text-gray-300 tracking-[0.3em] italic">Henüz yeni randevu gelmedi.</div>}

        </section>
      </div>
    </main>
  );
}