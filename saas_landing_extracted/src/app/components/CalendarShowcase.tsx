import { PhoneMockup } from "./PhoneMockup";

// Randezy Takvim prototipi bölümü — HTML prototipinin birebir karşılığı:
// bej arka plan, ortada başlık bloğu, yan yana iOS + Android telefonlar.
// Tema değişkenleri (Okyanus mavisi) + fontlar yalnızca .rdz-cal-scope altında.
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

export function CalendarShowcase() {
  return (
    <section
      className="rdz-cal-scope"
      style={{
        background: "#ECE7DF",
        backgroundImage:
          "radial-gradient(at 20% 10%, oklch(0.97 0.012 70) 0px, transparent 60%), radial-gradient(at 80% 90%, oklch(0.94 0.018 50) 0px, transparent 65%)",
        padding: "56px 24px 80px",
        overflow: "hidden",
      }}
    >
      <style>{SCOPE_STYLE}</style>

      {/* Başlık bloğu */}
      <div style={{ maxWidth: 900, margin: "0 auto 36px", textAlign: "center" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "oklch(0.45 0.04 50)",
            marginBottom: 8,
          }}
        >
          Randezy · İşletme Paneli
        </div>
        <h2
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: -0.8,
            margin: "0 0 6px",
            color: "var(--text)",
          }}
        >
          Randevu Takvimi · Mobil Prototip
        </h2>
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 14,
            color: "oklch(0.45 0.01 60)",
            maxWidth: 580,
            margin: "0 auto",
            lineHeight: 1.55,
          }}
        >
          Çok sektörlü bir randevu işletmesi için takvim ekranı. Gün · Hafta · Ay · Çalışan kolonları · Liste görünümleri, tarih seçici, çalışan
          filtresi, arama ve durum güncelleme.
        </p>
      </div>

      {/* Telefonlar */}
      <PhoneMockup />
    </section>
  );
}
