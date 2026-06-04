"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

type ScreenId = "home" | "calendar" | "customers" | "reports";

const TABS: { id: ScreenId; label: string; emoji: string }[] = [
  { id: "home", label: "Ana Ekran", emoji: "🏠" },
  { id: "calendar", label: "Takvim", emoji: "📅" },
  { id: "customers", label: "Müşteriler", emoji: "👥" },
  { id: "reports", label: "Raporlar", emoji: "📊" },
];

function HomeContent() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-400 text-[9px] mb-0.5">Bugün</p>
          <h2 className="text-xl font-bold text-black">8 Randevu</h2>
        </div>
        <div className="bg-[#00A3AD] w-9 h-9 rounded-xl flex items-center justify-center text-base">📅</div>
      </div>
      <div className="bg-gradient-to-br from-[#00A3AD] to-[#007A82] rounded-2xl p-4 text-white shadow-lg">
        <p className="text-[9px] opacity-70 mb-0.5">Bu Ay Ciro</p>
        <p className="text-2xl font-bold mb-2">₺24,850</p>
        <div className="flex items-center gap-1.5">
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-[9px]">↗ %32</span>
          <span className="text-[9px] opacity-70">geçen aya göre</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {[
          { time: "14:00", name: "Ahmet Yılmaz", service: "Saç Kesimi" },
          { time: "15:30", name: "Mehmet Demir", service: "Sakal Tıraşı" },
          { time: "17:00", name: "Can Öztürk", service: "Saç + Sakal" },
        ].map((apt) => (
          <div
            key={apt.time}
            className="bg-gray-50 rounded-xl p-2.5 flex items-center gap-2 hover:bg-[#00A3AD]/5 transition-colors cursor-pointer"
          >
            <div className="bg-[#00A3AD]/10 text-[#00A3AD] px-1.5 py-0.5 rounded-lg text-[9px] font-semibold flex-shrink-0">
              {apt.time}
            </div>
            <div>
              <p className="font-semibold text-[10px] text-black leading-tight">{apt.name}</p>
              <p className="text-gray-400 text-[9px]">{apt.service}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarContent() {
  const [selectedDay, setSelectedDay] = useState(4);
  const bookedDays = [1, 4, 7, 10, 14, 18, 21, 25, 28];

  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-black">Haziran 2026</h3>
        <span className="text-[#00A3AD] text-[9px] font-semibold bg-[#00A3AD]/10 px-2 py-0.5 rounded-full">
          24 Randevu
        </span>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((d) => (
          <div key={d} className="text-[8px] text-gray-400 font-medium py-0.5">
            {d}
          </div>
        ))}
        {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDay(d)}
            className={`aspect-square flex items-center justify-center rounded-lg text-[9px] transition-all ${
              d === selectedDay
                ? "bg-[#00A3AD] text-white font-bold"
                : bookedDays.includes(d)
                ? "bg-[#00A3AD]/10 text-[#00A3AD] font-medium hover:bg-[#00A3AD]/20"
                : "text-gray-400 hover:bg-gray-100"
            }`}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="space-y-1">
        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">
          {selectedDay} Haziran
        </p>
        {bookedDays.includes(selectedDay) ? (
          [
            { time: "09:00", name: "Ayşe K.", color: "bg-purple-50 text-purple-600" },
            { time: "11:30", name: "Fatma Ş.", color: "bg-green-50 text-green-600" },
          ].map((apt, i) => (
            <div
              key={i}
              className={`${apt.color} rounded-lg p-2 flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity`}
            >
              <span className="text-[9px] font-bold">{apt.time}</span>
              <span className="text-[9px]">{apt.name}</span>
            </div>
          ))
        ) : (
          <p className="text-[9px] text-gray-300 text-center py-2">Randevu yok</p>
        )}
      </div>
    </div>
  );
}

function CustomersContent() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-black">Müşteriler</h3>
        <span className="bg-[#00A3AD]/10 text-[#00A3AD] text-[9px] font-semibold px-2 py-0.5 rounded-full">
          142 kişi
        </span>
      </div>
      <div className="bg-gray-50 rounded-xl px-3 py-2 flex items-center gap-1.5">
        <span className="text-gray-300 text-xs">🔍</span>
        <span className="text-gray-300 text-[10px]">Müşteri ara...</span>
      </div>
      <div className="space-y-1.5">
        {[
          { name: "Ahmet Yılmaz", visits: 12, last: "2 gün önce", initials: "AY" },
          { name: "Mehmet Demir", visits: 8, last: "5 gün önce", initials: "MD" },
          { name: "Can Öztürk", visits: 6, last: "1 hafta", initials: "CÖ" },
          { name: "Ali Koç", visits: 4, last: "2 hafta", initials: "AK" },
        ].map((c, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-[#00A3AD]/15 flex items-center justify-center text-[#00A3AD] text-[8px] font-bold flex-shrink-0">
              {c.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-black leading-tight">{c.name}</p>
              <p className="text-[8px] text-gray-400">
                {c.visits} ziyaret • {c.last}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsContent() {
  return (
    <div className="p-4 space-y-3">
      <h3 className="text-sm font-bold text-black">Raporlar</h3>
      <div className="bg-gradient-to-br from-[#00A3AD] to-[#007A82] text-white rounded-2xl p-4">
        <p className="text-[9px] opacity-70 mb-0.5">Bu Ay Toplam Gelir</p>
        <p className="text-xl font-bold mb-1">₺47,250</p>
        <p className="text-[9px] opacity-80">↗ %45 artış (geçen aya göre)</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50 rounded-xl p-2.5">
          <p className="text-[8px] text-gray-500 mb-0.5">Toplam Randevu</p>
          <p className="text-lg font-bold text-black">156</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2.5">
          <p className="text-[8px] text-gray-500 mb-0.5">Ort. Sepet</p>
          <p className="text-lg font-bold text-black">₺303</p>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">
          Popüler Hizmetler
        </p>
        {[
          { name: "Saç Kesimi", count: 67, pct: 100 },
          { name: "Sakal Tıraşı", count: 45, pct: 67 },
          { name: "Saç + Sakal", count: 44, pct: 66 },
        ].map((s) => (
          <div key={s.name} className="space-y-0.5">
            <div className="flex justify-between text-[8px]">
              <span className="text-gray-600">{s.name}</span>
              <span className="text-gray-400">{s.count}</span>
            </div>
            <div className="bg-gray-100 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-[#00A3AD] transition-all duration-700"
                style={{ width: `${s.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenContent({ screenId }: { screenId: ScreenId }) {
  switch (screenId) {
    case "home":
      return <HomeContent />;
    case "calendar":
      return <CalendarContent />;
    case "customers":
      return <CustomersContent />;
    case "reports":
      return <ReportsContent />;
  }
}

function SignalIcon({ color }: { color: string }) {
  return (
    <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
      <rect x="0" y="5" width="2" height="4" rx="0.5" fill={color} opacity="0.4" />
      <rect x="3" y="3" width="2" height="6" rx="0.5" fill={color} opacity="0.6" />
      <rect x="6" y="1.5" width="2" height="7.5" rx="0.5" fill={color} opacity="0.8" />
      <rect x="9" y="0" width="2" height="9" rx="0.5" fill={color} />
    </svg>
  );
}

function BatteryIcon({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-0.5">
      <div
        className="w-5 h-2.5 rounded-sm flex items-center px-0.5"
        style={{ border: `1px solid ${color}`, opacity: 0.7 }}
      >
        <div
          className="h-full rounded-sm"
          style={{ width: "80%", backgroundColor: color }}
        />
      </div>
      <div
        className="w-0.5 h-1 rounded-r-sm"
        style={{ backgroundColor: color, opacity: 0.5 }}
      />
    </div>
  );
}

export function MobilePreview() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>("home");

  return (
    <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-20 px-6 md:px-12 lg:px-24 overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/2 -translate-y-1/2 left-1/4 w-64 h-64 bg-[#00A3AD] rounded-full blur-3xl" />
        <div className="absolute top-1/2 -translate-y-1/2 right-1/4 w-64 h-64 bg-[#00A3AD] rounded-full blur-3xl" />
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10 flex flex-col items-center">
        {/* Tab switcher */}
        <div className="flex gap-1.5 bg-white/5 backdrop-blur-sm p-1.5 rounded-2xl border border-white/10 mb-12">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveScreen(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                activeScreen === tab.id
                  ? "bg-[#00A3AD] text-white shadow-lg shadow-[#00A3AD]/30"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              <span>{tab.emoji}</span>
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Phones row */}
        <div className="flex items-end justify-center gap-6 md:gap-12 lg:gap-20">
          {/* ─── iOS Phone ─── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
            style={{ transform: "rotate(-4deg)" }}
          >
            <div className="w-[210px] bg-gradient-to-br from-slate-200 to-slate-300 rounded-[2.8rem] p-[3px] shadow-2xl">
              {/* Hardware buttons */}
              <div className="absolute -left-[3px] top-20 w-[3px] h-7 bg-slate-400 rounded-l-sm" />
              <div className="absolute -left-[3px] top-32 w-[3px] h-10 bg-slate-400 rounded-l-sm" />
              <div className="absolute -left-[3px] top-[172px] w-[3px] h-10 bg-slate-400 rounded-l-sm" />
              <div className="absolute -right-[3px] top-28 w-[3px] h-14 bg-slate-400 rounded-r-sm" />

              <div className="bg-white rounded-[2.5rem] overflow-hidden">
                {/* Status bar */}
                <div className="relative px-6 pt-[14px] pb-1 flex justify-between items-center">
                  <span className="text-[9px] font-bold text-black">9:41</span>
                  {/* Dynamic Island */}
                  <div className="absolute top-[10px] left-1/2 -translate-x-1/2 bg-black rounded-full w-[68px] h-[22px]" />
                  <div className="flex items-center gap-1">
                    <SignalIcon color="black" />
                    <BatteryIcon color="black" />
                  </div>
                </div>

                {/* Screen */}
                <div className="overflow-hidden" style={{ minHeight: 390 }}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeScreen}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.22, ease: "easeInOut" }}
                    >
                      <ScreenContent screenId={activeScreen} />
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Bottom nav */}
                <div className="border-t border-gray-100 px-1 pt-2 pb-1">
                  <div className="flex justify-around">
                    {TABS.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveScreen(tab.id)}
                        className="flex flex-col items-center gap-0.5 px-1 py-0.5"
                      >
                        <span
                          className={`text-[15px] transition-transform ${
                            activeScreen === tab.id ? "scale-110" : "scale-100 opacity-40"
                          }`}
                        >
                          {tab.emoji}
                        </span>
                        <span
                          className={`text-[7px] font-medium ${
                            activeScreen === tab.id ? "text-[#00A3AD]" : "text-gray-300"
                          }`}
                        >
                          {tab.label.split(" ")[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Home indicator */}
                <div className="flex justify-center pb-2 pt-0.5">
                  <div className="w-24 h-[3.5px] bg-black/15 rounded-full" />
                </div>
              </div>
            </div>

            {/* iOS label */}
            <div className="mt-5 flex justify-center items-center gap-1.5 text-white/40 text-[11px] font-medium">
              <svg width="13" height="13" viewBox="0 0 814 1000" fill="currentColor">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.2-49.6 190.5-49.6zm-174.1-66.3c-7.7 35.9-22.5 67.3-44.5 92.9-21.9 25.8-51.5 44.8-82.5 44.8-3.8 0-7.7-.4-11.5-.8 7.7-33.9 22.5-65.9 46.5-90.9 23.9-25.1 54.5-45.5 91.1-52.9 0 2.4.9 4.8.9 6.9z" />
              </svg>
              <span>iOS</span>
            </div>
          </motion.div>

          {/* ─── Android Phone ─── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative hidden md:block"
            style={{ transform: "rotate(4deg)" }}
          >
            <div className="w-[210px] bg-gradient-to-br from-gray-700 to-gray-800 rounded-[2.5rem] p-[3px] shadow-2xl border border-gray-600/50">
              {/* Hardware buttons */}
              <div className="absolute -right-[3px] top-24 w-[3px] h-10 bg-gray-600 rounded-r-sm" />
              <div className="absolute -left-[3px] top-20 w-[3px] h-7 bg-gray-600 rounded-l-sm" />
              <div className="absolute -left-[3px] top-32 w-[3px] h-7 bg-gray-600 rounded-l-sm" />

              <div className="bg-gray-900 rounded-[2.3rem] overflow-hidden">
                {/* Status bar */}
                <div className="relative px-5 pt-3 pb-1 flex justify-between items-center">
                  <span className="text-[9px] font-medium text-white">9:41</span>
                  {/* Punch-hole camera */}
                  <div className="absolute top-2 right-1/2 translate-x-1/2 w-5 h-5 rounded-full bg-gray-900 border-2 border-gray-800 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
                  </div>
                  <div className="flex items-center gap-1">
                    <SignalIcon color="white" />
                    <BatteryIcon color="white" />
                  </div>
                </div>

                {/* Screen content */}
                <div
                  className="bg-white overflow-hidden mx-1 rounded-[1.3rem]"
                  style={{ minHeight: 390 }}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeScreen}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.22, ease: "easeInOut" }}
                    >
                      <ScreenContent screenId={activeScreen} />
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Android bottom nav */}
                <div className="flex justify-around items-center px-4 py-2">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveScreen(tab.id)}
                      className="flex flex-col items-center gap-0.5"
                    >
                      <span
                        className={`text-[15px] transition-transform ${
                          activeScreen === tab.id ? "scale-110" : "scale-100 opacity-40"
                        }`}
                      >
                        {tab.emoji}
                      </span>
                      <span
                        className={`text-[7px] font-medium ${
                          activeScreen === tab.id ? "text-[#00A3AD]" : "text-white/40"
                        }`}
                      >
                        {tab.label.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Gesture bar */}
                <div className="flex justify-center pb-3">
                  <div className="w-20 h-[3.5px] bg-white/20 rounded-full" />
                </div>
              </div>
            </div>

            {/* Android label */}
            <div className="mt-5 flex justify-center items-center gap-1.5 text-white/40 text-[11px] font-medium">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 0.976l-1.35 2.338A7.363 7.363 0 0 0 12 2.25a7.363 7.363 0 0 0-4.173 1.064L6.477.976a.5.5 0 0 0-.862.504l1.327 2.298A7.388 7.388 0 0 0 4.5 9H19.5a7.388 7.388 0 0 0-2.442-5.222L18.385 1.48a.5.5 0 0 0-.862-.504zM9 6.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm6 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM4.5 10.5v8a1.5 1.5 0 0 0 3 0v-8h-3zm12 0v8a1.5 1.5 0 0 0 3 0v-8h-3zM6 10.5h12v7.25A2.25 2.25 0 0 1 15.75 20h-7.5A2.25 2.25 0 0 1 6 17.75V10.5z" />
              </svg>
              <span>Android</span>
            </div>
          </motion.div>
        </div>

        {/* App store buttons */}
        <div className="flex flex-wrap justify-center gap-4 mt-14">
          <div className="flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-all border border-white/10 rounded-2xl px-6 py-3.5 cursor-pointer">
            <svg width="22" height="22" viewBox="0 0 814 1000" fill="white">
              <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.2-49.6 190.5-49.6zm-174.1-66.3c-7.7 35.9-22.5 67.3-44.5 92.9-21.9 25.8-51.5 44.8-82.5 44.8-3.8 0-7.7-.4-11.5-.8 7.7-33.9 22.5-65.9 46.5-90.9 23.9-25.1 54.5-45.5 91.1-52.9 0 2.4.9 4.8.9 6.9z" />
            </svg>
            <div>
              <p className="text-[9px] text-white/40 leading-none">Şimdi İndir</p>
              <p className="text-[13px] font-semibold text-white leading-tight">App Store</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-all border border-white/10 rounded-2xl px-6 py-3.5 cursor-pointer">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M3.18 23.76A2 2 0 0 0 5 24c.57 0 1.12-.15 1.59-.43l10.8-6.24-3.29-3.29L3.18 23.76zm-1.64-19.3A2 2 0 0 0 1 6v12a2 2 0 0 0 .54 1.54l.09.08L12 9.27l-10.37-4.9-.09.09zm20.52 7.9L19.5 9.9 15.8 13.6l3.7 3.7 2.57-1.48a2 2 0 0 0 0-3.46zM5 0c-.57 0-1.12.15-1.59.43L13.76 9.8l3.29-3.29L6.59.43A1.98 1.98 0 0 0 5 0z" />
            </svg>
            <div>
              <p className="text-[9px] text-white/40 leading-none">Şimdi İndir</p>
              <p className="text-[13px] font-semibold text-white leading-tight">Google Play</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
