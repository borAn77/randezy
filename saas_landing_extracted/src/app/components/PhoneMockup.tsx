import { useEffect, useRef, useState } from "react";
import { IOSDevice, AndroidDevice } from "./calendar/devices";
import { CalendarApp } from "./calendar/CalendarApp";

// Randezy Takvim prototipi — tema CSS değişkenleri (Okyanus mavisi),
// fontlar ve sheet animasyonları. Yalnızca .rdz-cal-scope altına uygulanır.
const SCOPE_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

.rdz-cal-scope {
  --font-ui: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;

  --bg: oklch(0.985 0.004 70);
  --surface: #ffffff;
  --frame-bg: oklch(0.985 0.004 70);
  --text: oklch(0.22 0.008 60);
  --text-mut: oklch(0.50 0.006 60);
  --text-sub: oklch(0.66 0.005 60);
  --separator: oklch(0.92 0.005 60);
  --separator-soft: oklch(0.95 0.005 60);
  --now: oklch(0.62 0.20 28);

  /* Okyanus (derin mavi) teması — HTML prototipinde seçili */
  --primary: oklch(0.58 0.14 250);
  --primary-soft: oklch(0.94 0.04 250);
  --primary-tint: oklch(0.97 0.022 250);
  --primary-text: oklch(0.35 0.13 250);
  --primary-shadow: oklch(0.58 0.14 250 / 0.35);

  -webkit-font-smoothing: antialiased;
}

@keyframes sheetIn { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes sheetFadeIn { from { opacity: 0; } to { opacity: 1; } }
`;

const IOS_W = 402;
const AND_W = 412;
const GAP = 16;
const NATURAL_H = 892;

export function PhoneMockup() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.7);
  const [showAndroid, setShowAndroid] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fit = () => {
      const avail = el.clientWidth;
      // Genişlik yeterliyse iki telefonu da göster, değilse sadece iOS
      const both = avail >= 500;
      const naturalW = both ? IOS_W + GAP + AND_W : IOS_W;
      const s = Math.min(0.92, avail / naturalW);
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
    <div className="rdz-cal-scope" ref={containerRef} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <style>{SCOPE_STYLE}</style>
      <div style={{ width: naturalW * scale, height: NATURAL_H * scale }}>
        <div
          style={{
            transformOrigin: "top left",
            transform: `scale(${scale})`,
            display: "flex",
            alignItems: "flex-end",
            gap: GAP,
            width: naturalW,
            height: NATURAL_H,
          }}
        >
          <IOSDevice>
            <CalendarApp platform="ios" initialView="gun" />
          </IOSDevice>
          {showAndroid && (
            <AndroidDevice frameBg="var(--bg)">
              <CalendarApp platform="android" initialView="hafta" />
            </AndroidDevice>
          )}
        </div>
      </div>
    </div>
  );
}
