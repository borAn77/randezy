"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { IOSDevice, AndroidDevice } from "./calendar/devices";
import { CalendarApp } from "./calendar/CalendarApp";

// İki telefonlu sahne (iOS Gün + Android Hafta). Tema CSS değişkenleri üst
// öğedeki .rdz-cal-scope sınıfından gelir. Konteyner genişliğine göre ölçeklenir.
const IOS_W = 402;
const AND_W = 412;
const GAP = 56;
const NATURAL_H = 922; // telefon + üst etiket alanı

function PhoneLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        color: "oklch(0.45 0.04 50)",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: 999, background: "var(--primary)" }} />
      {children}
    </div>
  );
}

export function PhoneMockup() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [showAndroid, setShowAndroid] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fit = () => {
      const avail = el.clientWidth;
      // Genişlik yeterliyse iki telefonu da göster, değilse sadece iOS
      const both = avail >= 560;
      const naturalW = both ? IOS_W + GAP + AND_W : IOS_W;
      const s = Math.min(1, avail / naturalW);
      setShowAndroid(both);
      setScale(s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const naturalW = showAndroid ? IOS_W + GAP + AND_W : IOS_W;

  return (
    <div ref={containerRef} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <div style={{ width: naturalW * scale, height: NATURAL_H * scale }}>
        <div
          style={{
            transformOrigin: "top left",
            transform: `scale(${scale})`,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: GAP,
            width: naturalW,
            height: NATURAL_H,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <PhoneLabel>iOS</PhoneLabel>
            <IOSDevice>
              <CalendarApp platform="ios" initialView="gun" />
            </IOSDevice>
          </div>
          {showAndroid && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <PhoneLabel>Android</PhoneLabel>
              <AndroidDevice frameBg="var(--bg)">
                <CalendarApp platform="android" initialView="hafta" />
              </AndroidDevice>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
