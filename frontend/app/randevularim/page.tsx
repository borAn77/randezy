"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Navbar from "../../components/layout/Navbar";
import { Clock, Calendar as CalIcon, MapPin } from "lucide-react";

export default function Randevularim() {
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    const fetchAppointments = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('appointments')
          .select('*, shops(name, city, district)')
          .eq('user_id', user.id)
          .order('appointment_date', { ascending: true });
        setAppointments(data || []);
      }
    };
    fetchAppointments();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-[1000px] mx-auto pt-40 px-6">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-10">Randevularım</h1>
        
        <div className="space-y-6">
          {appointments.length > 0 ? appointments.map((apt) => (
            <div key={apt.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex justify-between items-center group hover:border-[#00A3AD] transition-all">
              <div className="flex gap-8 items-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex flex-col items-center justify-center border border-gray-100">
                  <span className="text-[10px] font-black text-[#00A3AD] uppercase">{apt.appointment_date.split('-')[1]}</span>
                  <span className="text-xl font-black">{apt.appointment_date.split('-')[2]}</span>
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase">{apt.service_name}</h3>
                  <div className="flex gap-4 mt-2 text-gray-400 font-bold text-[11px] uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Clock size={14}/> {apt.appointment_time}</span>
                    <span className="flex items-center gap-1 text-[#00A3AD]"><CalIcon size={14}/> {apt.appointment_date}</span>
                    <span className="flex items-center gap-1"><MapPin size={14}/> {apt.shops?.name || "—"}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="block text-2xl font-black">{apt.price} TL</span>
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full mt-2 inline-block ${apt.status === 'Onaylandı' ? 'text-green-600 bg-green-50' : apt.status === 'İptal Edildi' ? 'text-red-500 bg-red-50' : 'text-orange-400 bg-orange-50'}`}>
                  {apt.status}
                </span>
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