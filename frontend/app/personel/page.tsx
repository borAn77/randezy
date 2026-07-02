"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { KeyRound, ChevronLeft, ChevronRight, LogOut, RefreshCw, Clock, User } from "lucide-react";

// Personel takvimi — kodla giriş, salt-okunur günlük görünüm.
// Kod localStorage'da tutulur ve HER istekte server'da yeniden doğrulanır:
// owner kodu yenilediği an bu ekran otomatik olarak giriş ekranına düşer.
// Veri 30 sn'de bir sessizce tazelenir (realtime yerine bilinçli polling —
// kod-login'de auth.uid() olmadığı için RLS-tabanlı realtime mümkün değil).

const STORAGE_KEY = "randezy_staff_code";
const POLL_MS = 30_000;

type CalApt = {
  id: string;
  time: string;
  duration: number;
  serviceName: string;
  status: string;
  customerName: string;
};

type CalData = {
  staffName: string;
  shopName: string;
  hours: { open?: string; close?: string } | null;
  appointments: CalApt[];
};

const MONTHS_LONG = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const DAYS_TR = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];

const STATUS_CFG: Record<string, { label: string; bg: string; fg: string }> = {
  "Onaylandı":    { label: "Onaylandı",       bg: "#e6f7f4", fg: "#0d9488" },
  "Beklemede":    { label: "Onay bekliyor",   bg: "#FFF8EC", fg: "#92601A" },
  "Tamamlandı":   { label: "Tamamlandı",      bg: "#eef2ff", fg: "#4338ca" },
  "İptal Edildi": { label: "İptal edildi",    bg: "#f4f4f5", fg: "#71717a" },
};

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

