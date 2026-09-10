import { NextResponse, type NextRequest } from "next/server";

/**
 * Site kapatma anahtarı.
 *
 * Kapatmak için : Vercel > Settings > Environment Variables > SITE_CLOSED = 1  (sonra redeploy)
 * Geri açmak için: aynı değişkeni sil (veya 1 dışında bir değer yap) > redeploy
 *
 * Kod hiçbir şekilde silinmez; sadece web sayfaları 503 ile "kapalı" ekranına düşer.
 */
const SITE_KAPALI = process.env.SITE_CLOSED === "1";

/**
 * Site kapalıyken bile çalışmaya devam eden yollar.
 * Buraya dokunma: mobil uygulama (/api/staff/login, /api/staff/calendar, /api/notify),
 * Stripe webhook (/api/billing/webhook) ve günlük hatırlatma cron'u (/api/cron/reminders)
 * bu muafiyet sayesinde bozulmadan çalışır.
 */
function acikKalanYol(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!SITE_KAPALI || acikKalanYol(pathname)) {
    return NextResponse.next();
  }

  return new NextResponse(KAPALI_SAYFASI, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Geçici kapanış: arama motorları sayfayı indeksten düşürmez.
      "retry-after": "3600",
      // CDN kapalı sayfayı önbelleğe almasın; site geri açıldığında anında yayına döner.
      "cache-control": "no-store, must-revalidate",
    },
  });
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|mp4|webm|txt|xml)$).*)",
  ],
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
  .alt {
    margin-top: 32px;
    font-size: 13px;
    color: #8a8a8e;
  }
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
    <p>Randevu sistemimiz geçici olarak kapatılmıştır. Gösterdiğiniz ilgi için teşekkür ederiz.</p>
    <p class="alt">Sorularınız için <a href="mailto:destek@randezy.com">destek@randezy.com</a></p>
  </main>
</body>
</html>`;
