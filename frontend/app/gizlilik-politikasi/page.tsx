import LegalLayout from "../../components/layout/LegalLayout";

export const metadata = { title: "Gizlilik Politikası — Randezy" };

export default function GizlilikPolitikasiPage() {
  return (
    <LegalLayout
      title="Gizlilik Politikası"
      subtitle="Randezy'nin kişisel veri işleme ve koruma uygulamaları"
      sections={[
        {
          title: "1. Toplanan Veriler",
          content: `Randezy'yi kullandığınızda aşağıdaki veriler işlenebilir:

Hesap bilgileri: Ad, e-posta adresi, şifre (şifreli olarak saklanır, düz metin tutulmaz).

Randevu bilgileri: Tarih, saat, seçilen hizmet türü, ilgili işletme bilgisi.

İletişim bilgileri: Telefon numarası (yalnızca opsiyonel olarak girilirse).

İşletme bilgileri (işletme sahipleri için): İşletme adı, adres, telefon, hizmet listesi, çalışma saatleri, fotoğraflar.

Teknik veriler: Oturum bilgileri, giriş kayıtları.`,
        },
        {
          title: "2. Verilerin Kullanım Amacı",
          content: `Toplanan veriler yalnızca aşağıdaki amaçlarla kullanılmaktadır:

• Randevu hizmetinin sağlanması ve yönetilmesi
• Randevu hatırlatma e-postalarının gönderilmesi
• Hesap güvenliğinin korunması
• Müşteri ile işletme arasındaki koordinasyonun sağlanması
• Açık rıza veren kullanıcılara ticari elektronik ileti iletilmesi`,
        },
        {
          title: "3. Üçüncü Taraflarla Paylaşım",
          content: `Kişisel verileriniz aşağıdaki durumlarla sınırlı olmak üzere üçüncü taraflarla paylaşılabilir:

• Supabase Inc.: Veritabanı ve kimlik doğrulama altyapısı (teknik hizmet sağlayıcı)
• Resend Inc.: E-posta gönderim altyapısı (teknik hizmet sağlayıcı)
• Randevu yaptığınız işletme: Ad, iletişim ve randevu bilgileriniz, hizmetin ifası amacıyla paylaşılır
• Yasal zorunluluk: Yetkili kamu kurumlarının talepleri doğrultusunda

Verileriniz hiçbir koşulda reklam, pazarlama veya veri ticareti amacıyla üçüncü taraflara satılmaz.`,
        },
        {
          title: "4. Veri Güvenliği",
          content: `Kişisel verileriniz, sektör standardı güvenlik önlemleriyle korunmaktadır:

• Tüm veri iletimi HTTPS (TLS) ile şifrelenir
• Şifreler güçlü hash algoritmaları kullanılarak saklanır
• Veritabanı erişimi rol tabanlı yetkilendirme ile sınırlandırılmıştır`,
        },
        {
          title: "5. Veri Saklama",
          content: `Verileriniz hesabınız aktif olduğu sürece saklanır. Hesabınızı kapatmanız veya silme talebinde bulunmanız durumunda kişisel verileriniz, yasal yükümlülükler çerçevesinde belirlenen süreler dışında en geç 30 gün içinde kaldırılır.`,
        },
        {
          title: "6. İletişim",
          content: `Gizlilik uygulamalarımız hakkında sorularınız için:

destek@randezy.com`,
        },
      ]}
    />
  );
}
