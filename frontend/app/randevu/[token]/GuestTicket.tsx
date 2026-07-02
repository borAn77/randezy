"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, MapPin, User, Scissors } from "lucide-react";

export type TicketData = {
  token: string;
  serviceName: string;
  date: string;        // "YYYY-MM-DD"
  time: string;        // "HH:MM"
  price: number;
  status: string;      // 'Beklemede' | 'Onaylandı' | 'İptal Edildi' | 'Tamamlandı'
  guestName: string | null;
  duration: number | null;
  staffName: string | null;
  shopName: string;
  shopLocation: string;
};

const MONTHS_LONG = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const DAYS_TR = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];

const STATUS_CFG: Record<string, { label: string; bg: string; fg: string }> = {
  "Onaylandı":    { label: "Onaylandı",       bg: "#e6f7f4", fg: "#0d9488" },
  "Beklemede":    { label: "Onay bekleniyor", bg: "#FFF8EC", fg: "#92601A" },
  "Tamamlandı":   { label: "Tamamlandı",      bg: "#eef2ff", fg: "#4338ca" },
  "İptal Edildi": { label: "İptal edildi",    bg: "#f4f4f5", fg: "#71717a" },
};

// Bilet kenarındaki çentikli kesik çizgi (boarding-pass hissi)
function TicketDivider() {
  return (
    <div className="relative px-7">
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F9F9F9]" />
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F9F9F9]" />
      <div className="border-t-2 border-dashed border-gray-100" />
    </div>
  );
}

export default function GuestTicket({ ticket }: { ticket: TicketData }) {
  const [status, setStatus] = useState(ticket.status);
  const [cancelStep, setCancelStep] = useState<"idle" | "confirm" | "loading" | "done">("idle");
  const [cancelError, setCancelError] = useState<string | null>(null);

  const cfg = STATUS_CFG[status] ?? STATUS_CFG["Beklemede"];
  const d = new Date(`${ticket.date}T00:00:00`);
  const todayStr = new Date().toISOString().slice(0, 10);
  const cancellable = (status === "Beklemede" || status === "Onaylandı") && ticket.date >= todayStr;

  const handleCancel = async () => {
    setCancelStep("loading");
    setCancelError(null);
    try {
      const res = await fetch("/api/guest-appointments/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: ticket.token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCancelError(data.detail || "İptal edilemedi. Lütfen tekrar deneyin.");
        setCancelStep("idle");
        return;
      }
      setStatus("İptal Edildi");
      setCancelStep("done");
    } catch {
      setCancelError("Bağlantı hatası. Lütfen tekrar deneyin.");
      setCancelStep("idle");
    }
  };

  return (
    <main className="min-h-screen bg-[#F9F9F9] flex flex-col items-center justify-center px-4 py-14" style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}>
      <Link href="/" className="text-2xl font-black tracking-tighter text-[#0c0c0d] mb-8 hover:text-[#14b8a6] transition-colors">
        randezy
      </Link>

      {/* Bilet */}
      <div className="w-full max-w-sm bg-white rounded-[2rem] shadow-[0_20px_60px_rgba(12,12,13,0.08)] ticket-in overflow-hidden">
        {/* Üst: işletme + durum */}
        <div className="px-7 pt-7 pb-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-gray-300 pt-1">Randevu Bileti</p>
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex-shrink-0" style={{ background: cfg.bg, color: cfg.fg }}>
              {cfg.label}
            </span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-[#0c0c0d] leading-tight">{ticket.shopName}</h1>
          {ticket.shopLocation && (
            <p className="text-[11px] font-bold text-gray-400 mt-1 flex items-center gap-1">
              <MapPin size={11} /> {ticket.shopLocation}
            </p>
          )}
        </div>

        <TicketDivider />

        {/* Orta: tarih & saat + detaylar */}
        <div className="px-7 py-6">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">Tarih</p>
              <p className="text-base font-black text-[#0c0c0d] leading-tight">
                {d.getDate()} {MONTHS_LONG[d.getMonth()]} {d.getFullYear()}
              </p>
              <p className="text-[11px] font-bold text-gray-400">{DAYS_TR[d.getDay()]}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">Saat</p>
              <p className="text-3xl font-black leading-none" style={{ color: "#14b8a6" }}>{ticket.time}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Scissors size={11} /> Hizmet</span>
              <span className="text-[13px] font-black text-[#0c0c0d] text-right">{ticket.serviceName}</span>
            </div>
            {ticket.staffName && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><User size={11} /> Personel</span>
                <span className="text-[13px] font-black text-[#0c0c0d]">{ticket.staffName}</span>
              </div>
            )}
            {ticket.duration != null && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={11} /> Süre</span>
                <span className="text-[13px] font-black text-[#0c0c0d]">{ticket.duration} dk</span>
              </div>
            )}
            {ticket.guestName && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Misafir</span>
                <span className="text-[13px] font-black text-[#0c0c0d]">{ticket.guestName}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-50">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tutar</span>
              <span className="text-lg font-black text-[#0c0c0d] font-mono">₺{ticket.price}</span>
            </div>
          </div>
        </div>

        <TicketDivider />

        {/* Alt: referans */}
        <div className="px-7 py-5 flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-gray-300">Referans</span>
          <span className="font-mono text-[12px] font-bold text-gray-500 tracking-[0.15em]">{ticket.token.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>

      {/* Durum notu / iptal akışı */}
      <div className="w-full max-w-sm mt-6 text-center">
        {status === "Beklemede" && cancelStep !== "done" && (
          <p className="text-[11px] text-gray-400 font-medium mb-4">İşletme randevunu onayladığında durum güncellenecek.</p>
        )}

        {cancelStep === "done" && (
          <div className="bg-white rounded-2xl px-5 py-4 shadow-sm ticket-in mb-4">
            <p className="text-[12px] font-bold text-gray-500 flex items-center justify-center gap-2">
              <CheckCircle2 size={14} className="text-[#14b8a6]" /> Randevun iptal edildi. Yeni randevu için işletme sayfasını ziyaret edebilirsin.
            </p>
          </div>
        )}

        {cancelError && (
          <p className="text-[12px] font-bold text-red-500 bg-red-50 rounded-xl px-4 py-3 mb-4">{cancelError}</p>
        )}

        {cancellable && cancelStep === "idle" && (
          <button
            onClick={() => setCancelStep("confirm")}
            className="text-[11px] font-black uppercase tracking-widest text-gray-400 border-2 border-gray-200 px-6 py-3 rounded-2xl hover:border-red-200 hover:text-red-400 hover:bg-red-50 transition-all"
          >
            Randevuyu İptal Et
          </button>
        )}

        {cancellable && cancelStep === "confirm" && (
          <div className="bg-white rounded-2xl px-5 py-4 shadow-sm ticket-in">
            <p className="text-[12px] font-black text-[#0c0c0d] mb-3">Randevunu iptal etmek istediğine emin misin?</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleCancel}
                className="text-[11px] font-black uppercase tracking-widest bg-red-500 text-white px-5 py-2.5 rounded-xl hover:bg-red-600 transition-all"
              >
                Evet, iptal et
              </button>
              <button
                onClick={() => setCancelStep("idle")}
                className="text-[11px] font-black uppercase tracking-widest text-gray-500 border border-gray-200 px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-all"
              >
                Vazgeç
              </button>
            </div>
          </div>
        )}

        {cancellable && cancelStep === "loading" && (
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 animate-pulse">İptal ediliyor…</p>
        )}
      </div>

      <style>{`
        @keyframes ticketIn { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: none; } }
        .ticket-in { animation: ticketIn .45s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </main>
  );
}
