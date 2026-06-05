// Randezy Takvim prototipi — veri + yardımcılar (HTML prototipinden port edildi)
// Tarihler sabit bir "bugün"e sabitlenmiştir ki prototip tutarlı görünsün.

export type Status = "confirmed" | "inprogress" | "completed" | "cancelled" | "noshow";

export interface Staff {
  id: string;
  name: string;
  role: string;
  initials: string;
  avatarHue: number;
}

export interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  category: string;
}

export interface Appointment {
  id: string;
  dateOffset: number;
  start: string;
  end: string;
  serviceId: string;
  customerName: string;
  phone: string;
  staffId: string;
  status: Status;
  notes: string;
}

const TODAY = new Date(2026, 4, 22); // Cuma, 22 May 2026

const staff: Staff[] = [
  { id: "s1", name: "Ayşe Yıldız", role: "Saç Stilisti", initials: "AY", avatarHue: 35 },
  { id: "s2", name: "Mehmet Kaya", role: "Berber", initials: "MK", avatarHue: 230 },
  { id: "s3", name: "Selin Doğan", role: "Tırnak Uzmanı", initials: "SD", avatarHue: 160 },
  { id: "s4", name: "Burak Öz", role: "Cilt Bakım", initials: "BÖ", avatarHue: 295 },
];

const services: Service[] = [
  { id: "sv1", name: "Saç Kesim", duration: 45, price: 350, category: "coral" },
  { id: "sv2", name: "Saç Boyama", duration: 120, price: 1200, category: "amber" },
  { id: "sv3", name: "Fön & Şekillendirme", duration: 30, price: 250, category: "coral" },
  { id: "sv4", name: "Sakal Tıraşı", duration: 30, price: 200, category: "sky" },
  { id: "sv5", name: "Manikür", duration: 45, price: 300, category: "mint" },
  { id: "sv6", name: "Pedikür", duration: 60, price: 400, category: "sage" },
  { id: "sv7", name: "Jel Tırnak", duration: 75, price: 550, category: "mint" },
  { id: "sv8", name: "Cilt Bakımı", duration: 60, price: 800, category: "lilac" },
  { id: "sv9", name: "Kaş Tasarımı", duration: 20, price: 150, category: "lilac" },
  { id: "sv10", name: "Klasik Masaj", duration: 60, price: 750, category: "teal" },
];

const categoryColor: Record<string, { bg: string; edge: string; text: string }> = {
  coral: { bg: "#FFF1EC", edge: "#F2967A", text: "#7A2E15" },
  amber: { bg: "#FBF1DC", edge: "#D8A33D", text: "#5C3B05" },
  sky: { bg: "#E9F1FA", edge: "#7AA6D6", text: "#1C3858" },
  mint: { bg: "#E5F3EC", edge: "#67B591", text: "#0F4329" },
  sage: { bg: "#EEF3E5", edge: "#9CB073", text: "#33401A" },
  lilac: { bg: "#F0EBF8", edge: "#9B86C9", text: "#3A2C5D" },
  teal: { bg: "#E2F1F2", edge: "#5FA8AE", text: "#10363A" },
};

function ap(
  id: string,
  off: number,
  start: string,
  end: string,
  sv: string,
  cust: string,
  phone: string,
  staffId: string,
  status: Status = "confirmed",
  notes = "",
): Appointment {
  return { id, dateOffset: off, start, end, serviceId: sv, customerName: cust, phone, staffId, status, notes };
}

