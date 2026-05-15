"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Clock, ArrowLeft, X, Calendar as CalIcon,
  ChevronLeft, ChevronRight, CheckCircle2, MapPin, Star, Image as ImageIcon
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

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

export default function ShopDetail() {
  const params = useParams();
  const router = useRouter();

  const rawId = Array.isArray(params.id) ? params.id[0] : params.id as string;
  const shopId = parseInt(rawId, 10);

  const [shop, setShop] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [shopHours, setShopHours] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isClosedDay, setIsClosedDay] = useState(false);
  const [loading, setLoading] = useState(false);

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userHasReviewed, setUserHasReviewed] = useState(false);

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*, profiles(full_name)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    setReviews(data || []);
  };

  useEffect(() => {
    if (isNaN(shopId)) { setNotFound(true); return; }

    Promise.all([
      supabase.from('shops').select('*').eq('id', shopId).single(),
      supabase.from('services').select('*').eq('shop_id', shopId),
      supabase.from('shop_hours').select('*').eq('shop_id', shopId),
    ]).then(([{ data: shopData }, { data: servicesData }, { data: hoursData }]) => {
      if (!shopData) { setNotFound(true); return; }
      setShop(shopData);
      setGallery(shopData.gallery_urls || []);
      setServices(servicesData || []);
      setShopHours(hoursData || []);
    });

    fetchReviews();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, [shopId]);

  useEffect(() => {
    if (!currentUserId || reviews.length === 0) return;
    setUserHasReviewed(reviews.some(r => r.user_id === currentUserId));
  }, [reviews, currentUserId]);

  useEffect(() => {
    setSelectedTime("");
    console.log('[DEBUG] shopHours:', shopHours, '| selectedDay:', selectedDay, '| selectedService:', selectedService);
    if (!selectedDay || !selectedService || shopHours.length === 0) {
      setAvailableSlots([]);
      return;
    }

    const dayOfWeek = selectedDay.getDay();
    const dayHours = shopHours.find((h: any) => h.day_of_week === dayOfWeek);
    console.log('[DEBUG] dayOfWeek:', dayOfWeek, '| dayHours found:', dayHours);

    if (!dayHours || dayHours.is_closed) {
      setIsClosedDay(true);
      setAvailableSlots([]);
      return;
    }

    setIsClosedDay(false);
    const slots = generateTimeSlots(dayHours.open_time, dayHours.close_time, selectedService.duration);
    console.log('[DEBUG] dayHours:', dayHours, '| slots:', slots);

    supabase
      .from('appointments')
      .select('appointment_time')
      .eq('shop_id', shopId)
      .eq('appointment_date', selectedDay.toISOString().split('T')[0])
      .neq('status', 'İptal Edildi')
      .then(({ data: booked, error: apptError }) => {
        console.log('[DEBUG] appointments data:', booked, '| error:', apptError);
        const bookedTimes = new Set((booked || []).map((a: any) => a.appointment_time.slice(0, 5)));
        let available = slots.filter(s => !bookedTimes.has(s));

        const today = new Date();
        if (selectedDay.toDateString() === today.toDateString()) {
          const nowMinutes = today.getHours() * 60 + today.getMinutes();
          available = available.filter(s => {
            const [h, m] = s.split(':').map(Number);
            return (h * 60 + m) > nowMinutes;
          });
        }

        setAvailableSlots(available);
      });
  }, [selectedDay, selectedService, shopHours, shopId]);

  const handleSubmitReview = async () => {
    if (!currentUserId) { alert("Yorum yazmak için giriş yapmalısınız."); return; }
    if (reviewRating === 0) { alert("Lütfen bir puan seçin."); return; }
    setSubmittingReview(true);
    const { error } = await supabase.from('reviews').insert([{
      shop_id: shopId,
      user_id: currentUserId,
      rating: reviewRating,
      comment: reviewComment,
    }]);
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

  const renderDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const blanks = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const days = [];
    for (let i = 0; i < blanks; i++) {
      days.push(<div key={`blank-${i}`} className="h-9 w-9 sm:h-12 sm:w-12 md:h-14 md:w-14"></div>);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const fullDate = new Date(year, month, d);
      const isSelected = selectedDay && fullDate.toDateString() === selectedDay.toDateString();
      const isPast = fullDate < new Date(new Date().setHours(0,0,0,0));
      days.push(
        <button
          key={d}
          disabled={isPast}
          onClick={() => setSelectedDay(fullDate)}
          className={`h-9 w-9 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-xl md:rounded-2xl font-black text-xs md:text-sm transition-all flex items-center justify-center
            ${isSelected ? 'bg-[#00A3AD] text-white shadow-2xl scale-110' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}
            ${isPast ? 'opacity-20 cursor-not-allowed' : ''}`}
        >
          {d}
        </button>
      );
    }
    return days;
  };

  const handleBookingConfirm = async () => {
    if (!selectedDay || !selectedTime) return;
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { alert("Lütfen önce giriş yapın!"); setLoading(false); return; }
    const { error } = await supabase.from('appointments').insert([{
      user_id: session.user.id,
      shop_id: shopId,
      service_name: selectedService.name,
      price: selectedService.price,
      appointment_date: selectedDay.toISOString().split('T')[0],
      appointment_time: selectedTime,
      status: 'Beklemede'
    }]);
    if (!error) { setIsBooking(false); setShowSuccess(true); } else { alert("Hata: " + error.message); }
    setLoading(false);
  };

  const aylar = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

  if (notFound) return <div className="p-10 text-center font-black text-gray-400 uppercase tracking-widest">Dükkan bulunamadı.</div>;
  if (!shop) return <div className="p-10 text-center font-black text-gray-200 uppercase tracking-widest italic text-black">Yükleniyor...</div>;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="bg-white min-h-screen font-sans text-[#222]">
      {/* Header */}
      <div className="w-full flex justify-between items-center px-4 md:px-16 py-4 md:py-8 border-b border-gray-50 text-black">
        <div>
          <h1 onClick={() => router.push("/")} className="text-xl md:text-2xl font-black tracking-tighter text-[#222] uppercase cursor-pointer">randezy</h1>
          <div className="h-[3px] w-6 md:w-8 bg-[#00A3AD] mt-0.5 rounded-full"></div>
        </div>
        <button onClick={() => router.push("/")} className="text-xs font-black text-gray-400 hover:text-black flex items-center gap-1.5 md:gap-2 uppercase tracking-widest transition-all">
          <ArrowLeft size={13} /> <span className="hidden sm:inline">Ana Sayfaya Dön</span><span className="sm:hidden">Geri</span>
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-20">
          <div className="lg:col-span-2 text-black">
            {/* Hero Image */}
            <div className="relative rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl mb-8 md:mb-12 h-[240px] sm:h-[320px] md:h-[450px]">
              {shop.image_url
                ? <img src={shop.image_url} className="w-full h-full object-cover" alt={shop.name} />
                : <div className="w-full h-full bg-gray-100 flex items-center justify-center"><ImageIcon size={64} className="text-gray-300" /></div>
              }
              <div className="absolute bottom-4 left-4 right-4 md:bottom-10 md:left-10 md:right-auto bg-white/90 backdrop-blur-md p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-xl">
                <h1 className="text-xl sm:text-2xl md:text-4xl font-black tracking-tighter uppercase mb-1 md:mb-2 text-black">{shop.name}</h1>
                <p className="text-gray-500 font-bold text-[10px] md:text-xs uppercase tracking-[0.15em] md:tracking-[0.2em]">
                  {shop.district}, {shop.city}
                  {avgRating && <span className="ml-2">— ⭐ {avgRating} ({reviews.length} yorum)</span>}
                  {!avgRating && shop.score && <span className="ml-2">— ⭐ {shop.score}</span>}
                </p>
              </div>
            </div>

            {/* Gallery */}
            {gallery.length > 0 && (
              <div className="mb-10 md:mb-14">
                <h2 className="text-xl md:text-2xl font-black mb-4 md:mb-6 uppercase tracking-tighter border-b-4 border-[#00A3AD] inline-block text-black">Galeri</h2>
                <div className="grid grid-cols-3 gap-3 md:gap-4 mt-4 md:mt-6">
                  {gallery.map((url, i) => (
                    <div key={i} onClick={() => setLightboxUrl(url)} className="aspect-square rounded-[1.5rem] md:rounded-[2rem] overflow-hidden cursor-pointer group relative shadow-sm hover:shadow-xl transition-all">
                      <img src={url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={`Galeri ${i + 1}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Services */}
            <h2 className="text-xl md:text-2xl font-black mb-6 md:mb-10 uppercase tracking-tighter border-b-4 border-[#00A3AD] inline-block text-black">Hizmetlerimiz</h2>
            <div className="space-y-3 md:space-y-4 mt-4 md:mt-6">
              {services.length === 0 && (
                <p className="text-gray-300 font-bold text-sm uppercase tracking-widest italic py-10 text-center">Henüz hizmet eklenmemiş.</p>
              )}
              {services.map((service) => (
                <div key={service.id} className="bg-gray-50/50 hover:bg-white hover:shadow-xl p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] flex justify-between items-center transition-all group border border-transparent hover:border-gray-100 gap-3">
                  <div className="min-w-0">
                    <h3 className="font-black text-sm md:text-xl mb-1 group-hover:text-[#00A3AD] transition-colors text-black uppercase leading-tight">{service.name}</h3>
                    <p className="text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-1 md:gap-2">
                      <Clock size={10} /> {service.duration} dk
                    </p>
                  </div>
                  <div className="flex items-center gap-3 md:gap-8 flex-shrink-0">
                    <span className="font-black text-base md:text-2xl tracking-tighter text-black">{service.price} ₺</span>
                    <button onClick={() => { setSelectedService(service); setSelectedDay(null); setSelectedTime(""); setIsBooking(true); }} className="bg-[#222] text-white px-3 md:px-10 py-2.5 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase shadow-lg hover:bg-[#00A3AD] hover:scale-105 transition-all whitespace-nowrap">
                      Randevu Al
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Reviews */}
            <div className="mt-12 md:mt-20">
              <h2 className="text-xl md:text-2xl font-black mb-6 md:mb-10 uppercase tracking-tighter border-b-4 border-[#00A3AD] inline-block text-black">Yorumlar</h2>

              {currentUserId && !userHasReviewed && (
                <div className="bg-gray-50 rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 mb-6 md:mb-8 border-2 border-dashed border-gray-200">
                  <p className="text-[10px] font-black text-[#00A3AD] uppercase tracking-widest mb-3 md:mb-4">Deneyimini Paylaş</p>
                  <div className="flex gap-2 mb-3 md:mb-4">
                    {[1,2,3,4,5].map(star => (
                      <button key={star} onClick={() => setReviewRating(star)}>
                        <Star size={24} className={`transition-colors ${star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Yorumun (isteğe bağlı)..."
                    className="w-full bg-white rounded-2xl p-4 md:p-5 text-sm font-bold text-black outline-none border-2 border-transparent focus:border-[#00A3AD] resize-none mb-3 md:mb-4"
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                  />
                  <button
                    onClick={handleSubmitReview}
                    disabled={submittingReview || reviewRating === 0}
                    className="bg-black text-white px-8 md:px-10 py-3 md:py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#00A3AD] transition-all disabled:opacity-30"
                  >
                    {submittingReview ? "Gönderiliyor..." : "Yorum Gönder"}
                  </button>
                </div>
              )}

              {!currentUserId && (
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6 md:mb-8 italic">Yorum yazmak için giriş yapın.</p>
              )}

              {userHasReviewed && (
                <p className="text-[#00A3AD] text-xs font-black uppercase tracking-widest mb-6 md:mb-8">Bu işletmeye yorum yaptınız.</p>
              )}

              {reviews.length === 0 ? (
                <div className="text-center py-10 md:py-12 text-gray-300 font-black uppercase tracking-widest italic text-xs">Henüz yorum yok. İlk yorumu sen yap!</div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="bg-white rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-2 md:mb-3">
                        <p className="font-black text-sm uppercase tracking-tight">{r.profiles?.full_name || "Anonim"}</p>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={12} className={s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="text-gray-500 text-sm font-medium">{r.comment}</p>}
                      <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest mt-2 md:mt-3">{new Date(r.created_at).toLocaleDateString('tr-TR')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar — desktop only */}
          <div className="hidden lg:block text-black">
            <div className="bg-[#222] text-white p-10 rounded-[2.5rem] sticky top-12 shadow-2xl">
              <h3 className="text-xl font-black uppercase tracking-tighter mb-6 border-b border-white/10 pb-4">İletişim</h3>
              <div className="space-y-6 text-sm font-bold opacity-80 uppercase tracking-widest text-white">
                {shopHours.length > 0 ? shopHours.filter(h => !h.is_closed).slice(0, 2).map((h: any, i: number) => (
                  <p key={i} className="text-[#00A3AD]">{h.open_time?.slice(0,5)} - {h.close_time?.slice(0,5)}</p>
                )) : (
                  <p className="text-[#00A3AD]">09:00 - 20:00</p>
                )}
                <hr className="opacity-10" />
                <p>{shop.district}, {shop.city}</p>
                {shop.shop_phone && <p className="text-[#00A3AD]">{shop.shop_phone}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 md:p-6" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-5 right-5 md:top-8 md:right-8 text-white hover:text-gray-300 transition-colors"><X size={28} /></button>
          <img src={lightboxUrl} className="max-h-[90vh] max-w-[95vw] md:max-w-[90vw] rounded-2xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Booking modal */}
      {isBooking && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-6 text-black">
          <div className="bg-white w-full max-w-6xl rounded-t-[2.5rem] md:rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[92vh] md:h-[85vh]">

            {/* Calendar panel */}
            <div className="flex-1 p-5 sm:p-8 md:p-16 overflow-y-auto">
              <div className="flex justify-between items-center mb-6 md:mb-10">
                <div>
                  <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter">Zamanı Belirle</h2>
                  <div className="flex items-center gap-3 mt-3 md:mt-4">
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-1.5 md:p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={18} /></button>
                    <span className="font-black uppercase tracking-widest text-[#00A3AD] text-sm md:text-base">{aylar[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-1.5 md:p-2 hover:bg-gray-100 rounded-full"><ChevronRight size={18} /></button>
                  </div>
                </div>
                <button onClick={() => setIsBooking(false)} className="p-3 md:p-4 bg-gray-100 rounded-full hover:bg-gray-200 flex-shrink-0"><X size={18} /></button>
              </div>

              <div className="grid grid-cols-7 gap-1.5 sm:gap-3 md:gap-4 mb-2 text-center text-[9px] md:text-[10px] font-black text-gray-300 uppercase tracking-widest">
                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-3 md:gap-4 mb-8 md:mb-12">{renderDays()}</div>

              {selectedDay && isClosedDay && (
                <p className="text-center text-sm font-black text-gray-400 uppercase tracking-widest py-4">Bu gün işletme kapalı.</p>
              )}
              {selectedDay && !isClosedDay && availableSlots.length === 0 && (
                <p className="text-center text-sm font-black text-gray-400 uppercase tracking-widest py-4">Bu gün müsait saat yok.</p>
              )}
              {availableSlots.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 gap-2 md:gap-4">
                  {availableSlots.map((t) => (
                    <button key={t} onClick={() => setSelectedTime(t)} className={`py-3 md:py-5 rounded-xl md:rounded-2xl font-black text-xs border-2 transition-all ${selectedTime === t ? 'border-[#00A3AD] text-[#00A3AD] bg-[#E6F6F7]' : 'border-gray-100 text-gray-400 hover:border-[#00A3AD]'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Summary panel */}
            <div className="md:w-[380px] bg-gray-50 p-5 sm:p-8 md:p-16 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-100 shrink-0">
              <div>
                <h3 className="text-base md:text-xl font-black uppercase mb-4 md:mb-10 tracking-tighter">Özet</h3>
                <div className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm space-y-4 md:space-y-6">
                  <p className="font-black text-sm md:text-lg text-[#00A3AD] uppercase">{selectedService?.name}</p>
                  <p className="font-black text-sm text-black">
                    {selectedDay ? `${selectedDay.getDate()} ${aylar[selectedDay.getMonth()]} ${selectedDay.getFullYear()}` : "Tarih Seçilmedi"}
                    <br /><span className="text-[#00A3AD]">{selectedTime || "--:--"}</span>
                  </p>
                  <p className="text-2xl md:text-3xl font-black pt-3 md:pt-4 border-t border-gray-50">{selectedService?.price} ₺</p>
                </div>
              </div>
              <button onClick={handleBookingConfirm} disabled={!selectedTime || !selectedDay || loading} className="w-full mt-4 bg-[#00A3AD] text-white py-5 md:py-8 rounded-[1.5rem] md:rounded-[2rem] font-black uppercase tracking-widest shadow-2xl disabled:opacity-20 hover:scale-95 transition-all text-sm md:text-base">
                {loading ? "Kaydediliyor..." : "Onayla"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success */}
      {showSuccess && (
        <div className="fixed inset-0 z-[200] bg-[#F9F9F9] overflow-y-auto animate-in fade-in duration-500">
          <button onClick={() => router.push("/")} className="fixed top-5 right-5 md:top-12 md:right-12 p-3 md:p-6 hover:rotate-90 transition-all duration-500 text-black group z-[210] bg-white/50 backdrop-blur-md rounded-full shadow-sm">
            <X size={24} className="group-hover:scale-110" />
          </button>
          <div className="min-h-screen w-full flex items-start md:items-center justify-center py-16 md:py-20 px-4 md:px-6">
            <div className="max-w-2xl w-full text-center">
              <div className="mb-8 md:mb-12 flex justify-center">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-[#00A3AD] rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(0,163,173,0.3)] animate-bounce">
                  <CheckCircle2 size={40} className="text-white" />
                </div>
              </div>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-black mb-4 md:mb-6 leading-tight">Randevun Alındı!</h2>
              <div className="bg-white p-6 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-xl border border-gray-100 mb-8 md:mb-10 space-y-6 md:space-y-8">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-[10px] font-black text-[#00A3AD] uppercase tracking-[0.3em]">Hizmet & İşletme</p>
                  <p className="text-lg md:text-2xl font-black uppercase text-black">{selectedService?.name} — {shop.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-6 md:gap-8 pt-4 md:pt-6 border-t border-gray-50">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center gap-1"><CalIcon size={10}/> Tarih</p>
                    <p className="font-black uppercase text-black text-sm md:text-base">{selectedDay?.getDate()} {aylar[selectedDay?.getMonth() || 0]} {selectedDay?.getFullYear()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center gap-1"><Clock size={10}/> Saat</p>
                    <p className="font-black uppercase text-[#00A3AD] text-lg md:text-xl">{selectedTime}</p>
                  </div>
                </div>
                <div className="pt-4 md:pt-6 border-t border-gray-50 text-black">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center gap-1 mb-2"><MapPin size={10}/> Konum</p>
                  <p className="font-bold text-xs text-gray-500 uppercase tracking-widest italic">{shop.district}, {shop.city}</p>
                </div>
              </div>
              <button onClick={() => router.push("/")} className="bg-black text-white px-10 md:px-16 py-5 md:py-6 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-[#00A3AD] transition-all hover:-translate-y-1 text-sm md:text-base">
                KEŞFETMEYE DEVAM ET
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
