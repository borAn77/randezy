@AGENTS.md

# Randezy Mobile — Bekleyen Görevler

Mehmet'in onayladığı eksiklikler. Yeni oturumda önce bunları sor.

---

## 1. Gelmedi (No-Show) Metriği — ORTA

`FinanceScreen.tsx` — `Gelmedi` status şu an hiçbir metriğe girmiyor.
Ne gelire sayılıyor ne iptal'e. Tamamen görünmez.

**Yapılacak:**
- `Gelmedi` randevuları ayrı satır olarak göster (sayı + toplam tutar)
- Mevcut: `completed` ve `cancelled` var, `noShow` eksik
- Dosya: `mobile/screens/FinanceScreen.tsx` satır 64-72

```ts
// Şu an:
const completed = list.filter(a => a.status === 'Tamamlandı');
const cancelled = list.filter(a => a.status === 'İptal Edildi');

// Eksik:
const noShow = list.filter(a => a.status === 'Gelmedi');
```

---

## 2. HomeScreen Bugünkü Gelir Label'ı — KÜÇÜK

`HomeScreen.tsx` `TodayHero` component'inde gelir sadece `Tamamlandı` sayıyor.
Bu doğru davranış. Ama "Sırada" sayısına `Gelmedi` randevuları da giriyor gibi görünüyor.

**Kontrol et:** `doneCount` hesabında `İptal Edildi` ve `Gelmedi` birlikte `done` dispStatus'üne düşüyor (satır 58).
`Sırada` sayısı `totalCount - doneCount` — iptal edilenler de düşünce sırada sayısı azalıyor, doğru mu?

---

## Kalıcı Kurallar

- Expo v54 — kod yazmadan önce docs oku: https://docs.expo.dev/versions/v54.0.0/
- UI Türkçe
- Refactor yapma, minimal değişiklik
