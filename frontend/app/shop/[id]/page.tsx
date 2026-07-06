"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  Clock, ArrowLeft, X, Calendar as CalIcon,
  ChevronLeft, ChevronRight, CheckCircle2, MapPin, Star, Image as ImageIcon, Share2, Heart,
  Phone, Mail, AtSign, ChevronDown, Users, User, Search, Link2
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import AuthModal from "../../../components/layout/AuthModal";

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const normalizePhone = (raw: string): string | null => {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12 && digits[2] === '5') return '+' + digits;
  if (digits.startsWith('0') && digits.length === 11 && digits[1] === '5') return '+90' + digits.slice(1);
  if (digits.startsWith('5') && digits.length === 10) return '+90' + digits;
  return null;
};

function generateTimeSlots(openTime: string, closeTime: string, duration: number): string[] {
  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);
  let current = openH * 60 + openM;
  const end = closeH * 60 + closeM;
  const slots: string[] = [];
  while (current + duration <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, '0');
    const m = (current % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
    current += duration;
  }
  return slots;
}

const MONTHS_SHORT = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
const MONTHS_LONG = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const DAY_NAMES_SHORT = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];

// ---------- Campaign price helper ----------
function calcDiscountedPrice(service: any, campaigns: any[]): { original: number; discounted: number; campaign: any | null; pct: number } {
  const original = Number(service.price) || 0;
  const sid = String(service.id);
  // Filter to campaigns that apply to this specific service
  const applicable = campaigns.filter(c =>
    !c.service_ids?.length || c.service_ids.map(String).includes(sid)
  );
  if (!applicable.length) return { original, discounted: original, campaign: null, pct: 0 };
  // Pick campaign with highest savings (anti-stacking: only one applies)
  let bestCampaign: any = null;
  let bestDiscounted = original;
  let bestPct = 0;
  for (const c of applicable) {
    const val = Number(c.discount_value) || 0;
    let disc = original;
    let pct = 0;
    if ((c.type === 'percentage' || c.type === 'today_special' || c.type === 'last_minute') && val) {
      pct = Math.min(100, val);
      disc = Math.max(0, Math.round(original * (1 - pct / 100)));
    } else if (c.type === 'fixed' && val) {
      disc = Math.max(0, Math.round(original - val));
      pct = original > 0 ? Math.round(((original - disc) / original) * 100) : 0;
    }
    if (disc < bestDiscounted) { bestDiscounted = disc; bestPct = pct; bestCampaign = c; }
  }
  // Return null campaign when no actual price change occurs
  if (bestDiscounted >= original) return { original, discounted: original, campaign: null, pct: 0 };
  return { original, discounted: bestDiscounted, campaign: bestCampaign, pct: bestPct };
}

// ---------- Inline Booking Panel ----------
interface CartItemBase { service: any; date: Date; time: string; staff: any | null; }
interface CartItem extends CartItemBase { discountedPrice: number; campaign: any | null; }

