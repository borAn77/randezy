"use client";
import { motion } from "motion/react";
import { Calendar, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Akıllı randevu yönetimi",
    description: "Randevularınızı kolayca planlayın, düzenleyin ve yönetin. Otomatik hatırlatmalar ve çakışma kontrolü ile hiç randevu kaçırmayın. Müşterileriniz online randevu alabilir, siz telefonda vakit kaybetmeyin.",
    mockupType: "calendar",
  },
  {
    icon: TrendingUp,
    title: "Gelir ve performans takibi",
    description: "İşletmenizin gelirini gerçek zamanlı takip edin. Günlük, haftalık ve aylık raporlar ile performansınızı analiz edin. Hangi hizmetler daha çok tercih ediliyor, öğrenin ve stratejinizi belirleyin.",
    mockupType: "analytics",
  },
];

export function Features() {
  return (
    <section className="bg-white py-20 px-6 md:px-12 lg:px-24">
      <div className="max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 text-black">
            İşletmeniz için her şey dahil
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            Profesyonel araçlarla işinizi bir üst seviyeye taşıyın
          </p>
        </motion.div>

        <div className="space-y-24 lg:space-y-32">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center"
            >
              <div className={`space-y-5 ${index % 2 === 1 ? "lg:order-2" : ""}`}>
                <div className="inline-flex items-center justify-center bg-[#00A3AD]/10 w-14 h-14 rounded-xl">
                  <feature.icon className="w-7 h-7 text-[#00A3AD]" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-black">{feature.title}</h3>
                <p className="text-base md:text-lg text-gray-600 leading-relaxed">{feature.description}</p>
              </div>

              <div className={`${index % 2 === 1 ? "lg:order-1" : ""}`}>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 md:p-8">
                  <div className="bg-white rounded-xl shadow-xl p-5 md:p-6 space-y-4">
                    {feature.mockupType === "calendar" && (
                      <>
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-lg font-bold text-black">Mayıs 2026</h4>
                          <div className="text-[#00A3AD] text-xs font-semibold">Bu Hafta: 24 Randevu</div>
                        </div>
                        <div className="grid grid-cols-7 gap-2 text-center text-[10px] text-gray-500 mb-2">
                          {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => (
                            <div key={day} className="font-medium">{day}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                          {Array.from({ length: 35 }, (_, i) => (
                            <div
                              key={i}
                              className={`aspect-square flex items-center justify-center rounded-lg text-xs ${
                                i === 14
                                  ? "bg-[#00A3AD] text-white font-bold"
                                  : i % 5 === 0
                                  ? "bg-[#00A3AD]/10 text-[#00A3AD] font-medium"
                                  : "text-gray-400"
                              }`}
                            >
                              {i + 1}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {feature.mockupType === "analytics" && (
                      <div className="space-y-3">
                        <div className="bg-gradient-to-br from-[#00A3AD] to-[#008A94] text-white rounded-xl p-4">
                          <p className="text-xs mb-1 opacity-80">Bu Ay Toplam Gelir</p>
                          <p className="text-3xl font-bold">₺47,250</p>
                          <p className="text-xs mt-2 opacity-90">↗ %45 artış (geçen aya göre)</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs text-gray-600 mb-1">Toplam Randevu</p>
                            <p className="text-2xl font-bold text-black">156</p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs text-gray-600 mb-1">Ortalama Sepet</p>
                            <p className="text-2xl font-bold text-black">₺303</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-gray-600 font-semibold">Popüler Hizmetler</p>
                          {[
                            { name: "Saç Kesimi", count: 67, color: "#00A3AD" },
                            { name: "Sakal Tıraşı", count: 45, color: "#008A94" },
                            { name: "Saç + Sakal", count: 44, color: "#006D77" },
                          ].map((service) => (
                            <div key={service.name} className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full"
                                  style={{ width: `${(service.count / 67) * 100}%`, backgroundColor: service.color }}
                                />
                              </div>
                              <span className="text-xs text-gray-600 w-16">{service.count} adet</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
