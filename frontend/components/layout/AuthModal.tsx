"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { X, ShieldCheck, Eye, EyeOff, CheckCircle2 } from "lucide-react";

type Mode = 'login' | 'register' | 'otp' | 'forgot' | 'forgotSent';

const normalizePhone = (raw: string): string | null => {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) return '+' + digits;
  if (digits.startsWith('0') && digits.length === 11) return '+90' + digits.slice(1);
  if (digits.startsWith('5') && digits.length === 10) return '+90' + digits;
  return null;
};

export default function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [kvkkConsent, setKvkkConsent] = useState(false);
  const [internationalConsent, setInternationalConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const switchMode = (m: Mode) => { setMode(m); setAuthError(null); };

  const handleClose = () => {
    setMode('login');
    setEmail(""); setPassword(""); setConfirmPassword(""); setOtp("");
    setFirstName(""); setLastName(""); setPhone("");
    setShowPassword(false);
    setAuthError(null);
    setKvkkConsent(false);
    setInternationalConsent(false);
    setMarketingConsent(false);
    onClose();
  };

  const handleGoogleLogin = async () => {
    if (mode === 'register') {
      sessionStorage.setItem('randezy_legal_consent', 'true');
      sessionStorage.setItem('randezy_marketing_consent', String(marketingConsent));
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setAuthError("Google girişi sırasında bir hata oluştu. Tekrar deneyin.");
  };

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setAuthError(error.message.includes("Invalid login credentials") ? "E-posta veya şifre hatalı." : "Giriş yapılamadı. Tekrar deneyin.");
    else handleClose();
  };

  const handleRegister = async (e: any) => {
    e.preventDefault();
    if (!kvkkConsent || !internationalConsent) {
      setAuthError("Devam etmek için zorunlu onay kutucuklarını işaretleyin.");
      return;
    }
    if (firstName.trim().length < 2 || /^\d+$/.test(firstName.trim())) {
      setAuthError("Geçerli bir ad girin (en az 2 harf).");
      return;
    }
    if (lastName.trim().length < 2 || /^\d+$/.test(lastName.trim())) {
      setAuthError("Geçerli bir soyad girin (en az 2 harf).");
      return;
    }
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      setAuthError("Geçerli bir Türkiye cep telefonu girin. Örnek: 05321234567");
      return;
    }
    if (!/^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/.test(password)) {
      setAuthError("Şifre en az 8 karakter, 1 büyük harf ve 1 sembol (!@#$%^&*) içermelidir.");
      return;
    }
    if (password !== confirmPassword) { setAuthError("Şifreler eşleşmiyor."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    // Eğer Supabase confirm email kapalıysa session otomatik oluşur.
    // Her halükarda signOut yaparak OTP ekranına temiz geçiyoruz.
    await supabase.auth.signOut();
    setLoading(false);
    if (error) {
      if (error.message.includes("already registered")) {
        setAuthError("Bu e-posta zaten kayıtlı. Giriş yapın.");
        switchMode('login');
      } else setAuthError("Kayıt başarısız. Tekrar deneyin.");
    } else {
      switchMode('otp');
    }
  };

  const handleVerifyOtp = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'signup' });
    setLoading(false);
    if (error) {
      setAuthError("Doğrulama kodu hatalı veya süresi dolmuş.");
    } else {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          // Profil yaz — OTP doğrulandıktan sonra
          const normalizedPhone = normalizePhone(phone);
          await supabase.from('profiles').upsert({
            id: session.user.id,
            email: session.user.email,
            full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: normalizedPhone,
          }, { onConflict: 'id' });

          // Yasal onayları yaz
          const documents = ['kullanici_sozlesmesi_v1', 'kvkk_v1', 'yurtdisi_aktarim_v1'];
          if (marketingConsent) documents.push('ticari_ileti_v1');
          const res = await fetch('/api/legal-consents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ documents, marketing_consent: marketingConsent }),
          });
          if (!res.ok) { setAuthError("Yasal onay kaydı oluşturulamadı, lütfen tekrar deneyin."); return; }
        }
      } catch {
        setAuthError("Yasal onay kaydı oluşturulamadı, lütfen tekrar deneyin.");
        return;
      }
      handleClose();
    }
  };

  const handleForgotPassword = async () => {
    if (!email.includes("@")) { setAuthError("Lütfen e-posta adresinizi girin."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) setAuthError("Sıfırlama linki gönderilemedi. Tekrar deneyin.");
    else switchMode('forgotSent');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4"
      onClick={handleClose}
    >
      {/* Modal — max-height + internal scroll */}
      <div
        className="bg-white w-full max-w-[420px] rounded-[3rem] relative shadow-2xl animate-in zoom-in duration-300 border border-gray-100 flex flex-col"
        style={{ maxHeight: 'calc(100vh - 32px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* X — sticky, always visible */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-7 right-7 z-20 text-gray-300 hover:text-black transition-colors bg-white rounded-full p-1"
        >
          <X size={22} />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-10 pt-10 pb-10">

          {/* GİRİŞ YAP */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="animate-in fade-in duration-300">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-black mb-1">Giriş Yap</h2>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-8">Hesabına erişmek için giriş yap.</p>

              <div className="space-y-4">
                <input
                  required type="email" placeholder="E-posta adresin"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#00A3AD] outline-none font-bold text-sm text-black transition-all"
                />
                <div className="relative">
                  <input
                    required type={showPassword ? "text" : "password"} placeholder="Şifren"
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#00A3AD] outline-none font-bold text-sm text-black transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <button type="button" onClick={() => switchMode('forgot')} className="text-[10px] font-black text-gray-400 hover:text-[#00A3AD] uppercase tracking-widest transition-colors">
                  Şifremi Unuttum?
                </button>
              </div>

              <button disabled={loading} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl mt-6 hover:bg-[#00A3AD] transition-all">
                {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
              </button>

              <div className="relative py-4 flex items-center">
                <div className="flex-grow border-t border-gray-100"></div>
                <span className="flex-shrink mx-4 text-[9px] font-black text-gray-300 uppercase tracking-widest">Veya</span>
                <div className="flex-grow border-t border-gray-100"></div>
              </div>

              <button type="button" onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 py-4 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all font-black text-[11px] uppercase text-black">
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" className="w-4 h-4" alt="Google" />
                Google ile giriş yap
              </button>

              <p className="text-center mt-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                Hesabın yok mu?{" "}
                <button type="button" onClick={() => switchMode('register')} className="text-[#00A3AD] hover:underline">Kayıt Ol</button>
              </p>
            </form>
          )}

          {/* KAYIT OL */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="animate-in fade-in duration-300">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-black mb-1">Kayıt Ol</h2>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-6">Ücretsiz hesap oluştur.</p>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    required placeholder="Ad"
                    value={firstName} onChange={e => setFirstName(e.target.value)}
                    className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#00A3AD] outline-none font-bold text-sm text-black transition-all"
                  />
                  <input
                    required placeholder="Soyad"
                    value={lastName} onChange={e => setLastName(e.target.value)}
                    className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#00A3AD] outline-none font-bold text-sm text-black transition-all"
                  />
                </div>
                <input
                  required type="email" placeholder="E-posta adresin"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#00A3AD] outline-none font-bold text-sm text-black transition-all"
                />
                <input
                  required type="tel" placeholder="Telefon (05321234567)"
                  value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#00A3AD] outline-none font-bold text-sm text-black transition-all"
                />
                <div className="relative">
                  <input
                    required type={showPassword ? "text" : "password"} placeholder="Şifre oluştur"
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#00A3AD] outline-none font-bold text-sm text-black transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <input
                  required type="password" placeholder="Şifreyi tekrarla"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#00A3AD] outline-none font-bold text-sm text-black transition-all"
                />
                <div className="p-3 bg-[#E6F6F7] rounded-xl border border-[#00A3AD]/20">
                  <p className="text-[9px] font-bold text-[#00A3AD] leading-relaxed uppercase tracking-widest">
                    🛡️ En az 8 karakter, 1 büyük harf ve 1 sembol (!@#$%^&*) içermelidir.
                  </p>
                </div>
              </div>

              {/* Onaylar */}
              <div className="space-y-3 mt-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={kvkkConsent} onChange={e => setKvkkConsent(e.target.checked)} className="mt-0.5 flex-shrink-0 accent-[#00A3AD]" />
                  <span className="text-[10px] font-medium text-gray-500 leading-relaxed">
                    <Link href="/kullanici-sozlesmesi" target="_blank" className="font-black text-[#00A3AD] hover:underline">Kullanıcı Sözleşmesi</Link>'ni kabul ediyorum ve{" "}
                    <Link href="/kvkk" target="_blank" className="font-black text-[#00A3AD] hover:underline">KVKK Aydınlatma Metni</Link>'ni okudum. <span className="text-red-400">*</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={internationalConsent} onChange={e => setInternationalConsent(e.target.checked)} className="mt-0.5 flex-shrink-0 accent-[#00A3AD]" />
                  <span className="text-[10px] font-medium text-gray-500 leading-relaxed">
                    Kişisel verilerimin yurt dışındaki hizmet sağlayıcılarla paylaşılabileceğini okudum ve açık rıza gösteriyorum. <span className="text-red-400">*</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={marketingConsent} onChange={e => setMarketingConsent(e.target.checked)} className="mt-0.5 flex-shrink-0 accent-[#00A3AD]" />
                  <span className="text-[10px] font-medium text-gray-400 leading-relaxed">
                    Randezy'den <Link href="/ticari-ileti-izni" target="_blank" className="text-gray-500 hover:underline">ticari elektronik ileti</Link> almak istiyorum. (İsteğe bağlı)
                  </span>
                </label>
              </div>

              <button disabled={loading || !kvkkConsent || !internationalConsent} className="w-full bg-[#00A3AD] text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl mt-4 hover:bg-black transition-all disabled:opacity-40">
                {loading ? "Hesap oluşturuluyor..." : "Kayıt Ol"}
              </button>

              <div className="relative py-4 flex items-center">
                <div className="flex-grow border-t border-gray-100"></div>
                <span className="flex-shrink mx-4 text-[9px] font-black text-gray-300 uppercase tracking-widest">Veya</span>
                <div className="flex-grow border-t border-gray-100"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={!kvkkConsent || !internationalConsent}
                className="w-full flex items-center justify-center gap-3 py-4 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all font-black text-[11px] uppercase text-black disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" className="w-4 h-4" alt="Google" />
                Google ile kayıt ol
              </button>

              <p className="text-center mt-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                Zaten hesabın var mı?{" "}
                <button type="button" onClick={() => switchMode('login')} className="text-[#00A3AD] hover:underline">Giriş Yap</button>
              </p>
            </form>
          )}

          {/* OTP */}
          {mode === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="animate-in zoom-in duration-500 text-center">
              <div className="w-20 h-20 bg-[#E6F6F7] rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck size={40} className="text-[#00A3AD]" />
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-black mb-2">Kodu Onayla</h2>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-10 leading-relaxed px-4">
                {email} adresine gönderilen 6 haneli kodu girin.
              </p>
              <input
                required maxLength={8} type="text" placeholder="000000"
                className="w-full p-6 bg-gray-50 rounded-3xl text-center text-4xl font-black tracking-[0.2em] text-[#00A3AD] focus:ring-4 ring-[#00A3AD]/20 outline-none transition-all placeholder:text-gray-200"
                onChange={e => setOtp(e.target.value)} value={otp}
              />
              <button disabled={loading} className="w-full bg-[#00A3AD] text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-xl mt-8 hover:bg-black transition-all">
                {loading ? "Onaylanıyor..." : "Onayla ve Devam Et"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  setAuthError(null);
                  const { error } = await supabase.auth.resend({ type: 'signup', email });
                  if (error) setAuthError("Kod gönderilemedi, lütfen tekrar deneyin.");
                  else setAuthError("Yeni doğrulama kodu gönderildi.");
                }}
                className="mt-4 w-full py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-[#00A3AD] transition-colors"
              >
                Kodu tekrar gönder
              </button>
              <p className="mt-2 text-[10px] font-bold text-gray-300 uppercase cursor-pointer hover:text-black transition-colors" onClick={() => switchMode('register')}>
                Geri dön
              </p>
            </form>
          )}

          {/* ŞİFREMİ UNUTTUM */}
          {mode === 'forgot' && (
            <div className="animate-in fade-in duration-300">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-black mb-1">Şifremi Unuttum</h2>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-8">Sıfırlama linki e-postana gönderilecek.</p>
              <input
                type="email" placeholder="E-posta adresin"
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#00A3AD] outline-none font-bold text-sm text-black transition-all mb-4"
              />
              <button onClick={handleForgotPassword} disabled={loading} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#00A3AD] transition-all mb-4">
                {loading ? "Gönderiliyor..." : "Sıfırlama Linki Gönder"}
              </button>
              <p className="text-center text-[10px] font-black text-gray-400 uppercase cursor-pointer hover:text-black transition-colors" onClick={() => switchMode('login')}>
                Geri dön
              </p>
            </div>
          )}

          {/* LINK GÖNDERİLDİ */}
          {mode === 'forgotSent' && (
            <div className="animate-in fade-in duration-300 text-center">
              <div className="w-20 h-20 bg-[#E6F6F7] rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} className="text-[#00A3AD]" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-black mb-4">Link Gönderildi!</h2>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-10 leading-relaxed">
                {email} adresine şifre sıfırlama linki gönderildi.
              </p>
              <button onClick={() => switchMode('login')} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#00A3AD] transition-all">
                Giriş Yap
              </button>
            </div>
          )}

          {authError && (
            <p className="mt-4 text-center text-sm font-bold text-red-500">{authError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
