import LegalLayout from "../../components/layout/LegalLayout";

export const metadata = { title: "Ticari İleti İzni — Randezy" };

export default function TicariIletiIzniPage() {
  return (
    <LegalLayout
      title="Ticari İleti İzni"
      subtitle="6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun kapsamında bilgilendirme"
      sections={[
        {
          title: "1. Ticari İleti Nedir?",
          content: `Ticari ileti, mal veya hizmetleri tanıtmak, pazarlamak ya da işletmeyi duyurmak amacıyla gönderilen her türlü elektronik mesajdır. Randezy bu iletileri yalnızca e-posta yoluyla ve yalnızca açık onay veren kullanıcılara göndermektedir.`,
        },
        {
          title: "2. Onay Vermeniz Durumunda Gönderilecekler",
          content: `Ticari ileti iznini kabul eden kullanıcılara aşağıdaki içerikler e-posta yoluyla iletilebilir:

• Randezy platformundaki yeni özellikler ve hizmet güncellemeleri
• Platforma yeni katılan işletmeler ve bölgesel fırsatlar
• Özel kampanyalar ve indirim duyuruları

Zorunlu hizmet bildirimleri (randevu hatırlatmaları, hesap güvenlik bildirimleri) bu izinden bağımsız olarak gönderilebilir.`,
        },
        {
          title: "3. Onay Geri Alma",
          content: `Ticari ileti almaktan istediğiniz zaman vazgeçebilirsiniz:

• Gönderilen her e-postanın altındaki "Abonelikten Çık" bağlantısına tıklayarak
• destek@randezy.com adresine e-posta göndererek

Geri alma talebiniz en geç 3 iş günü içinde işleme alınır.`,
        },
        {
          title: "4. Gönderici Bilgisi",
          content: `HM MARKETING SP. Z O.O.
Randezy Platformu
destek@randezy.com
randezy.com`,
        },
        {
          title: "5. İletişim",
          content: `Ticari ileti uygulamalarımız hakkında sorularınız için:
destek@randezy.com`,
        },
      ]}
    />
  );
}
