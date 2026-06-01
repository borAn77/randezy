import LegalLayout from "../../components/layout/LegalLayout";

export const metadata = { title: "KVKK Aydınlatma Metni — Randezy" };

export default function KvkkPage() {
  return (
    <LegalLayout
      title="KVKK Aydınlatma Metni"
      subtitle="6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında bilgilendirme"
      sections={[
        {
          title: "1. Veri Sorumlusu",
          content: `Randezy platformunu işleten veri sorumlusu HM MARKETING SP. Z O.O.'dur.

Platform adı: Randezy
Web sitesi: randezy.com
İletişim: destek@randezy.com`,
        },
        {
          title: "2. İşlenen Kişisel Veriler",
          content: `Randezy'yi kullanmanız kapsamında aşağıdaki kişisel verileriniz işlenebilir:

• Ad ve soyad
• E-posta adresi
• Telefon numarası (opsiyonel olarak girilen)
• Randevu bilgileri (tarih, saat, hizmet türü, işletme bilgisi)
• Hesap giriş ve oturum bilgileri
• İşletme sahipleri için: işletme adı, adres, iletişim bilgileri, hizmet listesi`,
        },
        {
          title: "3. İşleme Amaçları ve Hukuki Dayanakları",
          content: `Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:

• Randevu platformu hizmetlerinin sunulması (KVKK md. 5/2-c — sözleşmenin ifası)
• Hesap oluşturma ve kimlik doğrulama (KVKK md. 5/2-c)
• Randevu hatırlatma e-postalarının gönderilmesi (KVKK md. 5/2-c)
• İşletme ile müşteri arasındaki randevu koordinasyonunun sağlanması (KVKK md. 5/2-c)
• Yasal yükümlülüklerin yerine getirilmesi (KVKK md. 5/2-ç)
• Ticari elektronik ileti gönderimi — yalnızca açık rıza verenlere (KVKK md. 5/1)`,
        },
        {
          title: "4. Yurt Dışına Veri Aktarımı",
          content: `Randezy, HM MARKETING SP. Z O.O. tarafından işletilmektedir. Hizmetin sunulması için kullanılan bulut altyapısı, e-posta servisleri ve teknik hizmet sağlayıcılar yurt dışında konumlanmış olabilir. Söz konusu kişisel veriler, yalnızca hizmetin sağlanması amacıyla bu sağlayıcılarla paylaşılmaktadır.

Kullandığımız başlıca hizmet sağlayıcılar:
• Supabase Inc. — veritabanı ve kimlik doğrulama altyapısı
• Resend Inc. — e-posta gönderim hizmetleri

Yurt dışına veri aktarımı, kayıt sırasında aldığımız açık rızanıza dayanmaktadır.`,
        },
        {
          title: "5. Veri Saklama Süresi",
          content: `Kişisel verileriniz, hesabınızın aktif olduğu süre boyunca saklanmaktadır. Hesabınızı silmeniz durumunda kişisel verileriniz, yasal yükümlülükler kapsamında belirlenmiş süreler dışında en geç 30 gün içinde sistemden kaldırılır.`,
        },
        {
          title: "6. KVKK Kapsamındaki Haklarınız (Madde 11)",
          content: `KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:

• Kişisel verilerinizin işlenip işlenmediğini öğrenme
• İşlenmişse buna ilişkin bilgi talep etme
• İşlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme
• Yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü kişileri bilme
• Eksik veya yanlış işlenmişse düzeltilmesini isteme
• Kanun'da öngörülen koşullar çerçevesinde silinmesini veya yok edilmesini isteme
• Düzeltme ve silme işlemlerinin üçüncü kişilere bildirilmesini isteme
• İşlenen verilerin otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme
• Kanuna aykırı işleme nedeniyle zarara uğramanız hâlinde zararın giderilmesini talep etme`,
        },
        {
          title: "7. Başvuru Yöntemi",
          content: `KVKK kapsamındaki haklarınızı kullanmak için aşağıdaki adrese yazılı olarak veya e-posta yoluyla başvurabilirsiniz:

E-posta: destek@randezy.com

Başvurular yasal süreler içinde yanıtlanacaktır.`,
        },
      ]}
    />
  );
}
