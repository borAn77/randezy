"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { IOSDevice, AndroidDevice } from "./calendar/devices";
import { CalendarApp } from "./calendar/CalendarApp";

const IOS_W = 402;
const AND_W = 412;
const GAP = 56;
const NATURAL_H = 922;
const MOBILE_BREAK = 560;

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
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<"ios" | "android">("ios");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fit = () => {
      const avail = el.clientWidth;
      const mobile = avail < MOBILE_BREAK;
      setIsMobile(mobile);
      const naturalW = mobile ? IOS_W : IOS_W + GAP + AND_W;
      setScale(Math.min(1, avail / naturalW));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const naturalW = isMobile ? IOS_W : IOS_W + GAP + AND_W;

  return (
    <div ref={containerRef} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {isMobile && (
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "oklch(0.93 0.01 60)", borderRadius: 999, padding: 4 }}>
          {(["ios", "android"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "7px 22px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.4,
                background: activeTab === tab ? "var(--primary)" : "transparent",
                color: activeTab === tab ? "#fff" : "oklch(0.50 0.006 60)",
                transition: "all 0.18s ease",
                fontFamily: "var(--font-ui)",
              }}
            >
              {tab === "ios" ? "iOS" : "Android"}
            </button>
          ))}
        </div>
      )}

      <div style={{ width: naturalW * scale, height: NATURAL_H * scale }}>
        <div
          style={{
            transformOrigin: "top left",
            transform: `scale(${scale})`,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: isMobile ? 0 : GAP,
            width: naturalW,
            height: NATURAL_H,
          }}
        >
          {(!isMobile || activeTab === "ios") && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              {!isMobile && <PhoneLabel>iOS</PhoneLabel>}
              <IOSDevice>
                <CalendarApp platform="ios" initialView="gun" />
              </IOSDevice>
            </div>
          )}
          {(!isMobile || activeTab === "android") && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              {!isMobile && <PhoneLabel>Android</PhoneLabel>}
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
