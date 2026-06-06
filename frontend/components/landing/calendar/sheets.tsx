"use client";
// Alt sheet'ler / overlay'ler — Detay, Arama, Tarih seçici, Çalışan filtresi
import React from "react";
import { CAL, H as HELPERS, type Appointment, type Status } from "./data";
import { StaffChip } from "./views";

const H_S = () => HELPERS;
const D_S = () => CAL;

// Genel overlay backdrop + sheet konteyneri
export function Sheet({
  open,
  onClose,
  children,
  maxHeight = "88%",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string;
}) {
  if (!open) return null;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 90, pointerEvents: "auto" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(20,18,15,0.36)", animation: "sheetFadeIn 0.2s ease" }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          background: "var(--surface)",
          borderRadius: "24px 24px 0 0",
          maxHeight,
          overflowY: "auto",
          overflowX: "hidden",
          boxShadow: "0 -10px 32px rgba(0,0,0,0.12)",
          fontFamily: "var(--font-ui)",
          paddingBottom: 36,
          animation: "sheetIn 0.28s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 999, background: "var(--separator)", margin: "10px auto 6px" }} />
        {children}
      </div>
    </div>
  );
}

// ── DETAY SHEET ───────────────────────────────────────────────────────────
export function DetailSheet({
  appointment,
  onClose,
  onStatus,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onStatus: (id: string, status: Status) => void;
}) {
  if (!appointment) return null;
  const ap = appointment;
  const sv = D_S().serviceById(ap.serviceId);
  const st = D_S().staffById(ap.staffId);
  const cc = D_S().categoryColor[sv.category];
  const date = H_S().dateFor(ap.dateOffset);

  const StatusButton = ({ value, label, icon }: { value: Status; label: string; icon: string }) => {
    const active = ap.status === value;
    const palette = {
      completed: { bg: "#E7F6EF", edge: "#10B981", fg: "#065F46" },
      cancelled: { bg: "#F2F2F4", edge: "#9CA3AF", fg: "#4B5563" },
      noshow: { bg: "#FCEDED", edge: "#EF4444", fg: "#991B1B" },
    }[value as "completed" | "cancelled" | "noshow"];
    return (
      <button
        onClick={() => onStatus(ap.id, value)}
        style={{
          flex: 1,
          padding: "12px 8px",
          borderRadius: 14,
          border: active ? `1.5px solid ${palette.edge}` : "1.5px solid var(--separator)",
          background: active ? palette.bg : "var(--surface)",
          color: active ? palette.fg : "var(--text-mut)",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          fontFamily: "var(--font-ui)",
        }}
      >
        <span style={{ fontSize: 18 }}>{icon}</span>
        {label}
      </button>
    );
  };

  return (
    <div style={{ padding: "6px 20px 0" }}>
      <div style={{ background: cc.bg, color: cc.text, borderRadius: 18, padding: "16px 18px", marginBottom: 18, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: cc.edge }} />
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 0.4, opacity: 0.75 }}>{H_S().formatDate(date)}</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, fontFamily: "var(--font-mono)", letterSpacing: -0.5 }}>
          {ap.start} – {ap.end}
        </div>
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{H_S().parseMin(ap.end) - H_S().parseMin(ap.start)} dakika</div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, color: "var(--text-sub)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Müşteri</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              background: "var(--primary-soft)",
              color: "var(--primary-text)",
              fontSize: 16,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {ap.customerName
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{ap.customerName}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-mut)", fontFamily: "var(--font-mono)" }}>{ap.phone}</div>
          </div>
          <button
            style={{ width: 40, height: 40, borderRadius: 999, border: "none", background: "var(--primary-soft)", color: "var(--primary)", cursor: "pointer", fontSize: 18 }}
            aria-label="Ara"
          >
            📞
          </button>
          <button
            style={{ width: 40, height: 40, borderRadius: 999, border: "none", background: "var(--primary-soft)", color: "var(--primary)", cursor: "pointer", fontSize: 16 }}
            aria-label="Mesaj"
          >
            💬
          </button>
        </div>
      </div>

      <div style={{ background: "var(--bg)", border: "1px solid var(--separator)", borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "var(--text-sub)", textTransform: "uppercase", letterSpacing: 0.6 }}>Hizmet</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginTop: 4 }}>{sv.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-mut)", marginTop: 2 }}>{sv.duration} dk</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "var(--text-sub)", textTransform: "uppercase", letterSpacing: 0.6 }}>Tutar</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
              {sv.price}
              <span style={{ fontSize: 13, opacity: 0.6 }}>₺</span>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--bg)",
          border: "1px solid var(--separator)",
          borderRadius: 14,
          padding: "12px 14px",
          marginBottom: 14,
        }}
      >
        <StaffChip staff={st} size={32} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "var(--text-sub)", textTransform: "uppercase", letterSpacing: 0.6 }}>Çalışan</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{st.name}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-mut)" }}>{st.role}</div>
        </div>
      </div>

      {ap.notes && (
        <div
          style={{
            background: "oklch(0.98 0.015 80)",
            border: "1px solid oklch(0.92 0.04 80)",
            borderRadius: 14,
            padding: "11px 14px",
            marginBottom: 14,
            color: "oklch(0.4 0.04 60)",
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, opacity: 0.7, marginBottom: 4 }}>Not</div>
          {ap.notes}
        </div>
      )}

      <div style={{ marginTop: 4, marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "var(--text-sub)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Durumu güncelle</div>
        <div style={{ display: "flex", gap: 8 }}>
          <StatusButton value="completed" label="Geldi" icon="✓" />
          <StatusButton value="noshow" label="Gelmedi" icon="—" />
          <StatusButton value="cancelled" label="İptal" icon="✕" />
        </div>
      </div>

      <button
        onClick={onClose}
        style={{
          width: "100%",
          padding: "14px 16px",
          borderRadius: 14,
          background: "var(--primary)",
          color: "#fff",
          border: "none",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "var(--font-ui)",
        }}
      >
        Kapat
      </button>
    </div>
  );
}

