import LegalLayout from "../../components/layout/LegalLayout";

export const metadata = { title: "Çerez Politikası — Randezy" };

export default function CerezPolitikasiPage() {
  return (
    <LegalLayout
      title="Çerez Politikası"
      subtitle="Randezy'nin kullandığı çerezler hakkında bilgilendirme"
      sections={[
        {
          title: "1. Çerez Nedir?",
          content: `Çerezler, tarayıcınız aracılığıyla cihazınıza yerleştirilen küçük metin dosyalarıdır. Oturum yönetimi ve kullanıcı tercihlerinin hatırlanması gibi teknik işlevler için kullanılır.`,
        },
        {
          title: "2. Zorunlu Çerezler",
          content: `Randezy yalnızca aşağıdaki zorunlu teknik çerezleri kullanmaktadır:

Oturum çerezleri: Giriş yaptığınızda kimliğinizi doğrulamak ve oturumunuzu aktif tutmak için gereklidir. Bu çerezler olmadan platforma giriş yapılamaz.

Supabase auth: Güvenli kimlik doğrulama ve oturum yönetimi için zorunlu teknik çerezler.

Bu çerezler üçüncü taraflarla paylaşılmaz ve yalnızca platformun temel işlevselliği için kullanılır.`,
        },
        {
          title: "3. Analitik Çerezler",
          content: `Randezy şu an üçüncü taraf analitik veya izleme çerezi kullanmamaktadır.`,
        },
        {
          title: "4. Reklam Çerezleri",
          content: `Randezy reklam, yeniden hedefleme (retargeting) veya davranışsal izleme amacıyla herhangi bir çerez kullanmamaktadır.`,
        },
        {
          title: "5. Çerez Yönetimi",
          content: `Tarayıcı ayarlarınızdan çerezleri silebilir veya engelleyebilirsiniz. Ancak zorunlu oturum çerezlerinin engellenmesi platforma girişi ve temel işlevleri kısıtlayabilir.

Popüler tarayıcılarda çerez yönetimi:
• Chrome: Ayarlar → Gizlilik ve güvenlik → Çerezler
• Firefox: Ayarlar → Gizlilik ve Güvenlik
• Safari: Tercihler → Gizlilik`,
        },
        {
          title: "6. İletişim",
          content: `destek@randezy.com`,
        },
      ]}
    />
  );
}