const appointments: Appointment[] = [
  // ── bugün (offset 0, Cuma 22 May)
  ap("a01", 0, "09:00", "09:45", "sv1", "Zeynep Aktaş", "+90 532 211 4078", "s1", "completed", "Yıkama dahil."),
  ap("a02", 0, "09:15", "09:45", "sv4", "Emre Çelik", "+90 533 678 2210", "s2", "completed"),
  ap("a03", 0, "10:00", "11:00", "sv8", "Defne Yılmaz", "+90 535 410 1192", "s4", "inprogress", "Hassas cilt — alkolsüz toner."),
  ap("a04", 0, "10:00", "11:15", "sv7", "Buse Acar", "+90 532 880 7745", "s3", "inprogress"),
  ap("a05", 0, "11:30", "13:30", "sv2", "Melis Erdem", "+90 539 002 3318", "s1", "confirmed", "Soğuk küllü kumral."),
  ap("a06", 0, "12:00", "12:30", "sv4", "Kerem Polat", "+90 532 449 6620", "s2", "confirmed"),
  ap("a07", 0, "13:00", "13:45", "sv5", "İrem Kılıç", "+90 537 113 8847", "s3", "noshow"),
  ap("a08", 0, "14:00", "14:45", "sv1", "Mert Aydın", "+90 533 220 1090", "s1", "confirmed"),
  ap("a09", 0, "14:30", "15:30", "sv10", "Cansu Demirci", "+90 532 334 8801", "s4", "confirmed"),
  ap("a10", 0, "15:00", "16:00", "sv6", "Pınar Şahin", "+90 535 778 1122", "s3", "confirmed"),
  ap("a11", 0, "15:30", "16:00", "sv3", "Selin Avcı", "+90 532 999 4471", "s1", "cancelled", "Müşteri arayıp iptal etti."),
  ap("a12", 0, "16:30", "17:30", "sv2", "Hande Korkmaz", "+90 533 661 2287", "s1", "confirmed"),
  ap("a13", 0, "17:00", "17:30", "sv9", "Gizem Uçar", "+90 539 224 5587", "s4", "confirmed"),
  ap("a14", 0, "17:00", "17:30", "sv4", "Ozan Bakır", "+90 532 119 4400", "s2", "confirmed"),
  ap("a15", 0, "18:00", "18:45", "sv1", "Tuna Köse", "+90 535 224 7711", "s2", "confirmed"),

  // ── yarın (Cmt 23 May)
  ap("a20", 1, "09:30", "10:15", "sv1", "Berk Ergin", "+90 532 117 8800", "s1", "confirmed"),
  ap("a21", 1, "10:00", "11:15", "sv7", "Ece Naz", "+90 533 887 1199", "s3", "confirmed"),
  ap("a22", 1, "11:00", "12:00", "sv8", "Aslı Tunç", "+90 535 600 3211", "s4", "confirmed"),
  ap("a23", 1, "13:00", "14:00", "sv10", "Yiğit Arda", "+90 532 442 1907", "s4", "confirmed"),
  ap("a24", 1, "14:30", "16:30", "sv2", "Damla Soysal", "+90 539 113 4421", "s1", "confirmed"),
  ap("a25", 1, "15:00", "15:45", "sv4", "Onur Taş", "+90 533 220 1199", "s2", "confirmed"),

  // ── Paz 24 May (offset 2)
  ap("a30", 2, "10:00", "10:45", "sv5", "Lara Uzun", "+90 532 911 6655", "s3", "confirmed"),
  ap("a31", 2, "11:00", "12:00", "sv6", "Mira Çevik", "+90 535 117 2244", "s3", "confirmed"),
  ap("a32", 2, "14:00", "15:00", "sv8", "Sena Karaca", "+90 533 661 1090", "s4", "confirmed"),

  // ── Pzt 25 May (offset 3)
  ap("a40", 3, "09:00", "09:30", "sv4", "Çağan Demir", "+90 532 220 4408", "s2", "confirmed"),
  ap("a41", 3, "10:00", "11:30", "sv2", "Naz Kurt", "+90 535 887 6611", "s1", "confirmed"),
  ap("a42", 3, "13:00", "13:45", "sv1", "Tolga Şen", "+90 533 119 0202", "s1", "confirmed"),
  ap("a43", 3, "14:00", "15:15", "sv7", "Elif Bal", "+90 539 002 1188", "s3", "confirmed"),
  ap("a44", 3, "15:30", "16:30", "sv10", "Bora Erden", "+90 532 778 4400", "s4", "confirmed"),

  // ── Sal 26 May (offset 4)
  ap("a50", 4, "09:30", "10:15", "sv3", "Esra Demirtaş", "+90 535 002 7711", "s1", "confirmed"),
  ap("a51", 4, "11:00", "12:00", "sv8", "Gül Aksoy", "+90 532 117 9920", "s4", "confirmed"),
  ap("a52", 4, "14:00", "14:45", "sv1", "Sinan Erbil", "+90 539 220 8800", "s2", "confirmed"),

  // ── Çar 27 May (offset 5)
  ap("a60", 5, "10:00", "10:45", "sv5", "Müge Çetin", "+90 532 661 4400", "s3", "confirmed"),
  ap("a61", 5, "11:00", "12:15", "sv7", "Begüm Karadağ", "+90 533 887 1100", "s3", "confirmed"),
  ap("a62", 5, "14:30", "15:30", "sv8", "Deniz Akın", "+90 535 119 7700", "s4", "confirmed"),
  ap("a63", 5, "16:00", "16:45", "sv1", "Ferit Yalçın", "+90 532 220 6644", "s1", "confirmed"),

  // ── Per 28 May (offset 6)
  ap("a70", 6, "09:00", "09:45", "sv1", "Aydın Saraç", "+90 539 991 6678", "s1", "confirmed"),
  ap("a71", 6, "13:00", "14:00", "sv10", "Ceren Akpınar", "+90 535 113 5522", "s4", "confirmed"),

  // ── dün (offset -1) — gerçekleşti
  ap("a80", -1, "10:00", "10:45", "sv1", "Esra Berkan", "+90 532 117 9988", "s1", "completed"),
  ap("a81", -1, "11:00", "12:15", "sv7", "Sıla Korkut", "+90 533 220 4499", "s3", "completed"),
  ap("a82", -1, "14:00", "14:30", "sv4", "Hakan Yüce", "+90 535 661 7700", "s2", "completed"),
  ap("a83", -1, "15:00", "16:00", "sv8", "Beste Türk", "+90 539 117 2200", "s4", "completed"),
  ap("a84", -1, "17:00", "18:30", "sv2", "Nehir Çoban", "+90 532 119 5588", "s1", "noshow"),
];

