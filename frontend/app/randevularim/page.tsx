"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Navbar from "../../components/layout/Navbar";
import { Clock, Calendar as CalIcon, MapPin, X } from "lucide-react";

const statusStyle: Record<string, string> = {
  'Onaylandı': 'text-green-600 bg-green-50',
  'İptal Edildi': 'text-red-500 bg-red-50',
  'Beklemede': 'text-orange-500 bg-orange-50',
};

export default function Randevularim() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchAppointments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/'); return; }
    const { data } = await supabase
      .from('appointments')
      .select('*, shops(name, city, district)')
      .eq('user_id', user.id)
      .order('appointment_date', { ascending: true });
    setAppointments(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, []);

  const handleCancel = async (id: string) => {
    if (!confirm("Randevuyu iptal etmek istediğinize emin misiniz?")) return;
    setCancelling(id);
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'İptal Edildi' })
      .eq('id', id);
    if (error) { alert("Hata: " + error.message); }
    else { await fetchAppointments(); }
    setCancelling(null);
  };

  const canCancel = (apt: any) => apt.status === 'Beklemede' || apt.status === 'Onaylandı';

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-[1000px] mx-auto pt-40 px-6">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-10">Randevularım</h1>

        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-20 font-black text-gray-200 uppercase tracking-widest italic">Randevular Yükleniyor...</div>
          ) : appointments.length > 0 ? appointments.map((apt) => (
            <div key={apt.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex justify-between items-center group hover:border-[#00A3AD] transition-all">
              <div className="flex gap-8 items-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex flex-col items-center justify-center border border-gray-100">
                  <span className="text-[10px] font-black text-[#00A3AD] uppercase">{apt.appointment_date.split('-')[1]}</span>
                  <span className="text-xl font-black">{apt.appointment_date.split('-')[2]}</span>
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase">{apt.service_name}</h3>
                  <div className="flex gap-4 mt-2 text-gray-400 font-bold text-[11px] uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Clock size={14}/> {apt.appointment_time?.slice(0, 5) ?? "--:--"}</span>
                    <span className="flex items-center gap-1 text-[#00A3AD]"><CalIcon size={14}/> {apt.appointment_date}</span>
                    <span className="flex items-center gap-1"><MapPin size={14}/> {apt.shops?.name || "—"}</span>
                  </div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-3">
                <span className="block text-2xl font-black">{apt.price} TL</span>
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full inline-block ${statusStyle[apt.status] ?? 'text-gray-500 bg-gray-100'}`}>
                  {apt.status}
                </span>
                {canCancel(apt) && (
                  <button
                    onClick={() => handleCancel(apt.id)}
                    disabled={cancelling === apt.id}
                    className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                  >
                    <X size={12} /> {cancelling === apt.id ? "İptal ediliyor..." : "İptal Et"}
                  </button>
                )}
              </div>
            </div>
          )) : (
            <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-200">
              <p className="font-black text-gray-300 uppercase tracking-widest italic">Henüz randevun bulunmuyor.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
