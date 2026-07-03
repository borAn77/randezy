import LegalLayout from "../../components/layout/LegalLayout";

export const metadata = { title: "Kullanıcı Sözleşmesi — Randezy" };

export default function KullaniciSozlesmesiPage() {
  return (
    <LegalLayout
      title="Kullanıcı Sözleşmesi"
      subtitle="Randezy platformunu kullanan bireysel kullanıcılar için geçerlidir"
      sections={[
        {
          title: "1. Hizmet Tanımı",
          content: `Randezy (HM MARKETING SP. Z O.O. tarafından işletilmektedir), kullanıcıların hizmet işletmelerinden çevrimiçi randevu almasını ve yönetmesini sağlayan bir dijital platformdur. Platform, işletmeler ile müşteriler arasında randevu koordinasyonu hizmeti sunar; bağımsız işletmelerin hizmet kalitesi veya fiyatlandırmasından sorumlu değildir.`,
        },
        {
          title: "2. Hesap Oluşturma ve Güvenlik",
          content: `• Platformu kullanmak için geçerli bir e-posta adresiyle hesap oluşturmanız gerekmektedir.
• Hesap bilgilerinizin gizliliğini korumak ve yetkisiz erişimi önlemek sizin sorumluluğunuzdadır.
• Hesabınız üzerinden gerçekleştirilen tüm işlemlerden siz sorumlusunuz.
• Başkası adına veya gerçek olmayan bilgilerle hesap oluşturmak yasaktır.

Platforma kayıt olan veya misafir olarak randevu alan kullanıcılar, 18 yaşını doldurduklarını ve yasal olarak sözleşme akdetme ehliyetine sahip olduklarını kabul, beyan ve taahhüt ederler.`,
        },
        {
          title: "3. Kullanım Koşulları",
          content: `Randezy'yi kullanırken aşağıdaki kurallara uymayı kabul edersiniz:

• Platform yalnızca yasal amaçlarla kullanılabilir.
• Yanıltıcı, eksik veya başkasına ait bilgi girmek yasaktır.
• Sistemi otomatik araçlarla taramak (scraping, botlama) yasaktır.
• Diğer kullanıcıları veya işletmeleri rahatsız edecek davranışlar yasaktır.
• Platformun teknik altyapısına zarar vermeye yönelik girişimlerde bulunmak yasaktır.`,
        },
        {
          title: "4. Randevu ve İptal",
          content: `• Randevu oluşturduğunuzda ad, iletişim ve randevu bilgileriniz ilgili işletme ile paylaşılır.
• İptal koşulları ve politikaları her işletme tarafından ayrıca belirlenir.
• Randezy, işletmelerin iptal politikasından veya randevu iptali nedeniyle oluşan zararlardan sorumlu tutulamaz.
• Gelemeyeceğiniz randevuları önceden iptal etmenizi tavsiye ederiz; bu hem işletmeyi hem de diğer müşterileri destekler.

Randezy, randevu hizmeti için kullanıcılardan doğrudan bir ücret tahsil etmez. Hizmet bedeli, müşteri ile işletme arasında işletmenin kendi kurallarına göre tahsil edilir.`,
        },
        {
          title: "5. Sorumluluk Sınırı",
          content: `Randezy, aşağıdaki konularda sorumluluk kabul etmez:

• İşletmeler tarafından sunulan hizmetlerin kalitesi, güvenilirliği veya uygunluğu
• İşletmenin randevuya gelmemesi veya hizmet sunmaması
• İşletme kaynaklı veri işleme uygulamaları
• Platformun geçici olarak erişilemez olduğu dönemlerde oluşabilecek zararlar`,
        },
        {
          title: "6. Hesabın Askıya Alınması veya Kapatılması",
          content: `• Kullanım koşullarını ihlal eden hesaplar önceden bildirimde bulunmaksızın geçici veya kalıcı olarak askıya alınabilir.
• Hesabınızı dilediğiniz zaman hesap ayarlarından silebilirsiniz.
• Hesap silinmesine ilişkin detaylar Gizlilik Politikası'nda belirtilmiştir.`,
        },
        {
          title: "7. Değişiklikler",
          content: `Bu sözleşmede yapılacak önemli değişiklikler, yürürlük tarihinden en az 15 gün önce kayıtlı e-posta adresinize bildirilecektir. Platformu kullanmaya devam etmeniz güncel koşulları kabul ettiğiniz anlamına gelir.`,
        },
        {
          title: "8. Uyuşmazlık Çözümü",
          content: `Bu sözleşmeden doğabilecek uyuşmazlıklarda Türk Hukuku uygulanacaktır. Bireysel kullanıcılar (tüketiciler), uyuşmazlık konusundaki başvurularını yerleşim yerlerindeki Tüketici Hakem Heyetlerine veya Tüketici Mahkemelerine yapabilirler.`,
        },
        {
          title: "9. İletişim",
          content: `destek@randezy.com`,
        },
      ]}
    />
  );
}
