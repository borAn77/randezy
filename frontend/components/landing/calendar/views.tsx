// Takvim görünümleri — Gün / Hafta / Ay / Çalışan kolonları / Liste
import React from "react";
import { CAL, H as HELPERS, type Appointment, type Staff, type Status } from "./data";

const H = () => HELPERS;
const D = () => CAL;

// ── ortak görsel atomlar ─────────────────────────────────────────────────────
const HOUR_PX = 76; // 1 saat = 76px (gün/çalışan görünümü)
const DAY_START = 9 * 60; // 09:00
const DAY_END = 20 * 60; // 20:00
const HOUR_LIST = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START + i * 60);

export function StatusDot({ status, size = 7 }: { status: Status; size?: number }) {
  const s = H().STATUS[status];
  if (!s) return null;
  return <span style={{ width: size, height: size, borderRadius: 999, background: s.dotColor, display: "inline-block", flexShrink: 0 }} />;
}

export function StaffChip({ staff, size = 22 }: { staff?: Staff | null; size?: number }) {
  if (!staff) return null;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        flexShrink: 0,
        background: `oklch(0.92 0.045 ${staff.avatarHue})`,
        color: `oklch(0.35 0.08 ${staff.avatarHue})`,
        fontSize: size <= 22 ? 10 : 12,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-ui)",
      }}
    >
      {staff.initials}
    </div>
  );
}

