# Randezy

Türkiye'deki kuaför, berber, güzellik merkezi ve spa gibi işletmeler için geliştirilmiş çevrimiçi randevu yönetim platformu. Müşteriler bölgelerindeki işletmeleri keşfeder ve 7/24 online randevu alır; işletme sahipleri takvimlerini, hizmetlerini ve gelirlerini tek panelden yönetir.

---

## Sistem Mimarisi

```
┌─────────────────────────────────────────────────────┐
│                   KULLANICI (Browser)               │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────▼────────────┐
        │   Next.js 16 Frontend   │  ← app router, SSR/SSG
        │      (Port 3000)        │
        └────────┬────────┬───────┘
                 │        │
     ┌───────────▼──┐  ┌──▼────────────────┐
     │  Supabase    │  │  FastAPI Backend  │
     │  (Auth + DB) │  │   (Port 8000)     │
     │  PostgreSQL  │  │  JWT + SQLModel   │
     └──────────────┘  └───────────────────┘
```

**Frontend** tüm gerçek zamanlı veri ve kimlik doğrulama işlemleri için **Supabase** ile doğrudan iletişim kurar. **FastAPI backend** ek iş mantığı ve alternatif veri işlemleri için kullanılır.

---

## Özellikler

### Müşteri Tarafı
- **İşletme Keşfi** — Ana sayfada aktif işletmeler kart görünümünde listelenir; isim, kategori veya şehre göre filtrelenir
- **Anlık Arama** — Arama çubuğu ile işletme adı, ilçe veya şehre göre canlı filtreleme
- **Kategori Filtresi** — Kuaför, Berber, Güzellik Merkezi, Tırnak, Fizyoterapi, Kaş & Kirpik, Masaj, Dövme
- **İşletme Sayfası** — Her işletmenin hizmet listesi, fiyatlar, çalışma saatleri ve konum bilgisi
- **Online Randevu** — Hizmet, tarih ve saat seçerek müşteri randevu oluşturabilir
- **Randevularım** — Müşterinin geçmiş ve gelecek randevuları `/randevularim` sayfasında listelenir
- **Hesabım** — Profil düzenleme, kişisel bilgiler ve güvenlik ayarları

### İşletme Sahibi Tarafı
- **Pro Landing Page** — `/pro` rotasında işletme sahiplerine yönelik SaaS tanıtım sayfası (Hero, Stats, Features, Industries, Pricing bölümleri)
- **4 Adımlı Kayıt Akışı** (`/isletme-ekle`)
  - Adım 1: Kategori, tabela adı, şehir/ilçe/adres bilgisi
  - Adım 2: Vergi dairesi, vergi no, IBAN (yasal bilgiler)
  - Adım 3: Hizmet menüsü oluşturma (isim, süre, fiyat)
  - Adım 4: Haftalık çalışma saatleri ve tatil günleri
- **Dashboard** (`/dashboard`) — İşletme yönetim paneli:
  - Genel bakış: günlük randevular, ciro özeti
  - Hizmet yönetimi: ekleme, düzenleme, silme, görsel yükleme
  - Çalışma saatleri yönetimi: gün bazlı açık/kapalı ve saat aralığı
  - İşletme bilgileri düzenleme (adres, kategori, profil görseli)
  - Randevu listesi ve durum takibi
- **Rol Sistemi** — İşletme kaydı tamamlandığında kullanıcının rolü `customer` → `business_owner` olarak güncellenir; Navbar buna göre "Yönetim Paneli" butonunu gösterir

### Kimlik Doğrulama
- Supabase Auth ile e-posta/şifre tabanlı kayıt ve giriş
- `AuthModal` — Navbar üzerinden açılan modal form (kayıt/giriş sekmeli)
- `CompleteProfileModal` — Giriş sonrası eksik profil bilgisi (ad, telefon) tamamlatılır
- JWT token tabanlı oturum yönetimi (FastAPI tarafı)

---

## Sayfa Yapısı (App Router)

