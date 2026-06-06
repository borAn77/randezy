"use client";
import { motion } from "motion/react";
import { PhoneMockup } from "./PhoneMockup";

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

export function Hero({ onStart }: { onStart?: () => void }) {
  return (
    <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white px-4 sm:px-6 md:px-12 lg:px-24 pt-20 pb-16 md:pt-24 md:pb-32 overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 right-20 w-96 h-96 bg-[#00A3AD] rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#00A3AD] rounded-full blur-3xl" />
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-24 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <h1 className="text-[2rem] sm:text-[2.5rem] md:text-[3.5rem] lg:text-[4.5rem] leading-[1.1] tracking-tight font-bold">
              Telefonu kapat,
              <br />
              işini büyüt.
            </h1>

            <p className="text-lg md:text-xl text-gray-300 max-w-xl leading-relaxed">
              Randevularınızı otomatik yönetin, takviminizi saniyeler içinde düzenleyin ve işletmenizin performansını gerçek zamanlı takip edin.
            </p>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStart}
              className="bg-white text-black px-8 py-3 md:px-10 md:py-4 rounded-xl text-base md:text-lg font-semibold hover:shadow-2xl transition-all"
            >
              Ücretsiz dene
            </motion.button>

            <p className="text-sm text-gray-400">
              Kredi kartı gerektirmez • Anında kurulum
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="rdz-cal-scope relative w-full"
          >
            <style>{SCOPE_STYLE}</style>
            <PhoneMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
