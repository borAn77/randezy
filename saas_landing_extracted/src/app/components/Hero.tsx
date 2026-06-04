import { motion } from "motion/react";
import { PhoneMockup } from "./PhoneMockup";

export function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white px-6 md:px-12 lg:px-24 pt-24 pb-32 overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 right-20 w-96 h-96 bg-[#00A3AD] rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#00A3AD] rounded-full blur-3xl" />
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Sol taraf - Slogan */}
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
              Randevularınızı otomatik yönetin, müşterilerinizle WhatsApp üzerinden iletişim kurun ve işletmenizin performansını gerçek zamanlı takip edin.
            </p>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white text-black px-10 py-4 rounded-xl text-lg font-semibold hover:shadow-2xl transition-all"
            >
              Ücretsiz dene
            </motion.button>

            <p className="text-sm text-gray-400">
              Kredi kartı gerektirmez • Anında kurulum
            </p>
          </motion.div>

          {/* Sağ taraf - iOS & Android mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="relative flex justify-center lg:justify-end"
          >
            <PhoneMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
