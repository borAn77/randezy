import LegalLayout from "../../components/layout/LegalLayout";

export const metadata = { title: "İşletme Kullanım Sözleşmesi — Randezy" };

export default function IsletmeSozlesmesiPage() {
  return (
    <LegalLayout
      title="İşletme Kullanım Sözleşmesi"
      subtitle="Randezy üzerinden hizmet listeleyen işletme sahipleri için geçerlidir"
      sections={[
        {
          title: "1. Taraflar ve Kapsam",
          content: `Bu sözleşme, Randezy platformuna (HM MARKETING SP. Z O.O. — randezy.com) kayıtlı işletme hesabı açan gerçek veya tüzel kişi ile platform arasındaki kullanım koşullarını düzenler. Randezy, HM MARKETING SP. Z O.O. tarafından işletilmektedir.`,
        },
        {
          title: "2. İşletme Hesabı",
          content: `• İşletme hesabı oluşturmak için gerçek ve güncel bilgi verilmesi zorunludur.
• Her e-posta adresiyle yalnızca bir işletme hesabı açılabilir.
• Hesap bilgilerinin gizliliği ve güvenliği işletme sahibinin sorumluluğundadır.
• Başkası adına veya gerçek olmayan işletme bilgileriyle hesap oluşturmak yasaktır.`,
        },
        {
          title: "3. İşletme Yükümlülükleri",
          content: `İşletme sahibi olarak aşağıdaki yükümlülükleri kabul etmiş sayılırsınız:

• Sunulan hizmetler, fiyatlar ve çalışma saatlerini doğru ve güncel tutmak.
• Onaylanan randevulara uymak; katılamayacağınız durumlarda müşteriyi önceden bilgilendirmek.
• Müşteri ile saygılı ve dürüst bir iletişim sürdürmek.
• Platformda listelenen hizmetlerin gerçekte sunulabilir nitelikte olmasını sağlamak.`,
        },
        {
          title: "4. Müşteri Verilerinin Kullanımı",
          content: `Randezy aracılığıyla elde ettiğiniz müşteri verileri (ad, iletişim, randevu geçmişi) yalnızca randevu hizmetinin ifası amacıyla kullanılabilir.

Bu veriler:
• Üçüncü taraflarla paylaşılamaz ve satılamaz
• Pazarlama veya reklam amacıyla kullanılamaz
• Randezy dışındaki sistemlere aktarılamaz

Bu yükümlülüğün ihlali hesabın kalıcı olarak kapatılmasına ve hukuki yaptırımlara yol açabilir.`,
        },
        {
          title: "5. İçerik Sorumluluğu",
          content: `İşletme profil bilgileri, hizmet açıklamaları, fiyatlar ve yüklenen görsellerin doğruluğu ve yasallığı işletme sahibine aittir. Yanıltıcı, telif hakkını ihlal eden veya müstehcen içerik yüklenmesi yasaktır.`,
        },
        {
          title: "6. Pilot Dönem ve Ücretlendirme",
          content: `Mevcut pilot aşamada platform hizmetleri ücretsiz sunulmaktadır. Ücretlendirme politikasında yapılacak değişiklikler, yürürlük tarihinden en az 30 gün önce kayıtlı e-posta adresine bildirilecektir.`,
        },
        {
          title: "7. Hesabın Askıya Alınması",
          content: `Aşağıdaki durumlarda işletme hesabı önceden bildirimde bulunmaksızın askıya alınabilir veya kapatılabilir:

• Kullanım koşullarının ihlali
• Müşteri verilerinin kötüye kullanımı
• Tekrarlayan müşteri şikayetleri
• Yanıltıcı içerik yayımlanması`,
        },
        {
          title: "8. İletişim",
          content: `destek@randezy.com`,
        },
      ]}
    />
  );
}
