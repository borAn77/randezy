"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import {
  ShieldCheck, MapPin, Phone, Mail, Clock, CheckCircle2, XCircle,
  ExternalLink, Package, Users, RefreshCw, Search, AlertCircle, Undo2,
} from "lucide-react";

type AdminShop = {
  id: number;
  name: string;
  slug: string | null;
  category: string | null;
  city: string | null;
  district: string | null;
  street: string | null;
  shop_phone: string | null;
  image_url: string | null;
  gallery_urls: string[] | null;
  description: string | null;
  instagram: string | null;
  is_active: boolean;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
  profiles: { full_name: string | null; email: string | null; phone: string | null } | null;
  services: { id: number; name: string; price: number }[];
  staff: { id: string; first_name: string; last_name: string }[];
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "İnceleme Bekliyor", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Onaylı", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejected: { label: "Reddedildi", cls: "bg-red-100 text-red-700 border-red-200" },
};

export default function AdminPage() {
  const router = useRouter();
  const [gate, setGate] = useState<"checking" | "login" | "denied" | "ok">("checking");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [shops, setShops] = useState<AdminShop[]>([]);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmRejectId, setConfirmRejectId] = useState<number | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchShops = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { setGate("login"); return; }
    setSessionEmail(session.user?.email ?? null);
    const res = await fetch("/api/admin/shops", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.status === 403) { setGate("denied"); return; }
    if (!res.ok) { showToast("Liste yüklenemedi, tekrar deneyin."); return; }
    const json = await res.json();
    setShops(json.shops || []);
    setGate("ok");
  };

  useEffect(() => { fetchShops(); }, []);

  const setStatus = async (shop: AdminShop, status: "approved" | "rejected" | "pending") => {
    setBusyId(shop.id);
    setConfirmRejectId(null);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/shops", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ shopId: shop.id, status, sendEmail }),
    });
    setBusyId(null);
    if (!res.ok) { showToast("İşlem başarısız oldu, tekrar deneyin."); return; }
    setShops(prev => prev.map(s => s.id === shop.id ? { ...s, approval_status: status } : s));
    showToast(
      status === "approved" ? `"${shop.name}" onaylandı ve yayına alındı.` :
      status === "rejected" ? `"${shop.name}" reddedildi.` :
      `"${shop.name}" tekrar incelemeye alındı.`
    );
  };

  const handleReject = (shop: AdminShop) => {
    if (confirmRejectId !== shop.id) {
      setConfirmRejectId(shop.id);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmRejectId(null), 4000);
      return;
    }
    setStatus(shop, "rejected");
  };

  const counts = {
    pending: shops.filter(s => s.approval_status === "pending").length,
    approved: shops.filter(s => s.approval_status === "approved").length,
    rejected: shops.filter(s => s.approval_status === "rejected").length,
    all: shops.length,
  };

  const visible = shops
    .filter(s => tab === "all" || s.approval_status === tab)
    .filter(s => {
      const q = query.toLowerCase().trim();
      if (!q) return true;
      return [s.name, s.city, s.district, s.category, s.profiles?.email, s.profiles?.full_name]
        .some(v => v?.toLowerCase().includes(q));
    });

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const mapsUrl = (s: AdminShop) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([s.name, s.district, s.city].filter(Boolean).join(" "))}`;

  if (gate === "checking") {
    return (
      <div className="h-screen bg-[#f7f5f0] flex items-center justify-center text-[#14b8a6] font-semibold tracking-widest text-sm">
        Yükleniyor...
      </div>
    );
  }

  if (gate === "login") {
    return (
      <div className="h-screen bg-[#f7f5f0] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertCircle size={40} className="text-gray-300" />
        <p className="text-sm font-semibold text-gray-600">Bu sayfayı görüntülemek için önce giriş yapmalısın.</p>
        <p className="text-[12px] text-gray-400">Ana sayfaya git, admin yetkili hesabınla giriş yap, sonra bu sayfaya geri dön.</p>
        <button onClick={() => router.replace("/")} className="text-[12px] font-bold text-[#14b8a6] border-b border-[#14b8a6] pb-0.5">
          Ana sayfaya git
        </button>
      </div>
    );
  }

  if (gate === "denied") {
    return (
      <div className="h-screen bg-[#f7f5f0] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertCircle size={40} className="text-gray-300" />
        <p className="text-sm font-semibold text-gray-600">Bu hesabın admin yetkisi yok.</p>
        {sessionEmail && (
          <p className="text-[12px] text-gray-400">
            Şu an <span className="font-bold text-gray-600">{sessionEmail}</span> ile girişlisin.
            Admin yetkili hesabınla giriş yapıp tekrar dene.
          </p>
        )}
        <button onClick={() => router.replace("/")} className="text-[12px] font-bold text-[#14b8a6] border-b border-[#14b8a6] pb-0.5">
          Ana sayfaya dön
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#0c0c0d] font-sans">
      {/* HEADER */}
      <header className="bg-[#0c0c0d] px-6 md:px-10 py-5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} className="text-[#14b8a6]" />
          <div>
            <div className="text-[16px] font-bold text-white tracking-tight">RANDEZY<span className="text-[#14b8a6]">.ADMIN</span></div>
            <div className="text-[11px] text-white/40 font-medium">İşletme Onay Merkezi</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-[12px] text-white/70 font-medium cursor-pointer select-none">
            <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="accent-[#14b8a6]" />
            İşlem sonrası işletmeye e-posta gönder
          </label>
          <button
            onClick={async () => { setRefreshing(true); await fetchShops(); setRefreshing(false); }}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl transition-all">
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Yenile
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        {/* KONTROL LİSTESİ */}
        <div className="mb-6 flex items-start gap-3 bg-white border border-[#ececea] rounded-2xl px-5 py-4">
          <ShieldCheck size={18} className="text-[#14b8a6] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-gray-500 leading-relaxed">
            <span className="font-bold text-[#0c0c0d]">Onay öncesi kontrol listesi: </span>
            1) Google Maps'te işletme var mı, adres ve fotoğraflar eşleşiyor mu? &nbsp;
            2) İşletmenin <span className="font-semibold">herkese açık</span> numarasını ara, kaydı teyit et. &nbsp;
            3) Şüphe varsa vergi levhası iste (İVD'den doğrula).
          </p>
        </div>

        {/* SEKMELER + ARAMA */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex gap-2">
            {([["pending", "Bekleyen"], ["approved", "Onaylı"], ["rejected", "Reddedilen"], ["all", "Tümü"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all border ${
                  tab === key ? "bg-[#0c0c0d] text-white border-[#0c0c0d]" : "bg-white text-gray-500 border-[#ececea] hover:border-gray-300"
                }`}>
                {label} <span className={tab === key ? "text-[#14b8a6]" : "text-gray-400"}>({counts[key]})</span>
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query} onChange={e => setQuery(e.target.value)} placeholder="İşletme, şehir, e-posta ara..."
              className="pl-9 pr-4 py-2 rounded-xl border border-[#ececea] bg-white text-[13px] w-64 outline-none focus:border-[#14b8a6] transition-colors" />
          </div>
        </div>

        {/* LİSTE */}
        {visible.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200">
            <p className="text-[13px] font-semibold text-gray-400">
              {tab === "pending" ? "Bekleyen başvuru yok — her şey güncel 🎉" : "Bu filtrede işletme bulunamadı."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {visible.map(shop => {
              const meta = STATUS_META[shop.approval_status];
              const gallery = (shop.gallery_urls || []).slice(0, 4);
              return (
                <div key={shop.id} className="bg-white rounded-3xl border border-[#ececea] p-5 md:p-6">
                  <div className="flex flex-col md:flex-row gap-5">
                    {/* GÖRSELLER */}
                    <div className="flex-shrink-0 w-full md:w-44">
                      <div className="h-32 md:h-28 rounded-2xl overflow-hidden bg-gray-100">
                        {shop.image_url
                          ? <a href={shop.image_url} target="_blank" rel="noreferrer"><img src={shop.image_url} className="w-full h-full object-cover" alt={shop.name} /></a>
                          : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-300">{shop.name.charAt(0)}</div>}
                      </div>
                      {gallery.length > 0 && (
                        <div className="flex gap-1.5 mt-2">
                          {gallery.map((g, i) => (
                            <a key={i} href={g} target="_blank" rel="noreferrer" className="w-1/4 h-10 rounded-lg overflow-hidden bg-gray-100">
                              <img src={g} className="w-full h-full object-cover" alt="" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* BİLGİLER */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[17px] font-bold tracking-tight">{shop.name}</h3>
                        {shop.category && <span className="px-2 py-0.5 rounded-full bg-[#E6F6F7] text-[#0d9488] text-[10px] font-bold uppercase tracking-wide">{shop.category}</span>}
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${meta.cls}`}>{meta.label}</span>
                        {!shop.is_active && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold">Sahibi henüz yayına almadı</span>}
                      </div>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[12.5px] text-gray-600">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate">{[shop.street, shop.district, shop.city].filter(Boolean).join(", ") || "Adres girilmemiş"}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Phone size={13} className="text-gray-400 flex-shrink-0" />
                          {shop.shop_phone ? <a href={`tel:${shop.shop_phone}`} className="hover:text-[#14b8a6] font-medium">{shop.shop_phone}</a> : "Telefon girilmemiş"}
                        </span>
                        <span className="flex items-center gap-1.5 min-w-0">
                          <Mail size={13} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate">
                            Sahibi: {shop.profiles?.full_name || "—"}
                            {shop.profiles?.email && <> · <a href={`mailto:${shop.profiles.email}`} className="hover:text-[#14b8a6] font-medium">{shop.profiles.email}</a></>}
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={13} className="text-gray-400 flex-shrink-0" />
                          Başvuru: {fmtDate(shop.created_at)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Package size={13} className="text-gray-400 flex-shrink-0" />
                          {shop.services.length > 0
                            ? `${shop.services.length} hizmet — ${shop.services.slice(0, 3).map(s => s.name).join(", ")}${shop.services.length > 3 ? "..." : ""}`
                            : "Hizmet girilmemiş"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users size={13} className="text-gray-400 flex-shrink-0" />
                          {shop.staff.length > 0 ? `${shop.staff.length} personel — ${shop.staff.map(p => p.first_name).join(", ")}` : "Personel girilmemiş"}
                        </span>
                      </div>

                      {shop.description && (
                        <p className="mt-2.5 text-[12px] text-gray-500 leading-relaxed line-clamp-2">{shop.description}</p>
                      )}

                      {/* AKSİYONLAR */}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <a href={mapsUrl(shop)} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#ececea] text-[12px] font-semibold text-gray-500 hover:border-[#14b8a6] hover:text-[#14b8a6] transition-all">
                          <ExternalLink size={13} /> Maps'te Doğrula
                        </a>
                        {shop.approval_status !== "approved" && (
                          <button onClick={() => setStatus(shop, "approved")} disabled={busyId === shop.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#14b8a6] text-white text-[12px] font-bold hover:bg-[#0d9488] transition-all disabled:opacity-50">
                            <CheckCircle2 size={14} /> {busyId === shop.id ? "İşleniyor..." : "Onayla"}
                          </button>
                        )}
                        {shop.approval_status !== "rejected" && (
                          <button onClick={() => handleReject(shop)} disabled={busyId === shop.id}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold transition-all disabled:opacity-50 ${
                              confirmRejectId === shop.id ? "bg-red-600 text-white" : "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                            }`}>
                            <XCircle size={14} /> {confirmRejectId === shop.id ? "Emin misin? Tekrar tıkla" : "Reddet"}
                          </button>
                        )}
                        {shop.approval_status !== "pending" && (
                          <button onClick={() => setStatus(shop, "pending")} disabled={busyId === shop.id}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#ececea] text-[12px] font-semibold text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-all disabled:opacity-50">
                            <Undo2 size={13} /> İncelemeye Al
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#0c0c0d] text-white text-[13px] font-semibold px-5 py-3.5 rounded-2xl shadow-2xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
