"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../../components/layout/Navbar";
import { api, type BusinessDetail, type Service, type StaffMember } from "../../../lib/api";
import { MapPin, Phone, Clock, ChevronRight, Star, ArrowLeft } from "lucide-react";
import { supabase } from "../../../lib/supabase";

const DAY_NAMES = ["", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export default function BusinessDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [biz, setBiz] = useState<BusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    api.getBusiness(slug)
      .then(async (b) => {
        setBiz(b);
        const { data } = await supabase
          .from('reviews')
          .select('*, profiles(full_name), owner_reply, owner_reply_at')
          .eq('shop_id', b.id)
          .order('created_at', { ascending: false });
        setReviews(data || []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F9F9F9]">
        <Navbar />
        <div className="max-w-5xl mx-auto pt-32 px-6 space-y-6 animate-pulse">
          <div className="h-64 bg-gray-100 rounded-[3.5rem]" />
          <div className="h-10 bg-gray-100 rounded-2xl w-1/2" />
          <div className="h-40 bg-gray-100 rounded-[3.5rem]" />
        </div>
      </main>
    );
  }

  if (notFound || !biz) {
    return (
      <main className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
        <Navbar />
        <div className="text-center">
          <p className="text-5xl font-black text-gray-200 uppercase">İşletme Bulunamadı</p>
          <Link href="/businesses" className="mt-6 inline-block text-[#00A3AD] font-bold text-sm">
            ← Aramaya Dön
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F9F9F9] text-[#111] pb-20">
      <Navbar />

      {/* Hero */}
      <div className="relative h-72 md:h-96 w-full bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
        {biz.cover_image_url ? (
          <img src={biz.cover_image_url} alt={biz.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-9xl font-black text-white/30">{biz.name[0]}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <button
          onClick={() => router.back()}
          className="absolute top-6 left-6 bg-white/20 backdrop-blur text-white p-3 rounded-2xl hover:bg-white/30 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="absolute bottom-8 left-8 right-8">
          <span className="bg-[#00A3AD] text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
            {biz.category}
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mt-3">
            {biz.name}
          </h1>
          {biz.city && (
            <p className="text-white/70 text-sm flex items-center gap-1.5 mt-2 font-medium">
              <MapPin size={14} />
              {biz.city}{biz.address ? ` · ${biz.address}` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Description */}
          {biz.description && (
            <div className="bg-white rounded-[3.5rem] p-10 shadow-xl border border-gray-100">
              <h2 className="text-xs font-black text-[#00A3AD] uppercase tracking-widest mb-4">Hakkında</h2>
              <p className="text-gray-600 leading-relaxed text-sm">{biz.description}</p>
            </div>
          )}

          {/* Services */}
          {biz.services.length > 0 && (
            <div className="bg-white rounded-[3.5rem] p-10 shadow-xl border border-gray-100">
              <h2 className="text-xs font-black text-[#00A3AD] uppercase tracking-widest mb-6">Hizmetler</h2>
              <div className="space-y-4">
                {biz.services.map((svc) => (
                  <div
                    key={svc.id}
                    className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl hover:bg-[#E6F6F7] transition-all"
                  >
                    <div>
                      <p className="font-black text-sm text-black">{svc.name}</p>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Clock size={11} />
                        {svc.duration_minutes} dk
                        {svc.description && ` · ${svc.description}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-black text-[#00A3AD]">₺{svc.price.toFixed(0)}</span>
                      <Link
                        href={`/b/${slug}/book?service_id=${svc.id}`}
                        className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#00A3AD] transition-all"
                      >
                        Randevu Al
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staff */}
          {biz.staff.length > 0 && (
            <div className="bg-white rounded-[3.5rem] p-10 shadow-xl border border-gray-100">
              <h2 className="text-xs font-black text-[#00A3AD] uppercase tracking-widest mb-6">Ekibimiz</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {biz.staff.map((member) => (
                  <div key={member.id} className="text-center p-5 bg-gray-50 rounded-2xl">
                    <div className="w-14 h-14 rounded-full bg-[#00A3AD] text-white flex items-center justify-center font-black text-lg mx-auto mb-3">
                      {member.photo_url ? (
                        <img src={member.photo_url} alt={member.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        member.name[0]
                      )}
                    </div>
                    <p className="font-black text-xs text-black uppercase">{member.name}</p>
                    {member.role && <p className="text-[10px] text-gray-400 mt-1">{member.role}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Reviews */}
          {reviews.length > 0 && (
            <div className="bg-white rounded-[3.5rem] p-10 shadow-xl border border-gray-100">
              <h2 className="text-xs font-black text-[#00A3AD] uppercase tracking-widest mb-2">Müşteri Yorumları</h2>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-3xl font-black text-black">
                  {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}
                </span>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={13} className={i <= Math.round(reviews.reduce((s,r)=>s+r.rating,0)/reviews.length) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
                  ))}
                </div>
                <span className="text-xs text-gray-400">{reviews.length} yorum</span>
              </div>
              <div className="space-y-5">
                {reviews.map((r: any) => (
                  <div key={r.id} className="border-b border-gray-100 pb-5 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-black text-black">{r.profiles?.full_name || 'Müşteri'}</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} size={11} className={i <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-[13px] text-gray-600 leading-relaxed">{r.comment}</p>}
                    {r.owner_reply && (
                      <div className="mt-3 bg-gray-50 border border-gray-100 rounded-2xl p-3">
                        <p className="text-[10px] font-semibold text-[#00A3AD] uppercase tracking-widest mb-1">İşletme Yanıtı</p>
                        <p className="text-[13px] text-gray-600 leading-relaxed">{r.owner_reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* CTA card */}
          <div className="bg-black rounded-[3.5rem] p-8 text-white text-center shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">Online Randevu</p>
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-6">Hemen Ayarla</h3>
            <Link
              href={`/b/${slug}/book`}
              className="block w-full bg-[#00A3AD] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#008a94] transition-all"
            >
              Randevu Al →
            </Link>
          </div>

          {/* Contact */}
          {(biz.phone || biz.city) && (
            <div className="bg-white rounded-[3.5rem] p-8 shadow-xl border border-gray-100">
              <h3 className="text-[10px] font-black text-[#00A3AD] uppercase tracking-widest mb-5">İletişim</h3>
              <div className="space-y-4">
                {biz.phone && (
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-gray-400" />
                    <span className="text-sm font-bold text-black">{biz.phone}</span>
                  </div>
                )}
                {biz.city && (
                  <div className="flex items-center gap-3">
                    <MapPin size={16} className="text-gray-400" />
                    <span className="text-sm font-bold text-black">{biz.city}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Opening hours */}
          {biz.opening_hours && biz.opening_hours.length > 0 && (
            <div className="bg-white rounded-[3.5rem] p-8 shadow-xl border border-gray-100">
              <h3 className="text-[10px] font-black text-[#00A3AD] uppercase tracking-widest mb-5">
                Çalışma Saatleri
              </h3>
              <div className="space-y-2">
                {biz.opening_hours.map((h) => (
                  <div key={h.day_of_week} className="flex items-center justify-between text-xs">
                    <span className="font-black text-gray-500 w-8">{DAY_NAMES[h.day_of_week]}</span>
                    {h.is_closed ? (
                      <span className="text-red-400 font-bold">Kapalı</span>
                    ) : (
                      <span className="font-bold text-black">
                        {h.open_time} – {h.close_time}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
