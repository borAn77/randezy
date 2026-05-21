"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { X, ShieldCheck, Eye, EyeOff, CheckCircle2 } from "lucide-react";

type Mode = 'login' | 'register' | 'otp' | 'forgot' | 'forgotSent';

export default function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");

  if (!isOpen) return null;

  const handleClose = () => {
    setMode('login');
    setEmail(""); setPassword(""); setConfirmPassword(""); setOtp("");
    setShowPassword(false);
    onClose();
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) alert("Google Giriş Hatası: " + error.message);
  };

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) alert("Hata: " + error.message);
    else handleClose();
  };

  const handleRegister = async (e: any) => {
    e.preventDefault();
    if (!/^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/.test(password)) {
      alert("Şifre en az 8 karakter, 1 büyük harf ve 1 sembol (!@#$%^&*) içermelidir.");
      return;
    }
    if (password !== confirmPassword) { alert("Şifreler eşleşmiyor."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.includes("already registered")) {
        alert("Bu e-posta zaten kayıtlı. Giriş yapın.");
        setMode('login');
      } else alert("Hata: " + error.message);
    } else {
      setMode('otp');
    }
  };

  const handleVerifyOtp = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'signup' });
    setLoading(false);
    if (error) alert("Kod hatalı: " + error.message);
    else handleClose();
  };

  const handleForgotPassword = async () => {
    if (!email.includes("@")) { alert("Lütfen e-posta adresinizi girin."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) alert("Hata: " + error.message);
    else setMode('forgotSent');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
      <div className="bg-white w-full max-w-[420px] rounded-[3.5rem] p-12 relative shadow-2xl animate-in zoom-in duration-300 border border-gray-100">
        <button onClick={handleClose} className="absolute top-10 right-10 text-gray-300 hover:text-black transition-colors">
          <X size={24} />
        </button>

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
              <button type="button" onClick={() => setMode('forgot')} className="text-[10px] font-black text-gray-400 hover:text-[#00A3AD] uppercase tracking-widest transition-colors">
                Şifremi Unuttum?
              </button>
            </div>

            <button disabled={loading} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl mt-6 hover:bg-[#00A3AD] transition-all">
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>

            <div className="relative py-5 flex items-center">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink mx-4 text-[9px] font-black text-gray-300 uppercase tracking-widest">Veya</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>

            <button type="button" onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 py-4 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all font-black text-[11px] uppercase text-black">
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" className="w-4 h-4" alt="Google" />
              Google ile giriş yap
            </button>

            <p className="text-center mt-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">
              Hesabın yok mu?{" "}
              <button type="button" onClick={() => setMode('register')} className="text-[#00A3AD] hover:underline">
                Kayıt Ol
              </button>
            </p>
          </form>
        )}

        {/* KAYIT OL */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="animate-in fade-in duration-300">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-black mb-1">Kayıt Ol</h2>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-8">Ücretsiz hesap oluştur.</p>

            <div className="space-y-4">
              <input
                required type="email" placeholder="E-posta adresin"
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#00A3AD] outline-none font-bold text-sm text-black transition-all"
              />
              <div className="relative">
                <input
                  required type={showPassword ? "text" : "password"} placeholder="Şifre oluştur"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#00A3AD] outline-none font-bold text-sm text-black transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <input
                required type="password" placeholder="Şifreyi tekrarla"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#00A3AD] outline-none font-bold text-sm text-black transition-all"
              />
              <div className="p-4 bg-[#E6F6F7] rounded-2xl border border-[#00A3AD]/20">
                <p className="text-[9px] font-bold text-[#00A3AD] leading-relaxed uppercase tracking-widest">
                  🛡️ En az 8 karakter, 1 büyük harf ve 1 sembol (!@#$%^&*) içermelidir.
                </p>
              </div>
            </div>

            <button disabled={loading} className="w-full bg-[#00A3AD] text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl mt-6 hover:bg-black transition-all">
              {loading ? "Hesap oluşturuluyor..." : "Kayıt Ol"}
            </button>

            <div className="relative py-5 flex items-center">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink mx-4 text-[9px] font-black text-gray-300 uppercase tracking-widest">Veya</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>

            <button type="button" onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 py-4 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all font-black text-[11px] uppercase text-black">
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" className="w-4 h-4" alt="Google" />
              Google ile kayıt ol
            </button>

            <p className="text-center mt-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">
              Zaten hesabın var mı?{" "}
              <button type="button" onClick={() => setMode('login')} className="text-[#00A3AD] hover:underline">
                Giriş Yap
              </button>
            </p>
          </form>
        )}

        {/* OTP DOĞRULAMA */}
        {mode === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="animate-in zoom-in duration-500 text-center">
            <div className="w-20 h-20 bg-[#E6F6F7] rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck size={40} className="text-[#00A3AD]" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-black mb-2">Kodu Onayla</h2>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-10 leading-relaxed px-4">
              {email} adresine gönderilen 8 haneli kodu girin.
            </p>
            <input
              required maxLength={8} type="text" placeholder="00000000"
              className="w-full p-6 bg-gray-50 rounded-3xl text-center text-4xl font-black tracking-[0.2em] text-[#00A3AD] focus:ring-4 ring-[#00A3AD]/20 outline-none transition-all placeholder:text-gray-200"
              onChange={e => setOtp(e.target.value)} value={otp}
            />
            <button disabled={loading} className="w-full bg-[#00A3AD] text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-xl mt-8 hover:bg-black transition-all">
              {loading ? "Onaylanıyor..." : "Onayla ve Devam Et"}
            </button>
            <p className="mt-6 text-[10px] font-bold text-gray-300 uppercase cursor-pointer hover:text-black transition-colors" onClick={() => setMode('register')}>
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
            <p className="text-center text-[10px] font-black text-gray-400 uppercase cursor-pointer hover:text-black transition-colors" onClick={() => setMode('login')}>
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
            <button onClick={() => setMode('login')} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#00A3AD] transition-all">
              Giriş Yap
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
