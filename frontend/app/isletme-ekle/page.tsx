"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/layout/Navbar";
import { ChevronDown, CheckCircle2, ArrowRight, Store, Phone, MapPin } from "lucide-react";
import { supabase } from "../../lib/supabase";
import AuthModal from "../../components/layout/AuthModal";

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
  { id: "KUAFÖR", label: "Kuaför" },
  { id: "BERBER", label: "Berber" },
  { id: "GÜZELLİK MERKEZİ", label: "Güzellik Merkezi" },
  { id: "TIRNAK", label: "Tırnak" },
  { id: "KAŞ VE KİRPİK", label: "Kaş & Kirpik" },
  { id: "MASAJ", label: "Masaj" },
  { id: "FİZYOTERAPİ", label: "Fizyoterapi" },
  { id: "DÖVME", label: "Dövme" },
];

export default function IsletmeEkle() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessTermsConsent, setBusinessTermsConsent] = useState(false);
  // Kapı: form yalnız session + profiles.email_verified===true ise açılır
  const [gate, setGate] = useState<'checking' | 'auth' | 'verify' | 'ok'>('checking');
  const [gateEmail, setGateEmail] = useState('');

  const [form, setForm] = useState({
    category: "",
    shopName: "",
    phone: "",
    city: "",
    district: "",
    street: "",
  });

  // Kapı kontrolü: oturum + e-posta OTP doğrulaması (profiles.email_verified). Sadece okuma.
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user) { setGate('auth'); return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('email_verified')
        .eq('id', session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (profile?.email_verified === true) {
        setGate('ok');
      } else {
        setGateEmail(session.user.email || '');
        setGate('verify');
      }
    };
    check();
    // Doğrulama tamamlanınca (AuthModal sinyali) tekrar kontrol et
    const onProfileUpdated = () => check();
    window.addEventListener('profile-updated', onProfileUpdated);
    return () => { cancelled = true; window.removeEventListener('profile-updated', onProfileUpdated); };
  }, []);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const isValid = form.category && form.shopName.trim() && form.city && form.district.trim() && form.street.trim() && businessTermsConsent;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Oturum bulunamadı. Lütfen giriş yapın.");

      // Son kapı: e-posta OTP doğrulaması tamamlanmış olmalı (sadece okuma)
      const { data: prof } = await supabase
        .from('profiles')
        .select('email_verified')
        .eq('id', user.id)
        .maybeSingle();
      if (prof?.email_verified !== true) {
        throw new Error("İşletme eklemek için önce e-posta adresinizi doğrulamanız gerekir.");
      }

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

  // Kontrol bitene kadar / doğrulanana kadar formu HİÇ gösterme (flash yok).
  if (gate !== 'ok') {
    return (
      <main className="min-h-screen bg-[#F9F9F9] text-[#111]">
        <Navbar />
        <div className="h-[70vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
          {gate === 'checking' ? (
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 italic animate-pulse">Yükleniyor...</p>
          ) : (
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
              İşletme eklemek için e-posta doğrulaması gerekli.
            </p>
          )}
        </div>
        {/* Giriş yok → kayıt/giriş; giriş var ama doğrulanmamış → OTP. Kapatınca ana sayfaya. */}
        <AuthModal
          isOpen={gate === 'auth' || gate === 'verify'}
          onClose={() => router.replace('/')}
          verificationOnly={gate === 'verify'}
          initialEmail={gateEmail}
          redirectAfterVerify="/isletme-ekle"
        />
      </main>
    );
  }

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
                  className={`py-4 px-3 rounded-2xl text-[10px] font-black uppercase tracking-wider border-2 transition-all duration-200 flex items-center justify-center gap-1.5
                    ${form.category === cat.id
                      ? 'border-[#00A3AD] bg-[#E6F6F7] text-[#00A3AD]'
                      : 'border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  {form.category === cat.id && <CheckCircle2 size={12} className="text-[#00A3AD] flex-shrink-0" />}
                  {cat.label}
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

          {/* İşletme sözleşmesi onayı */}
          <div className="mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={businessTermsConsent}
                onChange={e => setBusinessTermsConsent(e.target.checked)}
                className="mt-0.5 flex-shrink-0 accent-black"
              />
              <span className="text-[11px] font-medium text-gray-500 leading-relaxed">
                <Link href="/isletme-sozlesmesi" target="_blank" className="font-black text-black hover:text-[#00A3AD] transition-colors underline">İşletme Kullanım Sözleşmesi</Link>'ni okudum ve kabul ediyorum. <span className="text-red-400">*</span>
              </span>
            </label>
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