| Rota | Açıklama | Erişim |
|------|----------|--------|
| `/` | Ana sayfa — işletme keşfi ve arama | Herkese açık |
| `/pro` | İşletme sahipleri için SaaS landing page | Herkese açık |
| `/isletme-ekle` | 4 adımlı işletme kayıt formu | Giriş gerekli |
| `/dashboard` | İşletme yönetim paneli | Sadece business_owner |
| `/hesabim` | Kullanıcı profili ve ayarları | Giriş gerekli |
| `/randevularim` | Müşteri randevu geçmişi | Giriş gerekli |
| `/shop/[id]` | Bireysel işletme sayfası | Herkese açık |
| `/hediye-karti` | Hediye kartı sayfası | Herkese açık |

---

## Teknik Altyapı

### Frontend
| Teknoloji | Versiyon | Kullanım |
|-----------|----------|----------|
| Next.js | 16.2.4 | App Router, SSR/SSG |
| React | 19.2.4 | UI framework |
| TypeScript | 5.x | Tip güvenliği |
| Tailwind CSS | 4.x | Stil |
| Supabase JS | 2.x | Auth + gerçek zamanlı DB |
| Lucide React | 1.x | İkon kütüphanesi |
| Motion | 12.x | Animasyonlar (landing page) |

### Backend (FastAPI)
| Teknoloji | Kullanım |
|-----------|----------|
| FastAPI | REST API framework |
| SQLModel | ORM (Pydantic + SQLAlchemy) |
| Passlib / bcrypt | Şifre hash |
| Python-JOSE | JWT token |
| SQLite | Geliştirme veritabanı |

### Veritabanı Şeması (Supabase/PostgreSQL)

```
profiles          shops              services
─────────────     ──────────────     ──────────────
id (uuid)         id (int)           id (int)
full_name         owner_id → auth    shop_id → shops
phone             name               name
role              legal_name         price
                  category           duration
                  city               image_url
                  district
                  neighborhood       shop_hours
                  street             ──────────────
                  building_no        id (int)
                  door_no            shop_id → shops
                  tax_office         day_of_week
                  tax_no             open_time
                  mersis_no          close_time
                  iban               is_closed
                  image_url
                  is_active          appointments
                  score              ──────────────
                                     id (int)
                                     shop_id → shops
                                     user_id → auth
                                     service_name
                                     date / time
                                     price
                                     notes
```

### Backend API Endpoint'leri

```
POST /auth/register     → Yeni kullanıcı kaydı
POST /auth/login        → Giriş + JWT token

GET  /shops             → Tüm aktif işletmeleri listele
GET  /shops/{id}        → Tek işletme detayı
GET  /shops/{id}/services → İşletmenin hizmet listesi

POST /appointments      → Yeni randevu oluştur
```

---

## Bileşen Mimarisi

```
components/
├── layout/
│   ├── Navbar.tsx          → Sticky navbar, auth state, rol bazlı buton
│   ├── AuthModal.tsx       → Kayıt/giriş modal formu
│   ├── UserMenu.tsx        → Giriş yapmış kullanıcı menüsü
│   └── CompleteProfileModal.tsx → Eksik profil tamamlama
│
└── landing/               → /pro sayfası için SaaS bileşenleri
    ├── Hero.tsx            → Animasyonlu hero + telefon mockup
    ├── Stats.tsx           → Rakamsal istatistikler
    ├── Features.tsx        → 2 ana özellik (takvim, analiz)
    ├── Industries.tsx      → Sektör kartları
    └── Pricing.tsx         → Fiyatlandırma kartı
```

---

## Kurulum ve Çalıştırma

### Gereksinimler
- Node.js 18+
- Supabase hesabı ve proje

### Ortam Değişkenleri

`.env.local` dosyası oluşturun:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Frontend Başlatma

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

### Backend Başlatma

```bash
cd backend
pip install fastapi uvicorn sqlmodel passlib python-jose
uvicorn main:app --reload --port 8000
```

---

## Kullanıcı Akışı

### Müşteri Akışı
```
Ana Sayfa → İşletme Kartı → İşletme Sayfası → Hizmet Seç → Randevu Al
```

### İşletme Sahibi Akışı
```
Ana Sayfa → "İşletmeni Ekle" → /pro (SaaS Landing)
  → "Ücretsiz Başla" → /isletme-ekle (4 adım)
    → Kayıt Tamamla → Rol: business_owner
      → Navbar: "Yönetim Paneli" → /dashboard
```

---

## Kategoriler

Desteklenen işletme türleri: **Kuaför · Berber · Güzellik Merkezi · Tırnak · Fizyoterapi · Kaş ve Kirpik · Masaj · Dövme**
