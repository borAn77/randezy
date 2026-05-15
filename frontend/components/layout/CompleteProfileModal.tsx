"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function CompleteProfileModal({ user, onComplete }: { user: any; onComplete: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.user_metadata?.full_name?.split(" ")[0] || "",
    lastName: user?.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
    phone: "",
    age: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // SQL "Grand Master" şemasına tam uyumlu veri paketi
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      first_name: formData.firstName,
      last_name: formData.lastName,
      full_name: `${formData.firstName} ${formData.lastName}`.trim(), // Ad ve soyadı birleştiriyoruz
      phone: formData.phone,
      age: formData.age ? parseInt(formData.age) : null,
      email: user.email,
      updated_at: new Date().toISOString(), // JS Date objesini SQL'in anlayacağı ISO formatına çevirdik
    });

    if (error) {
      console.error("Detaylı Hata:", error);
      alert("Hata oluştu: " + error.message);
    } else {
      onComplete(); // Başarılıysa modalı kapat
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
      <div className="bg-white w-full max-w-[480px] rounded-[3.5rem] p-12 shadow-2xl animate-in zoom-in duration-500 border border-gray-100">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-black mb-2">Profilini Tamamla</h2>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] italic">Randevu alabilmek için bu bilgiler gereklidir.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="ml-4 text-[10px] font-black text-[#00A3AD] uppercase tracking-widest">Ad</label>
              <input 
                required 
                className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-gray-100 font-bold text-sm text-black focus:border-[#00A3AD] focus:bg-white outline-none transition-all placeholder:text-gray-300" 
                placeholder="Örn: Mehmet"
                value={formData.firstName} 
                onChange={e => setFormData({...formData, firstName: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label className="ml-4 text-[10px] font-black text-[#00A3AD] uppercase tracking-widest">Soyad</label>
              <input 
                required 
                className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-gray-100 font-bold text-sm text-black focus:border-[#00A3AD] focus:bg-white outline-none transition-all placeholder:text-gray-300" 
                placeholder="Örn: Yılmaz"
                value={formData.lastName} 
                onChange={e => setFormData({...formData, lastName: e.target.value})} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="ml-4 text-[10px] font-black text-[#00A3AD] uppercase tracking-widest">Telefon Numarası</label>
            <input 
              required 
              type="tel" 
              placeholder="05XX XXX XX XX" 
              className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-gray-100 font-bold text-sm text-black focus:border-[#00A3AD] focus:bg-white outline-none transition-all placeholder:text-gray-300" 
              value={formData.phone} 
              onChange={e => setFormData({...formData, phone: e.target.value})} 
            />
          </div>

          <div className="space-y-2">
            <label className="ml-4 text-[10px] font-black text-[#00A3AD] uppercase tracking-widest">Yaş</label>
            <input 
              required 
              type="number" 
              placeholder="Örn: 24"
              className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-gray-100 font-bold text-sm text-black focus:border-[#00A3AD] focus:bg-white outline-none transition-all placeholder:text-gray-300" 
              value={formData.age} 
              onChange={e => setFormData({...formData, age: e.target.value})} 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-black text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl hover:bg-[#00A3AD] transition-all mt-6 disabled:opacity-50"
          >
            {loading ? "VERİLER MÜHÜRLENİYOR..." : "KAYDI TAMAMLA"}
          </button>
        </form>
      </div>
    </div>
  );
}