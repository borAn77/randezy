"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/layout/Navbar";
import { supabase } from "../../lib/supabase";
import { api, type Appointment, ApiError } from "../../lib/api";
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, ChevronRight } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:   { label: "Beklemede",  color: "text-yellow-500 bg-yellow-50 border-yellow-200" },
  confirmed: { label: "Onaylandı",  color: "text-green-600 bg-green-50 border-green-200" },
  cancelled: { label: "İptal",      color: "text-red-400 bg-red-50 border-red-100" },
  completed: { label: "Tamamlandı", color: "text-gray-500 bg-gray-50 border-gray-100" },
  no_show:   { label: "Gelmedi",    color: "text-gray-400 bg-gray-50 border-gray-100" },
};

export default function AccountPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/");
      } else {
        setAuthChecked(true);
      }
    });
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, tab]);

  async function loadAppointments() {
    setLoading(true);
    try {
      const data = await api.myAppointments(tab);
      setAppointments(data);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Bu randevuyu iptal etmek istediğinize emin misiniz?")) return;
    setCancellingId(id);
    try {
      const updated = await api.cancelAppointment(id);
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch {
    } finally {
      setCancellingId(null);
    }
  }

  if (!authChecked) return null;

  return (
    <main className="min-h-screen bg-[#F9F9F9] text-[#111] pb-20">
      <Navbar />
      <div className="max-w-3xl mx-auto pt-32 px-6">
        <header className="mb-10">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Randevularım</h1>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">
            Tüm randevu geçmişiniz
          </p>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {(["upcoming", "past"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                tab === t
                  ? "bg-black text-white"
                  : "bg-white text-gray-400 border-2 border-gray-100 hover:border-gray-200"
              }`}
            >
              {t === "upcoming" ? "Yaklaşan" : "Geçmiş"}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-[2.5rem] animate-pulse" />
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-24">
            <Calendar className="text-gray-200 mx-auto mb-4" size={64} />
            <p className="text-2xl font-black uppercase text-gray-200 tracking-tighter">
              Randevu Yok
            </p>
            <Link
              href="/businesses"
              className="mt-6 inline-block bg-[#00A3AD] text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all"
            >
              İşletme Ara
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((apt) => {
              const status = STATUS_MAP[apt.status] ?? STATUS_MAP.pending;
              const start = new Date(apt.start_time);
              const canCancel = apt.status === "pending" || apt.status === "confirmed";

              return (
                <div
                  key={apt.id}
                  className="bg-white rounded-[2.5rem] p-8 shadow-md border border-gray-100 flex items-start gap-6"
                >
                  {/* Date block */}
                  <div className="text-center bg-[#F9F9F9] rounded-2xl p-4 min-w-[60px]">
                    <p className="text-xs font-black text-[#00A3AD] uppercase">
                      {start.toLocaleDateString("tr-TR", { month: "short" })}
                    </p>
                    <p className="text-2xl font-black text-black">
                      {start.getDate()}
                    </p>
                    <p className="text-xs text-gray-400 font-bold">
                      {start.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-black text-sm text-black uppercase tracking-tight">
                          {apt.business?.name ?? "İşletme"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 font-medium">
                          {apt.service?.name ?? "Hizmet"}
                          {apt.service && ` · ${apt.service.duration_minutes} dk`}
                        </p>
                      </div>
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    {canCancel && (
                      <button
                        onClick={() => handleCancel(apt.id)}
                        disabled={cancellingId === apt.id}
                        className="mt-4 text-red-400 text-xs font-black uppercase tracking-widest hover:text-red-600 transition-all disabled:opacity-50"
                      >
                        {cancellingId === apt.id ? "İptal ediliyor..." : "Randevuyu İptal Et"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