// slot grid için boyutlanmış (absolute) randevu kartı
export function ApptCard({
  ap,
  top,
  height,
  left,
  width,
  onPick,
  dense = false,
}: {
  ap: Appointment;
  top: number;
  height: number;
  left: number | string;
  width: number | string;
  onPick?: (ap: Appointment) => void;
  dense?: boolean;
}) {
  const sv = D().serviceById(ap.serviceId);
  const st = D().staffById(ap.staffId);
  const cc = D().categoryColor[sv.category];
  const isCancelled = ap.status === "cancelled" || ap.status === "noshow";
  return (
    <button
      onClick={() => onPick && onPick(ap)}
      style={{
        position: "absolute",
        top,
        height,
        left,
        width,
        background: cc.bg,
        color: cc.text,
        borderRadius: 10,
        padding: dense ? "4px 6px 4px 8px" : "6px 8px 6px 10px",
        textAlign: "left",
        border: "none",
        cursor: "pointer",
        boxShadow: `inset 3px 0 0 0 ${cc.edge}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: dense ? 1 : 3,
        opacity: isCancelled ? 0.55 : 1,
        textDecoration: ap.status === "cancelled" ? "line-through" : "none",
        fontFamily: "var(--font-ui)",
        transition: "transform 0.12s ease, box-shadow 0.12s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `inset 3px 0 0 0 ${cc.edge}, 0 4px 14px rgba(0,0,0,0.07)`)}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = `inset 3px 0 0 0 ${cc.edge}`)}
    >
      {height >= 28 && (
        <div
          style={{
            fontSize: dense ? 10 : 11,
            fontFamily: "var(--font-mono)",
            letterSpacing: 0.2,
            opacity: 0.85,
            lineHeight: 1.1,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <StatusDot status={ap.status} size={6} />
          {ap.start}
          {height >= 50 && <span style={{ opacity: 0.55 }}>–{ap.end}</span>}
        </div>
      )}
      {height >= 22 && (
        <div
          style={{
            fontSize: dense ? 12 : 13,
            fontWeight: 600,
            lineHeight: 1.15,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {ap.customerName}
        </div>
      )}
      {height >= 56 && !dense && (
        <div
          style={{
            fontSize: 11,
            opacity: 0.7,
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          {sv.name} · {st.initials}
        </div>
      )}
    </button>
  );
}

interface LaidOut {
  ap: Appointment;
  startM: number;
  endM: number;
  col: number;
  cols: number;
}

// çakışan randevuları kolonlara paketle (yan yana otursunlar)
function layout(aps: Appointment[]): LaidOut[] {
  const sorted = [...aps].sort((a, b) => H().parseMin(a.start) - H().parseMin(b.start));
  const result: LaidOut[] = [];
  let cluster: { ap: Appointment; startM: number; endM: number; col?: number; cols?: number }[] = [];
  let clusterEnd = -1;
  const flush = () => {
    if (!cluster.length) return;
    const cols: number[] = [];
    cluster.forEach((item) => {
      let placed = false;
      for (let i = 0; i < cols.length; i++) {
        if (cols[i] <= item.startM) {
          cols[i] = item.endM;
          item.col = i;
          placed = true;
          break;
        }
      }
      if (!placed) {
        item.col = cols.length;
        cols.push(item.endM);
      }
    });
    const colCount = Math.max(...cluster.map((c) => c.col!)) + 1;
    cluster.forEach((c) => {
      c.cols = colCount;
      result.push(c as LaidOut);
    });
    cluster = [];
    clusterEnd = -1;
  };
  for (const ap of sorted) {
    const startM = H().parseMin(ap.start);
    const endM = H().parseMin(ap.end);
    if (startM >= clusterEnd) flush();
    cluster.push({ ap, startM, endM });
    clusterEnd = Math.max(clusterEnd, endM);
  }
  flush();
  return result;
}

// ── GÜN GÖRÜNÜMÜ ────────────────────────────────────────────────────────────
export function DayView({
  date,
  staffFilter,
  onPick,
  nowMin,
}: {
  date: Date;
  staffFilter: string[] | null;
  onPick: (ap: Appointment) => void;
  nowMin: number;
}) {
  const aps = H().appointmentsOn(date, staffFilter);
  const items = layout(aps);
  const TIME_W = 52;
  const isToday = H().sameDay(date, D().TODAY);
  const containerH = ((DAY_END - DAY_START) / 60) * HOUR_PX;

  return (
    <div style={{ position: "relative", padding: "8px 14px 28px" }}>
      <div style={{ position: "relative", height: containerH }}>
        {HOUR_LIST.map((m, i) => (
          <div
            key={m}
            style={{
              position: "absolute",
              top: i * HOUR_PX,
              left: 0,
              right: 0,
              height: HOUR_PX,
              borderTop: i === 0 ? "none" : "1px solid var(--separator)",
              display: "flex",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: TIME_W,
                paddingTop: 4,
                paddingRight: 8,
                fontSize: 11,
                color: "var(--text-sub)",
                fontFamily: "var(--font-mono)",
                textAlign: "right",
                letterSpacing: 0.3,
              }}
            >
              {H().fmtMin(m)}
            </div>
            <div
              style={{
                position: "absolute",
                top: HOUR_PX / 2,
                left: TIME_W,
                right: 0,
                borderTop: "1px dashed var(--separator-soft)",
              }}
            />
          </div>
        ))}

        {items.map(({ ap, startM, endM, col, cols }) => {
          const gapPx = 4;
          const colWidthPct = 100 / cols;
          return (
            <ApptCard
              key={ap.id}
              ap={ap}
              top={((startM - DAY_START) / 60) * HOUR_PX + 2}
              height={Math.max(28, ((endM - startM) / 60) * HOUR_PX - 4)}
              left={`calc(${TIME_W}px + 4px + ${col * colWidthPct}% - ${(col * (TIME_W + 8) * colWidthPct) / 100}px)`}
              width={`calc(${colWidthPct}% - ${gapPx}px - ${((TIME_W + 8) * colWidthPct) / 100}px)`}
              onPick={onPick}
            />
          );
        })}

        {isToday && nowMin >= DAY_START && nowMin <= DAY_END && (
          <div
            style={{
              position: "absolute",
              left: TIME_W - 6,
              right: 6,
              top: ((nowMin - DAY_START) / 60) * HOUR_PX,
              height: 0,
              zIndex: 5,
              pointerEvents: "none",
            }}
          >
            <div style={{ position: "absolute", left: 0, top: -4, width: 9, height: 9, borderRadius: 999, background: "var(--now)" }} />
            <div style={{ position: "absolute", left: 4, right: 0, top: 0, height: 0, borderTop: "1.5px solid var(--now)" }} />
            <div
              style={{
                position: "absolute",
                right: 6,
                top: -16,
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: "var(--now)",
                fontWeight: 600,
                background: "var(--bg)",
                padding: "0 4px",
              }}
            >
              {H().fmtMin(nowMin)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── HAFTA GÖRÜNÜMÜ (Pzt..Paz, sıkıştırılmış) ───────────────────────────────
export function WeekView({
  date,
  staffFilter,
  onPick,
  onJump,
  nowMin,
}: {
  date: Date;
  staffFilter: string[] | null;
  onPick: (ap: Appointment) => void;
  onJump?: (d: Date) => void;
  nowMin: number;
}) {
  const weekStart = H().addDays(date, -H().dow(date)); // Pazartesi
  const days = Array.from({ length: 7 }, (_, i) => H().addDays(weekStart, i));
  const TIME_W = 36;
  const HR = 44;
  const containerH = ((DAY_END - DAY_START) / 60) * HR;

  return (
    <div style={{ padding: "4px 8px 24px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${TIME_W}px repeat(7, 1fr)`,
          gap: 2,
          position: "sticky",
          top: 0,
          background: "var(--bg)",
          zIndex: 4,
          padding: "6px 0 8px",
        }}
      >
        <div />
        {days.map((d) => {
          const isToday = H().sameDay(d, D().TODAY);
          const isSel = H().sameDay(d, date);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onJump && onJump(d)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: "4px 2px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                fontFamily: "var(--font-ui)",
              }}
            >
              <div style={{ fontSize: 10, color: "var(--text-sub)", textTransform: "uppercase", letterSpacing: 0.6 }}>
                {H().DAYS_TR[H().dow(d)]}
              </div>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 600,
                  background: isToday ? "var(--primary)" : isSel ? "var(--primary-soft)" : "transparent",
                  color: isToday ? "#fff" : isSel ? "var(--primary-text)" : "var(--text)",
                }}
              >
                {d.getDate()}
              </div>
            </button>
          );
        })}
      </div>

      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: `${TIME_W}px repeat(7, 1fr)`,
          height: containerH,
          gap: 0,
        }}
      >
        <div style={{ position: "relative" }}>
          {HOUR_LIST.slice(0, -1).map((m, i) => (
            <div
              key={m}
              style={{
                position: "absolute",
                top: i * HR,
                right: 6,
                fontSize: 9.5,
                color: "var(--text-sub)",
                fontFamily: "var(--font-mono)",
                letterSpacing: 0.3,
              }}
            >
              {H().fmtMin(m)}
            </div>
          ))}
        </div>
        {days.map((d, di) => {
          const aps = H().appointmentsOn(d, staffFilter);
          const items = layout(aps);
          const isToday = H().sameDay(d, D().TODAY);
          return (
            <div
              key={di}
              style={{
                position: "relative",
                borderLeft: "1px solid var(--separator)",
                background: isToday ? "var(--primary-tint)" : "transparent",
              }}
            >
              {HOUR_LIST.map((m, i) => (
                <div
                  key={m}
                  style={{
                    position: "absolute",
                    top: i * HR,
                    left: 0,
                    right: 0,
                    height: 0,
                    borderTop: i === 0 ? "none" : "1px solid var(--separator)",
                  }}
                />
              ))}
              {items.map(({ ap, startM, endM, col, cols }) => (
                <ApptCard
                  key={ap.id}
                  ap={ap}
                  dense
                  top={((startM - DAY_START) / 60) * HR + 1}
                  height={Math.max(20, ((endM - startM) / 60) * HR - 2)}
                  left={`${(col / cols) * 100}%`}
                  width={`calc(${100 / cols}% - 1px)`}
                  onPick={onPick}
                />
              ))}
              {isToday && nowMin >= DAY_START && nowMin <= DAY_END && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: ((nowMin - DAY_START) / 60) * HR,
                    height: 0,
                    borderTop: "1.5px solid var(--now)",
                    zIndex: 5,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── AY GÖRÜNÜMÜ (genel bakış) ──────────────────────────────────────────────
export function MonthView({
  date,
  staffFilter,
  onJump,
}: {
  date: Date;
  staffFilter: string[] | null;
  onJump?: (d: Date) => void;
}) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = H().dow(first);
  const gridStart = H().addDays(first, -offset);
  const cells = Array.from({ length: 42 }, (_, i) => H().addDays(gridStart, i));

  const countFor = (d: Date) => H().appointmentsOn(d, staffFilter).length;

  return (
    <div style={{ padding: "4px 14px 24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, paddingBottom: 6 }}>
        {H().DAYS_TR.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: 10,
              color: "var(--text-sub)",
              textTransform: "uppercase",
              letterSpacing: 0.8,
              fontWeight: 500,
              paddingTop: 4,
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === date.getMonth();
          const isToday = H().sameDay(d, D().TODAY);
          const isSel = H().sameDay(d, date);
          const n = countFor(d);
          const cats = [...new Set(H().appointmentsOn(d, staffFilter).map((a) => D().serviceById(a.serviceId).category))].slice(0, 4);
          return (
            <button
              key={i}
              onClick={() => onJump && onJump(d)}
              style={{
                aspectRatio: "1 / 1.15",
                minHeight: 56,
                background: isSel ? "var(--primary-soft)" : "var(--surface)",
                border: isToday ? "1.5px solid var(--primary)" : "1px solid var(--separator)",
                borderRadius: 12,
                padding: "6px 6px 4px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                cursor: "pointer",
                position: "relative",
                opacity: inMonth ? 1 : 0.35,
                fontFamily: "var(--font-ui)",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? "var(--primary)" : "var(--text)",
                  textAlign: "left",
                }}
              >
                {d.getDate()}
              </div>
              {n > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: 2 }}>
                    {cats.map((c) => (
                      <span key={c} style={{ width: 5, height: 5, borderRadius: 999, background: D().categoryColor[c].edge }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", color: "var(--text-mut)", letterSpacing: 0.2 }}>
                    {n} randevu
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── ÇALIŞAN (kaynak) GÖRÜNÜMÜ — her çalışana kolon ────────────────────────────
export function StaffView({ date, onPick, nowMin }: { date: Date; onPick: (ap: Appointment) => void; nowMin: number }) {
  const staff = D().staff;
  const TIME_W = 38;
  const HR = 58;
  const containerH = ((DAY_END - DAY_START) / 60) * HR;
  const isToday = H().sameDay(date, D().TODAY);

  return (
    <div style={{ padding: "4px 8px 24px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${TIME_W}px repeat(${staff.length}, 1fr)`,
          gap: 4,
          position: "sticky",
          top: 0,
          background: "var(--bg)",
          zIndex: 4,
          padding: "6px 0 8px",
        }}
      >
        <div />
        {staff.map((s) => (
          <div key={s.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <StaffChip staff={s} size={28} />
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 500,
                color: "var(--text)",
                fontFamily: "var(--font-ui)",
                textAlign: "center",
                lineHeight: 1.1,
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {s.name.split(" ")[0]}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${TIME_W}px repeat(${staff.length}, 1fr)`,
          gap: 4,
          height: containerH,
          position: "relative",
        }}
      >
        <div style={{ position: "relative" }}>
          {HOUR_LIST.slice(0, -1).map((m, i) => (
            <div
              key={m}
              style={{ position: "absolute", top: i * HR, right: 4, fontSize: 9.5, color: "var(--text-sub)", fontFamily: "var(--font-mono)" }}
            >
              {H().fmtMin(m)}
            </div>
          ))}
        </div>
        {staff.map((s) => {
          const aps = H().appointmentsOn(date, [s.id]);
          const items = layout(aps);
          return (
            <div
              key={s.id}
              style={{
                position: "relative",
                background: "var(--surface)",
                border: "1px solid var(--separator)",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {HOUR_LIST.map((m, i) => (
                <div
                  key={m}
                  style={{
                    position: "absolute",
                    top: i * HR,
                    left: 0,
                    right: 0,
                    height: 0,
                    borderTop: i === 0 ? "none" : "1px dashed var(--separator-soft)",
                  }}
                />
              ))}
              {items.map(({ ap, startM, endM, col, cols }) => (
                <ApptCard
                  key={ap.id}
                  ap={ap}
                  dense
                  top={((startM - DAY_START) / 60) * HR + 1}
                  height={Math.max(22, ((endM - startM) / 60) * HR - 2)}
                  left={`${(col / cols) * 100 + 1}%`}
                  width={`calc(${100 / cols}% - 2px)`}
                  onPick={onPick}
                />
              ))}
              {isToday && nowMin >= DAY_START && nowMin <= DAY_END && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: ((nowMin - DAY_START) / 60) * HR,
                    borderTop: "1.5px solid var(--now)",
                    zIndex: 5,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── LİSTE / AJANDA GÖRÜNÜMÜ ─────────────────────────────────────────────────
export function ListView({ date, staffFilter, onPick }: { date: Date; staffFilter: string[] | null; onPick: (ap: Appointment) => void }) {
  const days = [0, 1, 2].map((i) => H().addDays(date, i));
  return (
    <div style={{ padding: "4px 16px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      {days.map((d) => {
        const aps = H()
          .appointmentsOn(d, staffFilter)
          .sort((a, b) => H().parseMin(a.start) - H().parseMin(b.start));
        const isToday = H().sameDay(d, D().TODAY);
        return (
          <div key={d.toISOString()}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                marginBottom: 10,
                paddingBottom: 6,
                borderBottom: "1px solid var(--separator)",
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color: isToday ? "var(--primary)" : "var(--text)", fontFamily: "var(--font-ui)" }}>
                {d.getDate()}
              </div>
              <div style={{ flex: 1, fontSize: 12, color: "var(--text-mut)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {H().DAYS_TR_LONG[H().dow(d)]} · {H().MONTHS_TR[d.getMonth()]}
                {isToday && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 10,
                      fontWeight: 600,
                      background: "var(--primary)",
                      color: "#fff",
                      padding: "2px 6px",
                      borderRadius: 999,
                      letterSpacing: 0.4,
                    }}
                  >
                    BUGÜN
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-sub)", fontFamily: "var(--font-mono)" }}>{aps.length} randevu</div>
            </div>

            {aps.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--text-sub)", padding: "8px 4px", fontStyle: "italic" }}>Bu gün için randevu yok.</div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {aps.map((ap) => {
                const sv = D().serviceById(ap.serviceId);
                const st = D().staffById(ap.staffId);
                const cc = D().categoryColor[sv.category];
                const isCancelled = ap.status === "cancelled" || ap.status === "noshow";
                return (
                  <button
                    key={ap.id}
                    onClick={() => onPick(ap)}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "12px 12px",
                      background: "var(--surface)",
                      border: "1px solid var(--separator)",
                      borderRadius: 14,
                      alignItems: "stretch",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "var(--font-ui)",
                      opacity: isCancelled ? 0.6 : 1,
                    }}
                  >
                    <div style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: cc.edge }} />
                    <div style={{ width: 54, display: "flex", flexDirection: "column", alignItems: "flex-start", fontFamily: "var(--font-mono)" }}>
                      <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 600 }}>{ap.start}</div>
                      <div style={{ fontSize: 10, color: "var(--text-sub)", marginTop: 1 }}>{ap.end}</div>
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          textDecoration: ap.status === "cancelled" ? "line-through" : "none",
                        }}
                      >
                        {ap.customerName}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-mut)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {sv.name}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: H().STATUS[ap.status].textColor }}>
                        <StatusDot status={ap.status} size={6} />
                        <span>{H().STATUS[ap.status].label}</span>
                        <span style={{ color: "var(--text-sub)" }}>·</span>
                        <StaffChip staff={st} size={16} />
                        <span style={{ color: "var(--text-mut)" }}>{st.name.split(" ")[0]}</span>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--text)",
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                        alignSelf: "center",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {sv.price}₺
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