// ── ARAMA SHEET ───────────────────────────────────────────────────────────
export function SearchSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (ap: Appointment) => void }) {
  const [q, setQ] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current && inputRef.current.focus(), 240);
    else setQ("");
  }, [open]);

  const results = React.useMemo(() => {
    if (!q.trim()) return [];
    const qq = q.toLowerCase().trim();
    return D_S()
      .appointments.filter((a) => {
        const sv = D_S().serviceById(a.serviceId);
        const st = D_S().staffById(a.staffId);
        return (
          a.customerName.toLowerCase().includes(qq) ||
          a.phone.toLowerCase().includes(qq) ||
          sv.name.toLowerCase().includes(qq) ||
          st.name.toLowerCase().includes(qq)
        );
      })
      .sort((a, b) => a.dateOffset - b.dateOffset || H_S().parseMin(a.start) - H_S().parseMin(b.start))
      .slice(0, 30);
  }, [q]);

  return (
    <Sheet open={open} onClose={onClose} maxHeight="92%">
      <div style={{ padding: "4px 16px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--bg)",
            border: "1px solid var(--separator)",
            borderRadius: 999,
            padding: "10px 14px",
            marginBottom: 12,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="var(--text-mut)" strokeWidth="1.6" />
            <path d="M11 11l3.5 3.5" stroke="var(--text-mut)" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Müşteri, telefon, hizmet veya çalışan…"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--text)", fontFamily: "var(--font-ui)" }}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              style={{ border: "none", background: "transparent", color: "var(--text-mut)", fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1 }}
            >
              ×
            </button>
          )}
        </div>

        {!q && (
          <div style={{ fontSize: 12.5, color: "var(--text-sub)", textAlign: "center", padding: "30px 8px", lineHeight: 1.5 }}>
            Aramak için bir şeyler yazın.
            <br />
            Geçmiş ve gelecek tüm randevular taranır.
          </div>
        )}

        {q && results.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--text-mut)", textAlign: "center", padding: "24px 0" }}>"{q}" için sonuç yok.</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {results.map((ap) => {
            const sv = D_S().serviceById(ap.serviceId);
            const st = D_S().staffById(ap.staffId);
            const cc = D_S().categoryColor[sv.category];
            const date = H_S().dateFor(ap.dateOffset);
            return (
              <button
                key={ap.id}
                onClick={() => onPick(ap)}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "10px 12px",
                  background: "var(--surface)",
                  border: "1px solid var(--separator)",
                  borderRadius: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  alignItems: "center",
                  fontFamily: "var(--font-ui)",
                }}
              >
                <div style={{ width: 3, height: 36, borderRadius: 3, background: cc.edge }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{ap.customerName}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-mut)" }}>
                    {sv.name} · {st.name.split(" ")[0]}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                  <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>{ap.start}</div>
                  <div style={{ fontSize: 10, color: "var(--text-sub)" }}>{H_S().formatDate(date, "short")}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}

