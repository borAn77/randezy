"use client";
import { motion } from "motion/react";

const stats = [
  { value: "50K+", label: "Aktif Kullanıcı", description: "Randezy ile işlerini yönetiyor" },
  { value: "%87", label: "Zaman Tasarrufu", description: "Manuel işlemlerde azalma" },
  { value: "2M+", label: "Randevu", description: "Başarıyla tamamlandı" },
  { value: "%99.9", label: "Müşteri Memnuniyeti", description: "5 yıldız değerlendirme" },
];

export function Stats() {
  return (
    <section className="bg-white py-20 px-6 md:px-12 lg:px-24">
      <div className="max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 text-black">
            Rakamlarla Randezy
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            Binlerce işletme sahibinin güvendiği platform
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="text-center space-y-2"
            >
              <div className="text-4xl md:text-5xl font-bold text-black mb-2">{stat.value}</div>
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-1 text-black">{stat.label}</h3>
                <p className="text-sm text-gray-600">{stat.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
