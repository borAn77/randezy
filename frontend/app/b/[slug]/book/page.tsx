"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Navbar from "../../../../components/layout/Navbar";
import { api, type BusinessDetail, type Service, type StaffMember, type TimeSlot, ApiError } from "../../../../lib/api";
import { CheckCircle2, ChevronLeft, Clock, Calendar, User } from "lucide-react";

type Step = 1 | 2 | 3;

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function BookContent() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [biz, setBiz] = useState<BusinessDetail | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Selections
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(addDays(new Date(), 1)));
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    api.getBusiness(slug)
      .then((b) => {
        setBiz(b);
        const preselectedId = searchParams.get("service_id");
        if (preselectedId) {
          const svc = b.services.find((s) => s.id === preselectedId);
          if (svc) setSelectedService(svc);
        }
      })
      .finally(() => setLoading(false));
  }, [slug, searchParams]);

  useEffect(() => {
    if (step === 2 && biz && selectedService) {
      loadSlots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedDate, selectedStaff]);

  async function loadSlots() {
    if (!biz || !selectedService) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    try {
      const result = await api.getAvailability({
        business_id: biz.id,
        service_id: selectedService.id,
        date: selectedDate,
        staff_id: selectedStaff?.id,
      });
      setSlots(result);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }

  async function handleConfirm() {
    if (!biz || !selectedService || !selectedSlot) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createAppointment({
        business_id: biz.id,
        service_id: selectedService.id,
        start_time: selectedSlot.start,
        staff_id: selectedStaff?.id,
        notes: notes || undefined,
      });
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("Bu saat dilimi artık dolu. Lütfen başka bir saat seçin.");
        setStep(2);
      } else if (err instanceof ApiError && err.status === 401) {
        setError("Randevu almak için giriş yapmanız gerekiyor.");
      } else {
        setError("Bir hata oluştu. Lütfen tekrar deneyin.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !biz) {
    return (
      <main className="min-h-screen bg-[#F9F9F9]">
        <Navbar />
        <div className="max-w-2xl mx-auto pt-40 px-6 animate-pulse space-y-6">
          <div className="h-10 bg-gray-100 rounded-2xl w-1/3" />
          <div className="h-64 bg-gray-100 rounded-[3.5rem]" />
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
        <Navbar />
        <div className="text-center px-6">
          <CheckCircle2 className="text-[#00A3AD] mx-auto mb-6" size={72} />
          <h1 className="text-4xl font-black uppercase tracking-tighter text-black mb-3">
            Randevu Alındı!
          </h1>
          <p className="text-gray-500 text-sm font-medium mb-8">
            {biz.name} için randevunuz başarıyla oluşturuldu.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push("/randevularim")}
              className="bg-black text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#00A3AD] transition-all"
            >
              Randevularım
            </button>
            <button
              onClick={() => router.push("/")}
              className="border-2 border-gray-100 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500 hover:border-black transition-all"
            >
              Ana Sayfa
            </button>
          </div>
        </div>
      </main>
    );
  }

  const STEPS = ["Hizmet Seç", "Tarih & Saat", "Onayla"];

  return (
    <main className="min-h-screen bg-[#F9F9F9] text-[#111] pb-20">
      <Navbar />
      <div className="max-w-2xl mx-auto pt-36 px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-[10px] font-black text-[#00A3AD] uppercase tracking-widest mb-2">{biz.name}</p>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Randevu Al</h1>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-12 relative">
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gray-100 -z-10" />
          {STEPS.map((label, i) => {
            const s = (i + 1) as Step;
            return (
              <div key={s} className="flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full font-black text-xs border-4 flex items-center justify-center transition-all ${
                    s === step
                      ? "bg-[#00A3AD] border-[#E6F6F7] text-white scale-110"
                      : s < step
                      ? "bg-black border-black text-white"
                      : "bg-white border-gray-100 text-gray-300"
                  }`}
                >
                  {s < step ? <CheckCircle2 size={16} /> : s}
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 hidden sm:block">
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mb-6 p-5 bg-red-50 border-2 border-red-100 rounded-2xl text-red-500 text-xs font-bold">
            {error}
          </div>
        )}

        {/* Step 1: Service */}
        {step === 1 && (
          <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl border border-gray-100 animate-in fade-in">
            <h2 className="text-xl font-black uppercase tracking-tighter text-black mb-6">Hizmet Seçin</h2>
            <div className="space-y-3">
              {biz.services.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => setSelectedService(svc)}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all text-left ${
                    selectedService?.id === svc.id
                      ? "border-[#00A3AD] bg-[#E6F6F7]"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div>
                    <p className="font-black text-sm text-black">{svc.name}</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Clock size={11} />
                      {svc.duration_minutes} dk
                    </p>
                  </div>
                  <span className="font-black text-[#00A3AD]">₺{svc.price.toFixed(0)}</span>
                </button>
              ))}
            </div>
            <button
              disabled={!selectedService}
              onClick={() => setStep(2)}
              className="w-full mt-8 bg-black text-white py-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#00A3AD] transition-all disabled:opacity-20"
            >
              Devam Et →
            </button>
          </div>
        )}

        {/* Step 2: Staff + Date + Time */}
        {step === 2 && (
          <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl border border-gray-100 animate-in fade-in space-y-8">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(1)} className="p-2 rounded-xl hover:bg-gray-100 transition-all">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-xl font-black uppercase tracking-tighter text-black">Tarih & Saat</h2>
            </div>

            {/* Staff (optional) */}
            {biz.staff.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-[#00A3AD] uppercase tracking-widest mb-3">
                  Personel (İsteğe Bağlı)
                </p>
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => setSelectedStaff(null)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-xs font-bold transition-all ${
                      !selectedStaff ? "border-[#00A3AD] bg-[#E6F6F7] text-[#00A3AD]" : "border-gray-100 text-gray-500"
                    }`}
                  >
                    <User size={14} /> Fark Etmez
                  </button>
                  {biz.staff.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedStaff(m)}
                      className={`px-4 py-3 rounded-xl border-2 text-xs font-bold transition-all ${
                        selectedStaff?.id === m.id
                          ? "border-[#00A3AD] bg-[#E6F6F7] text-[#00A3AD]"
                          : "border-gray-100 text-gray-500"
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date */}
            <div>
              <p className="text-[10px] font-black text-[#00A3AD] uppercase tracking-widest mb-3">Tarih</p>
              <input
                type="date"
                value={selectedDate}
                min={formatDate(addDays(new Date(), 1))}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-5 text-sm font-bold text-black outline-none focus:border-[#00A3AD] transition-all"
              />
            </div>

            {/* Time slots */}
            <div>
              <p className="text-[10px] font-black text-[#00A3AD] uppercase tracking-widest mb-3">Müsait Saatler</p>
              {slotsLoading ? (
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <p className="text-sm text-gray-400 font-medium py-4">
                  Bu tarihte müsait saat bulunamadı.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.start}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-3 rounded-xl text-xs font-black border-2 transition-all ${
                        selectedSlot?.start === slot.start
                          ? "border-[#00A3AD] bg-[#00A3AD] text-white"
                          : "border-gray-100 text-gray-600 hover:border-[#00A3AD]"
                      }`}
                    >
                      {formatTime(slot.start)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              disabled={!selectedSlot}
              onClick={() => setStep(3)}
              className="w-full bg-black text-white py-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#00A3AD] transition-all disabled:opacity-20"
            >
              Onayla →
            </button>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && selectedService && selectedSlot && (
          <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl border border-gray-100 animate-in fade-in">
            <div className="flex items-center gap-3 mb-8">
              <button onClick={() => setStep(2)} className="p-2 rounded-xl hover:bg-gray-100 transition-all">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-xl font-black uppercase tracking-tighter text-black">Randevu Özeti</h2>
            </div>

            <div className="space-y-4 mb-8">
              <SummaryRow label="İşletme" value={biz.name} />
              <SummaryRow label="Hizmet" value={`${selectedService.name} · ₺${selectedService.price.toFixed(0)}`} />
              <SummaryRow
                label="Tarih & Saat"
                value={`${new Date(selectedSlot.start).toLocaleDateString("tr-TR", {
                  weekday: "long", day: "numeric", month: "long",
                })} · ${formatTime(selectedSlot.start)}`}
              />
              {selectedStaff && <SummaryRow label="Personel" value={selectedStaff.name} />}
              <SummaryRow label="Süre" value={`${selectedService.duration_minutes} dakika`} />
            </div>

            <div className="mb-6">
              <p className="text-[10px] font-black text-[#00A3AD] uppercase tracking-widest mb-3">Not (İsteğe Bağlı)</p>
              <textarea
                rows={3}
                placeholder="Özel isteğiniz varsa yazın..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-5 text-sm font-medium text-black outline-none focus:border-[#00A3AD] transition-all resize-none"
              />
            </div>

            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full bg-[#00A3AD] text-white py-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50"
            >
              {submitting ? "İşleniyor..." : "Randevuyu Onayla"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

import { Suspense } from "react";

export default function BookPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F9F9F9]" />}>
      <BookContent />
    </Suspense>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-4 border-b border-gray-50 last:border-0">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-black text-black">{value}</span>
    </div>
  );
}
