import { NextResponse, type NextRequest } from "next/server";

/**
 * ============================================================
 *  RANDEZY KAPALI  —  site kapatma anahtarı
 * ============================================================
 *
 * Site şu anda KAPALI. Varsayılan kapalıdır: Vercel paneline girmeye gerek yok,
 * bu dosya deploy edildiği anda site kapanır.
 *
 * Sayfalar da /api/* uçları da kapalıdır; hiçbir yoldan sisteme kayıt olunamaz
 * veya kişisel veri (isim/telefon) girilemez.
 *
 * GERİ AÇMAK — iki yoldan biri:
 *   1) Vercel'e erişim varsa : Environment Variables > SITE_OPEN = 1 > Redeploy
 *   2) Erişim yoksa          : aşağıdaki SITE_ACIK satırını `= true` yap, push et
 *
 * Kodun tamamı olduğu gibi duruyor; site açıldığında hiçbir şey değişmeden
 * eskisi gibi çalışır.
 */
const SITE_ACIK = process.env.SITE_OPEN === "1";

export default function proxy(request: NextRequest) {
  if (SITE_ACIK) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // API uçları kapalıyken HTML yerine JSON döner (misafir randevu, personel
  // girişi, bildirim, cron — hepsi dahil).
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Randezy şu anda hizmet vermiyor." },
      { status: 503, headers: KAPALI_BASLIKLARI }
    );
  }

  return new NextResponse(KAPALI_SAYFASI, {
    status: 503,
    headers: { ...KAPALI_BASLIKLARI, "content-type": "text/html; charset=utf-8" },
  });
}

const KAPALI_BASLIKLARI = {
  // Geçici kapanış: arama motorları sayfayı indeksten düşürmez.
  "retry-after": "3600",
  // CDN kapalı yanıtı önbelleğe almasın; site geri açıldığında anında yayına döner.
  "cache-control": "no-store, must-revalidate",
};

// Hiçbir yol muaf değil — tam kapanış.
export const config = {
  matcher: ["/:path*"],
};

const KAPALI_SAYFASI = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Randezy</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;800&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 32px 20px;
    background: #ffffff;
    color: #0c0c0d;
    font-family: Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .kutu { width: 100%; max-width: 460px; text-align: center; }
  .marka {
    font-size: 30px;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: #0c0c0d;
    margin: 0 0 28px;
  }
  .marka span { color: #14b8a6; }
  .cizgi {
    width: 44px;
    height: 3px;
    margin: 0 auto 28px;
    border-radius: 999px;
    background: linear-gradient(90deg, #14b8a6, #00A3AD);
  }
  h1 {
    font-size: 21px;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0 0 14px;
    line-height: 1.35;
  }
  p {
    font-size: 15px;
    line-height: 1.65;
    color: #5c5c62;
    margin: 0 0 12px;
  }
  a { color: #0d9488; font-weight: 600; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .alt { margin-top: 32px; font-size: 13px; color: #8a8a8e; }
  @media (prefers-color-scheme: dark) {
    body { background: #0c0c0d; color: #ececea; }
    .marka { color: #ececea; }
    p { color: #a1a1a8; }
    a { color: #2dd4bf; }
    .alt { color: #6f6f76; }
  }
</style>
</head>
<body>
  <main class="kutu">
    <div class="marka">rande<span>zy</span></div>
    <div class="cizgi"></div>
    <h1>Randezy şu anda hizmet vermiyor</h1>
    <p>Randevu sistemimiz kapatılmıştır. Gösterdiğiniz ilgi için teşekkür ederiz.</p>
    <p class="alt">Sorularınız için <a href="mailto:destek@randezy.com">destek@randezy.com</a></p>
  </main>
</body>
</html>`;
