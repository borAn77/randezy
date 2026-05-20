"use client";
import { motion } from "motion/react";
import { Scissors, Sparkles, Heart } from "lucide-react";

const industries = [
  {
    icon: Scissors,
    title: "Kuaför & Berber",
    description: "Saç kesimi, renklendirme ve sakal bakımı randevularınızı kolayca yönetin.",
    color: "#00A3AD",
  },
  {
    icon: Sparkles,
    title: "Güzellik Merkezi",
    description: "Cilt bakımı, manikür, pedikür ve diğer güzellik hizmetlerinizi organize edin.",
    color: "#00A3AD",
  },
  {
    icon: Heart,
    title: "Spa & Masaj",
    description: "Wellness ve rahatlama hizmetleriniz için profesyonel randevu sistemi.",
    color: "#00A3AD",
  },
];

export function Industries() {
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
            Her sektör için özel çözümler
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            İşletmenizin ihtiyaçlarına göre özelleştirilebilir
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {industries.map((industry, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-shadow"
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
                style={{ backgroundColor: `${industry.color}15` }}
              >
                <industry.icon className="w-7 h-7" style={{ color: industry.color }} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3 text-black">{industry.title}</h3>
              <p className="text-base text-gray-600 leading-relaxed">{industry.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
