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
  const [shopData, setShopData] = useState<any>(null);
  const [userAppointments, setUserAppointments] = useState<any[]>([]);
  const [shopAppointments, setShopAppointments] = useState<any[]>([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);

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

        const { data: aptData } = await supabase
          .from('appointments')
          .select('*, shops(name, city, district)')
          .eq('user_id', session.user.id)
          .order('appointment_date', { ascending: true });
        setUserAppointments(aptData || []);

        if (prof?.role === 'business_owner') {
          const { data: shopRes } = await supabase
            .from('shops')
            .select('*')
            .eq('owner_id', session.user.id)
            .single();
          setShopData(shopRes);
          if (shopRes) {
            const { data: shopAptData } = await supabase
              .from('appointments')
              .select('*, profiles(full_name, phone, email)')
              .eq('shop_id', shopRes.id)
              .order('appointment_date', { ascending: false });
            setShopAppointments(shopAptData || []);
          }
        }
      }
      setLoading(false);
    };
    getInitialData();
  }, []);

  const isOwner = profile?.role === 'business_owner';

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const { error } = await supabase.from('profiles').update({
      first_name: editForm.firstName,
      last_name: editForm.lastName,
      full_name: `${editForm.firstName} ${editForm.lastName}`.trim(),
      phone: editForm.phone.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    setSavingProfile(false);
    if (!error) {
      setProfile({ ...profile, first_name: editForm.firstName, last_name: editForm.lastName, full_name: `${editForm.firstName} ${editForm.lastName}`.trim(), phone: editForm.phone.trim() || null });
      setIsEditingProfile(false);
    } else {
      alert("Güncelleme hatası: " + error.message);
    }
  };

  const handleToggleShopStatus = async () => {
    if (!shopData) return;
    const newStatus = !shopData.is_active;
    const { error } = await supabase.from('shops').update({ is_active: newStatus }).eq('id', shopData.id);
    if (!error) setShopData({ ...shopData, is_active: newStatus });
  };

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
  if (!user) { router.replace("/"); return null; }

  return (
    <main className="min-h-screen bg-[#F9F9F9] text-[#111]">
      <Navbar />

      <div className="max-w-[1200px] mx-auto pt-44 pb-20 px-10 flex flex-col lg:flex-row gap-16">
        
        {/* SOL PANEL (Sidebar) */}
        <aside className="w-full lg:w-80 space-y-8">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-[#00A3AD] flex items-center justify-center text-3xl font-black text-white shadow-xl mb-4 uppercase">
              {profile?.first_name?.[0] || profile?.full_name?.[0] || user?.email?.[0]}
            </div>
            <h2 className="text-2xl font-black text-black uppercase tracking-tighter">
              {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : (profile?.full_name || '')}
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
              {isEditingProfile ? (
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#00A3AD] uppercase tracking-widest">Ad</label>
                      <input required value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-gray-100 font-bold text-sm text-black focus:border-[#00A3AD] focus:bg-white outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#00A3AD] uppercase tracking-widest">Soyad</label>
                      <input required value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value})} className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-gray-100 font-bold text-sm text-black focus:border-[#00A3AD] focus:bg-white outline-none transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#00A3AD] uppercase tracking-widest">Telefon</label>
                    <input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-gray-100 font-bold text-sm text-black focus:border-[#00A3AD] focus:bg-white outline-none transition-all" />
                  </div>
                  <div className="flex gap-4 mt-8">
                    <button type="submit" disabled={savingProfile} className="flex-1 bg-black text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-[#00A3AD] transition-all shadow-xl disabled:opacity-50">
                      {savingProfile ? "Kaydediliyor..." : "Kaydet"}
                    </button>
                    <button type="button" onClick={() => setIsEditingProfile(false)} disabled={savingProfile} className="px-8 py-5 rounded-2xl font-black uppercase tracking-widest border-2 border-gray-100 text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50">İptal</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-16">
                    {[
                      { label: "Ad", value: profile?.first_name || profile?.full_name?.split(' ')[0] },
                      { label: "Soyad", value: profile?.last_name || profile?.full_name?.split(' ').slice(1).join(' ') },
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
                  <button onClick={() => { setEditForm({ firstName: profile?.first_name || '', lastName: profile?.last_name || '', phone: profile?.phone || '' }); setIsEditingProfile(true); }} className="mt-16 bg-black text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-[#00A3AD] transition-all shadow-xl">Bilgileri Güncelle</button>
                </>
              )}
            </div>
          )}

          {/* TAB: İŞLETME YÖNETİMİ (SADECE PATRONLAR) */}
          {activeTab === "isletme-yonetimi" && isOwner && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black text-white p-8 rounded-[2.5rem] shadow-2xl">
                  <TrendingUp className="mb-4 text-[#00A3AD]" size={28} />
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Toplam Kazanç</p>
                  <h4 className="text-4xl font-black mt-2 tracking-tighter">₺{shopAppointments.filter(a => a.status === 'Onaylandı').reduce((sum, a) => sum + (a.price || 0), 0).toLocaleString('tr-TR')}</h4>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                  <Users className="mb-4 text-[#00A3AD]" size={28} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Toplam Müşteri</p>
                  <h4 className="text-4xl font-black mt-2 text-black tracking-tighter">{new Set(shopAppointments.map(a => a.user_id).filter(Boolean)).size}</h4>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                  <Calendar className="mb-4 text-[#00A3AD]" size={28} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bekleyen Randevu</p>
                  <h4 className="text-4xl font-black mt-2 text-black tracking-tighter">{shopAppointments.filter(a => a.status === 'Beklemede').length}</h4>
                </div>
              </div>

              <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl border border-gray-100">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-black">Hızlı İşlemler</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div onClick={handleToggleShopStatus} className="p-8 bg-gray-50 rounded-[2rem] flex justify-between items-center group cursor-pointer hover:bg-black transition-all">
                    <span className="font-black uppercase text-[11px] tracking-widest text-gray-600 group-hover:text-white">Dükkan Durumu ({shopData?.is_active ? 'Açık' : 'Kapalı'})</span>
                    <div className={`w-12 h-6 rounded-full relative transition-colors ${shopData?.is_active ? 'bg-[#00A3AD]' : 'bg-gray-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${shopData?.is_active ? 'right-1' : 'left-1'}`}></div></div>
                  </div>
                  <div onClick={() => router.push('/dashboard')} className="p-8 bg-gray-50 rounded-[2rem] flex justify-between items-center group cursor-pointer hover:bg-black transition-all">
                    <span className="font-black uppercase text-[11px] tracking-widest text-gray-600 group-hover:text-white">Yeni Hizmet Ekle</span>
                    <PlusCircle size={24} className="text-[#00A3AD]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "randevularim" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 text-black italic">Randevularım</h2>
              {userAppointments.length === 0 ? (
                <div className="text-center py-40 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 font-black uppercase text-gray-300 tracking-[0.3em] italic">Henüz randevun yok.</div>
              ) : userAppointments.map((apt) => (
                <div key={apt.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex justify-between items-center group hover:border-[#00A3AD] transition-all">
                  <div className="flex gap-6 items-center">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex flex-col items-center justify-center border border-gray-100">
                      <span className="text-[10px] font-black text-[#00A3AD] uppercase">{apt.appointment_date?.split('-')[1]}</span>
                      <span className="text-lg font-black text-black">{apt.appointment_date?.split('-')[2]}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-black uppercase text-black">{apt.service_name}</h3>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">{apt.shops?.name} • {apt.appointment_time?.slice(0,5)} • {apt.appointment_date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-xl font-black text-black">{apt.price} TL</span>
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full mt-2 inline-block ${apt.status === 'Onaylandı' ? 'text-green-600 bg-green-50' : apt.status === 'İptal Edildi' ? 'text-red-500 bg-red-50' : 'text-orange-400 bg-orange-50'}`}>{apt.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "isletme-randevular" && isOwner && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 text-black italic">Gelen Randevular</h2>
              {shopAppointments.length === 0 ? (
                <div className="text-center py-40 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 font-black uppercase text-gray-300 tracking-[0.3em] italic">Henüz randevu gelmedi.</div>
              ) : shopAppointments.map((apt) => (
                <div key={apt.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex justify-between items-center group hover:border-[#00A3AD] transition-all">
                  <div className="flex gap-6 items-center">
                    <div className="bg-black text-[#00A3AD] px-5 py-3 rounded-2xl font-black text-center">
                      <p className="text-[9px] uppercase opacity-50">Saat</p>
                      <p className="text-lg">{apt.appointment_time?.slice(0,5)}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-black uppercase text-black">{apt.profiles?.full_name || apt.profiles?.email || "Misafir"}</h3>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">{apt.service_name} • {apt.appointment_date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-xl font-black text-black">{apt.price} TL</span>
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full mt-2 inline-block ${apt.status === 'Onaylandı' ? 'text-green-600 bg-green-50' : apt.status === 'İptal Edildi' ? 'text-red-500 bg-red-50' : 'text-orange-400 bg-orange-50'}`}>{apt.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </section>
      </div>
    </main>
  );
}