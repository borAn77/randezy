"use client";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

const features = [
  "Sınırsız randevu",
  "Otomatik hatırlatmalar",
  "Gelir raporları",
  "Müşteri yönetimi",
  "Online rezervasyon sayfası",
  "7/24 destek",
  "Mobil uygulama erişimi",
];

export function Pricing() {
  const router = useRouter();

  return (
    <section className="bg-gray-50 py-20 px-6 md:px-12 lg:px-24">
      <div className="max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-block bg-[#00A3AD]/10 border border-[#00A3AD]/30 text-[#00A3AD] px-4 py-2 rounded-full text-sm font-semibold mb-5">
            🎉 Lansma Kampanyası
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 text-black">
            Şimdi tam zamanı
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            Lansma döneminde tüm özellikler tamamen ücretsiz
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <div className="bg-white text-black rounded-2xl p-8 md:p-10 shadow-lg border border-gray-200">
            <div className="text-center mb-8">
              <h3 className="text-xl md:text-2xl font-bold mb-3 text-black">Randezy Pro</h3>
              <div className="flex items-end justify-center gap-3 mb-2">
                <span className="text-6xl md:text-7xl font-bold text-black">₺0</span>
                <span className="text-2xl md:text-3xl text-gray-400 line-through mb-3">₺299</span>
              </div>
              <p className="text-base md:text-lg text-gray-600">
                Lansma süresince <span className="text-[#00A3AD] font-bold">tamamen ücretsiz</span>
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-x-6 gap-y-3 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="flex items-center gap-2"
                >
                  <div className="bg-[#00A3AD] rounded-full p-0.5 flex-shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm md:text-base text-gray-700">{feature}</span>
                </motion.div>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/isletme-ekle")}
              className="w-full bg-black hover:bg-gray-800 text-white py-4 rounded-xl text-lg md:text-xl font-semibold transition-all"
            >
              Hemen başla
            </motion.button>

            <p className="text-center text-gray-500 mt-4 text-xs md:text-sm">
              Kredi kartı gerektirmez • Anında kurulum • İstediğiniz zaman iptal edin
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-16"
        >
          <p className="text-gray-600 text-sm mb-5">
            Türkiye&apos;nin önde gelen işletmelerinin tercihi
          </p>
          <div className="flex flex-wrap justify-center gap-5 items-center">
            {["Kuaför", "Berber", "Güzellik Merkezi", "Spa", "Tırnak"].map((business, index) => (
              <span key={index} className="text-base md:text-lg font-medium text-gray-400">
                {business}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
