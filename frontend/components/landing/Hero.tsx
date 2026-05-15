"use client";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";

export function Hero() {
  const router = useRouter();

  return (
    <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white px-6 md:px-12 lg:px-24 pt-24 pb-32 overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 right-20 w-96 h-96 bg-[#00A3AD] rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#00A3AD] rounded-full blur-3xl" />
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <h1 className="text-[2.5rem] md:text-[3.5rem] lg:text-[4.5rem] leading-[1.1] tracking-tight font-bold">
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
              onClick={() => router.push("/isletme-ekle")}
              className="bg-white text-black px-10 py-4 rounded-xl text-lg font-semibold hover:shadow-2xl transition-all"
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
            className="relative flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-sm">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-[3rem] p-3 shadow-2xl border border-gray-700">
                <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl">
                  <div className="p-6 space-y-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Bugün</p>
                        <h2 className="text-2xl font-bold text-black">8 Randevu</h2>
                      </div>
                      <div className="bg-[#00A3AD] w-10 h-10 rounded-xl flex items-center justify-center text-xl">
                        📅
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-[#00A3AD] to-[#008A94] rounded-2xl p-5 text-white shadow-lg">
                      <p className="text-white/80 text-xs mb-1">Bu Ay Ciro</p>
                      <p className="text-3xl font-bold mb-3">₺24,850</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="bg-white/20 px-2 py-1 rounded-full">↗ %32</span>
                        <span className="text-white/80">geçen aya göre</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {[
                        { time: "14:00", name: "Ahmet Yılmaz", service: "Saç Kesimi" },
                        { time: "15:30", name: "Mehmet Demir", service: "Sakal Tıraşı" },
                        { time: "17:00", name: "Can Öztürk", service: "Saç + Sakal" },
                      ].map((apt, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                          className="bg-gray-50 rounded-xl p-3 flex items-center gap-3"
                        >
                          <div className="bg-[#00A3AD]/10 text-[#00A3AD] px-2 py-1 rounded-lg text-xs font-medium">
                            {apt.time}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-xs text-black">{apt.name}</p>
                            <p className="text-gray-500 text-[10px]">{apt.service}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
