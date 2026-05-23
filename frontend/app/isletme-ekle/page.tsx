"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/layout/Navbar";
import { ChevronDown, CheckCircle2, ArrowRight, Store, Phone, MapPin } from "lucide-react";
import { supabase } from "../../lib/supabase";

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

const categories = [
  { id: "KUAFÖR", label: "Kuaför", emoji: "✂️" },
  { id: "BERBER", label: "Berber", emoji: "💈" },
  { id: "GÜZELLİK MERKEZİ", label: "Güzellik Merkezi", emoji: "💅" },
  { id: "TIRNAK", label: "Tırnak", emoji: "💅" },
  { id: "KAŞ VE KİRPİK", label: "Kaş & Kirpik", emoji: "👁️" },
  { id: "MASAJ", label: "Masaj", emoji: "🤲" },
  { id: "FİZYOTERAPİ", label: "Fizyoterapi", emoji: "🏥" },
  { id: "DÖVME", label: "Dövme", emoji: "🎨" },
];

export default function IsletmeEkle() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    category: "",
    shopName: "",
    phone: "",
    city: "",
    district: "",
    street: "",
  });

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const isValid = form.category && form.shopName.trim() && form.city && form.district.trim() && form.street.trim();

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Oturum bulunamadı. Lütfen giriş yapın.");

      const { error: shopError } = await supabase.from('shops').insert([{
        owner_id: user.id,
        name: form.shopName.trim(),
        category: form.category,
        shop_phone: form.phone.trim() || null,
        city: form.city,
        district: form.district.trim(),
        street: form.street.trim(),
        is_active: false,
      }]);
      if (shopError) throw shopError;

      await supabase.from('profiles').update({ role: 'business_owner' }).eq('id', user.id);

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu, lütfen tekrar deneyin.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F9F9F9] text-[#111] pb-24">
      <Navbar />

      <div className="max-w-2xl mx-auto pt-36 px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#E6F6F7] text-[#00A3AD] text-[10px] font-black uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-6">
            <Store size={12} /> Yeni İşletme
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter text-black mb-4 leading-tight">
            İşletmeni<br />Randezy'e Ekle
          </h1>
          <p className="text-gray-400 text-sm font-medium max-w-sm mx-auto leading-relaxed">
            Hızlı kayıt ol, geri kalanını dashboard'dan tamamla.
            Sadece temel bilgiler yeterli.
          </p>
        </div>

        {/* Sonrasında ne olacak? */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            { step: "1", text: "Temel bilgileri gir" },
            { step: "2", text: "Dashboard'dan profili tamamla" },
            { step: "3", text: "Yayına al, randevu al" },
          ].map((s) => (
            <div key={s.step} className="bg-white rounded-2xl p-4 border border-gray-100 text-center shadow-sm">
              <div className="w-7 h-7 rounded-full bg-black text-white text-[10px] font-black flex items-center justify-center mx-auto mb-2">{s.step}</div>
              <p className="text-[11px] font-bold text-gray-500 leading-tight">{s.text}</p>
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="bg-white rounded-[3rem] shadow-2xl p-10 md:p-14 border border-gray-100">

          {/* Kategori */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-1">
              <Store size={13} className="text-[#00A3AD]" />
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#00A3AD]">İşletme Türü</p>
            </div>
            <p className="text-[11px] text-gray-400 font-medium mb-5">Hizmet verdiğin kategoriyi seç</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => set('category', cat.id)}
                  className={`py-4 px-3 rounded-2xl text-[10px] font-black uppercase tracking-wider border-2 transition-all duration-200 flex flex-col items-center gap-1.5
                    ${form.category === cat.id
                      ? 'border-[#00A3AD] bg-[#E6F6F7] text-[#00A3AD]'
                      : 'border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  <span className="text-xl">{cat.emoji}</span>
                  {cat.label}
                  {form.category === cat.id && <CheckCircle2 size={12} className="text-[#00A3AD]" />}
                </button>
              ))}
            </div>
          </div>

          {/* İşletme adı */}
          <div className="mb-6">
            <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2 block">Tabela / İşletme Adı</label>
            <input
              type="text"
              placeholder="örn. Berber Ali, Studio Hera..."
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-5 text-sm font-bold text-black outline-none focus:border-[#00A3AD] focus:bg-white transition-all"
              value={form.shopName}
              onChange={e => set('shopName', e.target.value)}
            />
          </div>

          {/* Telefon */}
          <div className="mb-6">
            <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2 block flex items-center gap-1.5">
              <Phone size={11} /> İşletme Telefonu <span className="normal-case text-gray-300 font-medium">(isteğe bağlı)</span>
            </label>
            <input
              type="tel"
              placeholder="0212 555 00 00"
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-5 text-sm font-bold text-black outline-none focus:border-[#00A3AD] focus:bg-white transition-all"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
            />
          </div>

          {/* Konum */}
          <div className="mb-8">
            <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2 block flex items-center gap-1.5">
              <MapPin size={11} /> Konum
            </label>
            <div className="space-y-3">
              <div className="relative">
                <select
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-5 text-sm font-bold text-black appearance-none outline-none focus:border-[#00A3AD]"
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                >
                  <option value="">İl seçin</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <input
                type="text"
                placeholder="İlçe"
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-5 text-sm font-bold text-black outline-none focus:border-[#00A3AD] focus:bg-white transition-all"
                value={form.district}
                onChange={e => set('district', e.target.value)}
              />
              <input
                type="text"
                placeholder="Sokak / Cadde / Mahalle"
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-5 text-sm font-bold text-black outline-none focus:border-[#00A3AD] focus:bg-white transition-all"
                value={form.street}
                onChange={e => set('street', e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-2xl p-4 text-center">
              {error}
            </div>
          )}

          <button
            disabled={!isValid || loading}
            onClick={handleSubmit}
            className="w-full bg-black text-white py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.4em] hover:bg-[#00A3AD] transition-all disabled:opacity-25 shadow-2xl flex items-center justify-center gap-3"
          >
            {loading ? (
              <span className="animate-pulse">Oluşturuluyor...</span>
            ) : (
              <>İşletmemi Oluştur <ArrowRight size={16} /></>
            )}
          </button>

          <p className="text-center text-[10px] text-gray-300 font-bold uppercase tracking-widest mt-6">
            Hizmetler, çalışma saatleri ve fotoğrafları daha sonra dashboard'dan eklersin
          </p>
        </div>
      </div>
    </main>
  );
}