// ── ÇALIŞAN FİLTRESİ SHEET ─────────────────────────────────────────────────
export function StaffFilterSheet({
  open,
  onClose,
  value,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  value: string[] | null;
  onChange: (v: string[] | null) => void;
}) {
  const all = D_S().staff;
  const isAll = !value || value.length === 0 || value.length === all.length;
  const isSelected = (id: string) => (isAll ? true : value!.includes(id));

  const toggle = (id: string) => {
    let next: string[];
    if (isAll) next = all.map((s) => s.id).filter((x) => x !== id);
    else if (value!.includes(id)) next = value!.filter((x) => x !== id);
    else next = [...value!, id];
    if (next.length === all.length) onChange(null);
    else onChange(next);
  };

  return (
    <Sheet open={open} onClose={onClose} maxHeight="62%">
      <div style={{ padding: "4px 20px 12px" }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Çalışan filtresi</div>
        <div style={{ fontSize: 12.5, color: "var(--text-mut)", marginBottom: 14 }}>Takvimde göstermek istediğin çalışanları seç.</div>

        <button
          onClick={() => onChange(null)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 14px",
            borderRadius: 14,
            cursor: "pointer",
            background: isAll ? "var(--primary-soft)" : "var(--bg)",
            border: isAll ? "1.5px solid var(--primary)" : "1.5px solid var(--separator)",
            marginBottom: 8,
            fontFamily: "var(--font-ui)",
            textAlign: "left",
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              background: "var(--primary)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            HEP
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Tüm çalışanlar</div>
            <div style={{ fontSize: 12, color: "var(--text-mut)" }}>{all.length} kişi</div>
          </div>
          {isAll && <Tick />}
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {all.map((s) => {
            const sel = isSelected(s.id) && !isAll;
            return (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 14,
                  cursor: "pointer",
                  background: sel ? "var(--primary-soft)" : "var(--bg)",
                  border: sel ? "1.5px solid var(--primary)" : "1.5px solid var(--separator)",
                  fontFamily: "var(--font-ui)",
                  textAlign: "left",
                }}
              >
                <StaffChip staff={s} size={30} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-mut)" }}>{s.role}</div>
                </div>
                {sel && <Tick />}
              </button>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}

function Tick() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill="var(--primary)" />
      <path d="M5 9.5l2.6 2.6L13 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── TARİH SEÇİCİ SHEET ─────────────────────────────────────────────────────
export function DatePickerSheet({
  open,
  onClose,
  value,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  value: Date;
  onChange: (d: Date) => void;
}) {
  const [month, setMonth] = React.useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  React.useEffect(() => {
    if (open) setMonth(new Date(value.getFullYear(), value.getMonth(), 1));
  }, [open]);

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = H_S().dow(first);
  const gridStart = H_S().addDays(first, -offset);
  const cells = Array.from({ length: 42 }, (_, i) => H_S().addDays(gridStart, i));
  const today = D_S().TODAY;

  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  return (
    <Sheet open={open} onClose={onClose} maxHeight="64%">
      <div style={{ padding: "4px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button onClick={() => shift(-1)} style={iconBtnStyle}>
            ‹
          </button>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{H_S().formatDate(month, "month")}</div>
          <button onClick={() => shift(1)} style={iconBtnStyle}>
            ›
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 0, marginBottom: 4 }}>
          {H_S().DAYS_TR.map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: 10, color: "var(--text-sub)", textTransform: "uppercase", letterSpacing: 0.6, padding: 4 }}>
              {d}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {cells.map((d, i) => {
            const inMonth = d.getMonth() === month.getMonth();
            const isToday = H_S().sameDay(d, today);
            const isSel = H_S().sameDay(d, value);
            const count = H_S().appointmentsOn(d).length;
            return (
              <button
                key={i}
                onClick={() => {
                  onChange(d);
                  onClose();
                }}
                style={{
                  aspectRatio: "1/1",
                  borderRadius: 12,
                  border: isToday && !isSel ? "1.5px solid var(--primary)" : "none",
                  background: isSel ? "var(--primary)" : "transparent",
                  color: isSel ? "#fff" : inMonth ? "var(--text)" : "var(--text-sub)",
                  fontSize: 14,
                  fontWeight: isSel || isToday ? 700 : 500,
                  cursor: "pointer",
                  position: "relative",
                  fontFamily: "var(--font-ui)",
                }}
              >
                {d.getDate()}
                {count > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 5,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 4,
                      height: 4,
                      borderRadius: 999,
                      background: isSel ? "#fff" : "var(--primary)",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            onChange(today);
            onClose();
          }}
          style={{
            marginTop: 14,
            width: "100%",
            padding: "12px",
            background: "var(--primary-soft)",
            color: "var(--primary-text)",
            border: "none",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-ui)",
          }}
        >
          Bugüne dön
        </button>
      </div>
    </Sheet>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 999,
  background: "var(--bg)",
  border: "1px solid var(--separator)",
  cursor: "pointer",
  fontSize: 20,
  color: "var(--text)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 0,
};
