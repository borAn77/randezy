"use client";
// CalendarApp — ana kabuk.
// Üst çubuk, görünüm değiştirici, tarih şeridi ve aktif görünümü cihaz çerçevesi içinde render eder.
import React from "react";
import { CAL, H, type Appointment, type Status } from "./data";
import { DayView, WeekView, MonthView, StaffView, ListView } from "./views";
import { Sheet, DetailSheet, SearchSheet, StaffFilterSheet, DatePickerSheet } from "./sheets";

type ViewId = "gun" | "hafta" | "ay" | "calisan" | "liste";

const VIEW_LABELS: Record<ViewId, string> = {
  gun: "Gün",
  hafta: "Hafta",
  ay: "Ay",
  calisan: "Çalışan",
  liste: "Liste",
};
const VIEW_ORDER: ViewId[] = ["gun", "hafta", "ay", "calisan", "liste"];

export function CalendarApp({ platform = "ios", initialView = "gun" }: { platform?: "ios" | "android"; initialView?: ViewId }) {
  const [view, setView] = React.useState<ViewId>(initialView);
  const [date, setDate] = React.useState(CAL.TODAY);
  const [staffFilter, setStaffFilter] = React.useState<string[] | null>(null);
  const [selectedAp, setSelectedAp] = React.useState<Appointment | null>(null);
  const [activeSheet, setActiveSheet] = React.useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = React.useState<Record<string, Status>>({});

  // simüle edilmiş "şimdi" — TODAY'de 14:18 (now-çizgisi kullanışlı bir yerde dursun)
  const NOW_MIN = 14 * 60 + 18;

  // override'ları çalışan kopyaya uygula (alt bileşenler basit kalsın)
  const applyOverrides = React.useCallback(() => {
    for (const a of CAL.appointments) {
      if (statusOverrides[a.id]) a.status = statusOverrides[a.id];
    }
  }, [statusOverrides]);
  applyOverrides();

  const pickAp = (ap: Appointment) => {
    setSelectedAp(ap);
    setActiveSheet("detail");
  };
  const closeSheet = () => setActiveSheet(null);

  const onStatusUpdate = (id: string, status: Status) => {
    setStatusOverrides((prev) => ({ ...prev, [id]: status }));
    setSelectedAp((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
  };

  const platformTopPad = platform === "ios" ? 50 : 4;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        fontFamily: "var(--font-ui)",
        color: "var(--text)",
        overflow: "hidden",
      }}
    >
      {/* ── Üst çubuk ─────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, padding: `${platformTopPad}px 16px 8px`, background: "var(--bg)", zIndex: 6 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: -0.5,
                fontFamily: "var(--font-mono)",
              }}
            >
              R
            </div>
            <div>
              <div style={{ fontSize: 9, color: "var(--text-sub)", textTransform: "uppercase", letterSpacing: 0.8, lineHeight: 1.1 }}>
                Randezy · İşletme
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", lineHeight: 1.15 }}>Takvim</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <IconBtn onClick={() => setActiveSheet("search")} aria="Ara">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </IconBtn>
            <IconBtn onClick={() => setActiveSheet("filter")} aria="Filtre" badge={staffFilter ? staffFilter.length : null}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </IconBtn>
          </div>
        </div>

        {/* tarih satırı */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 2px 8px" }}>
          <button
            onClick={() => setActiveSheet("datepicker")}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 4px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--font-ui)" }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: -0.4, lineHeight: 1.1 }}>
              {H.formatDate(date, view === "ay" ? "month" : "long")}
            </div>
            <svg width="12" height="12" viewBox="0 0 12 12" style={{ marginTop: 4 }}>
              <path d="M2 4l4 4 4-4" stroke="var(--text-mut)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div style={{ display: "flex", gap: 4 }}>
            <SmallIconBtn onClick={() => setDate(H.addDays(date, view === "hafta" ? -7 : view === "ay" ? -30 : -1))}>‹</SmallIconBtn>
            <button
              onClick={() => setDate(CAL.TODAY)}
              style={{
                padding: "0 10px",
                height: 28,
                borderRadius: 999,
                background: H.sameDay(date, CAL.TODAY) ? "var(--primary)" : "var(--bg)",
                color: H.sameDay(date, CAL.TODAY) ? "#fff" : "var(--text)",
                border: H.sameDay(date, CAL.TODAY) ? "none" : "1px solid var(--separator)",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-ui)",
                letterSpacing: 0.2,
              }}
            >
              Bugün
            </button>
            <SmallIconBtn onClick={() => setDate(H.addDays(date, view === "hafta" ? 7 : view === "ay" ? 30 : 1))}>›</SmallIconBtn>
          </div>
        </div>

        {/* görünüm değiştirici */}
        <ViewSwitcher value={view} onChange={setView} />

        {/* hafta şeridi (sadece gün/çalışan/liste) */}
        {(view === "gun" || view === "calisan" || view === "liste") && <WeekStrip date={date} onPick={setDate} />}
      </div>

      {/* ── Kaydırma gövdesi ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        {view === "gun" && <DayView date={date} staffFilter={staffFilter} onPick={pickAp} nowMin={NOW_MIN} />}
        {view === "hafta" && (
          <WeekView
            date={date}
            staffFilter={staffFilter}
            onPick={pickAp}
            onJump={(d) => {
              setDate(d);
              setView("gun");
            }}
            nowMin={NOW_MIN}
          />
        )}
        {view === "ay" && (
          <MonthView
            date={date}
            staffFilter={staffFilter}
            onJump={(d) => {
              setDate(d);
              setView("gun");
            }}
          />
        )}
        {view === "calisan" && <StaffView date={date} onPick={pickAp} nowMin={NOW_MIN} />}
        {view === "liste" && <ListView date={date} staffFilter={staffFilter} onPick={pickAp} />}
      </div>

      {/* ── FAB ─────────────────────────────────────────────────────── */}
      <button
        style={{
          position: "absolute",
          right: 18,
          bottom: platform === "ios" ? 40 : 18,
          width: 56,
          height: 56,
          borderRadius: 999,
          background: "var(--primary)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 8px 22px var(--primary-shadow), 0 2px 6px rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          fontWeight: 300,
          zIndex: 10,
          transition: "transform 0.15s ease",
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
        aria-label="Yeni randevu"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 3v16M3 11h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>

      {/* ── Overlay'ler ────────────────────────────────────────────────── */}
      <Sheet open={activeSheet === "detail"} onClose={closeSheet}>
        <DetailSheet appointment={selectedAp} onClose={closeSheet} onStatus={onStatusUpdate} />
      </Sheet>
      <SearchSheet
        open={activeSheet === "search"}
        onClose={closeSheet}
        onPick={(ap) => {
          setSelectedAp(ap);
          setDate(H.dateFor(ap.dateOffset));
          setActiveSheet("detail");
        }}
      />
      <StaffFilterSheet open={activeSheet === "filter"} onClose={closeSheet} value={staffFilter} onChange={setStaffFilter} />
      <DatePickerSheet open={activeSheet === "datepicker"} onClose={closeSheet} value={date} onChange={setDate} />
    </div>
  );
}