export const CAL = {
  TODAY,
  staff,
  services,
  categoryColor,
  appointments,
  serviceById: (id: string) => services.find((s) => s.id === id)!,
  staffById: (id: string) => staff.find((s) => s.id === id)!,
};

// ── Saf yardımcılar — tarih matematiği, zaman ayrıştırma, durum biçimleme ──
const DAY_MS = 86400000;
const DAYS_TR = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const DAYS_TR_LONG = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const MONTHS_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const MONTHS_TR_LONG = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

// 0 = Pzt ... 6 = Paz (Türkiye konvansiyonu)
function dow(d: Date) {
  return (d.getDay() + 6) % 7;
}

function addDays(d: Date, n: number) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function diffDays(a: Date, b: Date) {
  const ax = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bx = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((+ax - +bx) / DAY_MS);
}

// 'HH:MM' -> gece yarısından beri dakika
function parseMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function fmtMin(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDate(d: Date, fmt: "long" | "short" | "compact" | "month" = "long") {
  if (fmt === "short") return `${d.getDate()} ${MONTHS_TR[d.getMonth()]}`;
  if (fmt === "compact") return `${d.getDate()} ${MONTHS_TR[d.getMonth()]} ${DAYS_TR[dow(d)]}`;
  if (fmt === "month") return `${MONTHS_TR_LONG[d.getMonth()]} ${d.getFullYear()}`;
  return `${DAYS_TR_LONG[dow(d)]}, ${d.getDate()} ${MONTHS_TR_LONG[d.getMonth()]}`;
}

// TODAY'e göre verilen dateOffset için tarih çöz
function dateFor(offset: number) {
  return addDays(CAL.TODAY, offset);
}

// `date` günündeki tüm randevular, isteğe bağlı staffIds filtresi
function appointmentsOn(date: Date, staffIds: string[] | null = null) {
  const off = diffDays(date, CAL.TODAY);
  return CAL.appointments.filter((a) => a.dateOffset === off && (!staffIds || staffIds.includes(a.staffId)));
}

const STATUS: Record<Status, { label: string; dotColor: string; textColor: string }> = {
  confirmed: { label: "Onaylı", dotColor: "#9CA3AF", textColor: "#374151" },
  inprogress: { label: "Devam ediyor", dotColor: "#10B981", textColor: "#065F46" },
  completed: { label: "Geldi", dotColor: "#10B981", textColor: "#065F46" },
  cancelled: { label: "İptal", dotColor: "#9CA3AF", textColor: "#6B7280" },
  noshow: { label: "Gelmedi", dotColor: "#EF4444", textColor: "#991B1B" },
};

export const H = {
  DAYS_TR,
  DAYS_TR_LONG,
  MONTHS_TR,
  MONTHS_TR_LONG,
  dow,
  addDays,
  sameDay,
  diffDays,
  parseMin,
  fmtMin,
  formatDate,
  dateFor,
  appointmentsOn,
  STATUS,
};
