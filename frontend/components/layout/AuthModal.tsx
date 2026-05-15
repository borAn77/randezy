"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { X, Mail, Lock, ShieldCheck, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1); // 1: Email, 2: Şifre, 3: OTP
  const [isLogin, setIsLogin] = useState(false); // kayıt mı giriş mi
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    otp: ""
  });

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error: any) {
      alert("Google Giriş Hatası: " + error.message);
    }
  };

  const validatePassword = (pass: string) => {
    const regex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/;
    return regex.test(pass);
  };

  const handleNextStep = async () => {
    if (!formData.email.includes("@")) {
      alert("Lütfen geçerli bir e-posta adresi giriniz.");
      return;
    }
    // Email kayıtlı mı kontrol et
    setLoading(true);
    const { data } = await supabase.auth.signInWithOtp({
      email: formData.email,
      options: { shouldCreateUser: false }
    });
    setLoading(false);
    // Hata yoksa kullanıcı var demek → giriş modu
    // Hata varsa yeni kullanıcı → kayıt modu
    // En basit yol: direkt adım 2'ye geç, orada belirle
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      // GİRİŞ YAP
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) {
        alert("Hata: " + error.message);
        setLoading(false);
      } else {
        setLoading(false);
        onClose();
      }
    } else {
      // KAYIT OL
      if (!validatePassword(formData.password)) {
        alert("Şifre şartları karşılamıyor: En az 8 karakter, 1 büyük harf ve 1 özel karakter gerekli.");
        setLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        alert("Şifreler birbiriyle eşleşmiyor.");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });
      if (error) {
        if (error.message.includes("already registered")) {
          // Zaten kayıtlıysa giriş moduna geç
          setIsLogin(true);
          alert("Bu email zaten kayıtlı. Şifrenizi girin.");
        } else {
          alert("Hata: " + error.message);
        }
        setLoading(false);
      } else {
        setStep(3);
        setLoading(false);
      }
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: formData.email,
      token: formData.otp,
      type: 'signup'
    });
    if (error) {
      alert("Kod hatalı: " + error.message);
      setLoading(false);
    } else {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
      <div className="bg-white w-full max-w-[460px] rounded-[3.5rem] p-12 relative shadow-2xl animate-in zoom-in duration-300 border border-gray-100">
        
        <button onClick={onClose} className="absolute top-10 right-10 text-gray-300 hover:text-black transition-colors">
          <X size={24} />
        </button>

        {/* ADIM 1: EMAIL */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10 text-black">
              <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">Başlamaya Hazır Mısın?</h2>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest italic">Randevu almak için giriş yap veya kaydol.</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2 text-black">
                <label className="ml-4 text-[10px] font-black text-[#00A3AD] uppercase tracking-widest">E-Posta Adresin</label>
                <input 
                  type="email" 
                  placeholder="merhaba@randezy.com"
                  className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#00A3AD] focus:bg-white outline-none font-bold text-sm text-black transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <button 
                onClick={handleNextStep}
                disabled={loading}
                className="w-full bg-[#00A3AD] text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-lg hover:bg-black transition-all flex items-center justify-center gap-3"
              >
                {loading ? "Kontrol ediliyor..." : <> Devam Et <ArrowRight size={18} /> </>}
              </button>

              <div className="relative py-6 flex items-center">
                <div className="flex-grow border-t border-gray-100"></div>
                <span className="flex-shrink mx-4 text-[9px] font-black text-gray-300 uppercase tracking-widest">Veya</span>
                <div className="flex-grow border-t border-gray-100"></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  type="button" onClick={handleGoogleLogin}
                  className="relative z-[110] cursor-pointer flex items-center justify-center gap-3 py-4 border-2 border-gray-50 rounded-2xl hover:bg-gray-100 transition-all font-black text-[10px] uppercase text-black"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" className="w-4 h-4" alt="Google" />
                  Google
                </button>
                <button 
                  type="button"
                  className="relative z-[110] cursor-pointer flex items-center justify-center gap-3 py-4 border-2 border-gray-50 rounded-2xl hover:bg-gray-100 transition-all font-black text-[10px] uppercase text-black"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" className="w-4 h-4" alt="Apple" />
                  Apple
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADIM 2: ŞİFRE */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-10 text-black">
              <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">
                {isLogin ? "Giriş Yap" : "Şifre Belirle"}
              </h2>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{formData.email}</p>
            </div>

            <div className="space-y-4">
              <div className="relative text-black">
                <input 
                  required type={showPassword ? "text" : "password"} placeholder="ŞİFRE" 
                  className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#00A3AD] outline-none font-bold text-sm text-black transition-all"
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {!isLogin && (
                <>
                  <input 
                    required type="password" placeholder="ŞİFREYİ TEKRARLA" 
                    className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#00A3AD] outline-none font-bold text-sm text-black transition-all"
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  />
                  <div className="p-4 bg-[#E6F6F7] rounded-2xl border border-[#00A3AD]/20">
                    <p className="text-[9px] font-bold text-[#00A3AD] leading-relaxed uppercase tracking-widest">
                      🛡️ GÜVENLİK: Şifreniz en az 8 karakter olmalı, bir büyük harf ve bir sembol (!@#$) içermelidir.
                    </p>
                  </div>
                </>
              )}
            </div>

            <button 
              disabled={loading}
              className="w-full bg-black text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl mt-8 hover:bg-[#00A3AD] transition-all"
            >
              {loading ? "GÖNDERİLİYOR..." : isLogin ? "GİRİŞ YAP" : "HESABI OLUŞTUR"}
            </button>

            <p className="text-center mt-6 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
              {isLogin ? (
                <span className="cursor-pointer hover:text-black transition-colors" onClick={() => setIsLogin(false)}>
                  Hesabın yok mu? Kaydol
                </span>
              ) : (
                <span className="cursor-pointer hover:text-black transition-colors" onClick={() => setIsLogin(true)}>
                  Zaten hesabın var mı? Giriş yap
                </span>
              )}
            </p>
          </form>
        )}

        {/* ADIM 3: OTP */}
        {step === 3 && (
          <form onSubmit={handleVerifyOtp} className="animate-in zoom-in duration-500 text-center">
            <div className="w-20 h-20 bg-[#E6F6F7] rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck size={40} className="text-[#00A3AD]" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-black mb-2">Kodu Onayla</h2>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-10 leading-relaxed px-4">
              {formData.email} adresine gönderilen 8 haneli kodu girin.
            </p>

            <input 
              required maxLength={8} type="text" placeholder="00000000" 
              className="w-full p-6 bg-gray-50 rounded-3xl text-center text-4xl font-black tracking-[0.2em] text-[#00A3AD] focus:ring-4 ring-[#00A3AD]/20 outline-none transition-all placeholder:text-gray-200"
              onChange={(e) => setFormData({...formData, otp: e.target.value})}
              value={formData.otp}
            />

            <button 
              disabled={loading}
              className="w-full bg-[#00A3AD] text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-xl mt-10 hover:bg-black transition-all"
            >
              {loading ? "ONAYLANIYOR..." : "ONAYLA VE DEVAM ET"}
            </button>
            
            <p className="mt-8 text-[10px] font-bold text-gray-300 uppercase cursor-pointer hover:text-black transition-colors" onClick={() => setStep(2)}>
              E-postayı mı yanlış yazdın? Geri dön.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}