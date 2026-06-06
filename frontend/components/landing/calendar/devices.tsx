// Cihaz çerçeveleri — basitleştirilmiş iOS 26 (Liquid Glass) + Android (Material 3)
import React from "react";

// ─────────────────────────────────────────────────────────────
// iOS durum çubuğu
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({ dark = false, time = "9:41" }: { dark?: boolean; time?: string }) {
  const c = dark ? "#fff" : "#000";
  return (
    <div
      style={{
        display: "flex",
        gap: 154,
        alignItems: "center",
        justifyContent: "center",
        padding: "21px 24px 19px",
        boxSizing: "border-box",
        position: "relative",
        zIndex: 20,
        width: "100%",
      }}
    >
      <div style={{ flex: 1, height: 22, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 1.5 }}>
        <span style={{ fontFamily: '-apple-system, "SF Pro", system-ui', fontWeight: 590, fontSize: 17, lineHeight: "22px", color: c }}>{time}</span>
      </div>
      <div style={{ flex: 1, height: 22, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, paddingTop: 1, paddingRight: 1 }}>
        <svg width="19" height="12" viewBox="0 0 19 12">
          <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill={c} />
          <rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill={c} />
          <rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill={c} />
          <rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill={c} />
        </svg>
        <svg width="17" height="12" viewBox="0 0 17 12">
          <path d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z" fill={c} />
          <path d="M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z" fill={c} />
          <circle cx="8.5" cy="10.5" r="1.5" fill={c} />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke={c} strokeOpacity="0.35" fill="none" />
          <rect x="2" y="2" width="20" height="9" rx="2" fill={c} />
          <path d="M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z" fill={c} fillOpacity="0.4" />
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// iOS cihaz çerçevesi
// ─────────────────────────────────────────────────────────────
export function IOSDevice({
  children,
  width = 402,
  height = 874,
  dark = false,
}: {
  children: React.ReactNode;
  width?: number;
  height?: number;
  dark?: boolean;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 48,
        overflow: "hidden",
        position: "relative",
        background: dark ? "#000" : "#F2F2F7",
        boxShadow: "0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)",
        fontFamily: "-apple-system, system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div style={{ position: "absolute", top: 11, left: "50%", transform: "translateX(-50%)", width: 126, height: 37, borderRadius: 24, background: "#000", zIndex: 50 }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }}>
        <IOSStatusBar dark={dark} />
      </div>
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          height: 34,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          paddingBottom: 8,
          pointerEvents: "none",
        }}
      >
        <div style={{ width: 139, height: 5, borderRadius: 100, background: dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.25)" }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Android (Material 3)
// ─────────────────────────────────────────────────────────────
const MD_C = {
  surface: "#f4fbf8",
  onSurface: "#171d1b",
  frameBorder: "rgba(116,119,117,0.5)",
};

function AndroidStatusBar({ dark = false }: { dark?: boolean }) {
  const c = dark ? "#fff" : MD_C.onSurface;
  return (
    <div
      style={{
        height: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        position: "relative",
        fontFamily: "Roboto, system-ui, sans-serif",
        flexShrink: 0,
      }}
    >
      <div style={{ width: 128, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 400, letterSpacing: 0.25, lineHeight: "20px", color: c }}>9:30</span>
      </div>
      <div style={{ position: "absolute", left: "50%", top: 8, transform: "translateX(-50%)", width: 24, height: 24, borderRadius: 100, background: "#2e2e2e" }} />
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", paddingRight: 2 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" style={{ marginRight: -2 }}>
            <path d="M8 13.3L.67 5.97a10.37 10.37 0 0114.66 0L8 13.3z" fill={c} />
          </svg>
          <svg width="16" height="16" viewBox="0 0 16 16" style={{ marginRight: -2 }}>
            <path d="M14.67 14.67V1.33L1.33 14.67h13.34z" fill={c} />
          </svg>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16">
          <rect x="3.75" y="2" width="8.5" height="13" rx="1.5" fill={c} />
          <rect x="5.5" y="0.9" width="5" height="2" rx="0.5" fill={c} />
        </svg>
      </div>
    </div>
  );
}

function AndroidNavBar({ dark = false }: { dark?: boolean }) {
  return (
    <div style={{ height: 24, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <div style={{ width: 108, height: 4, borderRadius: 2, background: dark ? "#fff" : MD_C.onSurface, opacity: 0.4 }} />
    </div>
  );
}

export function AndroidDevice({
  children,
  width = 412,
  height = 892,
  dark = false,
  frameBg,
}: {
  children: React.ReactNode;
  width?: number;
  height?: number;
  dark?: boolean;
  frameBg?: string;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 18,
        overflow: "hidden",
        background: frameBg || (dark ? "#1d1b20" : MD_C.surface),
        border: `8px solid ${MD_C.frameBorder}`,
        boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <AndroidStatusBar dark={dark} />
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>{children}</div>
      <AndroidNavBar dark={dark} />
    </div>
  );
}
