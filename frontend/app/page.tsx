"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { Search, X, MapPin, ArrowUpDown, Heart, ChevronDown } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { supabase } from "../lib/supabase";
import AuthModal from "../components/layout/AuthModal";

const HERO_VIDEOS = [
  '/videos/4177973-hd_1920_1080_30fps.mp4',
  '/videos/5793310-uhd_3840_2160_25fps.mp4',
  '/videos/8225735-hd_1920_1080_25fps.mp4',
  '/videos/9335886-hd_1920_1080_25fps.mp4',
  '/videos/9738019-uhd_3840_2160_24fps.mp4',
];

const CATEGORY_MAP: Record<string, string> = {
  "Kuaför": "KUAFÖR",
  "Berber": "BERBER",
  "Güzellik Merkezi": "GÜZELLİK MERKEZİ",
  "Tırnak": "TIRNAK",
  "Fizyoterapi": "FİZYOTERAPİ",
  "Kaş ve Kirpik": "KAŞ VE KİRPİK",
  "Masaj": "MASAJ",
  "Dövme": "DÖVME",
};

export default function Home() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [sortBy, setSortBy] = useState<"default" | "rating">("default");
  const [whereOpen, setWhereOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [nextIdx, setNextIdx] = useState<number | null>(null);
  const [fadingOutIdx, setFadingOutIdx] = useState<number | null>(null);
  const shopsRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const cycleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("q")) setSearchQuery(params.get("q")!);
    if (params.get("category")) setSelectedCategory(params.get("category")!);
    if (params.get("district")) setSelectedDistrict(params.get("district")!);
    const urlCity = params.get("city");
    if (urlCity) {
      setSelectedCity(urlCity);
      localStorage.setItem("randezy_city", urlCity);
    } else {
      setSelectedCity(localStorage.getItem("randezy_city") || "");
    }
  }, []);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedCity) params.set("city", selectedCity);
    if (selectedDistrict) params.set("district", selectedDistrict);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [searchQuery, selectedCategory, selectedCity, selectedDistrict]);

  // Start first video on mount
  useEffect(() => {
    if (userId) return;
    const v = videoRefs.current[0];
    if (v) { v.currentTime = 0; v.play().catch(() => {}); }
  }, [userId]);

  // Two-layer crossfade cycle: display → fade-out/fade-in simultaneously → promote
  useEffect(() => {
    if (userId) return;

    cycleRef.current = setTimeout(() => {
      const next = (activeIdx + 1) % HERO_VIDEOS.length;

      // Pre-play next video silently before it becomes visible
      const nextVideo = videoRefs.current[next];
      if (nextVideo) {
        nextVideo.currentTime = 0;
        nextVideo.play().catch(() => {});
      }

      // Both layers fade simultaneously: old fades out, new fades in
      setFadingOutIdx(activeIdx);
      setNextIdx(next);

      cycleRef.current = setTimeout(() => {
        // Retire old video
        const oldVideo = videoRefs.current[activeIdx];
        if (oldVideo) { oldVideo.pause(); oldVideo.currentTime = 0; }
        setActiveIdx(next);
        setFadingOutIdx(null);
        setNextIdx(null);
      }, 1400);
    }, 5500);

    return () => { if (cycleRef.current) clearTimeout(cycleRef.current); };
  }, [activeIdx, userId]);

  useEffect(() => {
    supabase
      .from("shops")
      .select("*, campaigns(id, type, discount_value, start_date, end_date, is_active), services(name, price, sort_order), reviews(rating)")
      .eq("is_active", true)
      .then(({ data, error }) => {
        if (error) { setError(true); } else { setShops(data || []); }
        setLoading(false);
      });

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      supabase
        .from("favorites")
        .select("shop_id")
        .eq("user_id", user.id)
        .then(({ data }) => {
          setFavoriteIds(new Set((data || []).map((f: any) => f.shop_id)));
        });
    });
  }, []);

  const toggleFavorite = async (e: React.MouseEvent, shopId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) { setIsAuthOpen(true); return; }
    if (favoriteIds.has(shopId)) {
      await supabase.from("favorites").delete().eq("user_id", userId).eq("shop_id", shopId);
      setFavoriteIds(prev => { const n = new Set(prev); n.delete(shopId); return n; });
    } else {
      await supabase.from("favorites").insert({ user_id: userId, shop_id: shopId });
      setFavoriteIds(prev => new Set(prev).add(shopId));
    }
  };

  const cities = useMemo(() =>
    [...new Set(shops.map(s => s.city).filter(Boolean))].sort() as string[],
    [shops]
  );

  const districts = useMemo(() => {
    if (!selectedCity) return [];
    return [...new Set(
      shops.filter(s => s.city === selectedCity && s.district).map(s => s.district)
    )].sort() as string[];
  }, [shops, selectedCity]);

  const filteredShops = useMemo(() => {
    let result = shops.filter(shop => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        shop.name?.toLowerCase().includes(q) ||
        shop.district?.toLowerCase().includes(q) ||
        shop.city?.toLowerCase().includes(q);
      const matchesCategory = !selectedCategory || shop.category === selectedCategory;
      const matchesCity = !selectedCity || shop.city === selectedCity;
      const matchesDistrict = !selectedDistrict || shop.district === selectedDistrict;
      return matchesSearch && matchesCategory && matchesCity && matchesDistrict;
    });
    if (sortBy === "rating") {
      result = [...result].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }
    return result;
  }, [shops, searchQuery, selectedCategory, selectedCity, selectedDistrict, sortBy]);

  const pickCity = (city: string) => {
    setSelectedCity(city);
    setSelectedDistrict("");
    localStorage.setItem("randezy_city", city);
    setWhereOpen(false);
    shopsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCitySelect = (city: string) => {
    const next = selectedCity === city ? "" : city;
    setSelectedCity(next);
    setSelectedDistrict("");
    localStorage.setItem("randezy_city", next);
    shopsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCategoryClick = (cat: string) => {
    if (cat === "Dahası...") return;
    const dbCat = CATEGORY_MAP[cat];
    setSelectedCategory(prev => prev === dbCat ? "" : dbCat);
    shopsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedDistrict("");
    setSortBy("default");
    shopsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const isFiltered = !!(searchQuery || selectedCategory || selectedCity || selectedDistrict);

  return (
    <main className="min-h-screen bg-white font-sans">
      <section className="relative h-[100vh] w-full flex flex-col text-white overflow-hidden" style={{ contain: 'paint' }}>
        <div className="absolute inset-0 bg-[#050505]" style={{ height: '100vh', overflow: 'hidden' }}>
          {userId ? (
            <img
              src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1600"
              className="w-full h-full object-cover opacity-50 object-top"
              alt="Hero Background"
            />
          ) : (
            HERO_VIDEOS.map((src, i) => {
              const isFadingOut = i === fadingOutIdx;
              const isNext = i === nextIdx;
              const isActive = i === activeIdx;
              // fadingOut: was 0.65, now fades to 0 (old layer exits)
              // next/active: was 0, now fades to 0.65 (new layer enters)
              const opacity = isFadingOut ? 0 : (isActive || isNext ? 0.65 : 0);
              // Scale: entering video zooms in slightly, exiting zooms back out
              const scale = isFadingOut ? 'scale(1.0)' : (isActive || isNext ? 'scale(1.04)' : 'scale(1.0)');
              return (
                <video
                  key={i}
                  ref={el => { videoRefs.current[i] = el; }}
                  src={src}
                  muted
                  loop
                  playsInline
                  preload="auto"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    opacity,
                    transform: scale,
                    transition: 'opacity 1.4s ease-in-out, transform 1.4s ease-in-out',
                    willChange: isActive || isNext || isFadingOut ? 'opacity, transform' : 'auto',
                  }}
                />
              );
            })
          )}
        </div>

        <Navbar />

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-5 md:px-6 -mt-10 md:-mt-16">
          <h2 className="text-[38px] sm:text-[52px] md:text-[64px] font-black mb-3 tracking-tighter leading-tight text-white">
            Değişime hazır mısın?
          </h2>
          <p className="text-sm md:text-lg font-bold opacity-80 mb-6 md:mb-8 tracking-tight max-w-xs sm:max-w-none">
            Bölgendeki en iyi uzmanları keşfet ve anında randevunu al!
          </p>

          {/* Search bar — 3 alanlı */}
          <div className="bg-white rounded-2xl p-1.5 flex flex-col md:flex-row md:items-stretch shadow-2xl w-full max-w-[860px] text-left" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
            {/* Ne arıyorsun? */}
            <div className="flex-1 flex flex-col justify-center px-4 py-2 min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500" style={{ fontFamily: "var(--font-jb-mono), monospace" }}>Ne arıyorsun?</span>
              <div className="flex items-center mt-0.5">
                <Search className="text-gray-500 mr-2 flex-shrink-0" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") shopsRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                  placeholder="Hizmet, işletme veya ilçe ara..."
                  className="w-full text-black outline-none font-semibold text-sm placeholder:text-gray-400 min-w-0 bg-transparent"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-black transition-colors ml-2 flex-shrink-0">
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="hidden md:block w-px bg-gray-100 my-2" />
            <div className="md:hidden h-px bg-gray-100 mx-3" />

            {/* Nerede? */}
            <div className="relative flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setWhereOpen(v => !v)}
                className="w-full flex flex-col justify-center px-4 py-2 text-left"
              >
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500" style={{ fontFamily: "var(--font-jb-mono), monospace" }}>Nerede?</span>
                <div className="flex items-center mt-0.5 gap-2">
                  <MapPin className="text-gray-500 flex-shrink-0" size={15} />
                  <span className={`text-sm font-semibold truncate ${selectedCity ? "text-black" : "text-gray-500"}`}>
                    {selectedCity || "Tüm şehirler"}
                  </span>
                  <ChevronDown className="text-gray-500 ml-auto flex-shrink-0" size={15} />
                </div>
              </button>
              {whereOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setWhereOpen(false)} />
                  <div className="absolute left-2 right-2 top-full mt-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 max-h-64 overflow-y-auto">
                    <button onClick={() => pickCity("")} className={`w-full text-left px-4 py-2 text-sm font-semibold hover:bg-gray-50 ${!selectedCity ? "text-[#14b8a6]" : "text-gray-600"}`}>
                      Tüm şehirler
                    </button>
                    {cities.map(city => (
                      <button key={city} onClick={() => pickCity(city)} className={`w-full text-left px-4 py-2 text-sm font-semibold hover:bg-gray-50 ${selectedCity === city ? "text-[#14b8a6]" : "text-black"}`}>
                        {city}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => shopsRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="bg-[#0c0c0d] text-white px-6 md:px-9 py-3 md:py-0 rounded-xl font-bold text-sm uppercase tracking-widest flex-shrink-0 m-1 hover:bg-[#14b8a6] transition-colors"
              style={{ fontFamily: "var(--font-jb-mono), monospace" }}
            >
              Ara
            </button>
          </div>

          {/* City selector */}
          {!loading && cities.length > 0 && (
            <div className="flex items-center gap-3 mt-4 md:mt-5 w-full max-w-[700px]">
              <div className="flex items-center gap-1.5 text-white/50 text-[10px] font-black uppercase tracking-widest flex-shrink-0">
                <MapPin size={11} />
                <span className="hidden sm:inline">Şehir</span>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
                {cities.map(city => (
                  <button
                    key={city}
                    onClick={() => handleCitySelect(city)}
                    className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border
                      ${selectedCity === city
                        ? "bg-[#00A3AD] border-[#00A3AD] text-white shadow-lg shadow-[#00A3AD]/30"
                        : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                      }`}
                  >
                    {city}
                  </button>
                ))}
                {selectedCity && (
                  <button
                    onClick={() => handleCitySelect(selectedCity)}
                    className="px-3 py-1.5 rounded-full text-[11px] font-black text-white/40 hover:text-white transition-colors whitespace-nowrap flex items-center gap-1"
                  >
                    <X size={10} /> Tümü
                  </button>
                )}
              </div>
            </div>
          )}

          {/* District filter */}
          {selectedCity && districts.length > 1 && (
            <div className="flex items-center gap-3 mt-2 w-full max-w-[700px]">
              <div className="flex items-center gap-1.5 text-white/40 text-[10px] font-black uppercase tracking-widest flex-shrink-0">
                <span className="hidden sm:inline">İlçe</span>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
                {districts.map(district => (
                  <button
                    key={district}
                    onClick={() => {
                      setSelectedDistrict(prev => prev === district ? "" : district);
                      shopsRef.current?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border
                      ${selectedDistrict === district
                        ? "bg-white text-[#00A3AD] border-white shadow-sm"
                        : "bg-white/5 border-white/15 text-white/60 hover:bg-white/15"
                      }`}
                  >
                    {district}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          <div className="flex overflow-x-auto md:flex-wrap md:justify-center gap-6 md:gap-10 mt-6 md:mt-10 font-black text-[10px] md:text-[11px] uppercase tracking-[0.15em] md:tracking-[0.2em] w-full max-w-3xl pb-1 scrollbar-hide">
            {[...Object.keys(CATEGORY_MAP), "Dahası..."].map(c => {
              const isActive = selectedCategory === CATEGORY_MAP[c];
              return (
                <div key={c} onClick={() => handleCategoryClick(c)} className="cursor-pointer group flex flex-col items-center flex-shrink-0">
                  <span className={`transition-colors whitespace-nowrap ${isActive ? "text-[#00A3AD]" : "text-white"}`}>{c}</span>
                  <div className={`h-[2.5px] w-full mt-1.5 rounded-full transition-opacity ${isActive ? "opacity-100 bg-[#00A3AD]" : "bg-white opacity-0 group-hover:opacity-100"}`}></div>
                </div>
              );
            })}
          </div>
        </div>

      </section>

      {/* Shops grid */}
      <section ref={shopsRef} className="max-w-[1400px] mx-auto px-4 sm:px-8 md:px-20 pt-12 pb-14 bg-white" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>

        {/* Tek konsolide header: sol başlık+meta / sağ kontroller */}
        {!loading && !error && (
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight" style={{ color: "#0c0c0d" }}>Öne Çıkanlar</h2>
              <p className="text-[10px] md:text-[11px] uppercase tracking-widest mt-1.5" style={{ fontFamily: "var(--font-jb-mono), monospace", color: "#8a8a8e" }}>
                Randezy topluluğunun favorileri.
                <span className="ml-2" style={{ color: "#0c0c0d" }}><b>{filteredShops.length}</b> işletme</span>
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setSortBy(p => p === "rating" ? "default" : "rating")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest border transition-all
                  ${sortBy === "rating"
                    ? "bg-[#14b8a6] text-white border-[#14b8a6]"
                    : "bg-white text-gray-500 border-[#ececea] hover:border-gray-300"
                  }`}
                style={{ fontFamily: "var(--font-jb-mono), monospace" }}
              >
                <ArrowUpDown size={12} />
                Puana Göre
              </button>
              <button
                onClick={clearFilters}
                className="text-[#14b8a6] font-bold text-[10px] md:text-[12px] tracking-widest border-b-2 border-[#14b8a6] pb-0.5 hover:text-[#0d9488] transition-colors uppercase whitespace-nowrap"
                style={{ fontFamily: "var(--font-jb-mono), monospace" }}
              >
                Tümünü Gör →
              </button>
            </div>
          </div>
        )}

        {/* Aktif filtre chip'leri (yalnızca filtre varsa) */}
        {!loading && !error && isFiltered && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
            {selectedCity && (
              <span className="flex items-center gap-1.5 bg-[#14b8a6]/10 border border-[#14b8a6]/20 text-[#0d9488] px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest">
                <MapPin size={11} /> {selectedCity}
                <button onClick={() => handleCitySelect(selectedCity)} className="ml-1 hover:text-red-400 transition-colors"><X size={10} /></button>
              </span>
            )}
            {selectedDistrict && (
              <span className="flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest">
                {selectedDistrict}
                <button onClick={() => setSelectedDistrict("")} className="ml-1 hover:text-red-400 transition-colors"><X size={10} /></button>
              </span>
            )}
            {selectedCategory && (
              <span className="flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest">
                {selectedCategory}
                <button onClick={() => setSelectedCategory("")} className="ml-1 hover:text-red-400 transition-colors"><X size={10} /></button>
              </span>
            )}
          </div>
        )}

        {error ? (
          <div className="text-center font-black text-red-400 py-20 uppercase tracking-widest italic">Dükkanlar yüklenemedi.</div>
        ) : loading ? (
          <div className="text-center font-black text-gray-200 py-20 uppercase tracking-widest italic">Dükkanlar Hazırlanıyor...</div>
        ) : filteredShops.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <p className="font-black text-gray-300 uppercase tracking-widest italic">
              {selectedCity ? `${selectedDistrict || selectedCity}'da işletme bulunamadı.` : "Sonuç bulunamadı."}
            </p>
            {isFiltered && (
              <button onClick={clearFilters} className="text-[#00A3AD] font-black text-xs uppercase tracking-widest border-b border-[#00A3AD] pb-0.5">
                Filtreleri Temizle
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[18px] md:gap-[22px]" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
            {filteredShops.map((shop: any) => {
              const _td = new Date(); const todayStr = `${_td.getFullYear()}-${String(_td.getMonth()+1).padStart(2,'0')}-${String(_td.getDate()).padStart(2,'0')}`;
              const activeCampaign = (shop.campaigns || []).find((c: any) =>
                c.is_active && c.start_date <= todayStr && c.end_date >= todayStr
              );
              const campaignLabel = activeCampaign
                ? activeCampaign.type === 'percentage' ? `%${activeCampaign.discount_value} İndirim`
                  : activeCampaign.type === 'fixed' ? `₺${activeCampaign.discount_value} İndirim`
                  : activeCampaign.type === 'today_special' ? 'Bugüne Özel'
                  : 'Son Dakika'
                : null;
              const isDiscount = activeCampaign && (activeCampaign.type === 'percentage' || activeCampaign.type === 'fixed');
              const reviewCount = (shop.reviews || []).length;
              const topServices = [...(shop.services || [])]
                .filter((s: any) => s && s.name)
                .sort((a: any, b: any) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
                .slice(0, 2);
              const initial = (shop.name || "?").trim().charAt(0).toUpperCase();
              return (
                <Link
                  href={`/shop/${shop.id}`}
                  key={shop.id}
                  className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-[#ececea] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Görsel */}
                  <div className="relative h-40 sm:h-44 md:h-48 w-full overflow-hidden">
                    {shop.image_url
                      ? <img src={shop.image_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={shop.name} />
                      : <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(20,184,166,0.08)" }}>
                          <span className="text-5xl md:text-6xl font-extrabold" style={{ color: "rgba(20,184,166,0.45)" }}>{initial}</span>
                        </div>
                    }
                    {campaignLabel && (
                      <div className="absolute top-3 left-3">
                        <span
                          className="px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wide shadow-sm"
                          style={{
                            fontFamily: "var(--font-jb-mono), monospace",
                            background: isDiscount ? "#c2410c" : "#fbbf24",
                            color: isDiscount ? "#ffffff" : "#0c0c0d",
                          }}
                        >
                          {campaignLabel}
                        </span>
                      </div>
                    )}
                    {shop.score != null && (
                      <div
                        className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] md:text-[11px] font-bold shadow-sm flex items-center gap-1"
                        style={{ fontFamily: "var(--font-jb-mono), monospace", color: "#0c0c0d" }}
                      >
                        <span className="text-amber-400">★</span>
                        {shop.score}
                        {reviewCount > 0 && <span style={{ color: "#8a8a8e" }}>({reviewCount})</span>}
                      </div>
                    )}
                    <button
                      onClick={e => toggleFavorite(e, shop.id)}
                      className="absolute bottom-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:scale-110 transition-all"
                    >
                      <Heart
                        size={16}
                        className={favoriteIds.has(shop.id) ? "fill-red-500 text-red-500" : "text-gray-400"}
                      />
                    </button>
                  </div>

                  {/* Gövde */}
                  <div className="flex flex-col flex-1 p-3.5 md:p-4">
                    <h3 className="font-extrabold text-[13px] md:text-[16px] uppercase tracking-tight leading-tight truncate" style={{ color: "#0c0c0d" }}>
                      {shop.name}
                    </h3>
                    <p className="text-[9px] md:text-[10px] uppercase tracking-widest mt-1" style={{ fontFamily: "var(--font-jb-mono), monospace", color: "#8a8a8e" }}>
                      {shop.district}{shop.district && shop.city ? ", " : ""}{shop.city}
                    </p>

                    {topServices.length > 0 && (
                      <div className="mt-3 pt-3 space-y-1.5 border-t border-[#ececea]">
                        {topServices.map((s: any, i: number) => (
                          <div key={i} className="flex items-center justify-between gap-2 text-[11px] md:text-[12px]">
                            <span className="truncate" style={{ color: "rgba(12,12,13,0.8)" }}>{s.name}</span>
                            <span className="font-bold whitespace-nowrap" style={{ fontFamily: "var(--font-jb-mono), monospace", color: "#0c0c0d" }}>
                              {Number(s.price) > 0 ? `₺${s.price}` : "Ücretsiz"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto pt-4">
                      <div
                        className="w-full text-center py-2.5 rounded-xl text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-white transition-colors group-hover:bg-[#14b8a6]"
                        style={{ fontFamily: "var(--font-jb-mono), monospace", background: "#0c0c0d" }}
                      >
                        Randevu Al →
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <Footer />
    </main>
  );
}