// ── yardımcılar ─────────────────────────────────────────────────────────────
function IconBtn({ children, onClick, aria, badge }: { children: React.ReactNode; onClick: () => void; aria: string; badge?: number | null }) {
  return (
    <button
      onClick={onClick}
      aria-label={aria}
      style={{
        width: 38,
        height: 38,
        borderRadius: 999,
        background: "var(--bg)",
        border: "1px solid var(--separator)",
        color: "var(--text)",
        cursor: "pointer",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
      {badge != null && (
        <span
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            background: "var(--primary)",
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            minWidth: 14,
            height: 14,
            borderRadius: 999,
            padding: "0 4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function SmallIconBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        borderRadius: 999,
        background: "var(--bg)",
        border: "1px solid var(--separator)",
        cursor: "pointer",
        fontSize: 16,
        color: "var(--text)",
        lineHeight: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}

function ViewSwitcher({ value, onChange }: { value: ViewId; onChange: (v: ViewId) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, padding: 3, background: "var(--bg)", border: "1px solid var(--separator)", borderRadius: 999, marginBottom: 0 }}>
      {VIEW_ORDER.map((v) => {
        const active = value === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            style={{
              flex: 1,
              height: 28,
              borderRadius: 999,
              background: active ? "var(--surface)" : "transparent",
              color: active ? "var(--text)" : "var(--text-mut)",
              border: "none",
              cursor: "pointer",
              fontSize: 11.5,
              fontWeight: active ? 600 : 500,
              fontFamily: "var(--font-ui)",
              boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06), 0 0 0 1px var(--separator)" : "none",
              transition: "background 0.15s ease",
            }}
          >
            {VIEW_LABELS[v]}
          </button>
        );
      })}
    </div>
  );
}

function WeekStrip({ date, onPick }: { date: Date; onPick: (d: Date) => void }) {
  const start = H.addDays(date, -3);
  const days = Array.from({ length: 7 }, (_, i) => H.addDays(start, i));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginTop: 10, marginBottom: -2 }}>
      {days.map((d) => {
        const isToday = H.sameDay(d, CAL.TODAY);
        const isSel = H.sameDay(d, date);
        const count = H.appointmentsOn(d).length;
        return (
          <button
            key={d.toISOString()}
            onClick={() => onPick(d)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "6px 2px 8px",
              borderRadius: 12,
              cursor: "pointer",
              background: isSel ? "var(--primary)" : "transparent",
              border: "none",
              fontFamily: "var(--font-ui)",
              transition: "background 0.15s ease",
            }}
          >
            <span style={{ fontSize: 9.5, letterSpacing: 0.6, textTransform: "uppercase", color: isSel ? "rgba(255,255,255,0.8)" : "var(--text-sub)", fontWeight: 500 }}>
              {H.DAYS_TR[H.dow(d)]}
            </span>
            <span style={{ fontSize: 16, fontWeight: isSel || isToday ? 700 : 500, color: isSel ? "#fff" : isToday ? "var(--primary)" : "var(--text)" }}>
              {d.getDate()}
            </span>
            {count > 0 && <span style={{ width: 4, height: 4, borderRadius: 999, background: isSel ? "#fff" : "var(--primary)", opacity: isSel ? 0.95 : 1 }} />}
          </button>
        );
      })}
    </div>
  );
}
