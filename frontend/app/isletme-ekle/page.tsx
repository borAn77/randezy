"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/layout/Navbar";
import { 
  ChevronRight, Store, MapPin, CheckCircle2, 
  ChevronDown, ReceiptText, CreditCard, X, 
  Clock, Plus, Trash2, Save 
} from "lucide-react";
import { supabase } from "../../lib/supabase";

// 🇹🇷 81 İl – Tam ve Alfabetik Liste (Hatalar temizlendi)
const cities = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir", 
  "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", 
  "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", 
  "Hakkari", "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", 
  "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", 
  "Nevşehir", "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat", 
  "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman", 
  "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"
].sort();

const categories = [
  "KUAFÖR", "BERBER", "GÜZELLİK MERKEZİ", "TIRNAK", 
  "FİZYOTERAPİ", "KAŞ VE KİRPİK", "MASAJ", "DÖVME"
];

const daysOfWeek = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export default function IsletmeEkle() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    category: "", shopName: "", officialTitle: "",
    city: "", district: "", neighborhood: "", street: "", buildingNo: "", doorNo: "",
    vergiDairesi: "", vergiNo: "", mersisNo: ""
  });

  const [services, setServices] = useState<any[]>([]);
  const [newService, setNewService] = useState({ name: "", price: "", duration: "30" });

  const [hours, setHours] = useState(
    daysOfWeek.map((day, index) => ({
      day_of_week: index + 1,
      day_name: day,
      open_time: "09:00",
      close_time: "20:00",
      is_closed: false
    }))
  );

  const addService = () => {
    if (newService.name && newService.price) {
      setServices([...services, newService]);
      setNewService({ name: "", price: "", duration: "30" });
    }
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const toggleDay = (index: number) => {
    const newHours = [...hours];
    newHours[index].is_closed = !newHours[index].is_closed;
    setHours(newHours);
  };

  const handleHourChange = (index: number, field: string, value: string) => {
    const newHours = [...hours];
    (newHours[index] as any)[field] = value;
    setHours(newHours);
  };

  // --- 🚀 SUPABASE KAYIT & RÜTBE GÜNCELLEME ---
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Oturum bulunamadı. Lütfen giriş yapın.");

      // 1. İşletmeyi Kaydet
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .insert([{
          owner_id: user.id,
          name: formData.shopName,
          legal_name: formData.officialTitle,
          category: formData.category,
          city: formData.city,
          district: formData.district,
          neighborhood: formData.neighborhood,
          street: formData.street,
          building_no: formData.buildingNo,
          door_no: formData.doorNo,
          tax_office: formData.vergiDairesi,
          tax_no: formData.vergiNo,
          mersis_no: formData.mersisNo
        }])
        .select()
        .single();

      if (shopError) throw shopError;

      // 2. 🔥 ROLÜ GÜNCELLE (Müşteriyi İşletme Sahibi Yap)
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: 'business_owner' })
        .eq('id', user.id);

      if (roleError) throw roleError;

      // 3. Hizmetleri Kaydet
      const servicesToInsert = services.map(s => ({
        shop_id: shop.id,
        name: s.name,
        price: parseFloat(s.price),
        duration: parseInt(s.duration)
      }));
      await supabase.from('services').insert(servicesToInsert);

      // 4. Çalışma Saatlerini Kaydet
      const hoursToInsert = hours.map(h => ({
        shop_id: shop.id,
        day_of_week: h.day_of_week === 7 ? 0 : h.day_of_week,
        open_time: h.open_time,
        close_time: h.close_time,
        is_closed: h.is_closed
      }));
      await supabase.from('shop_hours').insert(hoursToInsert);

      router.push('/dashboard');

    } catch (err: any) {
      setSubmitError(err.message || "Bir hata oluştu, lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid = formData.category && formData.shopName && formData.city && formData.district && formData.street;

  return (
    <main className="min-h-screen bg-[#F9F9F9] text-[#111] pb-20">
      <Navbar />
      
      <div className="max-w-4xl mx-auto pt-40 px-6">
        {/* STEPPER */}
        <div className="flex items-center justify-between mb-16 relative">
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gray-200 -z-10"></div>
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`flex items-center justify-center w-10 h-10 rounded-full font-black text-xs border-4 transition-all duration-500
              ${s === step ? 'bg-[#00A3AD] border-[#E6F6F7] text-white scale-125' : 
                s < step ? 'bg-black border-black text-white' : 'bg-white border-gray-100 text-gray-300'}`}>
              {s < step ? <CheckCircle2 size={16} /> : s}
            </div>
          ))}
        </div>

        {/* STEP 1: KİMLİK & ADRES */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-black uppercase tracking-tighter mb-4 text-black">İşletmeni Tanımla</h1>
              <p className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.3em]">ADIM 1: KATEGORİ VE ADRES</p>
            </div>
            <div className="bg-white rounded-[3.5rem] shadow-2xl p-12 md:p-16 border border-gray-100">
              <section className="mb-16">
                <h3 className="text-[11px] font-black text-[#00A3AD] uppercase tracking-[0.4em] mb-8 flex items-center gap-2"><Store size={14} /> İşletme Türü</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {categories.map((cat) => (
                    <button key={cat} onClick={() => setFormData({...formData, category: cat})}
                      className={`py-5 px-2 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest border-2 transition-all duration-300
                        ${formData.category === cat ? 'border-[#00A3AD] bg-[#E6F6F7] text-[#00A3AD]' : 'border-gray-100 text-gray-500 hover:border-gray-300'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                <input type="text" placeholder="Tabela Adı" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-6 text-sm font-bold text-black outline-none focus:border-[#00A3AD] focus:bg-white transition-all" value={formData.shopName} onChange={(e) => setFormData({...formData, shopName: e.target.value})} />
                <input type="text" placeholder="Resmi Ünvan" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-6 text-sm font-bold text-black outline-none focus:border-[#00A3AD] focus:bg-white transition-all" value={formData.officialTitle} onChange={(e) => setFormData({...formData, officialTitle: e.target.value})} />
              </section>

              <section className="space-y-6">
                 <div className="grid grid-cols-2 gap-4 text-black font-bold">
                    <div className="relative">
                      <select className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-6 text-sm font-bold text-black appearance-none outline-none focus:border-[#00A3AD]" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})}>
                          <option value="">İl Seçiniz</option>
                          {cities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                    </div>
                    <input placeholder="İlçe" className="bg-gray-50 border-2 border-gray-100 rounded-2xl p-6 text-sm font-bold text-black outline-none focus:border-[#00A3AD] focus:bg-white" value={formData.district} onChange={(e) => setFormData({...formData, district: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <input placeholder="Mahalle" className="bg-gray-50 border-2 border-gray-100 rounded-2xl p-6 text-sm font-bold text-black outline-none focus:border-[#00A3AD] focus:bg-white" onChange={(e) => setFormData({...formData, neighborhood: e.target.value})} />
                    <input placeholder="Sokak / Cadde" className="bg-gray-50 border-2 border-gray-100 rounded-2xl p-6 text-sm font-bold text-black outline-none focus:border-[#00A3AD] focus:bg-white" onChange={(e) => setFormData({...formData, street: e.target.value})} />
                 </div>
              </section>

              <button disabled={!isStep1Valid} onClick={() => setStep(2)} className="w-full bg-black text-white py-8 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] mt-12 hover:bg-[#00A3AD] transition-all disabled:opacity-20 shadow-2xl">Yasal Bilgilere Geç</button>
            </div>
          </div>
        )}

        {/* STEP 2: YASAL BİLGİLER */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-black uppercase tracking-tighter mb-4 text-black">Yasal Bilgiler</h1>
              <p className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.3em]">ADIM 2: BAKANLIK VE FİNANS</p>
            </div>
            <div className="bg-white rounded-[3.5rem] shadow-2xl p-12 md:p-16 border border-gray-100">
              <section className="space-y-8">
                <input placeholder="Vergi Dairesi" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-6 text-sm font-bold text-black outline-none focus:border-[#00A3AD] focus:bg-white" onChange={(e) => setFormData({...formData, vergiDairesi: e.target.value})} />
                <input placeholder="Vergi Numarası" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-6 text-sm font-bold text-black outline-none focus:border-[#00A3AD] focus:bg-white" onChange={(e) => setFormData({...formData, vergiNo: e.target.value})} />
              </section>
              <div className="grid grid-cols-2 gap-6 mt-12">
                <button onClick={() => setStep(1)} className="py-8 rounded-[2rem] font-black text-xs uppercase text-gray-400 border-2 border-gray-100 hover:bg-gray-50 transition-all">Geri Dön</button>
                <button onClick={() => setStep(3)} className="bg-black text-white py-8 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] hover:bg-[#00A3AD] transition-all">Hizmet Ekle</button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: HİZMETLER */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-12 text-black">
              <h1 className="text-5xl font-black uppercase tracking-tighter mb-4">Hizmetlerin</h1>
              <p className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.3em]">ADIM 3: MENÜ VE FİYATLANDIRMA</p>
            </div>
            <div className="bg-white rounded-[3.5rem] shadow-2xl p-12 md:p-16 border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-gray-50 p-6 rounded-3xl">
                <input placeholder="Hizmet Adı" className="bg-white border-2 border-gray-100 rounded-2xl p-4 text-sm font-bold text-black outline-none" value={newService.name} onChange={(e) => setNewService({...newService, name: e.target.value})} />
                <select className="bg-white border-2 border-gray-100 rounded-2xl p-4 text-sm font-bold text-black outline-none" value={newService.duration} onChange={(e) => setNewService({...newService, duration: e.target.value})}>
                    <option value="30">30 DK</option>
                    <option value="60">60 DK</option>
                    <option value="90">90 DK</option>
                </select>
                <div className="relative">
                  <input placeholder="Fiyat" className="w-full bg-white border-2 border-gray-100 rounded-2xl p-4 text-sm font-bold text-black outline-none" value={newService.price} onChange={(e) => setNewService({...newService, price: e.target.value})} />
                  <button onClick={addService} className="absolute right-2 top-2 bottom-2 bg-black text-white px-4 rounded-xl text-[10px] font-black hover:bg-[#00A3AD] transition-all">EKLE</button>
                </div>
              </div>
              <div className="space-y-3">
                {services.map((s, i) => (
                  <div key={i} className="flex justify-between p-6 bg-white border-2 border-gray-50 rounded-2xl items-center hover:border-gray-200 transition-all shadow-sm">
                    <span className="font-black text-xs uppercase tracking-widest text-black">{s.name} ({s.duration} DK)</span>
                    <div className="flex items-center gap-4 text-black">
                      <span className="font-black">{s.price} TL</span>
                      <button onClick={() => removeService(i)} className="text-red-500 hover:scale-110 transition-transform"><Trash2 size={18}/></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-6 mt-12">
                <button onClick={() => setStep(2)} className="py-8 rounded-[2rem] font-black text-xs uppercase text-gray-400 border-2 border-gray-100 hover:bg-gray-50">Geri Dön</button>
                <button disabled={services.length === 0} onClick={() => setStep(4)} className="bg-black text-white py-8 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] disabled:opacity-20 hover:bg-[#00A3AD] transition-all">Son Adım</button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: ÇALIŞMA SAATLERİ */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-12 text-black">
              <h1 className="text-5xl font-black uppercase tracking-tighter mb-4">Çalışma Saatleri</h1>
              <p className="text-gray-500 text-[11px] font-bold uppercase tracking-[0.3em]">ADIM 4: HAFTALIK PROGRAM</p>
            </div>
            <div className="bg-white rounded-[3.5rem] shadow-2xl p-12 md:p-16 border border-gray-100">
              <div className="space-y-4">
                {hours.map((h, i) => (
                  <div key={i} className={`flex items-center justify-between p-6 rounded-[2rem] transition-all ${h.is_closed ? 'bg-gray-50 opacity-50' : 'bg-white border-2 border-gray-50 shadow-sm'}`}>
                    <div className="flex items-center gap-4">
                      <button onClick={() => toggleDay(i)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${h.is_closed ? 'bg-gray-200 border-gray-200' : 'bg-[#00A3AD] border-[#00A3AD]'}`}>
                        {!h.is_closed && <CheckCircle2 size={14} className="text-white" />}
                      </button>
                      <span className="font-black uppercase text-[10px] tracking-widest text-black w-24">{h.day_name}</span>
                    </div>
                    {!h.is_closed ? (
                      <div className="flex items-center gap-2">
                        <input type="time" className="bg-gray-100 p-2 rounded-lg text-xs font-bold text-black border-none focus:ring-1 ring-[#00A3AD]" value={h.open_time} onChange={(e) => handleHourChange(i, 'open_time', e.target.value)} />
                        <span className="text-gray-300 font-bold">-</span>
                        <input type="time" className="bg-gray-100 p-2 rounded-lg text-xs font-bold text-black border-none focus:ring-1 ring-[#00A3AD]" value={h.close_time} onChange={(e) => handleHourChange(i, 'close_time', e.target.value)} />
                      </div>
                    ) : (
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest italic">TATİL / KAPALI</span>
                    )}
                  </div>
                ))}
              </div>
              {submitError && (
                <p className="mt-8 text-center text-sm font-bold text-red-500 bg-red-50 rounded-2xl p-4">{submitError}</p>
              )}
              <div className="grid grid-cols-2 gap-6 mt-12">
                <button onClick={() => setStep(3)} className="py-8 rounded-[2rem] font-black text-xs uppercase text-gray-400 border-2 border-gray-100 hover:bg-gray-50">Geri Dön</button>
                <button onClick={handleSubmit} disabled={loading} className="bg-[#00A3AD] text-white py-8 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3">
                  {loading ? "Veriler Mühürleniyor..." : <><Save size={18}/> İşletmeyi Yayına Al</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}