/**
 * Randezy Demo Seed Script
 * Mevcut işletmeleri siler ve 9 kategorili demo işletme ekler.
 *
 * Çalıştırma:
 *   node seed.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gaxjfcwdwefdmwpzskfl.supabase.co";

// Supabase Dashboard → Settings → API → service_role (secret) buraya yapıştır
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdheGpmY3dkd2VmZG13cHpza2ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAxMDA4MywiZXhwIjoyMDkzNTg2MDgzfQ._DBJlYZOGaxksiAh1QwZl6a9SdQQIamfwmUMY-pRhzw";

if (SERVICE_ROLE_KEY === "BURAYA_SERVICE_ROLE_KEY_YAPISTIR") {
  console.error("❌  SERVICE_ROLE_KEY doldurmadın! seed.mjs içinde BURAYA_SERVICE_ROLE_KEY_YAPISTIR kısmını Supabase service_role ile değiştir.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ──────────────────────────────────────────────
// DEMO VERİLERİ
// ──────────────────────────────────────────────

const SHOPS = [
  {
    name: "Saç Atölyesi",
    legal_name: "Saç Atölyesi Kuaförlük Ltd. Şti.",
    category: "KUAFÖR",
    city: "İstanbul",
    district: "Kadıköy",
    neighborhood: "Moda",
    street: "Moda Caddesi",
    building_no: "42",
    door_no: "3",
    tax_office: "Kadıköy",
    tax_no: "1234567890",
    mersis_no: "0123456789012345",
    iban: "TR310006200119000006672315",
    image_url: "https://images.unsplash.com/photo-1553519430-e89e67401ed5?w=800&q=80",
    score: 4.8,
    services: [
      { name: "Saç Kesimi", price: 150, duration: 45 },
      { name: "Saç Boyama", price: 350, duration: 90 },
      { name: "Keratin Bakım", price: 500, duration: 120 },
      { name: "Fön & Şekillendirme", price: 120, duration: 30 },
    ],
  },
  {
    name: "Grand Barber",
    legal_name: "Grand Barber Kuaförlük A.Ş.",
    category: "BERBER",
    city: "İstanbul",
    district: "Beşiktaş",
    neighborhood: "Levent",
    street: "Büyükdere Caddesi",
    building_no: "185",
    door_no: "1",
    tax_office: "Beşiktaş",
    tax_no: "9876543210",
    mersis_no: "9876543210987654",
    iban: "TR640006200119000006677890",
    image_url: "https://images.unsplash.com/photo-1634302104565-cc698ee83144?w=800&q=80",
    score: 4.9,
    services: [
      { name: "Erkek Saç Kesimi", price: 120, duration: 30 },
      { name: "Sakal Tıraş", price: 80, duration: 20 },
      { name: "Saç & Sakal Kombo", price: 180, duration: 45 },
      { name: "Ense Düzeltme", price: 50, duration: 15 },
    ],
  },
  {
    name: "Bella Beauty Studio",
    legal_name: "Bella Güzellik Hizmetleri Ltd. Şti.",
    category: "GÜZELLİK MERKEZİ",
    city: "İstanbul",
    district: "Şişli",
    neighborhood: "Nişantaşı",
    street: "Teşvikiye Caddesi",
    building_no: "67",
    door_no: "5",
    tax_office: "Şişli",
    tax_no: "5555555555",
    mersis_no: "5555555555555555",
    iban: "TR480006200119000006611223",
    image_url: "https://images.unsplash.com/photo-1713085085470-fba013d67e65?w=800&q=80",
    score: 4.7,
    services: [
      { name: "Cilt Bakımı", price: 400, duration: 60 },
      { name: "Profesyonel Makyaj", price: 350, duration: 45 },
      { name: "Lazer Epilasyon (Bacak)", price: 550, duration: 40 },
      { name: "Akne Tedavisi", price: 300, duration: 50 },
    ],
  },
  {
    name: "Nail Art Istanbul",
    legal_name: "Nail Art Güzellik Hizmetleri",
    category: "TIRNAK",
    city: "İstanbul",
    district: "Üsküdar",
    neighborhood: "Bağlarbaşı",
    street: "Hakimiyet-i Milliye Caddesi",
    building_no: "14",
    door_no: "2",
    tax_office: "Üsküdar",
    tax_no: "3333333333",
    mersis_no: "3333333333333333",
    iban: "TR960006200119000006644556",
    image_url: "https://images.unsplash.com/photo-1571290274554-6a2eaa771e5f?w=800&q=80",
    score: 4.6,
    services: [
      { name: "Manikür", price: 150, duration: 45 },
      { name: "Pedikür", price: 180, duration: 60 },
      { name: "Protez Tırnak (Tam Set)", price: 380, duration: 90 },
      { name: "Nail Art Tasarım", price: 220, duration: 60 },
    ],
  },
  {
    name: "FizioPlus Rehabilitasyon",
    legal_name: "FizioPlus Sağlık Hizmetleri A.Ş.",
    category: "FİZYOTERAPİ",
    city: "Ankara",
    district: "Çankaya",
    neighborhood: "Kavaklıdere",
    street: "Tunalı Hilmi Caddesi",
    building_no: "82",
    door_no: "4",
    tax_office: "Çankaya",
    tax_no: "7777777777",
    mersis_no: "7777777777777777",
    iban: "TR120006200119000006677889",
    image_url: "https://images.unsplash.com/photo-1645005513713-9e2b92a687d3?w=800&q=80",
    score: 4.9,
    services: [
      { name: "Bel Ağrısı Tedavisi", price: 450, duration: 50 },
      { name: "Omuz Rehabilitasyonu", price: 450, duration: 50 },
      { name: "Spor Fizyoterapisi", price: 550, duration: 60 },
      { name: "Boyun Ağrısı Tedavisi", price: 400, duration: 45 },
    ],
  },
  {
    name: "Brow & Lash Studio",
    legal_name: "Brow Lash Güzellik Hizmetleri",
    category: "KAŞ VE KİRPİK",
    city: "İzmir",
    district: "Konak",
    neighborhood: "Alsancak",
    street: "Kıbrıs Şehitleri Caddesi",
    building_no: "55",
    door_no: "7",
    tax_office: "Konak",
    tax_no: "2222222222",
    mersis_no: "2222222222222222",
    iban: "TR780006200119000006655443",
    image_url: "https://images.unsplash.com/photo-1519415387722-a1c3bbef716c?w=800&q=80",
    score: 4.8,
    services: [
      { name: "Kaş Tasarımı", price: 200, duration: 30 },
      { name: "Kirpik Lifting", price: 350, duration: 60 },
      { name: "Kirpik Uzatma", price: 500, duration: 90 },
      { name: "Microblading", price: 1200, duration: 120 },
    ],
  },
  {
    name: "Zen Masaj & Spa",
    legal_name: "Zen Wellness Hizmetleri Ltd. Şti.",
    category: "MASAJ",
    city: "Antalya",
    district: "Muratpaşa",
    neighborhood: "Meltem",
    street: "Atatürk Caddesi",
    building_no: "103",
    door_no: "1",
    tax_office: "Muratpaşa",
    tax_no: "4444444444",
    mersis_no: "4444444444444444",
    iban: "TR340006200119000006633221",
    image_url: "https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=800&q=80",
    score: 4.7,
    services: [
      { name: "İsveç Masajı (60 dk)", price: 400, duration: 60 },
      { name: "Sıcak Taş Masajı", price: 550, duration: 75 },
      { name: "Aromatik Masaj", price: 450, duration: 60 },
      { name: "Spor Masajı", price: 500, duration: 60 },
    ],
  },
  {
    name: "Black Ink Tattoo",
    legal_name: "Black Ink Dövme Sanatı",
    category: "DÖVME",
    city: "İzmir",
    district: "Karşıyaka",
    neighborhood: "Bostanlı",
    street: "Şehit Fethi Bey Caddesi",
    building_no: "28",
    door_no: "B",
    tax_office: "Karşıyaka",
    tax_no: "6666666666",
    mersis_no: "6666666666666666",
    iban: "TR560006200119000006699887",
    image_url: "https://images.unsplash.com/photo-1643513456892-437e82e06f4a?w=800&q=80",
    score: 4.8,
    services: [
      { name: "Küçük Dövme (5cm)", price: 600, duration: 60 },
      { name: "Orta Boy Dövme (10cm)", price: 1200, duration: 120 },
      { name: "Büyük Dövme (15cm+)", price: 2000, duration: 180 },
      { name: "Dövme Tasarım Danışmanlığı", price: 200, duration: 30 },
    ],
  },
  {
    name: "Style Lab",
    legal_name: "Style Lab Kuaförlük Hizmetleri",
    category: "KUAFÖR",
    city: "Ankara",
    district: "Çankaya",
    neighborhood: "Bahçelievler",
    street: "7. Cadde",
    building_no: "21",
    door_no: "A",
    tax_office: "Çankaya",
    tax_no: "8888888888",
    mersis_no: "8888888888888888",
    iban: "TR890006200119000006622334",
    image_url: "https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?w=800&q=80",
    score: 4.6,
    services: [
      { name: "Saç Kesimi & Şekillendirme", price: 200, duration: 60 },
      { name: "Balayage", price: 600, duration: 150 },
      { name: "Saç Bakım Maskesi", price: 250, duration: 45 },
      { name: "Gelin Saçı", price: 800, duration: 120 },
    ],
  },
];

// Haftalık saat şablonu: Pzt–Cum 09:00-20:00, Cmt 10:00-18:00, Paz kapalı
function defaultHours(shopId) {
  return [
    { shop_id: shopId, day_of_week: 1, open_time: "09:00", close_time: "20:00", is_closed: false },
    { shop_id: shopId, day_of_week: 2, open_time: "09:00", close_time: "20:00", is_closed: false },
    { shop_id: shopId, day_of_week: 3, open_time: "09:00", close_time: "20:00", is_closed: false },
    { shop_id: shopId, day_of_week: 4, open_time: "09:00", close_time: "20:00", is_closed: false },
    { shop_id: shopId, day_of_week: 5, open_time: "09:00", close_time: "20:00", is_closed: false },
    { shop_id: shopId, day_of_week: 6, open_time: "10:00", close_time: "18:00", is_closed: false },
    { shop_id: shopId, day_of_week: 0, open_time: "00:00", close_time: "00:00", is_closed: true },
  ];
}

// ──────────────────────────────────────────────
// SEED
// ──────────────────────────────────────────────

async function seed() {
  console.log("🌱  Randezy Seed başlatılıyor...\n");

  // 1. Demo kullanıcıyı oluştur / var olanı getir
  let ownerId;
  const DEMO_EMAIL = "demo@randezy.com";

  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const demoUser = existingUsers?.users?.find((u) => u.email === DEMO_EMAIL);

  if (demoUser) {
    ownerId = demoUser.id;
    console.log(`✅  Demo kullanıcı zaten var: ${ownerId}`);
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: "Randezy2024!",
      email_confirm: true,
      user_metadata: { full_name: "Demo Randezy" },
    });
    if (createErr) { console.error("❌  Kullanıcı oluşturulamadı:", createErr.message); process.exit(1); }
    ownerId = created.user.id;
    console.log(`✅  Demo kullanıcı oluşturuldu: ${ownerId}`);
  }

  // Demo kullanıcının profilini güncelle / oluştur
  await supabase.from("profiles").upsert({
    id: ownerId,
    full_name: "Demo Randezy",
    phone: "05001234567",
    role: "business_owner",
  });

  // 2. Demo işletmeleri upsert et (sil+ekle değil, güncelle — yorumlar korunur)
  console.log("\n📦  Demo işletmeler güncelleniyor / ekleniyor...\n");

  for (const shop of SHOPS) {
    const { services: shopServices, ...shopData } = shop;

    // Aynı isimde demo işletme var mı?
    const { data: existing } = await supabase
      .from("shops")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("name", shop.name)
      .maybeSingle();

    let shopId;

    if (existing) {
      // Varsa güncelle (yorumlar bozulmaz)
      await supabase.from("shops").update({ ...shopData, owner_id: ownerId, is_active: true }).eq("id", existing.id);
      shopId = existing.id;
      // Hizmet ve saatlerini sıfırla (reviews'a dokunma)
      await supabase.from("services").delete().eq("shop_id", shopId);
      await supabase.from("shop_hours").delete().eq("shop_id", shopId);
      console.log(`   🔄  [${shop.category.padEnd(18)}]  ${shop.name}  —  güncellendi`);
    } else {
      // Yoksa ekle
      const { data: inserted, error: shopErr } = await supabase
        .from("shops")
        .insert({ ...shopData, owner_id: ownerId, is_active: true })
        .select()
        .single();

      if (shopErr) {
        console.error(`❌  ${shop.name} eklenemedi:`, shopErr.message);
        continue;
      }
      shopId = inserted.id;
      console.log(`   ✅  [${shop.category.padEnd(18)}]  ${shop.name}  —  ${shop.city} / ${shop.district}`);
    }

    // Hizmetler
    await supabase.from("services").insert(shopServices.map((s) => ({ shop_id: shopId, ...s })));
    // Çalışma saatleri
    await supabase.from("shop_hours").insert(defaultHours(shopId));
  }

  console.log("\n🎉  Seed tamamlandı! 9 işletme, hizmetleri ve çalışma saatleriyle birlikte eklendi.");
  console.log("     Demo kullanıcı:  demo@randezy.com  |  Randezy2024!\n");
}

seed().catch((err) => {
  console.error("Beklenmeyen hata:", err);
  process.exit(1);
});
