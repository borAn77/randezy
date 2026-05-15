"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { 
  TrendingUp, Users, Calendar, Settings, Plus, Edit3, MessageSquare, 
  Package, LayoutDashboard, Star, Bell, Search, ChevronRight, 
  Trash2, Save, X, CheckCircle2, AlertCircle, Camera, Image as ImageIcon, Info, UploadCloud, Clock, Phone
} from "lucide-react";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); 
  const [shop, setShop] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [serviceForm, setServiceForm] = useState({ name: "", price: "", duration: "", image_url: "" });

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: shopData } = await supabase
      .from('shops')
      .select('*, profiles(avatar_url, full_name)')
      .eq('owner_id', user.id)
      .single();
    
    if (shopData) {
      setShop(shopData);
      const [servicesRes, appointmentsRes] = await Promise.all([
        supabase.from('services').select('*').eq('shop_id', shopData.id).order('created_at', { ascending: false }),
        supabase.from('appointments').select('*, profiles(full_name, phone, email)').eq('shop_id', shopData.id).order('appointment_date', { ascending: false })
      ]);
      setServices(servicesRes.data || []);
      setAppointments(appointmentsRes.data || []);
    } else {
      setShop(null);
    }
    setLoading(false);
  }

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

  const handleServiceSubmit = async (e: React.FormEvent) => {
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

  const handleSettingsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('profiles').upsert({ id: user.id, email: user.email, role: 'business_owner', full_name: fd.get('name') as string });

    const { error } = await supabase.from('shops').upsert({
      id: shop?.id,
      owner_id: user.id,
      name: fd.get('name') as string,
      legal_name: fd.get('legal_name') as string,
      mersis_no: fd.get('mersis_no') as string,
      tax_office: fd.get('tax_office') as string,
      tax_no: fd.get('tax_no') as string,
      category: 'BERBER',
      shop_phone: fd.get('phone') as string,
      description: fd.get('bio') as string,
      iban: fd.get('iban') as string,
      city: 'İstanbul', district: 'Kadıköy', neighborhood: 'Moda', street: 'Güneş', building_no: '1'
    });

    if (!error) { alert("Tüm Veriler Mühürlendi!"); fetchInitialData(); setActiveTab("overview"); }
    else { alert("Hata: " + error.message); }
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center font-black text-[#00A3AD] animate-pulse uppercase tracking-[0.5em]">RANDEZY.PRO YÜKLENİYOR...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-black">
      {/* 🚀 SIDEBAR */}
      <aside className="w-72 bg-black fixed h-full flex flex-col p-8 z-50 shadow-2xl">
        <div className="mb-12"><h2 className="text-2xl font-black text-white tracking-tighter italic">RANDEZY<span className="text-[#00A3AD]">.PRO</span></h2><div className="h-[2px] w-8 bg-[#00A3AD] mt-1"></div></div>
        <nav className="flex-1 space-y-2">
          {[
            { id: "overview", label: "Dashboard", icon: <LayoutDashboard size={18}/> },
            { id: "branding", label: "Görsel Kimlik", icon: <Camera size={18}/> },
            { id: "appointments", label: "Randevular", icon: <Calendar size={18}/> },
            { id: "services", label: "Hizmet Yönetimi", icon: <Package size={18}/> }
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
          <div className="relative w-96"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} /><input type="text" placeholder="Hızlı arama..." className="w-full pl-14 pr-6 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm outline-none font-bold text-xs" /></div>
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
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-[#E6F6F7] rounded-full flex items-center justify-center mb-8"><AlertCircle size={40} className="text-[#00A3AD]" /></div>
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-4 italic text-black">Dükkan Verisi Bulunamadı</h2>
            <button onClick={() => setActiveTab("settings")} className="bg-black text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-[#00A3AD] transition-all">Dükkanı Kur</button>
          </div>
        ) : (
          <>
            {/* 1. OVERVIEW */}
            {activeTab === "overview" && (
               <div className="animate-in fade-in duration-500 grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                  <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm group hover:shadow-xl transition-all"><TrendingUp className="text-[#00A3AD] mb-4" size={24}/><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tahmini Kazanç</p><h3 className="text-4xl font-black text-black">₺12.450</h3></div>
                  <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm group hover:shadow-xl transition-all"><Users className="text-[#00A3AD] mb-4" size={24}/><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Müşteriler</p><h3 className="text-4xl font-black text-black">{appointments.length * 2 + 3}</h3></div>
                  <div className="bg-black text-white p-10 rounded-[3rem] shadow-2xl"><Calendar className="text-[#00A3AD] mb-4" size={24}/><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bekleyen Randevu</p><h3 className="text-4xl font-black">{appointments.filter(a => a.status === 'Beklemede').length}</h3></div>
               </div>
            )}

            {/* 2. GÖRSEL KİMLİK */}
            {activeTab === "branding" && (
               <div className="animate-in slide-in-from-right-4 grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm group text-center">
                    <h4 className="text-[11px] font-black uppercase tracking-widest mb-6">Tabela & Dış Cephe</h4>
                    <div className="aspect-video bg-gray-50 rounded-3xl overflow-hidden mb-6 relative">{shop?.image_url ? <img src={shop.image_url} className="w-full h-full object-cover" /> : <ImageIcon className="absolute inset-0 m-auto text-gray-200" size={40} />}</div>
                    <label className="w-full flex items-center justify-center gap-3 py-5 bg-black text-white rounded-3xl font-black text-[10px] uppercase cursor-pointer hover:bg-[#00A3AD] transition-all"><UploadCloud size={16}/> Fotoğraf Yükle
                       <input type="file" className="hidden" onChange={async (e) => {
                          const url = await handleFileUpload(e.target.files![0], 'shop-covers');
                          if(url && shop?.id) { await supabase.from('shops').update({ image_url: url }).eq('id', shop.id); fetchInitialData(); }
                       }} />
                    </label>
                  </div>
                  <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm group text-center">
                    <h4 className="text-[11px] font-black uppercase tracking-widest mb-6">İç Mekan Galerisi</h4>
                    <div className="grid grid-cols-2 gap-2 mb-6 h-32 overflow-hidden">
                       {shop?.gallery_urls?.slice(0, 4).map((url: string, i: number) => <img key={i} src={url} className="h-full w-full object-cover rounded-xl" />)}
                    </div>
                    <label className="w-full flex items-center justify-center gap-3 py-5 bg-black text-white rounded-3xl font-black text-[10px] uppercase cursor-pointer hover:bg-[#00A3AD] transition-all"><Plus size={16}/> Ekle
                       <input type="file" className="hidden" onChange={async (e) => {
                          const url = await handleFileUpload(e.target.files![0], 'gallery');
                          if(url && shop?.id) { const g = [...(shop.gallery_urls || []), url]; await supabase.from('shops').update({ gallery_urls: g }).eq('id', shop.id); fetchInitialData(); }
                       }} />
                    </label>
                  </div>
               </div>
            )}

            {/* 3. RANDEVULAR */}
            {activeTab === "appointments" && (
               <div className="animate-in slide-in-from-right-4 space-y-6">
                  <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 italic">Randevu Trafiği</h2>
                  {appointments.length > 0 ? appointments.map((apt) => (
                    <div key={apt.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 flex items-center justify-between group hover:border-[#00A3AD] transition-all">
                       <div className="flex items-center gap-8">
                          <div className="bg-black text-[#00A3AD] px-6 py-4 rounded-2xl font-black text-center">
                             <p className="text-[9px] uppercase opacity-50">Saat</p>
                             <p className="text-lg">{apt.appointment_time.slice(0,5)}</p>
                          </div>
                          <div>
                             <h4 className="text-xl font-black uppercase">{apt.profiles?.full_name || apt.profiles?.email || "Misafir"}</h4>
                             <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{apt.profiles?.phone || apt.profiles?.email} • {apt.appointment_date}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${apt.status === 'Onaylandı' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>{apt.status}</span>
                          {apt.status === 'Beklemede' && (
                            <div className="flex gap-2">
                               <button onClick={() => updateAppointmentStatus(apt.id, 'Onaylandı')} className="p-3 bg-black text-white rounded-xl hover:bg-green-600 transition-all"><CheckCircle2 size={18}/></button>
                               <button onClick={() => updateAppointmentStatus(apt.id, 'İptal Edildi')} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><X size={18}/></button>
                            </div>
                          )}
                       </div>
                    </div>
                  )) : (
                    <div className="py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100 text-gray-300 font-black uppercase text-xs tracking-widest italic">Henüz randevu talebi yok</div>
                  )}
               </div>
            )}

            {/* 4. HİZMET YÖNETİMİ */}
            {activeTab === "services" && (
               <div className="animate-in slide-in-from-right-4">
                  <div className="flex justify-between items-center mb-12"><h2 className="text-4xl font-black uppercase tracking-tighter italic">Servis & Portfolyo</h2><button onClick={() => { setEditingService(null); setServiceForm({ name: "", price: "", duration: "", image_url: "" }); setIsServiceModalOpen(true); }} className="bg-black text-white px-10 py-5 rounded-2xl font-black text-xs uppercase hover:bg-[#00A3AD] transition-all shadow-xl"><Plus size={18} /> Yeni Ekle</button></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     {services.map((s) => (
                       <div key={s.id} className="bg-white rounded-[3.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500">
                          <div className="h-48 bg-gray-50">{s.image_url && <img src={s.image_url} className="w-full h-full object-cover" />}</div>
                          <div className="p-8"><h4 className="font-black uppercase text-xl mb-2">{s.name}</h4><p className="text-[10px] font-black text-[#00A3AD] mb-8">₺{s.price} • {s.duration} DK</p>
                          <div className="flex gap-2">
                             <button onClick={() => { setEditingService(s); setServiceForm({ name: s.name, price: s.price.toString(), duration: s.duration.toString(), image_url: s.image_url }); setIsServiceModalOpen(true); }} className="flex-1 py-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase">Düzenle</button>
                             <button onClick={async () => { if(confirm("Silinsin mi?")) { await supabase.from('services').delete().eq('id', s.id); fetchInitialData(); } }} className="p-3 bg-red-50 text-red-500 rounded-xl"><Trash2 size={18}/></button>
                          </div></div>
                       </div>
                     ))}
                  </div>
               </div>
            )}
          </>
        )}

        {/* 5. AYARLAR */}
        {activeTab === "settings" && (
           <div className="animate-in slide-in-from-bottom-4 max-w-5xl">
              <div className="bg-white rounded-[4rem] p-16 shadow-2xl border border-gray-100">
                 <h2 className="text-4xl font-black uppercase tracking-tighter mb-4 italic underline decoration-[#00A3AD] decoration-8 underline-offset-8">Kurumsal Mühür</h2>
                 <form className="space-y-10" onSubmit={handleSettingsSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-black">Tabela Adı</label><input name="name" defaultValue={shop?.name} required className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                       <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-black">Resmi Ünvan</label><input name="legal_name" defaultValue={shop?.legal_name} required className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-black">MERSİS NO</label><input name="mersis_no" defaultValue={shop?.mersis_no} className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                       <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-black">Vergi Dairesi</label><input name="tax_office" defaultValue={shop?.tax_office} className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                       <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-black">Vergi No</label><input name="tax_no" defaultValue={shop?.tax_no} className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-black">İletişim Hattı</label><input name="phone" defaultValue={shop?.shop_phone} required className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                       <div className="space-y-2"><label className="ml-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-black">IBAN</label><input name="iban" defaultValue={shop?.iban} required className="p-6 bg-gray-50 rounded-3xl outline-none font-black text-sm border-2 border-transparent focus:border-[#00A3AD] w-full text-black" /></div>
                    </div>
                    <button type="submit" className="w-full bg-black text-white py-8 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl hover:bg-[#00A3AD] transition-all flex items-center justify-center gap-4"><Save size={20} /> Kaydet ve Mühürle</button>
                 </form>
              </div>
           </div>
        )}
      </main>

      {/* SERVİS MODALI */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-lg rounded-[4rem] p-12 relative animate-in zoom-in duration-300 text-black">
             <button onClick={() => setIsServiceModalOpen(false)} className="absolute top-10 right-10 text-gray-300 hover:text-black transition-colors"><X size={32}/></button>
             <h3 className="text-3xl font-black uppercase tracking-tighter mb-10">Hizmet Ekle</h3>
             <form onSubmit={handleServiceSubmit} className="space-y-6">
                <div className="mb-4">
                   {serviceForm.image_url ? <img src={serviceForm.image_url} className="h-40 w-full object-cover rounded-3xl" /> : (
                      <label className="flex flex-col items-center justify-center h-40 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl cursor-pointer hover:border-[#00A3AD] transition-all"><UploadCloud className="text-gray-300 mb-2" size={32} /><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">İşini Yükle</span><input type="file" className="hidden" onChange={async (e) => { const url = await handleFileUpload(e.target.files![0], 'service-portfolios'); if(url) setServiceForm({...serviceForm, image_url: url}); }} /></label>
                   )}
                </div>
                <input required placeholder="Hizmet Adı" className="w-full p-6 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black" value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-6"><input required type="number" placeholder="Fiyat (₺)" className="w-full p-6 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black" value={serviceForm.price} onChange={e => setServiceForm({...serviceForm, price: e.target.value})} /><input required type="number" placeholder="Süre (DK)" className="w-full p-6 bg-gray-50 rounded-3xl font-black text-sm outline-none border-2 border-transparent focus:border-[#00A3AD] text-black" value={serviceForm.duration} onChange={e => setServiceForm({...serviceForm, duration: e.target.value})} /></div>
                <button className="w-full bg-[#00A3AD] text-white py-6 rounded-3xl font-black uppercase text-xs shadow-xl tracking-widest">YAYINLA</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}