export default function PersonelPage() {
  const [view, setView] = useState<"checking" | "pin" | "cal">("checking");
  const [code, setCode] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [date, setDate] = useState(() => localDateStr(new Date()));
  const [data, setData] = useState<CalData | null>(null);
  const [calLoading, setCalLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const dateRef = useRef(date);
  useEffect(() => { dateRef.current = date; }, [date]);

  const logout = useCallback((message?: string) => {
    localStorage.removeItem(STORAGE_KEY);
    setCode(null);
    setData(null);
    setView("pin");
    if (message) setPinError(message);
  }, []);

  const fetchCalendar = useCallback(async (activeCode: string, targetDate: string, silent = false) => {
    if (!silent) setCalLoading(true);
    try {
      const res = await fetch("/api/staff/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeCode, date: targetDate }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        logout("Kodun yenilenmiş veya geçersiz. İşletme sahibinden güncel kodu iste.");
        return;
      }
      if (!res.ok) return; // geçici hata (429 vs) — mevcut veriyi koru, sonraki poll dener
      // Poll cevabı geldiğinde kullanıcı başka güne geçtiyse ezme
      if (dateRef.current !== targetDate) return;
      setData({ staffName: json.staffName, shopName: json.shopName, hours: json.hours, appointments: json.appointments || [] });
      setLastSync(new Date());
      setView("cal");
    } catch { /* bağlantı hatası — mevcut veriyi koru */ }
    if (!silent) setCalLoading(false);
  }, [logout]);

  // Açılış: kayıtlı kod varsa doğrudan takvimi dene
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setCode(saved);
      fetchCalendar(saved, dateRef.current);
    } else {
      setView("pin");
    }
  }, [fetchCalendar]);

  // 30 sn polling — sadece takvim görünümündeyken
  useEffect(() => {
    if (view !== "cal" || !code) return;
    const t = setInterval(() => fetchCalendar(code, dateRef.current, true), POLL_MS);
    return () => clearInterval(t);
  }, [view, code, fetchCalendar]);

  // Tarih değişince yeniden çek
  useEffect(() => {
    if (view === "cal" && code) fetchCalendar(code, date);
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinLoading(true);
    try {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: pinInput }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPinError(json.detail || "Giriş yapılamadı. Tekrar deneyin.");
        setPinLoading(false);
        return;
      }
      const normalized = pinInput.toUpperCase().trim();
      localStorage.setItem(STORAGE_KEY, normalized);
      setCode(normalized);
      setPinInput("");
      await fetchCalendar(normalized, dateRef.current);
    } catch {
      setPinError("Bağlantı hatası. Tekrar deneyin.");
    }
    setPinLoading(false);
  };

  const d = new Date(`${date}T12:00:00`);
  const isToday = date === localDateStr(new Date());

  // ── Açılış kontrolü ─────────────────────────────────────────────────
  if (view === "checking") {
    return (
      <main className="min-h-screen bg-[#F9F9F9] flex items-center justify-center" style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}>
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-300 animate-pulse">Yükleniyor…</p>
      </main>
    );
  }

  // ── PIN giriş ekranı ────────────────────────────────────────────────
  if (view === "pin") {
    return (
      <main className="min-h-screen bg-[#F9F9F9] flex flex-col items-center justify-center px-4 py-14" style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}>
        <p className="text-2xl font-black tracking-tighter text-[#0c0c0d] mb-8">randezy</p>
        <div className="w-full max-w-sm bg-white rounded-[2rem] shadow-[0_20px_60px_rgba(12,12,13,0.08)] p-8 staff-in">
          <div className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-full px-3 py-1 text-[10px] font-bold tracking-widest uppercase mb-3">
            <KeyRound size={12} /> Personel Girişi
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900 leading-none mb-2">Takvimine Bak</h1>
          <p className="text-[12px] text-gray-400 font-medium leading-relaxed mb-6">
            İşletme sahibinin sana verdiği giriş kodunu yaz — randevuların karşında.
          </p>
          <form onSubmit={handleLogin}>
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1.5 block">Giriş Kodu</label>
            <input
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value.toUpperCase()); setPinError(null); }}
              placeholder="RDZ-XXXX-XXXX"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="w-full bg-white border border-gray-200 focus:border-[#14b8a6] rounded-xl px-4 py-3.5 outline-none font-mono font-bold text-base tracking-[0.12em] text-gray-900 transition-all placeholder:text-gray-300 placeholder:tracking-[0.12em]"
            />
            {pinError && (
              <p className="text-[12px] font-bold text-red-500 bg-red-50 rounded-xl px-4 py-3 mt-3">{pinError}</p>
            )}
            <button
              type="submit"
              disabled={pinLoading || pinInput.trim().length < 8}
              className="w-full mt-4 rounded-xl py-4 font-bold text-sm transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: "#14b8a6", color: "#04221d" }}
            >
              {pinLoading ? "Kontrol ediliyor…" : "Giriş Yap →"}
            </button>
          </form>
          <p className="text-[10px] text-gray-300 font-medium leading-relaxed mt-4 text-center">
            Kodun yok mu? İşletme sahibi panelindeki Personel sekmesinden oluşturabilir.
          </p>
        </div>
        <style>{staffCss}</style>
      </main>
    );
  }

  // ── Takvim ──────────────────────────────────────────────────────────
  const apts = data?.appointments ?? [];
  return (
    <main className="min-h-screen bg-[#F9F9F9] pb-16" style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}>
      {/* Üst bar */}
      <header className="bg-white border-b border-gray-100 px-5 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 truncate">{data?.shopName}</p>
            <p className="text-[15px] font-black text-gray-900 truncate flex items-center gap-1.5"><User size={13} className="text-[#14b8a6]" /> {data?.staffName}</p>
          </div>
          <button
            onClick={() => logout()}
            title="Çıkış yap"
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 border border-gray-200 px-3 py-2 rounded-xl hover:text-red-400 hover:border-red-200 transition-all flex-shrink-0"
          >
            <LogOut size={12} /> Çıkış
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4">
        {/* Tarih navigasyonu */}
        <div className="flex items-center justify-between gap-2 mt-5 mb-4">
          <button onClick={() => setDate(addDays(date, -1))} className="w-10 h-10 grid place-items-center bg-white border border-gray-200 rounded-xl text-gray-500 hover:border-[#14b8a6] hover:text-[#14b8a6] transition-all">
            <ChevronLeft size={16} />
          </button>
          <div className="text-center">
            <p className="text-[15px] font-black text-gray-900 leading-tight">{d.getDate()} {MONTHS_LONG[d.getMonth()]} · {DAYS_TR[d.getDay()]}</p>
            <div className="flex items-center justify-center gap-2 mt-0.5">
              {data?.hours?.open ? (
                <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><Clock size={9} /> {data.hours.open} – {data.hours.close}</p>
              ) : (
                <p className="text-[10px] font-bold text-gray-300">Çalışma saati tanımlı değil</p>
              )}
              {!isToday && (
                <button onClick={() => setDate(localDateStr(new Date()))} className="text-[10px] font-black uppercase tracking-widest text-[#14b8a6] hover:underline">Bugün</button>
              )}
            </div>
          </div>
          <button onClick={() => setDate(addDays(date, 1))} className="w-10 h-10 grid place-items-center bg-white border border-gray-200 rounded-xl text-gray-500 hover:border-[#14b8a6] hover:text-[#14b8a6] transition-all">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Randevu listesi */}
        {calLoading && !data ? (
          <p className="text-center text-[11px] font-black uppercase tracking-widest text-gray-300 py-16 animate-pulse">Yükleniyor…</p>
        ) : apts.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-100 rounded-2xl py-14 text-center staff-in">
            <p className="text-[13px] font-bold text-gray-400">Bu gün için randevun yok.</p>
            <p className="text-[11px] text-gray-300 font-medium mt-1">Yeni randevular otomatik olarak burada belirir.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {apts.map((a) => {
              const cfg = STATUS_CFG[a.status] ?? STATUS_CFG["Beklemede"];
              const cancelled = a.status === "İptal Edildi";
              return (
                <div key={a.id} className={`bg-white border border-gray-100 rounded-2xl px-4 py-3.5 flex items-center gap-4 staff-in ${cancelled ? "opacity-60" : ""}`}>
                  <div className="flex-shrink-0 text-center w-14 bg-gray-50 rounded-xl py-2">
                    <p className="text-[15px] font-black text-gray-900 leading-none">{a.time}</p>
                    <p className="text-[9px] font-bold text-gray-400 mt-1">{a.duration} dk</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] font-black text-gray-900 truncate ${cancelled ? "line-through" : ""}`}>{a.customerName}</p>
                    <p className="text-[12px] font-bold text-gray-400 truncate">{a.serviceName}</p>
                  </div>
                  <span className="flex-shrink-0 text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-full" style={{ background: cfg.bg, color: cfg.fg }}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Senkron durumu */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => code && fetchCalendar(code, date)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-gray-300 hover:text-[#14b8a6] transition-colors"
          >
            <RefreshCw size={10} className={calLoading ? "animate-spin" : ""} />
            {lastSync ? `Son güncelleme ${lastSync.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} · 30 sn'de bir yenilenir` : "Yenile"}
          </button>
        </div>
      </div>
      <style>{staffCss}</style>
    </main>
  );
}

const staffCss = `
  @keyframes staffIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  .staff-in { animation: staffIn .4s cubic-bezier(0.16, 1, 0.3, 1); }
`;