function InlineBookingPanel({
  service, shopHours, staff, shopId, onAdd, onError, allServices, cartItems
}: {
  service: any;
  shopHours: any[];
  staff: any[];
  shopId: number;
  onAdd: (item: CartItemBase) => void;
  onError: (msg: string) => void;
  allServices: any[];
  cartItems: CartItem[];
}) {
  const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const BUFFER_MIN = 5;
  const aptDuration = (apt: any): number => apt.duration_snapshot ?? 30;
  // Buffer is two-sided: both new and existing appointments need 5 min gap between them
  const isBlocked = (slotStart: string, newDur: number, apts: any[]): boolean => {
    const ns = toMin(slotStart);
    const ne = ns + newDur;
    return apts.some(a => {
      if (!a.appointment_time) return false;
      const es = toMin(a.appointment_time.slice(0, 5));
      const ee = es + aptDuration(a) + BUFFER_MIN;
      return ns < ee && ne + BUFFER_MIN > es;
    });
  };
  // Convert current cart items into appointment-like objects so they block slots
  const cartAsApts = (dateStr: string, forStaffId: string | null): any[] =>
    cartItems
      .filter(c => {
        if (localDateStr(c.date) !== dateStr) return false;
        // forStaffId=null means no-staff shop — include all cart items for the date
        if (forStaffId !== null) return !c.staff?.id || c.staff.id === forStaffId;
        return true;
      })
      .map(c => ({ appointment_time: c.time, duration_snapshot: c.service.duration, staff_id: c.staff?.id || null }));
  const isInCart = (slotTime: string): boolean => {
    if (!selectedDay) return false;
    const dateStr = localDateStr(selectedDay);
    return cartItems.some(c =>
      localDateStr(c.date) === dateStr &&
      String(c.service.id) === String(service.id) &&
      c.time === slotTime &&
      (c.staff?.id || null) === (selectedStaff?.id || null)
    );
  };
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isClosedDay, setIsClosedDay] = useState(false);
  const [slotCounts, setSlotCounts] = useState<Record<string, number | null>>({});

  // Pre-load slot counts for 7 days
  useEffect(() => {
    const dateStrs = days.map(d => localDateStr(d));
    supabase.rpc('get_shop_slots', { p_shop_id: shopId, p_dates: dateStrs })
      .then(({ data: booked }) => {
        const counts: Record<string, number> = {};
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        days.forEach(d => {
          const dateStr = localDateStr(d);
          const dayOfWeek = d.getDay();
          const dayHours = shopHours.find((h: any) => h.day_of_week === dayOfWeek);
          if (!dayHours || dayHours.is_closed) { counts[dateStr] = 0; return; }
          const allSlots = generateTimeSlots(dayHours.open_time, dayHours.close_time, service.duration);
          const isToday = d.toDateString() === now.toDateString();
          const dayBooked = (booked || []).filter((a: any) => a.appointment_date === dateStr);
          let available: string[];
          if (selectedStaff) {
            const apts = [...dayBooked.filter((a: any) => a.staff_id === selectedStaff.id), ...cartAsApts(dateStr, selectedStaff.id)];
            available = allSlots.filter(s => !isBlocked(s, service.duration, apts));
          } else if (staff.length > 0) {
            available = allSlots.filter(s => staff.some(sm => {
              const apts = [...dayBooked.filter((a: any) => a.staff_id === sm.id), ...cartAsApts(dateStr, sm.id)];
              return !isBlocked(s, service.duration, apts);
            }));
          } else {
            const apts = [...dayBooked, ...cartAsApts(dateStr, null)];
            available = allSlots.filter(s => !isBlocked(s, service.duration, apts));
          }
          if (isToday) available = available.filter(s => { const [h, m] = s.split(':').map(Number); return (h * 60 + m) > nowMinutes; });
          counts[dateStr] = available.length;
        });
        setSlotCounts(counts);
      });
  }, [service.duration, shopHours, shopId, selectedStaff, staff.length, cartItems]);

  // Load slots when day selected
  useEffect(() => {
    setSelectedTime('');
    if (!selectedDay || shopHours.length === 0) { setAvailableSlots([]); return; }
    const dayOfWeek = selectedDay.getDay();
    const dayHours = shopHours.find((h: any) => h.day_of_week === dayOfWeek);
    if (!dayHours || dayHours.is_closed) { setIsClosedDay(true); setAvailableSlots([]); return; }
    setIsClosedDay(false);
    const slots = generateTimeSlots(dayHours.open_time, dayHours.close_time, service.duration);
    supabase.rpc('get_shop_slots', { p_shop_id: shopId, p_dates: [localDateStr(selectedDay)] })
      .then(({ data: booked }) => {
        const now = new Date();
        const isToday = selectedDay.toDateString() === now.toDateString();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const dateStr = localDateStr(selectedDay);
        let available: string[];
        if (selectedStaff) {
          const apts = [...(booked || []).filter((a: any) => a.staff_id === selectedStaff.id), ...cartAsApts(dateStr, selectedStaff.id)];
          available = slots.filter(s => !isBlocked(s, service.duration, apts));
        } else if (staff.length > 0) {
          available = slots.filter(s => staff.some(sm => {
            const apts = [...(booked || []).filter((a: any) => a.staff_id === sm.id), ...cartAsApts(dateStr, sm.id)];
            return !isBlocked(s, service.duration, apts);
          }));
        } else {
          const apts = [...(booked || []), ...cartAsApts(dateStr, null)];
          available = slots.filter(s => !isBlocked(s, service.duration, apts));
        }
        if (isToday) available = available.filter(s => { const [h, m] = s.split(':').map(Number); return (h * 60 + m) > nowMinutes; });
        setAvailableSlots(available);
      });
  }, [selectedDay, selectedStaff, cartItems]);

  const canAdd = !!(selectedDay && selectedTime);

  // First available slot that follows all current cart items for the same day/staff
  const suggestedSlot = (() => {
    if (!selectedDay || cartItems.length === 0) return null;
    const dateStr = localDateStr(selectedDay);
    const staffId = selectedStaff?.id || null;
    const dayCart = cartItems.filter(c => {
      if (localDateStr(c.date) !== dateStr) return false;
      if (staffId !== null && c.staff?.id && c.staff.id !== staffId) return false;
      return true;
    });
    if (dayCart.length === 0) return null;
    const latestEnd = dayCart.reduce((max, c) => Math.max(max, toMin(c.time) + c.service.duration + BUFFER_MIN), 0);
    return availableSlots.find(s => toMin(s) >= latestEnd) || null;
  })();

  return (
    <div className="border-t border-gray-100 p-5 bg-[#fafaf8]">
      {/* Staff picker */}
      {staff.length > 1 && (
        <div className="mb-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.14em] mb-2">Personel seç</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedStaff(null)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${selectedStaff === null ? 'border-[#0c0c0d] bg-[#0c0c0d] text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'}`}
            >
              <span className="w-5 h-5 rounded-full bg-gray-400 grid place-items-center text-[8px] font-bold text-white">?</span>
              Fark etmez
            </button>
            {staff.map((s: any) => (
              <button
                key={s.id}
                onClick={() => setSelectedStaff(selectedStaff?.id === s.id ? null : s)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${selectedStaff?.id === s.id ? 'border-[#0c0c0d] bg-[#0c0c0d] text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'}`}
              >
                <div className="w-5 h-5 rounded-full bg-[#14b8a6] grid place-items-center text-[8px] font-bold text-white overflow-hidden flex-shrink-0">
                  {s.avatar_url ? <img src={s.avatar_url} className="w-full h-full object-cover" alt="" /> : s.first_name?.charAt(0)}
                </div>
                {s.first_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date strip */}
      <div className="mb-4">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.14em] mb-2">Tarih seç</p>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map(d => {
            const dateStr = localDateStr(d);
            const count = slotCounts[dateStr];
            const isSelected = selectedDay && localDateStr(selectedDay) === dateStr;
            const isClosed = count === 0;
            const isLoading = count === undefined || count === null;
            return (
              <button
                key={dateStr}
                disabled={isClosed || isLoading}
                onClick={() => { setSelectedDay(d); setSelectedTime(''); }}
                className={`p-2 rounded-xl border text-center transition-all ${
                  isSelected ? 'bg-[#0c0c0d] border-[#0c0c0d] text-white' :
                  isClosed ? 'opacity-40 cursor-not-allowed border-gray-100 bg-white' :
                  'border-gray-200 bg-white hover:border-[#14b8a6]'
                }`}
              >
                <div className={`text-[9px] font-mono uppercase tracking-wider ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>{DAY_NAMES_SHORT[d.getDay()]}</div>
                <div className={`text-lg font-bold mt-0.5 ${isSelected ? 'text-white' : 'text-[#0c0c0d]'}`}>{d.getDate()}</div>
                <div className={`text-[8px] font-mono leading-tight ${isSelected ? 'text-white/70' : isClosed ? 'text-red-400' : 'text-[#15803d]'}`}>
                  {isLoading ? '...' : isClosed ? 'Kapalı' : `${count} boş`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      {selectedDay && (
        <div className="mb-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.14em] mb-2">Saat seç</p>
          {isClosedDay ? (
            <p className="text-sm text-gray-400">Bu gün işletme kapalı.</p>
          ) : availableSlots.length === 0 ? (
            <p className="text-sm text-gray-400">Bu gün müsait saat yok.</p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
              {availableSlots.map(t => {
                const inCart = isInCart(t);
                return (
                  <button
                    key={t}
                    onClick={() => { if (!inCart) setSelectedTime(t); }}
                    className={`relative py-2.5 rounded-xl border font-mono text-sm font-semibold text-center transition-all ${
                      inCart ? 'opacity-60 border-[#14b8a6]/50 bg-[#14b8a6]/10 text-[#0d9488] cursor-default' :
                      selectedTime === t ? 'bg-[#14b8a6] border-[#14b8a6] text-[#04221d]' :
                      t === suggestedSlot ? 'border-amber-400 bg-amber-50 text-[#0c0c0d] hover:border-amber-500' :
                      'border-gray-200 bg-white text-gray-600 hover:border-[#14b8a6]'
                    }`}
                  >
                    {!inCart && t === suggestedSlot && (
                      <span className="absolute -top-1.5 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full flex items-center justify-center text-[7px] font-black text-black leading-none">★</span>
                    )}
                    {inCart ? <span className="text-[9px] leading-tight block">✓<br/>Sepette</span> : t}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 gap-4">
        <div className="text-sm text-gray-500 font-mono min-w-0">
          {canAdd
            ? <span><span className="font-semibold text-[#0c0c0d]">{selectedDay!.getDate()} {MONTHS_SHORT[selectedDay!.getMonth()]} · {selectedTime}</span>{selectedStaff ? ` · ${selectedStaff.first_name}` : ''}</span>
            : <span className="text-gray-400">Devam etmek için saat seç</span>
          }
        </div>
        <button
          disabled={!canAdd}
          onClick={() => {
            // Misafirler de sepete ekleyebilir — kimlik, onay adımında (misafir formu / giriş) alınır.
            if (!availableSlots.includes(selectedTime)) { onError("Bu saat artık müsait değil."); return; }
            onAdd({ service, date: selectedDay!, time: selectedTime, staff: selectedStaff });
          }}
          className="flex-shrink-0 bg-[#0c0c0d] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#14b8a6] hover:text-[#04221d] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Sepete ekle →
        </button>
      </div>
    </div>
  );
}

// ---------- Main Page ----------
export default function ShopDetail() {
  const params = useParams();
  const router = useRouter();

  // Bu sayfa iki route'tan render edilir: /shop/[id] ve /b/[slug] (re-export).
  // id varsa direkt; yoksa slug'dan shop id çözülür. Eski /shop/[id] aynen çalışır.
  const idParam = (Array.isArray(params.id) ? params.id[0] : params.id) as string | undefined;
  const slugParam = (Array.isArray(params.slug) ? params.slug[0] : params.slug) as string | undefined;
  const [shopId, setShopId] = useState<number | null>(idParam ? parseInt(idParam, 10) : null);

  const [shop, setShop] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [shopHours, setShopHours] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [haircutUrls, setHaircutUrls] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userHasReviewed, setUserHasReviewed] = useState(false);

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [showAllHours, setShowAllHours] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceStaffFilter, setServiceStaffFilter] = useState<any>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
  const [nearbyShops, setNearbyShops] = useState<any[]>([]);
  const [nearbyAvailability, setNearbyAvailability] = useState<Record<number, boolean>>({});
  const [nearbyFillRate, setNearbyFillRate] = useState<Record<number, number>>({});

  // New v2 state
  const [expandedServiceId, setExpandedServiceId] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [lastConfirmed, setLastConfirmed] = useState<CartItem | null>(null);

  // Misafir (hesapsız) randevu akışı
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestLinks, setGuestLinks] = useState<{ token: string; label: string }[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  // KVKK: aydınlatma + yurt dışı aktarım rızası — pre-ticked OLAMAZ
  const [guestKvkkConsent, setGuestKvkkConsent] = useState(false);
  const [guestTransferConsent, setGuestTransferConsent] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onScroll = () => {
      const h = heroRef.current?.offsetHeight ?? 350;
      setShowStickyBar(window.scrollY > h + 80);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!shop?.id || !shop?.city) return;
    const todayStr = localDateStr(new Date());
    supabase
      .from('shops')
      .select('id, name, category, city, district, image_url, gallery_urls, created_at, is_promoted, services(price, duration), shop_hours(day_of_week, is_closed, open_time, close_time), reviews(rating), campaigns(id, type, discount_value, start_date, end_date, is_active)')
      .neq('id', shop.id)
      .eq('city', shop.city)
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .limit(12)
      .then(async ({ data }) => {
        if (!data) return;
        const shopIds = data.map((s: any) => s.id);
        const { data: todayApts } = await supabase
          .from('appointments')
          .select('shop_id')
          .in('shop_id', shopIds)
          .eq('appointment_date', todayStr)
          .neq('status', 'İptal Edildi');
        const bookedByShop: Record<number, number> = {};
        (todayApts || []).forEach((a: any) => { bookedByShop[a.shop_id] = (bookedByShop[a.shop_id] || 0) + 1; });
        const calcAvailable = (s: any): boolean => {
          const todayIdx = new Date().getDay();
          const h = s.shop_hours?.find((h: any) => h.day_of_week === todayIdx);
          if (!h || h.is_closed) return false;
          const [oH, oM] = h.open_time.split(':').map(Number);
          const [cH, cM] = h.close_time.split(':').map(Number);
          const totalMin = (cH * 60 + cM) - (oH * 60 + oM);
          const minDur = s.services?.length ? Math.min(...s.services.map((sv: any) => Number(sv.duration) || 60)) : 60;
          const totalSlots = Math.max(0, Math.floor(totalMin / minDur));
          return totalSlots > (bookedByShop[s.id] || 0);
        };
        const calcFillRate = (s: any): number => {
          const todayIdx = new Date().getDay();
          const h = s.shop_hours?.find((h: any) => h.day_of_week === todayIdx);
          if (!h || h.is_closed) return 0;
          const [oH, oM] = h.open_time.split(':').map(Number);
          const [cH, cM] = h.close_time.split(':').map(Number);
          const totalMin = (cH * 60 + cM) - (oH * 60 + oM);
          const minDur = s.services?.length ? Math.min(...s.services.map((sv: any) => Number(sv.duration) || 60)) : 60;
          const totalSlots = Math.max(1, Math.floor(totalMin / minDur));
          return (bookedByShop[s.id] || 0) / totalSlots;
        };
        const availability: Record<number, boolean> = {};
        const fillRates: Record<number, number> = {};
        data.forEach((s: any) => { availability[s.id] = calcAvailable(s); fillRates[s.id] = calcFillRate(s); });
        setNearbyAvailability(availability);
        setNearbyFillRate(fillRates);
        const hasActiveCampaign = (s: any) => s.campaigns?.some((c: any) => c.is_active && c.start_date <= todayStr && c.end_date >= todayStr);
        const scoreShop = (s: any): number => {
          const revs = s.reviews || [];
          const avg = revs.length ? revs.reduce((sum: number, r: any) => sum + r.rating, 0) / revs.length : 0;
          const fr = fillRates[s.id] || 0;
          return (s.category === shop.category ? 30 : 0) + avg * 8 + Math.min(revs.length, 30) * 0.5
            + (availability[s.id] ? 25 : 0) + (hasActiveCampaign(s) ? 15 : 0) + (s.is_promoted ? 50 : 0) + (fr > 0.6 ? 10 : 0);
        };
        setNearbyShops([...data].sort((a: any, b: any) => scoreShop(b) - scoreShop(a)));
      });
  }, [shop?.id, shop?.city, shop?.category]);

  const toggleFavorite = useCallback(async () => {
    if (!currentUserId) { setIsAuthOpen(true); return; }
    if (shopId == null) return;
    if (isFavorited) {
      await supabase.from('favorites').delete().eq('user_id', currentUserId).eq('shop_id', shopId);
      setIsFavorited(false);
    } else {
      await supabase.from('favorites').insert({ user_id: currentUserId, shop_id: shopId });
      setIsFavorited(true);
    }
  }, [currentUserId, isFavorited, shopId]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: shop?.name ?? 'Randezy', url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shop]);

  const fetchReviews = async () => {
    if (shopId == null) return;
    const { data } = await supabase.from('reviews').select('*, profiles(full_name), owner_reply, owner_reply_at').eq('shop_id', shopId).order('created_at', { ascending: false });
    setReviews(data || []);
  };

  // Slug route'unda shop id'yi çöz (id route'unda anında set edilir)
  useEffect(() => {
    if (idParam) { setShopId(parseInt(idParam, 10)); return; }
    if (slugParam) {
      supabase.from('shops').select('id').eq('slug', slugParam).maybeSingle()
        .then(({ data }) => { if (data?.id != null) setShopId(data.id as number); else setNotFound(true); });
    }
  }, [idParam, slugParam]);

  useEffect(() => {
    if (shopId == null || isNaN(shopId)) { return; }
    Promise.all([
      supabase.from('shops').select('*').eq('id', shopId).single(),
      supabase.from('services').select('*').eq('shop_id', shopId).order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
      supabase.from('shop_hours').select('*').eq('shop_id', shopId),
      supabase.from('staff').select('*').eq('shop_id', shopId).order('created_at', { ascending: true }),
      supabase.from('campaigns').select('*').eq('shop_id', shopId).eq('is_active', true),
    ]).then(([{ data: shopData }, { data: servicesData }, { data: hoursData }, { data: staffData }, { data: campData }]) => {
      if (!shopData) { setNotFound(true); return; }
      setShop(shopData);
      setGallery(shopData.gallery_urls || []);
      setHaircutUrls(shopData.haircut_urls || []);
      setServices(servicesData || []);
      setShopHours(hoursData || []);
      setStaff(staffData || []);
      const todayLocal = localDateStr(new Date());
      setActiveCampaigns((campData || []).filter((c: any) => c.start_date <= todayLocal && c.end_date >= todayLocal));
    });
    fetchReviews();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
      if (user) {
        supabase.from('favorites').select('id').eq('user_id', user.id).eq('shop_id', shopId).maybeSingle()
          .then(({ data }) => setIsFavorited(!!data));
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, [shopId]);

  useEffect(() => {
    if (!currentUserId || reviews.length === 0) return;
    setUserHasReviewed(reviews.some(r => r.user_id === currentUserId));
  }, [reviews, currentUserId]);

  const handleSubmitReview = async () => {
    if (!currentUserId) { alert("Yorum yazmak için giriş yapmalısınız."); return; }
    if (reviewRating === 0) { alert("Lütfen bir puan seçin."); return; }
    if (shopId == null) return;
    setSubmittingReview(true);
    const { error } = await supabase.from('reviews').upsert([{ shop_id: shopId, user_id: currentUserId, rating: reviewRating, comment: reviewComment }], { onConflict: 'shop_id,user_id' });
    if (error) {
      alert("Hata: " + error.message);
    } else {
      const { data: allReviews } = await supabase.from('reviews').select('rating').eq('shop_id', shopId);
      if (allReviews && allReviews.length > 0) {
        const avg = allReviews.reduce((s: number, r: any) => s + r.rating, 0) / allReviews.length;
        await supabase.from('shops').update({ score: Math.round(avg * 10) / 10 }).eq('id', shopId);
      }
      setReviewRating(0);
      setReviewComment("");
      await fetchReviews();
    }
    setSubmittingReview(false);
  };

  // Pre-insert overlap check: sepetteki her öğeyi DB'deki mevcut randevulara karşı doğrular.
  // Çakışan öğeyi sepetten düşürüp toast gösterir ve false döner.
  // Hem giriş yapmış hem misafir akışı bu kontrolden geçer (asıl güvence DB trigger'ında).
  const verifyCartAvailability = async (): Promise<boolean> => {
    const _toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
    const _BUF = 5;
    for (const item of cart) {
      const dateStr = localDateStr(item.date);
      const staffId = item.staff?.id || null;
      const ns = _toMin(item.time);
      const ne = ns + item.service.duration;
      const { data: allSlots } = await supabase.rpc('get_shop_slots', { p_shop_id: shopId, p_dates: [dateStr] });
      const existing = staffId
        ? (allSlots || []).filter((a: any) => a.staff_id === staffId)
        : (allSlots || []).filter((a: any) => !a.staff_id);
      for (const apt of existing) {
        if (!apt.appointment_time) continue;
        const es = _toMin(apt.appointment_time.slice(0, 5));
        const ee = es + (apt.duration_snapshot ?? 30) + _BUF;
        if (ns < ee && ne > es) {
          setCart(prev => prev.filter(c => !(
            String(c.service.id) === String(item.service.id) &&
            c.time === item.time &&
            localDateStr(c.date) === dateStr &&
            (c.staff?.id || null) === staffId
          )));
          setToast(`${item.time} saati az önce doldu. ${item.service.name} sepetten kaldırıldı.`);
          return false;
        }
      }
    }
    return true;
  };

  const handleCartConfirm = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    // Üyelik öncelikli akış: önce AuthModal açılır; misafir yolu modaldaki
    // "Üye olmadan randevu al" (onGuestContinue) ile ikincil seçenek olarak sunulur.
    if (!session) { setLoading(false); setIsAuthOpen(true); return; }

    if (!(await verifyCartAvailability())) { setLoading(false); return; }

    const { data: profileData } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, email: session.user.email }, { onConflict: 'id' })
      .select('full_name')
      .single();
    const customerName = profileData?.full_name || session.user.user_metadata?.full_name || 'Müşteri';
    const inserts = cart.map(item => ({
      user_id: session.user.id,
      shop_id: shopId,
      customer_name: customerName,
      service_id: item.service.id,
      service_name: item.service.name,
      price: item.discountedPrice,
      appointment_date: localDateStr(item.date),
      appointment_time: item.time,
      status: 'Beklemede',
      staff_id: item.staff?.id || null,
      duration_snapshot: item.service.duration,
    }));
    const { data: insertedApts, error } = await supabase.from('appointments').insert(inserts).select('id');
    if (!error) {
      setLastConfirmed(cart[0]);
      cart.forEach((_item, idx) => {
        const appointmentId = insertedApts?.[idx]?.id;
        if (!appointmentId) return;
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ type: 'new_appointment', appointmentId }),
        }).catch(() => {});
      });
      setCart([]);
      setExpandedServiceId(null);
      setShowSuccess(true);
    } else {
      setToast("Rezervasyon hatası: " + error.message);
    }
    setLoading(false);
  };

  // Misafir randevusu: doğrulama → overlap ön kontrolü → /api/guest-appointments.
  // Insert service_role ile server'da yapılır (RLS anon'a kapalı kalır),
  // işletme bildirimi de server tarafında tetiklenir.
  const handleGuestConfirm = async () => {
    const name = guestName.trim().replace(/\s+/g, ' ');
    if (name.length < 2 || /^\d+$/.test(name)) { setGuestError('Geçerli bir ad soyad girin.'); return; }
    const phone = normalizePhone(guestPhone);
    if (!phone) { setGuestError('Geçerli bir Türkiye cep telefonu girin. Örnek: 05321234567'); return; }
    const email = guestEmail.trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) { setGuestError('Geçerli bir e-posta girin.'); return; }
    if (!guestKvkkConsent || !guestTransferConsent) { setGuestError('Devam etmek için zorunlu onayları işaretleyin.'); return; }

    setGuestError(null);
    setLoading(true);

    if (!(await verifyCartAvailability())) { setLoading(false); setShowGuestForm(false); return; }

    try {
      const res = await fetch('/api/guest-appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId,
          guest: { name, phone, email: email || undefined },
          consents: { kvkk: guestKvkkConsent, transfer: guestTransferConsent },
          items: cart.map(item => ({
            serviceId: item.service.id,
            price: item.discountedPrice,
            date: localDateStr(item.date),
            time: item.time,
            staffId: item.staff?.id || null,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          setShowGuestForm(false);
          setToast(data.detail || 'Seçtiğin saatlerden biri az önce doldu. Lütfen tekrar dene.');
        } else {
          setGuestError(data.detail || 'Randevu oluşturulamadı. Lütfen tekrar deneyin.');
        }
        setLoading(false);
        return;
      }
      setGuestLinks((data.appointments || []).map((a: any, idx: number) => ({
        token: a.guest_token,
        label: cart[idx]?.service?.name || 'Randevu',
      })).filter((l: any) => l.token));
      setLastConfirmed(cart[0]);
      setCart([]);
      setExpandedServiceId(null);
      setShowGuestForm(false);
      setShowSuccess(true);
    } catch {
      setGuestError('Bağlantı hatası. Lütfen tekrar deneyin.');
    }
    setLoading(false);
  };

  const SERVICE_CATEGORIES = ['Saç', 'Sakal', 'Saç + Sakal', 'Kafa Tıraşı', 'Boya / Kamuflaj', 'Ek Hizmetler', 'Masaj', 'Tırnak', 'Kaş/Kirpik', 'Diğer'];
  const filteredServices = useMemo(() => {
    let result = services;
    if (serviceStaffFilter) result = result.filter((s: any) => !s.staff_id || s.staff_id === serviceStaffFilter.id || (Array.isArray(s.staff_ids) && s.staff_ids.includes(serviceStaffFilter.id)));
    if (serviceSearch.trim()) { const q = serviceSearch.toLowerCase(); result = result.filter((s: any) => s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)); }
    return result;
  }, [services, serviceStaffFilter, serviceSearch]);

  const groupedServices = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredServices.forEach((s: any) => { const cat = s.category || 'Diğer'; if (!groups[cat]) groups[cat] = []; groups[cat].push(s); });
    const sorted: Record<string, any[]> = {};
    SERVICE_CATEGORIES.forEach(c => { if (groups[c]) sorted[c] = groups[c]; });
    Object.keys(groups).forEach(c => { if (!sorted[c]) sorted[c] = groups[c]; });
    return sorted;
  }, [filteredServices]);

  const getNearbyMinPrice = (svcs: any[]) => { if (!svcs?.length) return null; const min = Math.min(...svcs.map((s: any) => Number(s.price) || Infinity)); return min === Infinity ? null : min; };
  const getNearbyRating = (revs: any[]) => { if (!revs || revs.length < 3) return null; return (revs.reduce((s: number, r: any) => s + r.rating, 0) / revs.length).toFixed(1); };

  if (notFound) return <div className="p-10 text-center font-black text-gray-400 uppercase tracking-widest">Dükkan bulunamadı.</div>;
  if (!shop) return <div className="p-10 text-center font-black text-gray-200 uppercase tracking-widest italic">Yükleniyor...</div>;

  // Puan yalnızca 3+ yorumdan sonra gösterilir
  const avgRating = reviews.length >= 3 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const todayIdx = new Date().getDay();
  const todayHours = shopHours.find((h: any) => h.day_of_week === todayIdx);
  const isOpenNow = !!(todayHours && !todayHours.is_closed && (() => {
    const now = new Date();
    const [oH, oM] = todayHours.open_time.split(':').map(Number);
    const [cH, cM] = todayHours.close_time.split(':').map(Number);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return nowMin >= oH * 60 + oM && nowMin < cH * 60 + cM;
  })());
  const nextSlot = (() => {
    if (!todayHours || todayHours.is_closed) return null;
    const minDur = services.length ? Math.min(...services.map((s: any) => s.duration || 60)) : 60;
    const slots = generateTimeSlots(todayHours.open_time, todayHours.close_time, minDur);
    const now = new Date(); const nowMin = now.getHours() * 60 + now.getMinutes();
    return slots.find(s => { const [h, m] = s.split(':').map(Number); return (h * 60 + m) > nowMin; }) || null;
  })();

  const streetPart = shop.street ? `${shop.street}${shop.building_no ? ' No:' + shop.building_no : ''}` : null;
  const addressLine1 = [streetPart, shop.neighborhood].filter(Boolean).join(', ');
  const addressLine2 = [shop.district, shop.city, shop.postal_code].filter(Boolean).join(' / ');
  const mapQuery = [streetPart, shop.neighborhood, shop.district, shop.city].filter(Boolean).join(', ') || [shop.district, shop.city].filter(Boolean).join(', ');
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}`;

  const cartOriginalTotal = cart.reduce((a, c) => a + (Number(c.service.price) || 0), 0);
  const cartTotal = cart.reduce((a, c) => a + c.discountedPrice, 0);
  const cartDiscount = cartOriginalTotal - cartTotal;
  const cartDuration = cart.reduce((a, c) => a + c.service.duration, 0);

  // Success screen
  if (showSuccess && lastConfirmed) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#fafaf8] overflow-y-auto" style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}>
        <button onClick={() => { setShowSuccess(false); router.push('/'); }} className="fixed top-5 right-5 p-3 hover:rotate-90 transition-all duration-500 text-black group z-[210] bg-white/50 backdrop-blur-md rounded-full shadow-sm">
          <X size={24} />
        </button>
        <div className="min-h-screen flex items-center justify-center py-16 px-4">
          <div className="max-w-xl w-full text-center">
            <div className="mb-10 flex justify-center">
              <div className="w-20 h-20 bg-[#14b8a6] rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(20,184,166,0.3)]">
                <CheckCircle2 size={40} className="text-white" />
              </div>
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter text-[#0c0c0d] mb-4">Randevun Alındı!</h2>
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 mb-8 space-y-6">
              <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] font-black text-[#14b8a6] uppercase tracking-[0.3em]">Hizmet & İşletme</p>
                <p className="text-xl font-black uppercase text-[#0c0c0d]">{lastConfirmed.service.name} — {shop.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><CalIcon size={10} /> Tarih</p>
                  <p className="font-black uppercase text-[#0c0c0d]">{lastConfirmed.date.getDate()} {MONTHS_LONG[lastConfirmed.date.getMonth()]} {lastConfirmed.date.getFullYear()}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><Clock size={10} /> Saat</p>
                  <p className="font-black uppercase text-[#14b8a6] text-xl">{lastConfirmed.time}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-50">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><MapPin size={10} /> Konum</p>
                <p className="font-bold text-xs text-gray-500 uppercase tracking-widest">{shop.district}, {shop.city}</p>
              </div>
              <div className="pt-4 border-t border-gray-50 flex flex-col items-center gap-1">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tutar</p>
                {lastConfirmed.campaign && lastConfirmed.discountedPrice < Number(lastConfirmed.service.price) ? (
                  <div className="flex items-center gap-2">
                    <span className="line-through text-gray-300 font-mono text-sm">₺{lastConfirmed.service.price}</span>
                    <span className="font-black text-[#14b8a6] text-lg">₺{lastConfirmed.discountedPrice}</span>
                    <span className="bg-amber-400 text-black text-[9px] font-black px-2 py-0.5 rounded-lg uppercase">🏷 {lastConfirmed.campaign.title}</span>
                  </div>
                ) : (
                  <p className="font-black text-[#0c0c0d] text-lg">₺{lastConfirmed.discountedPrice}</p>
                )}
              </div>
            </div>
            {/* Misafir randevusu: şifresiz takip linki */}
            {guestLinks.length > 0 && (
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-8 text-left guest-sheet-in">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 size={13} className="text-[#14b8a6]" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Randevu Takip Linkin</p>
                </div>
                <p className="text-[11px] leading-relaxed mb-4 text-gray-400">
                  Bu link sana özel — randevunu buradan görüntüleyebilir ve gerekirse iptal edebilirsin. E-postana da gönderdik.
                </p>
                {guestLinks.map((l) => (
                  <div key={l.token} className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2.5 mb-2 last:mb-0">
                    <span className="font-mono text-[11px] truncate flex-1 text-gray-600">
                      {`${window.location.origin}/randevu/${l.token}`}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/randevu/${l.token}`)
                          .then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); })
                          .catch(() => {});
                      }}
                      className={`flex-shrink-0 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${
                        linkCopied ? 'bg-[#14b8a6] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {linkCopied ? '✓ Kopyalandı' : 'Kopyala'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => router.push('/')} className="bg-[#0c0c0d] text-white px-12 py-4 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#14b8a6] transition-all text-sm">
              Keşfetmeye Devam Et
            </button>
            {guestLinks.length > 0 && (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="block mx-auto mt-5 text-[11px] font-bold text-gray-400 hover:text-[#14b8a6] transition-colors"
              >
                Randevularını tek yerden takip etmek ister misin? <span className="font-black underline">Hesap oluştur</span>
              </button>
            )}
          </div>
        </div>
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        <style>{`
          @keyframes guestSheetIn { from { opacity: 0; transform: translateY(28px) scale(0.98); } to { opacity: 1; transform: none; } }
          .guest-sheet-in { animation: guestSheetIn .38s cubic-bezier(0.16, 1, 0.3, 1); }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Manrope', system-ui, sans-serif" }} className="bg-white min-h-screen text-[#0c0c0d]">

      {/* Toast */}
      {toast && (
        <div className="fixed top-24 right-5 z-[60] bg-[#0c0c0d] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm">
          <div className="w-6 h-6 rounded-full bg-[#14b8a6] text-[#04221d] grid place-items-center font-bold flex-shrink-0">✓</div>
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-14 py-5 border-b border-gray-100 bg-white sticky top-0 z-30">
        <div onClick={() => router.push('/')} className="cursor-pointer">
          <div className="text-xl font-black tracking-[0.04em]" style={{ borderBottom: '3px solid #14b8a6', paddingBottom: '3px', display: 'inline-block' }}>RANDEZY</div>
        </div>
        <button onClick={() => router.push('/')} className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.12em] text-gray-500 hover:text-[#14b8a6] transition-colors">
          <ArrowLeft size={12} /> <span className="hidden sm:inline">Ana sayfaya dön</span><span className="sm:hidden">Geri</span>
        </button>
      </header>

      {/* Page grid */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-14 py-10 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 items-start">

          {/* ── Left column ── */}
          <div>

            {/* Hero */}
            <div ref={heroRef} className="relative rounded-3xl overflow-hidden" style={{ aspectRatio: '16/11', background: '#cdb8b0', boxShadow: '0 20px 50px -30px rgba(0,0,0,0.25)' }}>
              {shop.image_url
                ? <img src={shop.image_url} className="absolute inset-0 w-full h-full object-cover" alt={shop.name} />
                : <div className="absolute inset-0 bg-gradient-to-br from-pink-200 via-rose-300 to-rose-700 flex items-center justify-center"><ImageIcon size={64} className="text-white/40" /></div>
              }
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/55" />

              {/* Top-right: fav + share */}
              <div className="absolute top-5 right-5 flex gap-2">
                <button onClick={toggleFavorite} className="w-10 h-10 rounded-full border-0 grid place-items-center shadow-lg hover:scale-105 transition-all" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)' }}>
                  <Heart size={16} className={isFavorited ? 'fill-red-500 text-red-500' : 'text-[#0c0c0d]'} />
                </button>
                <button onClick={handleShare} className="w-10 h-10 rounded-full border-0 grid place-items-center shadow-lg hover:scale-105 transition-all" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)' }}>
                  {copied ? <CheckCircle2 size={16} className="text-[#14b8a6]" /> : <Share2 size={16} className="text-[#0c0c0d]" />}
                </button>
              </div>

              {/* Bottom-left: biz card */}
              <div className="absolute left-5 bottom-5 rounded-2xl flex items-center gap-3 shadow-xl max-w-[340px]" style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)', padding: '10px 16px 10px 12px' }}>
                <div className="w-10 h-10 rounded-full flex-shrink-0 grid place-items-center font-bold text-white text-base" style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                  {shop.name?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-bold tracking-tight m-0 flex items-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis">
                    {shop.name}
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex-shrink-0" style={{ background: '#e6f7f4', color: '#0d9488' }}>✓</span>
                  </h1>
                  <div className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">
                    {shop.category}{shop.city ? ` · ${shop.city}` : ''}{avgRating ? ` · ★ ${avgRating}` : ''}
                  </div>
                </div>
              </div>

              {/* Bottom-right: CTA chip */}
              {isOpenNow && nextSlot && (
                <div className="absolute right-5 bottom-5 text-white rounded-2xl flex items-center gap-3 shadow-xl text-xs" style={{ background: 'rgba(12,12,13,0.88)', backdropFilter: 'blur(20px)', padding: '6px 6px 6px 14px', maxWidth: '320px' }}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#15803d', boxShadow: '0 0 0 3px rgba(21,128,61,0.25)', animation: 'pulse 2s infinite' }} />
                  <span style={{ color: 'rgba(255,255,255,0.85)' }}>Bugün <b style={{ color: '#fff', fontWeight: 600 }}>{nextSlot}</b> müsait</span>
                  <button
                    onClick={() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="border-0 rounded-xl font-bold text-[13px] flex items-center gap-1.5 transition-colors"
                    style={{ background: '#14b8a6', color: '#04221d', padding: '10px 16px' }}
                  >
                    Randevu al →
                  </button>
                </div>
              )}
            </div>

            {/* Active campaigns banner */}
            {activeCampaigns.length > 0 && (
              <div className="mt-6 space-y-3">
                {activeCampaigns.map((c: any) => {
                  const label = c.type === 'percentage' ? `%${c.discount_value} İndirim` : c.type === 'fixed' ? `₺${c.discount_value} İndirim` : c.type === 'today_special' ? 'Bugüne Özel Fiyat' : 'Son Dakika Fırsatı';
                  return (
                    <div key={c.id} className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
                      <span className="text-2xl">🏷️</span>
                      <div>
                        <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest">{label}</p>
                        <p className="text-[13px] font-semibold text-amber-900">{c.title}</p>
                      </div>
                      <span className="ml-auto text-[10px] text-amber-500 font-mono">{c.end_date} tarihine kadar</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Gallery */}
            {gallery.length > 0 && (
              <div className="mt-14">
                <div className="flex items-end justify-between mb-6">
                  <h2 className="text-[28px] font-bold tracking-tight inline-block" style={{ borderBottom: '3px solid #14b8a6', paddingBottom: '6px' }}>Galeri</h2>
                  <div className="font-mono text-[11px] text-gray-400 uppercase tracking-widest">{gallery.length} fotoğraf</div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {gallery.map((url, i) => (
                    <div key={i} onClick={() => setLightboxUrl(url)} className="aspect-square rounded-2xl overflow-hidden cursor-pointer relative border border-gray-100 group">
                      <img src={url} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Services */}
            <div id="services-section" className="mt-14">
              <div className="flex items-end justify-between mb-6">
                <h2 className="text-[28px] font-bold tracking-tight inline-block" style={{ borderBottom: '3px solid #14b8a6', paddingBottom: '6px' }}>Hizmetlerimiz</h2>
                <div className="font-mono text-[11px] text-gray-500 uppercase tracking-widest">{filteredServices.length} hizmet · Anlık randevu</div>
              </div>

              {staff.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
                  <button onClick={() => setServiceStaffFilter(null)} className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${serviceStaffFilter === null ? 'border-[#0c0c0d] bg-[#0c0c0d] text-white' : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-300'}`}>
                    <Users size={10} /> Tümü
                  </button>
                  {staff.map((s: any) => (
                    <button key={s.id} onClick={() => setServiceStaffFilter(serviceStaffFilter?.id === s.id ? null : s)} className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${serviceStaffFilter?.id === s.id ? 'border-[#14b8a6] bg-[#e6f7f4] text-[#0d9488]' : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-300'}`}>
                      <div className="w-5 h-5 rounded-full overflow-hidden bg-[#e6f7f4] flex items-center justify-center flex-shrink-0">
                        {s.avatar_url ? <img src={s.avatar_url} className="w-full h-full object-cover" alt="" /> : <span className="text-[#14b8a6] font-black text-[8px]">{s.first_name?.charAt(0)}</span>}
                      </div>
                      {s.first_name}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative mb-5">
                <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                <input value={serviceSearch} onChange={e => setServiceSearch(e.target.value)} placeholder="Hizmet ara..." className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#14b8a6] transition-colors bg-white" />
                {serviceSearch && <button onClick={() => setServiceSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><X size={13} /></button>}
              </div>

              <div className="flex flex-col gap-3">
                {filteredServices.length === 0 ? (
                  <p className="text-center py-10 text-gray-300 font-bold text-sm uppercase tracking-widest">{serviceSearch ? 'Hizmet bulunamadı.' : 'Henüz hizmet eklenmemiş.'}</p>
                ) : (
                  Object.entries(groupedServices).map(([category, catServices]) => (
                    <div key={category}>
                      {Object.keys(groupedServices).length > 1 && (
                        <div className="flex items-center gap-3 my-3">
                          <div className="h-px flex-1 bg-gray-100" />
                          <span className="text-[10px] font-black text-[#0d9488] uppercase tracking-[0.2em]">{category}</span>
                          <div className="h-px flex-1 bg-gray-100" />
                        </div>
                      )}
                      {(catServices as any[]).map((service: any) => {
                        const isExpanded = expandedServiceId === service.id;
                        return (
                          <div key={service.id} className="rounded-2xl overflow-hidden transition-all mb-3" style={{ border: isExpanded ? '1px solid #14b8a6' : '1px solid #ececea', boxShadow: isExpanded ? '0 12px 30px -16px rgba(20,184,166,0.3)' : 'none' }}>
                            <div
                              className="grid grid-cols-[1fr_auto] items-center p-5 gap-5 cursor-pointer transition-colors"
                              style={{ background: isExpanded ? 'transparent' : undefined }}
                              onClick={() => setExpandedServiceId(isExpanded ? null : service.id)}
                              onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLDivElement).style.background = '#fafaf8'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                            >
                              <div>
                                <h3 className="text-[15px] font-bold tracking-tight m-0 mb-1.5 text-[#0c0c0d]">{service.name}</h3>
                                {service.description && <p className="text-[13px] text-gray-600 mb-2 max-w-[480px] m-0">{service.description}</p>}
                                <div className="flex gap-4 font-mono text-[11px] text-gray-500 uppercase tracking-wider">
                                  <span className="flex items-center gap-1"><Clock size={11} className="text-[#14b8a6]" /> {service.duration} dk</span>
                                  {staff.length > 0 && <span className="flex items-center gap-1"><User size={11} className="text-[#14b8a6]" /> {serviceStaffFilter ? serviceStaffFilter.first_name : 'Tüm Personel'}</span>}
                                </div>
                              </div>
                              {(() => {
                                const { original, discounted, pct } = calcDiscountedPrice(service, activeCampaigns);
                                const hasDiscount = discounted < original;
                                return (
                                  <div className="text-right flex-shrink-0">
                                    {hasDiscount ? (
                                      <>
                                        <div className="text-[13px] line-through text-gray-300 font-mono leading-tight">{original} ₺</div>
                                        <div className="text-[22px] font-bold tracking-tight text-[#14b8a6] leading-tight">{discounted} ₺</div>
                                        <div className="inline-block bg-amber-400 text-black px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide mt-1">-%{pct}</div>
                                      </>
                                    ) : (
                                      <div className="text-[22px] font-bold tracking-tight">{original} ₺</div>
                                    )}
                                    <div className={`font-mono text-[11px] uppercase tracking-wider mt-1.5 flex items-center gap-1 justify-end ${isExpanded ? 'text-[#0d9488]' : 'text-[#14b8a6]'}`}>
                                      {isExpanded ? 'Kapat' : 'Saat seç'}
                                      <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                            {isExpanded && (
                              <InlineBookingPanel
                                service={service}
                                shopHours={shopHours}
                                staff={serviceStaffFilter ? [serviceStaffFilter] : staff}
                                shopId={shopId!}
                                allServices={services}
                                cartItems={cart}
                                onError={setToast}
                                onAdd={(item) => {
                  const _toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
                  const _BUFFER = 5;
                  const ns = _toMin(item.time);
                  const ne = ns + item.service.duration;
                  const nd = localDateStr(item.date);
                  const duplicate = cart.some(ex =>
                    localDateStr(ex.date) === nd &&
                    String(ex.service.id) === String(item.service.id) &&
                    ex.time === item.time &&
                    (ex.staff?.id || null) === (item.staff?.id || null)
                  );
                  if (duplicate) { setToast('Bu randevu zaten sepette.'); return; }
                  const conflict = cart.some(ex => {
                    if (localDateStr(ex.date) !== nd) return false;
                    if (item.staff?.id && ex.staff?.id && item.staff.id !== ex.staff.id) return false;
                    const es = _toMin(ex.time);
                    const ee = es + ex.service.duration + _BUFFER;
                    return ns < ee && ne > es;
                  });
                  if (conflict) { setToast('Bu saatte sepette çakışan randevu var. Farklı saat seçin.'); return; }
                  const { discounted, campaign } = calcDiscountedPrice(item.service, activeCampaigns);
                  setCart(prev => [...prev, { ...item, discountedPrice: discounted, campaign }]);
                  setToast(`${item.service.name} sepete eklendi`);
                  setExpandedServiceId(null);
                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Favori Kesimler */}
            {haircutUrls.length > 0 && (
              <div className="mt-14">
                <div className="flex items-end justify-between mb-6">
                  <h2 className="text-[28px] font-bold tracking-tight inline-block" style={{ borderBottom: '3px solid #14b8a6', paddingBottom: '6px' }}>Favori Kesimlerimiz</h2>
                  <div className="font-mono text-[11px] text-gray-400 uppercase tracking-widest">{haircutUrls.length} fotoğraf</div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {haircutUrls.map((url, i) => (
                    <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-gray-100 group cursor-pointer">
                      <img src={url} alt={`Kesim ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="mt-14">
              <div className="flex items-end justify-between mb-6">
                <h2 className="text-[28px] font-bold tracking-tight inline-block" style={{ borderBottom: '3px solid #14b8a6', paddingBottom: '6px' }}>Yorumlar</h2>
                {reviews.length > 0 && <div className="font-mono text-[11px] text-gray-400 uppercase tracking-widest">{reviews.length} yorum</div>}
              </div>

              {avgRating && (
                <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-8 mb-8 p-6 rounded-2xl" style={{ background: '#fafaf8' }}>
                  <div>
                    <div className="text-7xl font-bold leading-none tracking-tight">{avgRating}</div>
                    <div className="text-[#14b8a6] text-lg tracking-[4px] my-2">{'★'.repeat(Math.round(Number(avgRating)))}{'☆'.repeat(5 - Math.round(Number(avgRating)))}</div>
                    <div className="font-mono text-[12px] text-gray-400">{reviews.length} yorum</div>
                  </div>
                  <div className="flex flex-col gap-2 justify-center">
                    {[5,4,3,2,1].map(star => {
                      const count = reviews.filter(r => r.rating === star).length;
                      const pct = Math.round((count / reviews.length) * 100);
                      return (
                        <div key={star} className="grid items-center gap-2.5 font-mono text-[12px] text-gray-500" style={{ gridTemplateColumns: '30px 1fr 40px' }}>
                          <span>{star} ★</span>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#14b8a6' }} /></div>
                          <span className="text-right text-gray-400 text-[11px]">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentUserId && !userHasReviewed && (
                <div className="bg-gray-50 rounded-2xl p-5 mb-6 border-2 border-dashed border-gray-200">
                  <p className="text-[10px] font-black text-[#14b8a6] uppercase tracking-widest mb-3">Deneyimini Paylaş</p>
                  <div className="flex gap-2 mb-3">{[1,2,3,4,5].map(star => (<button key={star} onClick={() => setReviewRating(star)}><Star size={24} className={star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} /></button>))}</div>
                  <textarea rows={3} placeholder="Yorumun (isteğe bağlı)..." className="w-full bg-white rounded-xl p-4 text-sm outline-none border-2 border-transparent focus:border-[#14b8a6] resize-none mb-3" value={reviewComment} onChange={e => setReviewComment(e.target.value)} />
                  <button onClick={handleSubmitReview} disabled={submittingReview || reviewRating === 0} className="bg-[#0c0c0d] text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#14b8a6] transition-all disabled:opacity-30">
                    {submittingReview ? 'Gönderiliyor...' : 'Yorum Gönder'}
                  </button>
                </div>
              )}
              {!currentUserId && <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6 italic">Yorum yazmak için giriş yapın.</p>}
              {userHasReviewed && <p className="text-[#14b8a6] text-xs font-black uppercase tracking-widest mb-6">Bu işletmeye yorum yaptınız.</p>}

              {reviews.length === 0 ? (
                <div className="text-center py-10 text-gray-300 font-black uppercase tracking-widest text-xs">Henüz yorum yok. İlk yorumu sen yap!</div>
              ) : (
                <div className="flex flex-col">
                  {reviews.map((r, idx) => {
                    const gradients = ['linear-gradient(135deg,#14b8a6,#0d9488)', 'linear-gradient(135deg,#f59e0b,#d97706)', 'linear-gradient(135deg,#6366f1,#4f46e5)', 'linear-gradient(135deg,#ec4899,#db2777)'];
                    return (
                      <div key={r.id} className={`pt-5 grid gap-4 ${idx > 0 ? 'border-t border-gray-100' : ''}`} style={{ gridTemplateColumns: '44px 1fr' }}>
                        <div className="w-11 h-11 rounded-full grid place-items-center font-bold text-sm text-white" style={{ background: gradients[idx % gradients.length] }}>
                          {(r.profiles?.full_name || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="font-semibold text-sm">{r.profiles?.full_name || 'Anonim'}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider" style={{ background: '#e9f6ec', color: '#15803d' }}>✓ Doğrulanmış</span>
                          </div>
                          <div className="text-[13px] tracking-[2px] mb-1" style={{ color: '#14b8a6' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                          <div className="font-mono text-[11px] text-gray-400 uppercase tracking-wider mb-2">{new Date(r.created_at).toLocaleDateString('tr-TR')}</div>
                          {r.comment && <div className="text-sm text-gray-500 leading-relaxed">{r.comment}</div>}
                          {r.owner_reply && (
                            <div className="mt-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
                              <p className="text-[10px] font-semibold text-[#14b8a6] uppercase tracking-widest mb-1">İşletme Yanıtı</p>
                              <p className="text-[13px] text-gray-600 leading-relaxed">{r.owner_reply}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Nearby shops */}
            {(() => {
              const availableCount = nearbyShops.filter((s: any) => nearbyAvailability[s.id]).length;
              const maxReviewCount = nearbyShops.length ? Math.max(...nearbyShops.map((s: any) => s.reviews?.length || 0)) : 0;
              return (
                <div className="mt-20 pb-12">
                  <div className="flex items-end justify-between mb-6">
                    <div>
                      <h2 className="text-[28px] font-bold tracking-tight inline-block" style={{ borderBottom: '3px solid #14b8a6', paddingBottom: '6px' }}>Bölgendeki Diğer İşletmeler</h2>
                      <p className="text-xs text-gray-400 mt-2 max-w-md">
                        {availableCount > 0
                          ? <><span style={{ color: '#14b8a6', fontWeight: 700 }}>{availableCount} işletme</span> bugün müsait — uygun randevunu kaçırma.</>
                          : 'Yakınındaki benzer işletmeleri keşfet.'}
                      </p>
                    </div>
                    {nearbyShops.length > 1 && (
                      <div className="hidden md:flex items-center gap-2 flex-shrink-0 ml-6">
                        <button onClick={() => carouselRef.current?.scrollBy({ left: -260, behavior: 'smooth' })} className="p-3 rounded-2xl border border-gray-200 text-gray-400 hover:border-[#14b8a6] hover:text-[#14b8a6] transition-all"><ChevronLeft size={15} /></button>
                        <button onClick={() => carouselRef.current?.scrollBy({ left: 260, behavior: 'smooth' })} className="p-3 rounded-2xl border border-gray-200 text-gray-400 hover:border-[#14b8a6] hover:text-[#14b8a6] transition-all"><ChevronRight size={15} /></button>
                      </div>
                    )}
                  </div>
                  {nearbyShops.length === 0 ? (
                    <div className="text-center py-14 bg-gray-50 rounded-3xl border border-gray-100">
                      <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.2em]">Yakında önerilecek işletmeler burada görünecek.</p>
                    </div>
                  ) : (
                    <div ref={carouselRef} className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                      {nearbyShops.map((s: any) => {
                        const todayOpen = nearbyAvailability[s.id] ?? false;
                        const fillRate = nearbyFillRate[s.id] ?? 0;
                        const minPrice = getNearbyMinPrice(s.services);
                        const rating = getNearbyRating(s.reviews);
                        const reviewCount = s.reviews?.length || 0;
                        const cover = s.image_url || s.gallery_urls?.[0] || null;
                        const todayStr = localDateStr(new Date());
                        const activeCampaign = s.campaigns?.find((c: any) => c.is_active && c.start_date <= todayStr && c.end_date >= todayStr);
                        const campaignLabel = activeCampaign ? (activeCampaign.type === 'percentage' ? `%${activeCampaign.discount_value} İndirim` : activeCampaign.type === 'fixed' ? `₺${activeCampaign.discount_value} İndirim` : activeCampaign.type === 'today_special' ? 'Bugüne Özel' : 'Son Dakika') : null;
                        const availabilityBadge = todayOpen ? (fillRate > 0.7 ? { label: 'Son Dakika', bg: 'bg-red-500' } : { label: 'Bugün Uygun', bg: 'bg-[#14b8a6]' }) : fillRate > 0.5 ? { label: 'Hızlı Doluyor', bg: 'bg-orange-500' } : null;
                        const isNew = s.created_at && (Date.now() - new Date(s.created_at).getTime()) < 30 * 24 * 60 * 60 * 1000;
                        const isMostPopular = reviewCount >= 5 && reviewCount === maxReviewCount;
                        return (
                          <div key={s.id} onClick={() => router.push(`/shop/${s.id}`)} className="flex-shrink-0 w-52 md:w-60 snap-start cursor-pointer group">
                            <div className="relative h-44 md:h-52 rounded-2xl overflow-hidden bg-gray-100 mb-3 shadow-sm group-hover:shadow-2xl group-hover:-translate-y-1.5 transition-all duration-300">
                              {cover ? <img src={cover} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={s.name} /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-50"><ImageIcon size={28} className="text-gray-300" /></div>}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                              {rating && <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-xl shadow-sm"><span className="text-yellow-400 text-[10px]">★</span><span className="text-[11px] font-black text-[#0c0c0d]">{rating}</span>{reviewCount > 0 && <span className="text-[9px] font-bold text-gray-400">({reviewCount})</span>}</div>}
                              {availabilityBadge && <div className="absolute top-3 right-3"><span className={`${availabilityBadge.bg} text-white px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wide shadow-sm`}>{availabilityBadge.label}</span></div>}
                              {campaignLabel && <div className="absolute bottom-3 right-3"><span className="bg-amber-400 text-black px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wide shadow-sm">{campaignLabel}</span></div>}
                              {(isNew || isMostPopular) && <div className="absolute bottom-3 left-3"><span className="bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wide">{isNew ? 'Yeni İşletme' : 'En Çok Tercih'}</span></div>}
                            </div>
                            <div className="px-0.5">
                              <p className="font-black text-[13px] text-[#0c0c0d] uppercase tracking-tight leading-tight truncate group-hover:text-[#14b8a6] transition-colors">{s.name}</p>
                              <div className="flex items-center justify-between mt-0.5">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide truncate">{s.district && s.city ? `${s.district}, ${s.city}` : s.city || s.district}</p>
                              </div>
                              {minPrice && <p className="text-[11px] font-black text-gray-500 mt-1.5">₺{minPrice}<span className="font-medium text-gray-400">'den</span></p>}
                              <button className="mt-2 w-full py-2 rounded-xl border border-gray-100 bg-white hover:bg-[#14b8a6] hover:text-white hover:border-[#14b8a6] font-black text-[10px] uppercase tracking-widest text-gray-400 transition-all shadow-sm">İncele</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ── Sidebar ── */}
          <div className="hidden lg:flex flex-col gap-4 sticky top-24">

            {/* Map */}
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-lg">
              <div className="h-[180px] w-full bg-gray-100 relative">
                <iframe title="Konum" className="w-full h-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed&z=16`} />
              </div>
              <div className="px-5 py-4 bg-white">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-black text-sm text-[#0c0c0d] uppercase tracking-tight leading-tight">{shop.name}</p>
                  <span className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${isOpenNow ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOpenNow ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {isOpenNow ? 'Açık' : 'Kapalı'}
                  </span>
                </div>
                <div className="space-y-0.5 mb-3">
                  {addressLine1 && <p className="text-[11px] text-gray-600 font-bold leading-snug">{addressLine1}</p>}
                  {addressLine2 && <p className="text-[11px] text-gray-400 font-bold leading-snug">{addressLine2}</p>}
                  {!addressLine1 && !addressLine2 && <p className="text-[11px] text-gray-400 font-bold leading-snug">{[shop.district, shop.city].filter(Boolean).join(', ')}</p>}
                </div>
                <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#14b8a6] uppercase tracking-widest hover:underline">
                  <MapPin size={9} /> Yol Tarifi Al
                </a>
              </div>
            </div>

            {/* Info panel: about + hours + staff + contact + cancel */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {shop.description && (
                <div className="px-5 py-5">
                  <p className="text-[9px] font-black text-[#14b8a6] uppercase tracking-[0.18em] mb-2.5">Hakkımızda</p>
                  <p className="text-[12.5px] text-gray-600 font-medium leading-relaxed">{shop.description}</p>
                </div>
              )}
              {shopHours.length > 0 && (() => {
                const dayNames = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
                const sorted = [...shopHours].sort((a: any, b: any) => a.day_of_week - b.day_of_week);
                return (
                  <div className={`px-5 py-5 ${shop.description ? 'border-t border-gray-50' : ''}`}>
                    <p className="text-[9px] font-black text-[#14b8a6] uppercase tracking-[0.18em] mb-3">Çalışma Saatleri</p>
                    <div className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${todayHours?.is_closed ? 'bg-red-400' : 'bg-green-400'}`} />
                        <span className="text-[11px] font-black uppercase text-[#0c0c0d]">Bugün</span>
                      </div>
                      {todayHours?.is_closed
                        ? <span className="text-[11px] font-black text-red-400">Kapalı</span>
                        : <span className="text-[11px] font-black text-[#14b8a6]">{todayHours?.open_time?.slice(0,5)} – {todayHours?.close_time?.slice(0,5)}</span>
                      }
                    </div>
                    {showAllHours && (
                      <div className="space-y-2 mb-2.5">
                        {sorted.map((h: any) => (
                          <div key={h.day_of_week} className="flex justify-between items-center py-0.5">
                            <span className={`text-[11px] uppercase ${h.day_of_week === todayIdx ? 'text-[#0c0c0d] font-black' : 'text-gray-400 font-bold'}`}>{dayNames[h.day_of_week]}</span>
                            {h.is_closed ? <span className="text-[11px] font-bold text-red-300">Kapalı</span> : <span className="text-[11px] font-bold text-gray-500">{h.open_time?.slice(0,5)} – {h.close_time?.slice(0,5)}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => setShowAllHours(p => !p)} className="flex items-center gap-1 text-[9px] font-black text-[#14b8a6] uppercase tracking-widest hover:underline mt-1">
                      <ChevronDown size={10} className={`transition-transform ${showAllHours ? 'rotate-180' : ''}`} />
                      {showAllHours ? 'Daha Az' : 'Tüm Hafta'}
                    </button>
                  </div>
                );
              })()}
              {staff.length > 0 && (
                <div className="px-5 py-5 border-t border-gray-50">
                  <p className="text-[9px] font-black text-[#14b8a6] uppercase tracking-[0.18em] mb-3">Çalışanlar</p>
                  <div className="flex flex-wrap gap-2.5">
                    {staff.map((s) => (
                      <div key={s.id} className="flex flex-col items-center gap-1.5 p-2">
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-[#e6f7f4] flex items-center justify-center border-2 border-white shadow-sm">
                          {s.avatar_url ? <img src={s.avatar_url} className="w-full h-full object-cover" alt={s.first_name} /> : <span className="text-[#14b8a6] font-black text-sm">{s.first_name?.charAt(0)}{s.last_name?.charAt(0)}</span>}
                        </div>
                        <span className="text-[9px] font-black uppercase text-gray-500 tracking-wide max-w-[52px] truncate text-center">{s.first_name}</span>
                        {s.role && <span className="text-[8px] font-bold text-gray-300 uppercase tracking-wide max-w-[52px] truncate text-center">{s.role}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(shop.shop_phone || shop.email || shop.instagram) && (
                <div className="px-5 py-5 border-t border-gray-50 space-y-2.5">
                  <p className="text-[9px] font-black text-[#14b8a6] uppercase tracking-[0.18em]">İletişim</p>
                  {shop.shop_phone && <a href={`tel:${shop.shop_phone}`} className="flex items-center gap-3 group"><div className="w-7 h-7 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-[#14b8a6] transition-colors flex-shrink-0"><Phone size={12} className="text-gray-400 group-hover:text-white transition-colors" /></div><span className="text-[12.5px] font-black text-[#0c0c0d] group-hover:text-[#14b8a6] transition-colors">{shop.shop_phone}</span></a>}
                  {shop.email && <a href={`mailto:${shop.email}`} className="flex items-center gap-3 group"><div className="w-7 h-7 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-[#14b8a6] transition-colors flex-shrink-0"><Mail size={12} className="text-gray-400 group-hover:text-white transition-colors" /></div><span className="text-[12.5px] font-bold text-gray-600 group-hover:text-[#14b8a6] transition-colors">{shop.email}</span></a>}
                  {shop.instagram && <a href={`https://instagram.com/${shop.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group"><div className="w-7 h-7 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-purple-500 group-hover:to-pink-500 transition-all flex-shrink-0"><AtSign size={12} className="text-gray-400 group-hover:text-white transition-colors" /></div><span className="text-[12.5px] font-bold text-gray-600 group-hover:text-pink-500 transition-colors">{shop.instagram}</span></a>}
                </div>
              )}
              <button onClick={() => setShowCancellationModal(true)} className="w-full flex items-center justify-between px-5 py-4 border-t border-gray-50 hover:bg-gray-50 transition-colors group">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-[#14b8a6] transition-colors">İptal Politikası</span>
                <ChevronRight size={13} className="text-gray-300 group-hover:text-[#14b8a6] transition-colors" />
              </button>
            </div>

            {/* Booking cart (black) */}
            <div className="rounded-2xl p-5" style={{ background: '#0c0c0d', color: '#fff' }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>⚡ Randevu Sepeti</div>
              {cart.length === 0 ? (
                <div className="text-sm py-4 border-y mb-3" style={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  Henüz hizmet seçmedin. Bir hizmete tıkla, saat seç, sepete ekle.
                </div>
              ) : (
                <>
                  {cart.map((item, i) => {
                    const hasDiscount = item.discountedPrice < (Number(item.service.price) || 0);
                    return (
                      <div key={i} className="grid items-center py-3 border-t text-sm" style={{ gridTemplateColumns: '1fr auto', gap: '12px', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <div>
                          <div className="font-semibold">{item.service.name}</div>
                          {item.campaign && hasDiscount && <div className="text-[9px] font-mono mt-0.5" style={{ color: '#14b8a6' }}>🏷 {item.campaign.title}</div>}
                          <div className="font-mono text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {item.date.getDate()} {MONTHS_SHORT[item.date.getMonth()]} · {item.time}{item.staff ? ` · ${item.staff.first_name}` : ''} · {item.service.duration} dk
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            {hasDiscount && <div className="text-[10px] line-through font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>{item.service.price} ₺</div>}
                            <span className="font-mono font-semibold" style={{ color: hasDiscount ? '#14b8a6' : '#fff' }}>{item.discountedPrice} ₺</span>
                          </div>
                          <button onClick={() => setCart(c => c.filter((_, j) => j !== i))} className="border-0 p-0 text-base" style={{ background: 'transparent', color: 'rgba(255,255,255,0.4)' }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#fff'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)'}>×</button>
                        </div>
                      </div>
                    );
                  })}
                  {cartDiscount > 0 && (
                    <div className="flex justify-between items-baseline pt-2 font-mono text-[11px]" style={{ color: '#14b8a6' }}>
                      <span>Kampanya İndirimi</span>
                      <span>-{cartDiscount} ₺</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline my-3 font-mono text-[13px]">
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Toplam · {cartDuration} dk</span>
                    <span className="text-lg font-bold">{cartTotal} ₺</span>
                  </div>
                </>
              )}
              <button
                disabled={cart.length === 0 || loading}
                onClick={() => { if (cart.length > 0) setShowConfirmModal(true); }}
                className="w-full rounded-xl py-3.5 font-bold text-sm transition-all"
                style={{ background: cart.length === 0 ? 'rgba(255,255,255,0.1)' : '#14b8a6', color: cart.length === 0 ? 'rgba(255,255,255,0.3)' : '#04221d', cursor: cart.length === 0 ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Kaydediliyor...' : cart.length === 0 ? 'Hizmet seç' : 'Randevuyu onayla →'}
              </button>
              {cart.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-[9px] text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Randevu oluşturarak ad, iletişim ve randevu bilgilerinizin ilgili işletme ile paylaşılmasını kabul etmiş sayılırsınız.
                  </p>
                  <p className="text-[9px] text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Gelemeyeceğiniz randevuları mümkün olduğunca erken iptal etmenizi rica ederiz. Geç iptal veya randevuya gelmeme durumlarında işletmeler ileride ön ödeme talep edebilir.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      {showStickyBar && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-2xl px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-bold text-sm truncate text-[#0c0c0d]">{shop.name}</div>
            <div className="font-mono text-[11px] text-green-600">
              {cart.length > 0 ? `${cart.length} hizmet · ${cartTotal} ₺` : (isOpenNow ? '● Açık' : 'Randevu al')}
            </div>
          </div>
          <button
            onClick={() => {
              // Misafirler de onaylayabilir — session kontrolü handleCartConfirm içinde yapılır.
              if (cart.length > 0) { setShowConfirmModal(true); }
              else { document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' }); }
            }}
            className="flex-shrink-0 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
            style={{ background: '#0c0c0d' }}
          >
            {cart.length > 0 ? 'Onayla →' : 'Randevu Al →'}
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-5 right-5 text-white hover:text-gray-300 transition-colors"><X size={28} /></button>
          <img src={lightboxUrl} className="max-h-[90vh] max-w-[95vw] rounded-2xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onGuestContinue={cart.length > 0 ? () => { setGuestError(null); setGuestKvkkConsent(false); setGuestTransferConsent(false); setShowGuestForm(true); } : undefined}
      />

      {/* Guest details sheet — üyeliksiz hızlı randevu */}
      {showGuestForm && (
        <div
          className="fixed inset-0 z-[260] flex items-end sm:items-center justify-center p-0 sm:p-6 guest-overlay-in"
          style={{ background: 'rgba(12,12,13,0.55)', backdropFilter: 'blur(8px)' }}
          onClick={() => !loading && setShowGuestForm(false)}
        >
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden guest-sheet-in" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-7 pt-7 pb-5 relative">
              <button
                onClick={() => !loading && setShowGuestForm(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full border border-gray-200 grid place-items-center hover:bg-gray-50 transition-colors"
              >
                <X size={15} />
              </button>
              <div className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-full px-3 py-1 text-[10px] font-bold tracking-widest uppercase mb-3">
                <User size={12} /> Misafir Randevusu
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight text-gray-900 leading-none">Son Bir Adım</h3>
              <p className="text-[12px] text-gray-400 font-medium mt-2 leading-relaxed">
                Hesap oluşturmana gerek yok — adını ve numaranı bırak, randevun hazır.
              </p>
            </div>

            {/* Mini cart summary */}
            <div className="mx-7 mb-5 bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 truncate">
                {cart.length} hizmet{cart[0] ? ` · ${cart[0].date.getDate()} ${MONTHS_SHORT[cart[0].date.getMonth()]} · ${cart[0].time}` : ''}
              </span>
              <span className="text-lg font-black text-gray-900 flex-shrink-0 ml-3">{cartTotal} ₺</span>
            </div>

            {/* Inputs */}
            <div className="px-7 space-y-3.5">
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1.5 block">Ad Soyad</label>
                <input
                  value={guestName}
                  onChange={e => { setGuestName(e.target.value); setGuestError(null); }}
                  placeholder="örn. Deniz Yılmaz"
                  autoComplete="name"
                  className="w-full bg-white border border-gray-200 focus:border-[#14b8a6] rounded-xl px-4 py-3 outline-none font-bold text-sm text-gray-900 transition-all placeholder:text-gray-300"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1.5 block">Telefon</label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={e => { setGuestPhone(e.target.value); setGuestError(null); }}
                  placeholder="05XX XXX XX XX"
                  autoComplete="tel"
                  className="w-full bg-white border border-gray-200 focus:border-[#14b8a6] rounded-xl px-4 py-3 outline-none font-bold text-sm text-gray-900 transition-all placeholder:text-gray-300"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1.5 block">
                  E-posta <span className="text-red-400">*</span> <span className="text-gray-300 normal-case tracking-normal font-bold">(onay ve takip linki buraya gelecek)</span>
                </label>
                <input
                  type="email"
                  required
                  value={guestEmail}
                  onChange={e => { setGuestEmail(e.target.value); setGuestError(null); }}
                  placeholder="ornek@eposta.com"
                  autoComplete="email"
                  className="w-full bg-white border border-gray-200 focus:border-[#14b8a6] rounded-xl px-4 py-3 outline-none font-bold text-sm text-gray-900 transition-all placeholder:text-gray-300"
                />
              </div>
              {/* KVKK onayları — hiçbiri önceden işaretli gelmez */}
              <div className="space-y-2.5 pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={guestKvkkConsent}
                    onChange={e => { setGuestKvkkConsent(e.target.checked); setGuestError(null); }}
                    className="mt-0.5 flex-shrink-0 accent-[#14b8a6]"
                  />
                  <span className="text-[10px] font-medium text-gray-500 leading-relaxed">
                    <a href="/kullanici-sozlesmesi" target="_blank" rel="noreferrer" className="font-black text-[#14b8a6] hover:underline">Kullanıcı Sözleşmesi</a>&apos;ni ve{' '}
                    <a href="/kvkk" target="_blank" rel="noreferrer" className="font-black text-[#14b8a6] hover:underline">KVKK Aydınlatma Metni</a>&apos;ni okudum, Kullanıcı Sözleşmesi&apos;ni kabul ediyorum. <span className="text-red-400">*</span>
                  </span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={guestTransferConsent}
                    onChange={e => { setGuestTransferConsent(e.target.checked); setGuestError(null); }}
                    className="mt-0.5 flex-shrink-0 accent-[#14b8a6]"
                  />
                  <span className="text-[10px] font-medium text-gray-500 leading-relaxed">
                    Kişisel verilerimin yurt dışındaki hizmet sağlayıcılarla paylaşılmasına açık rıza gösteriyorum. <span className="text-red-400">*</span>
                  </span>
                </label>
              </div>

              {guestError && (
                <p className="text-[12px] font-bold text-red-500 bg-red-50 rounded-xl px-4 py-3">{guestError}</p>
              )}
            </div>

            {/* Submit + login link */}
            <div className="px-7 pt-5 pb-7">
              <button
                onClick={handleGuestConfirm}
                disabled={loading || !guestEmail.trim() || !guestKvkkConsent || !guestTransferConsent}
                className="w-full rounded-xl py-4 font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: '#14b8a6', color: '#04221d' }}
              >
                {loading ? 'Randevun oluşturuluyor...' : 'Randevuyu Tamamla →'}
              </button>
              <p className="text-[9px] text-gray-300 text-center leading-relaxed mt-3">
                Randevu oluşturarak ad, iletişim ve randevu bilgilerinizin ilgili işletme ile paylaşılmasını kabul etmiş sayılırsınız.
              </p>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">veya</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <p className="text-center text-[11px] font-bold text-gray-400">
                Zaten hesabın var mı?{' '}
                <button
                  onClick={() => { setShowGuestForm(false); setIsAuthOpen(true); }}
                  className="text-[#14b8a6] font-black hover:underline"
                >
                  Giriş yap
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Confirm booking modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[260] flex items-end sm:items-center justify-center p-0 sm:p-6" style={{ background: 'rgba(12,12,13,0.55)', backdropFilter: 'blur(8px)' }} onClick={() => setShowConfirmModal(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h3 className="text-base font-black uppercase tracking-tight text-[#0c0c0d]">Randevunu Onayla</h3>
              <button onClick={() => setShowConfirmModal(false)} className="w-8 h-8 rounded-full border border-gray-200 grid place-items-center hover:bg-gray-50 transition-colors"><X size={16} /></button>
            </div>
            {/* Cart summary */}
            <div className="px-6 py-4 space-y-3 max-h-[40vh] overflow-y-auto">
              {cart.map((item, i) => {
                const hasDiscount = item.discountedPrice < (Number(item.service.price) || 0);
                return (
                  <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <div className="font-bold text-[13px] text-[#0c0c0d]">{item.service.name}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5 font-mono">
                        {item.date.getDate()} {MONTHS_SHORT[item.date.getMonth()]} · {item.time}{item.staff ? ` · ${item.staff.first_name}` : ''} · {item.service.duration} dk
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {hasDiscount && <div className="text-[10px] line-through text-gray-300 font-mono">{item.service.price} ₺</div>}
                      <div className="font-bold text-[13px] font-mono" style={{ color: hasDiscount ? '#14b8a6' : '#0c0c0d' }}>{item.discountedPrice} ₺</div>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between items-baseline pt-1 font-mono text-[12px] font-bold">
                <span className="text-gray-400">Toplam · {cartDuration} dk</span>
                <span className="text-[#0c0c0d]">{cartTotal} ₺</span>
              </div>
            </div>
            {/* Warning */}
            <div className="mx-6 mb-4 rounded-xl px-4 py-3" style={{ background: '#FFF8EC' }}>
              <p className="text-[11px] leading-relaxed text-[#92601A] font-medium">
                Gelemeyeceğiniz randevuları mümkün olduğunca erken iptal etmenizi rica ederiz. Geç iptal veya randevuya gelmeme durumlarında işletmeler ileride ön ödeme talep edebilir.
              </p>
            </div>
            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 rounded-xl font-bold text-sm border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                Vazgeç
              </button>
              <button
                onClick={() => { setShowConfirmModal(false); handleCartConfirm(); }}
                disabled={loading}
                className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors"
                style={{ background: '#14b8a6', color: '#04221d' }}
              >
                {loading ? 'Kaydediliyor...' : 'Evet, onayla →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation modal */}
      {showCancellationModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6" style={{ background: 'rgba(12,12,13,0.35)', backdropFilter: 'blur(8px)' }} onClick={() => setShowCancellationModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 max-h-[calc(100vh-48px)] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black uppercase tracking-tighter text-[#0c0c0d]">İptal Politikası</h3>
              <button onClick={() => setShowCancellationModal(false)} className="w-9 h-9 rounded-full border border-gray-200 grid place-items-center hover:bg-gray-50 transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4 text-[13px] text-gray-600 font-medium leading-relaxed">
              {shop?.free_cancel_hours && <div className="bg-[#e6f7f4] rounded-xl px-4 py-3 text-[#14b8a6] font-black text-[12px] uppercase tracking-wide">Ücretsiz iptal: randevudan {shop.free_cancel_hours} saat öncesine kadar</div>}
              {shop?.cancellation_policy ? <p>{shop.cancellation_policy}</p> : (
                <>
                  <p>Seçilen hizmetler için hizmet sağlayıcı, gelmeme (no-show) veya son dakika iptali durumunda iptal ücreti uygulama hakkını saklı tutar.</p>
                  <p>İptal ücreti uygulanıp uygulanmayacağına dair nihai karar hizmet sağlayıcıya aittir.</p>
                  <p>Müşteri randevuya zamanında gelirse veya rezervasyon sırasında belirtilen makul süre içinde iptal ederse ücret alınamaz.</p>
                </>
              )}
              {shop?.no_show_policy && <div className="border-t border-gray-100 pt-3"><p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Gelmeme Politikası</p><p>{shop.no_show_policy}</p></div>}
              {shop?.deposit_info && <div className="border-t border-gray-100 pt-3"><p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Depozito</p><p>{shop.deposit_info}</p></div>}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 3px rgba(21,128,61,0.25);}50%{box-shadow:0 0 0 7px rgba(21,128,61,0);} }
        @keyframes guestOverlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes guestSheetIn { from { opacity: 0; transform: translateY(28px) scale(0.98); } to { opacity: 1; transform: none; } }
        .guest-overlay-in { animation: guestOverlayIn .25s ease-out; }
        .guest-sheet-in { animation: guestSheetIn .38s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}
