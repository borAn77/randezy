"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import {
  TrendingUp, Users, Calendar, Settings, Plus, Edit3,
  Package, LayoutDashboard, Camera, Image as ImageIcon, UploadCloud,
  Clock, Trash2, Save, X, CheckCircle2, AlertCircle, ChevronDown, Star, MessageSquare
} from "lucide-react";

const cities = [
  "Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara","Antalya","Ardahan","Artvin",
  "Aydın","Balıkesir","Bartın","Batman","Bayburt","Bilecik","Bingöl","Bitlis","Bolu","Burdur",
  "Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan",
  "Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul",
  "İzmir","Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri","Kilis","Kırıkkale","Kırklareli",
  "Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Mardin","Mersin","Muğla","Muş",
  "Nevşehir","Niğde","Ordu","Osmaniye","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas",
  "Şanlıurfa","Şırnak","Tekirdağ","Tokat","Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak"
].sort();

const daysOfWeek = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [shop, setShop] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [shopHours, setShopHours] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [serviceForm, setServiceForm] = useState({ name: "", price: "", duration: "", image_url: "" });
  const [savingHours, setSavingHours] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [staff, setStaff] = useState<any[]>([]);
  const [staffForm, setStaffForm] = useState({ firstName: "", lastName: "", avatarUrl: "" });
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/'); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'business_owner') { router.replace('/'); return; }

    const { data: shopList } = await supabase
      .from('shops')
      .select('*, profiles(avatar_url, full_name)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1);
    const shopData = shopList?.[0] || null;

    if (shopData) {
      setShop(shopData);
      const [servicesRes, appointmentsRes, hoursRes, reviewsRes, staffRes] = await Promise.all([
        supabase.from('services').select('*').eq('shop_id', shopData.id).order('created_at', { ascending: false }),
        supabase.from('appointments').select('*, profiles(full_name, phone, email), staff(first_name, last_name)').eq('shop_id', shopData.id).order('appointment_date', { ascending: true }).order('appointment_time', { ascending: true }),
        supabase.from('shop_hours').select('*').eq('shop_id', shopData.id).order('day_of_week', { ascending: true }),
        supabase.from('reviews').select('*, profiles(full_name)').eq('shop_id', shopData.id).order('created_at', { ascending: false }),
        supabase.from('staff').select('*').eq('shop_id', shopData.id).order('created_at', { ascending: true }),
      ]);
      setServices(servicesRes.data || []);
      setAppointments(appointmentsRes.data || []);
      setReviews(reviewsRes.data || []);
      setStaff(staffRes.data || []);

      const hours = hoursRes.data || [];
      if (hours.length === 0) {
        setShopHours(daysOfWeek.map((day, i) => ({
          day_of_week: i === 6 ? 0 : i + 1,
          day_name: day,
          open_time: "09:00",
          close_time: "20:00",
          is_closed: false,
          shop_id: shopData.id,
        })));
      } else {
        const dayNames = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
        setShopHours(hours.map((h: any) => ({ ...h, day_name: dayNames[h.day_of_week] })));
      }
    } else {
      setShop(null);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  // Realtime subscription for appointments
  useEffect(() => {
    if (!shop?.id) return;
    const channel = supabase
      .channel(`appointments-${shop.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `shop_id=eq.${shop.id}` },
        () => fetchInitialData()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [shop?.id, fetchInitialData]);

  const handleFileUpload = async (file: File, folder: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('randezy_images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('randezy_images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err: any) {
      alert("Hata: " + err.message);
      return null;
    }
  };

  const handleServiceSubmit = async (e: any) => {
    e.preventDefault();
    if (!shop?.id) return;
    const payload = { shop_id: shop.id, name: serviceForm.name, price: parseFloat(serviceForm.price), duration: parseInt(serviceForm.duration), image_url: serviceForm.image_url };
    const { error } = editingService
      ? await supabase.from('services').update(payload).eq('id', editingService.id)
      : await supabase.from('services').insert([payload]);
    if (!error) { setIsServiceModalOpen(false); setEditingService(null); setServiceForm({ name: "", price: "", duration: "", image_url: "" }); fetchInitialData(); }
  };

  const updateAppointmentStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', id);
    if (!error) fetchInitialData();
  };

  const handleReject = async (id: string) => {
    const words = rejectReason.trim().split(/\s+/).filter(Boolean);
    if (words.length < 10) {
      setRejectError(`En az 10 kelime gerekli. Şu an: ${words.length} kelime.`);
      return;
    }
    await supabase.from('appointments').update({ status: 'İptal Edildi', cancel_reason: rejectReason.trim() }).eq('id', id);
    setRejectingId(null);
    setRejectReason("");
    setRejectError("");
    fetchInitialData();
  };

  const handleSettingsSubmit = async (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('profiles').upsert({ id: user.id, email: user.email, role: 'business_owner', full_name: fd.get('name') as string });

    // Mevcut dükkanı bul — yoksa yeni oluştur, varsa üzerine yaz
    let shopId = shop?.id;
    if (!shopId) {
      const { data: existing } = await supabase.from('shops').select('id').eq('owner_id', user.id).limit(1).maybeSingle();
      shopId = existing?.id;
    }

    const { error } = await supabase.from('shops').upsert({
      id: shopId,
      owner_id: user.id,
      name: fd.get('name') as string,
      legal_name: fd.get('legal_name') as string,
      mersis_no: fd.get('mersis_no') as string,
      tax_office: fd.get('tax_office') as string,
      tax_no: fd.get('tax_no') as string,
      category: shop?.category || 'BERBER',
      shop_phone: fd.get('phone') as string,
      description: fd.get('bio') as string,
      iban: fd.get('iban') as string,
      city: fd.get('city') as string,
      district: fd.get('district') as string,
      neighborhood: fd.get('neighborhood') as string,
      street: fd.get('street') as string,
      building_no: fd.get('building_no') as string,
    });

    if (!error) { alert("Ayarlar kaydedildi!"); fetchInitialData(); setActiveTab("overview"); }
    else { alert("Hata: " + error.message); }
  };

  const handleSaveHours = async () => {
    if (!shop?.id) return;
    setSavingHours(true);
    const hoursToUpsert = shopHours.map(h => ({
      shop_id: shop.id,
      day_of_week: h.day_of_week,
      open_time: h.open_time,
      close_time: h.close_time,
      is_closed: h.is_closed,
      ...(h.id ? { id: h.id } : {}),
    }));
    const { error } = await supabase.from('shop_hours').upsert(hoursToUpsert, { onConflict: 'shop_id,day_of_week' });
    setSavingHours(false);
    if (error) { alert("Hata: " + error.message); }
    else { alert("Çalışma saatleri kaydedildi!"); fetchInitialData(); }
  };

  const updateHour = (index: number, field: string, value: any) => {
    setShopHours(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
  };

  const handleStaffSubmit = async () => {
    if (!shop?.id || !staffForm.firstName.trim() || !staffForm.lastName.trim()) return;
    setSavingStaff(true);
    const { error } = await supabase.from('staff').insert([{
      shop_id: shop.id,
      first_name: staffForm.firstName.trim(),
      last_name: staffForm.lastName.trim(),
      avatar_url: staffForm.avatarUrl || null,
    }]);
    if (error) { alert("Hata: " + error.message); }
    else { setIsStaffModalOpen(false); fetchInitialData(); }
    setSavingStaff(false);
  };

  // Real metrics
  const confirmedAppointments = appointments.filter(a => a.status === 'Onaylandı');
  const totalRevenue = confirmedAppointments.reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0);
  const uniqueCustomers = new Set(appointments.map(a => a.user_id)).size;
  const pendingCount = appointments.filter(a => a.status === 'Beklemede').length;
  const pendingAppointments = appointments.filter(a => a.status === 'Beklemede');
  const otherAppointments = appointments.filter(a => a.status !== 'Beklemede');

  if (loading) return <div className="h-screen bg-black flex items-center justify-center font-black text-[#00A3AD] animate-pulse uppercase tracking-[0.5em]">RANDEZY.PRO YÜKLENİYOR...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-black">
      {/* SIDEBAR */}
      <aside className="w-72 bg-black fixed h-full flex flex-col p-8 z-50 shadow-2xl">
        <div className="mb-12"><h2 className="text-2xl font-black text-white tracking-tighter italic">RANDEZY<span className="text-[#00A3AD]">.PRO</span></h2><div className="h-[2px] w-8 bg-[#00A3AD] mt-1"></div></div>
        <nav className="flex-1 space-y-2">
          {[
            { id: "overview", label: "Dashboard", icon: <LayoutDashboard size={18}/> },
            { id: "branding", label: "Görsel Kimlik", icon: <Camera size={18}/> },
            { id: "appointments", label: "Randevular", icon: <Calendar size={18}/> },
            { id: "reviews", label: "Yorumlar", icon: <MessageSquare size={18}/> },
            { id: "services", label: "Hizmet Yönetimi", icon: <Package size={18}/> },
            { id: "hours", label: "Çalışma Saatleri", icon: <Clock size={18}/> },
            { id: "staff", label: "Personel", icon: <Users size={18}/> },
            { id: "finance", label: "Finans", icon: <TrendingUp size={18}/> },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === item.id ? "bg-[#00A3AD] text-white shadow-lg shadow-[#00A3AD]/20" : "text-gray-500 hover:text-white hover:bg-white/5"}`}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="pt-6 border-t border-white/10">
          <button onClick={() => setActiveTab("settings")} className={`w-full flex items-center gap-4 px-6 py-4 font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'text-[#00A3AD]' : 'text-gray-500 hover:text-white'}`}>
            <Settings size={18}/> Ayarlar
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-72 p-12 overflow-y-auto">
        <header className="flex justify-between items-center mb-16">
          <div className="relative w-96 opacity-50 pointer-events-none"><input type="text" placeholder="Arama yakında..." className="w-full pl-14 pr-6 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm outline-none font-bold text-xs" /></div>
          <div className="flex items-center gap-6 bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
            <div className="text-right">
              <p className="text-xs font-black uppercase text-black">{shop?.name || "Kurulum Bekliyor"}</p>
              <p className="text-[9px] font-bold text-[#00A3AD] uppercase tracking-widest">Premium İşletme</p>
            </div>
            <div className="w-10 h-10 bg-black rounded-xl overflow-hidden shadow-xl border-2 border-white">
               {shop?.profiles?.avatar_url ? <img src={shop.profiles.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#00A3AD] font-black">{shop?.name?.charAt(0) || "P"}</div>}
            </div>
          </div>
        </header>

        {!shop && activeTab !== "settings" ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-[#E6F6F7] rounded-full flex items-center justify-center mb-8"><AlertCircle size={40} className="text-[#00A3AD]" /></div>
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-4 italic text-black">Dükkan Verisi Bulunamadı</h2>
            <button onClick={() => setActiveTab("settings")} className="bg-black text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-[#00A3AD] transition-all">Dükkanı Kur</button>
          </div>
        ) : (
          <>
            {/* 1. OVERVIEW */}
            {activeTab === "overview" && (
              <div className="animate-in fade-in duration-500 grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                  <TrendingUp className="text-[#00A3AD] mb-4" size={24}/>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Toplam Kazanç</p>
                  <h3 className="text-4xl font-black text-black">₺{totalRevenue.toLocaleString('tr-TR')}</h3>
                  <p className="text-[9px] text-gray-300 mt-1 uppercase font-bold tracking-wider">Onaylanan randevulardan</p>
                </div>
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                  <Users className="text-[#00A3AD] mb-4" size={24}/>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Benzersiz Müşteri</p>
                  <h3 className="text-4xl font-black text-black">{uniqueCustomers}</h3>
                </div>
                <div className="bg-black text-white p-10 rounded-[3rem] shadow-2xl">
                  <Calendar className="text-[#00A3AD] mb-4" size={24}/>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bekleyen Randevu</p>
                  <h3 className="text-4xl font-black">{pendingCount}</h3>
                </div>
              </div>
            )}

            {/* 2. GÖRSEL KİMLİK */}
            {activeTab === "branding" && (
              <div className="animate-in slide-in-from-right-4 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm text-center">
                  <h4 className="text-[11px] font-black uppercase tracking-widest mb-6">Tabela & Dış Cephe</h4>
                  <div className="aspect-video bg-gray-50 rounded-3xl overflow-hidden mb-6 relative">{shop?.image_url ? <img src={shop.image_url} className="w-full h-full object-cover" /> : <ImageIcon className="absolute inset-0 m-auto text-gray-200" size={40} />}</div>
                  <label className="w-full flex items-center justify-center gap-3 py-5 bg-black text-white rounded-3xl font-black text-[10px] uppercase cursor-pointer hover:bg-[#00A3AD] transition-all"><UploadCloud size={16}/> Fotoğraf Yükle
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const url = await handleFileUpload(file, 'shop-covers');
                      if(url && shop?.id) { await supabase.from('shops').update({ image_url: url }).eq('id', shop.id); fetchInitialData(); }
                    }} />
                  </label>
                </div>
                <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm text-center">
                  <h4 className="text-[11px] font-black uppercase tracking-widest mb-6">İç Mekan Galerisi</h4>
                  <div className="grid grid-cols-2 gap-2 mb-6 h-32 overflow-hidden">
                    {(shop?.gallery_urls || []).slice(0, 4).map((url: string, i: number) => <img key={i} src={url} className="h-full w-full object-cover rounded-xl" />)}
                  </div>
                  <label className="w-full flex items-center justify-center gap-3 py-5 bg-black text-white rounded-3xl font-black text-[10px] uppercase cursor-pointer hover:bg-[#00A3AD] transition-all"><Plus size={16}/> Ekle
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const url = await handleFileUpload(file, 'gallery');
                      if(url && shop?.id) { const g = [...(shop.gallery_urls || []), url]; await supabase.from('shops').update({ gallery_urls: g }).eq('id', shop.id); fetchInitialData(); }
                    }} />
                  </label>
                </div>
              </div>
            )}

            {/* 3. RANDEVULAR */}
            {activeTab === "appointments" && (
              <div className="animate-in slide-in-from-right-4">
                <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 italic">Randevu Trafiği</h2>

                {appointments.length === 0 && (
                  <div className="py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100 text-gray-300 font-black uppercase text-xs tracking-widest italic">Henüz randevu talebi yok</div>
                )}

                {/* Bekleyen Talepler */}
                {pendingAppointments.length > 0 && (
                  <div className="mb-10">
                    <div className="flex items-center gap-3 mb-5">
                      <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Bekleyen Talepler</span>
                      <span className="min-w-[20px] h-5 px-1.5 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center text-[10px] font-black">{pendingAppointments.length}</span>
                    </div>
                    <div className="space-y-4">
                      {pendingAppointments.map((apt) => (
                        <div key={apt.id} className="bg-white rounded-[2.5rem] border border-orange-100 overflow-hidden group hover:border-orange-300 transition-all">
                          <div className="p-8 flex items-center justify-between">
                            <div className="flex items-center gap-8">
                              <div className="bg-black text-[#00A3AD] px-6 py-4 rounded-2xl font-black text-center flex-shrink-0">
                                <p className="text-[9px] uppercase opacity-50">{apt.appointment_date}</p>
                                <p className="text-lg">{apt.appointment_time?.slice(0,5) ?? "--:--"}</p>
                              </div>
                              <div>
                                <h4 className="text-xl font-black uppercase">{apt.profiles?.full_name || apt.profiles?.email || "Misafir"}</h4>
                                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                                  {apt.service_name}
                                  {apt.staff && <span className="text-[#00A3AD]"> • {apt.staff.first_name} {apt.staff.last_name}</span>}
                                  {(apt.profiles?.phone || apt.profiles?.email) && ` • ${apt.profiles?.phone || apt.profiles?.email}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0">
                              <span className="px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest bg-yellow-50 text-yellow-600">{apt.status}</span>
                              <div className="flex gap-2">
                                <button onClick={() => updateAppointmentStatus(apt.id, 'Onaylandı')} className="p-3 bg-black text-white rounded-xl hover:bg-green-600 transition-all" title="Onayla"><CheckCircle2 size={18}/></button>
                                <button onClick={() => { setRejectingId(rejectingId === apt.id ? null : apt.id); setRejectReason(""); setRejectError(""); }} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all" title="Reddet"><X size={18}/></button>
                              </div>
                            </div>
                          </div>
                          {rejectingId === apt.id && (
                            <div className="border-t border-red-100 bg-red-50 p-6 animate-in slide-in-from-top-2">
                              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3">Red Gerekçesi — En az 10 kelime yazın</p>
                              <textarea rows={3} placeholder="Müşteriye iletilecek red açıklamasını yazın..." className="w-full bg-white rounded-2xl p-4 text-sm font-bold text-black outline-none border-2 border-transparent focus:border-red-400 resize-none mb-2" value={rejectReason} onChange={e => { setRejectReason(e.target.value); setRejectError(""); }} />
                              {rejectError && <p className="text-[11px] font-bold text-red-500 mb-2">{rejectError}</p>}
                              <div className="flex gap-3">
                                <button onClick={() => handleReject(apt.id)} className="bg-red-500 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all">Reddet ve Gönder</button>
                                <button onClick={() => { setRejectingId(null); setRejectReason(""); setRejectError(""); }} className="bg-white text-gray-400 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:text-black transition-all">Vazgeç</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Onaylı & Geçmiş Randevular */}
                {otherAppointments.length > 0 && (
                  <div>
                    {pendingAppointments.length > 0 && (
                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex-1 h-px bg-gray-100"></div>
                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest px-2">Onaylı & Geçmiş</span>
                        <div className="flex-1 h-px bg-gray-100"></div>
                      </div>
                    )}
                    <div className="space-y-4">
                      {otherAppointments.map((apt) => (
                        <div key={apt.id} className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden group hover:border-[#00A3AD] transition-all">
                          <div className="p-8 flex items-center justify-between">
                            <div className="flex items-center gap-8">
                              <div className="bg-black text-[#00A3AD] px-6 py-4 rounded-2xl font-black text-center flex-shrink-0">
                                <p className="text-[9px] uppercase opacity-50">{apt.appointment_date}</p>
                                <p className="text-lg">{apt.appointment_time?.slice(0,5) ?? "--:--"}</p>
                              </div>
                              <div>
                                <h4 className="text-xl font-black uppercase">{apt.profiles?.full_name || apt.profiles?.email || "Misafir"}</h4>
                                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                                  {apt.service_name}
                                  {apt.staff && <span className="text-[#00A3AD]"> • {apt.staff.first_name} {apt.staff.last_name}</span>}
                                  {(apt.profiles?.phone || apt.profiles?.email) && ` • ${apt.profiles?.phone || apt.profiles?.email}`}
                                </p>
                                {apt.cancel_reason && <p className="text-[10px] font-bold text-red-400 mt-1 italic">Red gerekçesi: {apt.cancel_reason}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0">
                              <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${apt.status === 'Onaylandı' ? 'bg-green-50 text-green-600' : apt.status === 'İptal Edildi' ? 'bg-red-50 text-red-500' : 'bg-yellow-50 text-yellow-600'}`}>{apt.status}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3.5 YORUMLAR */}
            {activeTab === "reviews" && (
              <div className="animate-in slide-in-from-right-4">
                <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 italic">Müşteri Yorumları</h2>
                {reviews.length === 0 ? (
                  <div className="py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100 text-gray-300 font-black uppercase text-xs tracking-widest italic">Henüz yorum yapılmamış</div>
                ) : (
                  <div className="space-y-4">
                    {/* Ortalama */}
                    <div className="bg-black text-white p-8 rounded-[2.5rem] flex items-center gap-8 mb-6">
                      <div className="text-center">
                        <p className="text-5xl font-black text-[#00A3AD]">{(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}</p>
                        <p className="text-[9px] uppercase tracking-widest text-gray-400 mt-1">Ortalama Puan</p>
                      </div>
                      <div>
                        <div className="flex gap-1 mb-2">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={20} className={s <= Math.round(reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'} />
                          ))}
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{reviews.length} değerlendirme</p>
                      </div>
                    </div>

                    {reviews.map((r) => (
                      <div key={r.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-black text-base uppercase tracking-tight">{r.profiles?.full_name || "Anonim"}</p>
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} size={14} className={s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
                              ))}
                            </div>
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{new Date(r.created_at).toLocaleDateString('tr-TR')}</span>
                          </div>
                        </div>
                        {r.comment && <p className="text-gray-500 text-sm font-medium">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. HİZMET YÖNETİMİ */}
            {activeTab === "services" && (
              <div className="animate-in slide-in-from-right-4">
                <div className="flex justify-between items-center mb-12">
                  <h2 className="text-4xl font-black uppercase tracking-tighter italic">Servis & Portfolyo</h2>
                  <button onClick={() => { setEditingService(null); setServiceForm({ name: "", price: "", duration: "", image_url: "" }); setIsServiceModalOpen(true); }} className="bg-black text-white px-10 py-5 rounded-2xl font-black text-xs uppercase hover:bg-[#00A3AD] transition-all shadow-xl flex items-center gap-2"><Plus size={18} /> Yeni Ekle</button>
                </div>
                {services.length === 0 ? (
                  <div className="py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100 text-gray-300 font-black uppercase text-xs tracking-widest italic">Henüz hizmet eklemediniz</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {services.map((s) => (
                      <div key={s.id} className="bg-white rounded-[3.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500">
                        <div className="h-48 bg-gray-50">{s.image_url && <img src={s.image_url} className="w-full h-full object-cover" />}</div>
                        <div className="p-8">
                          <h4 className="font-black uppercase text-xl mb-2">{s.name}</h4>
                          <p className="text-[10px] font-black text-[#00A3AD] mb-8">₺{s.price} • {s.duration} DK</p>
                          <div className="flex gap-2">
                            <button onClick={() => { setEditingService(s); setServiceForm({ name: s.name, price: s.price.toString(), duration: s.duration.toString(), image_url: s.image_url }); setIsServiceModalOpen(true); }} className="flex-1 py-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1"><Edit3 size={14}/> Düzenle</button>
                            <button onClick={async () => { if(confirm("Silinsin mi?")) { await supabase.from('services').delete().eq('id', s.id); fetchInitialData(); } }} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18}/></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. ÇALIŞMA SAATLERİ */}
            {activeTab === "hours" && (
              <div className="animate-in slide-in-from-right-4 max-w-2xl">
                <h2 className="text-4xl font-black uppercase tracking-tighter italic mb-12">Çalışma Saatleri</h2>
                <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm space-y-4">
                  {shopHours.map((h, i) => (
                    <div key={i} className={`flex items-center justify-between p-6 rounded-[2rem] transition-all ${h.is_closed ? 'bg-gray-50 opacity-60' : 'border-2 border-gray-50'}`}>
                      <div className="flex items-center gap-4">
                        <button onClick={() => updateHour(i, 'is_closed', !h.is_closed)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${h.is_closed ? 'bg-gray-200 border-gray-200' : 'bg-[#00A3AD] border-[#00A3AD]'}`}>
                          {!h.is_closed && <CheckCircle2 size={14} className="text-white" />}
                        </button>
                        <span className="font-black uppercase text-[10px] tracking-widest w-24">{h.day_name}</span>
                      </div>
                      {!h.is_closed ? (
                        <div className="flex items-center gap-2">
                          <input type="time" className="bg-gray-100 p-2 rounded-lg text-xs font-bold text-black border-none focus:ring-1 ring-[#00A3AD]" value={h.open_time} onChange={(e) => updateHour(i, 'open_time', e.target.value)} />
                          <span className="text-gray-300 font-bold">–</span>
                          <input type="time" className="bg-gray-100 p-2 rounded-lg text-xs font-bold text-black border-none focus:ring-1 ring-[#00A3AD]" value={h.close_time} onChange={(e) => updateHour(i, 'close_time', e.target.value)} />
                        </div>
                      ) : (
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest italic">TATİL / KAPALI</span>
                      )}
                    </div>
                  ))}
                  <button onClick={handleSaveHours} disabled={savingHours} className="w-full bg-black text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs mt-4 hover:bg-[#00A3AD] transition-all flex items-center justify-center gap-3">
                    <Save size={18}/> {savingHours ? "Kaydediliyor..." : "Saatleri Kaydet"}
                  </button>
                </div>
              </div>
            )}

            {/* 6. PERSONEL */}
            {activeTab === "staff" && (
              <div className="animate-in slide-in-from-right-4">
                <div className="flex justify-between items-center mb-12">
                  <h2 className="text-4xl font-black uppercase tracking-tighter italic">Personel</h2>
                  {staff.length < 10 && (
                    <button onClick={() => { setStaffForm({ firstName: "", lastName: "", avatarUrl: "" }); setIsStaffModalOpen(true); }} className="bg-black text-white px-10 py-5 rounded-2xl font-black text-xs uppercase hover:bg-[#00A3AD] transition-all shadow-xl flex items-center gap-2"><Plus size={18} /> Personel Ekle</button>
                  )}
                </div>
                {staff.length === 0 ? (
                  <div className="py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100 text-gray-300 font-black uppercase text-xs tracking-widest italic">Henüz personel eklemediniz</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    {staff.map((s) => (
                      <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center gap-4 hover:shadow-xl transition-all">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-[#E6F6F7] border-4 border-white shadow-lg flex items-center justify-center">
                          {s.avatar_url ? <img src={s.avatar_url} className="w-full h-full object-cover" /> : <span className="text-2xl font-black text-[#00A3AD]">{s.first_name?.charAt(0)}</span>}
                        </div>
                        <div className="text-center">
                          <p className="font-black text-sm uppercase tracking-tight">{s.first_name}</p>
                          <p className="font-bold text-xs uppercase tracking-wider text-gray-400">{s.last_name}</p>
                        </div>
                        <button onClick={async () => { if(confirm("Personel silinsin mi?")) { await supabase.from('staff').delete().eq('id', s.id); fetchInitialData(); } }} className="p-2 text-red-400 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 7. FİNANS */}
            {activeTab === "finance" && (
              <div className="animate-in slide-in-from-right-4">
                <h2 className="text-4xl font-black uppercase tracking-tighter italic mb-12">Finans</h2>
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                  <TrendingUp size={48} className="text-gray-200 mb-6" />
                  <p className="font-black text-gray-300 uppercase tracking-widest italic text-sm">Yakında Geliyor</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* AYARLAR */}
        {activeTab === "settings" && (
          <div className="animate-in slide-in-from-bottom-4 max-w-5xl">
            <div className="bg-white rounded-[4rem] p-16 shadow-2xl border border-gray-100">
              <h2 className="text-4xl font-black uppercase tracking-tighter mb-10 italic underline decoration-[#00A3AD] decoration-8 underline-offset-8">Kurumsal Mühür</h2>
              <form className="space-y-10" onSubmit={handleSettingsSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tabela Adı</label><input name="name" defaultValue={shop?.name} required className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                  <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Resmi Ünvan</label><input name="legal_name" defaultValue={shop?.legal_name} required className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">MERSİS NO</label><input name="mersis_no" defaultValue={shop?.mersis_no} className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                  <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Vergi Dairesi</label><input name="tax_office" defaultValue={shop?.tax_office} className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                  <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Vergi No</label><input name="tax_no" defaultValue={shop?.tax_no} className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">İletişim Hattı</label><input name="phone" defaultValue={shop?.shop_phone} required className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                  <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">IBAN</label><input name="iban" defaultValue={shop?.iban} className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                </div>
                {/* ADRES */}
                <div className="border-t border-gray-100 pt-10">
                  <p className="text-[10px] font-black text-[#00A3AD] uppercase tracking-widest mb-6">Adres Bilgileri</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 relative">
                      <label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">İl</label>
                      <select name="city" defaultValue={shop?.city || ""} className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black appearance-none">
                        <option value="">İl Seçiniz</option>
                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-6 bottom-6 text-gray-400 pointer-events-none" size={18} />
                    </div>
                    <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">İlçe</label><input name="district" defaultValue={shop?.district} className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                    <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mahalle</label><input name="neighborhood" defaultValue={shop?.neighborhood} className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                    <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sokak / Cadde</label><input name="street" defaultValue={shop?.street} className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                    <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Bina No</label><input name="building_no" defaultValue={shop?.building_no} className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                  </div>
                </div>
                <button type="submit" className="w-full bg-black text-white py-8 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl hover:bg-[#00A3AD] transition-all flex items-center justify-center gap-4"><Save size={20} /> Kaydet ve Mühürle</button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* PERSONEL MODALI */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-md rounded-[4rem] p-12 relative animate-in zoom-in duration-300 text-black">
            <button onClick={() => setIsStaffModalOpen(false)} className="absolute top-10 right-10 text-gray-300 hover:text-black transition-colors"><X size={32}/></button>
            <h3 className="text-3xl font-black uppercase tracking-tighter mb-10">Personel Ekle</h3>
            <div className="flex flex-col items-center gap-6">
              <label className="relative cursor-pointer group">
                <div className="w-28 h-28 rounded-full overflow-hidden bg-[#E6F6F7] border-4 border-white shadow-xl flex items-center justify-center">
                  {staffForm.avatarUrl ? <img src={staffForm.avatarUrl} className="w-full h-full object-cover" /> : <span className="text-4xl font-black text-[#00A3AD]">{staffForm.firstName?.charAt(0) || "?"}</span>}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all rounded-full">
                  <UploadCloud size={24} className="text-white" />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]; if(!file) return;
                  const url = await handleFileUpload(file, 'staff-avatars');
                  if(url) setStaffForm(f => ({...f, avatarUrl: url}));
                }} />
              </label>
              <input placeholder="İsim" className="w-full p-6 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black" value={staffForm.firstName} onChange={e => setStaffForm(f => ({...f, firstName: e.target.value}))} />
              <input placeholder="Soyisim" className="w-full p-6 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black" value={staffForm.lastName} onChange={e => setStaffForm(f => ({...f, lastName: e.target.value}))} />
              <button onClick={handleStaffSubmit} disabled={savingStaff || !staffForm.firstName.trim() || !staffForm.lastName.trim()} className="w-full bg-[#00A3AD] text-white py-6 rounded-3xl font-black uppercase text-xs shadow-xl tracking-widest hover:bg-black transition-all disabled:opacity-30">
                {savingStaff ? "EKLENİYOR..." : "EKLE"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SERVİS MODALI */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-lg rounded-[4rem] p-12 relative animate-in zoom-in duration-300 text-black">
            <button onClick={() => setIsServiceModalOpen(false)} className="absolute top-10 right-10 text-gray-300 hover:text-black transition-colors"><X size={32}/></button>
            <h3 className="text-3xl font-black uppercase tracking-tighter mb-10">{editingService ? "Hizmeti Düzenle" : "Hizmet Ekle"}</h3>
            <form onSubmit={handleServiceSubmit} className="space-y-6">
              <div className="mb-4">
                {serviceForm.image_url ? <img src={serviceForm.image_url} className="h-40 w-full object-cover rounded-3xl" /> : (
                  <label className="flex flex-col items-center justify-center h-40 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl cursor-pointer hover:border-[#00A3AD] transition-all"><UploadCloud className="text-gray-300 mb-2" size={32} /><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Fotoğraf Yükle</span><input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if(!file) return; const url = await handleFileUpload(file, 'service-portfolios'); if(url) setServiceForm({...serviceForm, image_url: url}); }} /></label>
                )}
              </div>
              <input required placeholder="Hizmet Adı" className="w-full p-6 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black" value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-6">
                <input required type="number" placeholder="Fiyat (₺)" className="w-full p-6 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black" value={serviceForm.price} onChange={e => setServiceForm({...serviceForm, price: e.target.value})} />
                <input required type="number" placeholder="Süre (DK)" className="w-full p-6 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black" value={serviceForm.duration} onChange={e => setServiceForm({...serviceForm, duration: e.target.value})} />
              </div>
              <button className="w-full bg-[#00A3AD] text-white py-6 rounded-3xl font-black uppercase text-xs shadow-xl tracking-widest hover:bg-black transition-all">YAYINLA</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
