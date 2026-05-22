"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { Search, X, MapPin, Image as ImageIcon, ArrowUpDown, Heart } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import { supabase } from "../lib/supabase";
import AuthModal from "../components/layout/AuthModal";

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
  const [userId, setUserId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [videoIdx, setVideoIdx] = useState(0);
  const shopsRef = useRef<HTMLDivElement>(null);

  const heroVideos = [
    '/videos/4177973-hd_1920_1080_30fps.mp4',
    '/videos/8225735-hd_1920_1080_25fps.mp4',
    '/videos/9335886-hd_1920_1080_25fps.mp4',
  ];

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

  useEffect(() => {
    if (userId) return;
    const t = setInterval(() => setVideoIdx(i => (i + 1) % heroVideos.length), 7000);
    return () => clearInterval(t);
  }, [userId]);

  useEffect(() => {
    supabase
      .from("shops")
      .select("*")
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
            heroVideos.map((src, i) => (
              <video
                key={i}
                src={src}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  opacity: i === videoIdx ? 0.65 : 0,
                  transition: 'opacity 1.5s ease-in-out',
                  zIndex: i === videoIdx ? 1 : 0,
                }}
              />
            ))
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

          {/* Search bar */}
          <div className="bg-white rounded-2xl p-1.5 flex items-center shadow-2xl w-full max-w-[700px]">
            <div className="flex-1 flex items-center px-3 md:px-6 min-w-0">
              <Search className="text-gray-300 mr-2 md:mr-4 flex-shrink-0" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") shopsRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                placeholder="Hizmet, işletme veya ilçe ara..."
                className="w-full py-3 md:py-4 text-black outline-none font-bold text-sm placeholder:text-gray-300 min-w-0"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-gray-300 hover:text-black transition-colors ml-2 flex-shrink-0">
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              onClick={() => shopsRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="bg-[#222] text-white px-5 md:px-10 py-3 md:py-4 rounded-xl font-black text-sm uppercase tracking-widest flex-shrink-0"
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

        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 w-full bg-white px-5 md:px-20 py-4 md:py-8 flex justify-between items-center border-t border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg md:text-2xl font-black text-[#222] tracking-tighter leading-none">Öne Çıkanlar</h3>
              {selectedCity && <span className="text-lg md:text-2xl font-black text-[#00A3AD] tracking-tighter">— {selectedCity}</span>}
              {selectedDistrict && <span className="text-lg md:text-2xl font-black text-gray-400 tracking-tighter">/ {selectedDistrict}</span>}
            </div>
            <p className="text-[10px] md:text-[12px] font-bold text-gray-400 italic mt-1 uppercase tracking-widest">
              {selectedCity ? `${selectedDistrict || selectedCity}'daki işletmeler` : "Randezy topluluğunun favorileri."}
            </p>
          </div>
          <button onClick={clearFilters} className="text-[#00A3AD] font-black text-[10px] md:text-[12px] tracking-[0.15em] md:tracking-[0.2em] border-b-2 border-[#00A3AD] pb-1 hover:text-[#008A94] transition-colors uppercase">
            TÜMÜNÜ GÖR
          </button>
        </div>
      </section>

      {/* Shops grid */}
      <section ref={shopsRef} className="max-w-[1400px] mx-auto px-4 sm:px-8 md:px-20 py-12 md:py-24 bg-white">

        {/* Filter bar */}
        {!loading && !error && (
          <div className="flex items-center justify-between mb-8 md:mb-12 flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {selectedCity && (
                <span className="flex items-center gap-1.5 bg-[#00A3AD]/10 border border-[#00A3AD]/20 text-[#00A3AD] px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest">
                  <MapPin size={11} /> {selectedCity}
                  <button onClick={() => handleCitySelect(selectedCity)} className="ml-1 hover:text-red-400 transition-colors"><X size={10} /></button>
                </span>
              )}
              {selectedDistrict && (
                <span className="flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest">
                  {selectedDistrict}
                  <button onClick={() => setSelectedDistrict("")} className="ml-1 hover:text-red-400 transition-colors"><X size={10} /></button>
                </span>
              )}
              {selectedCategory && (
                <span className="flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest">
                  {selectedCategory}
                  <button onClick={() => setSelectedCategory("")} className="ml-1 hover:text-red-400 transition-colors"><X size={10} /></button>
                </span>
              )}
              <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                <span className="text-black font-black">{filteredShops.length}</span> işletme
              </span>
              {isFiltered && (
                <button onClick={clearFilters} className="text-[10px] font-black text-gray-400 hover:text-red-400 uppercase tracking-widest transition-colors">
                  Temizle
                </button>
              )}
            </div>
            <button
              onClick={() => setSortBy(p => p === "rating" ? "default" : "rating")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all
                ${sortBy === "rating"
                  ? "bg-[#00A3AD] text-white border-[#00A3AD]"
                  : "bg-white text-gray-400 border-gray-100 hover:border-gray-300"
                }`}
            >
              <ArrowUpDown size={12} />
              Puana Göre
            </button>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-12">
            {filteredShops.map((shop: any) => (
              <Link href={`/shop/${shop.id}`} key={shop.id} className="group cursor-pointer">
                <div className="relative h-52 sm:h-64 md:h-80 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden mb-3 md:mb-6 shadow-2xl transition-all group-hover:-translate-y-2 ring-1 ring-black/5">
                  {shop.image_url
                    ? <img src={shop.image_url} className="w-full h-full object-cover" alt={shop.name} />
                    : <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-2">
                        <ImageIcon size={40} className="text-gray-300" />
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{shop.category || "İşletme"}</span>
                      </div>
                  }
                  <div className="absolute top-3 right-3 md:top-6 md:right-6 bg-white/95 backdrop-blur-md px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black text-black shadow-lg">
                    ⭐ {shop.score ?? "—"}
                  </div>
                  <button
                    onClick={e => toggleFavorite(e, shop.id)}
                    className="absolute bottom-3 right-3 md:bottom-4 md:right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:scale-110 transition-all"
                  >
                    <Heart
                      size={16}
                      className={favoriteIds.has(shop.id) ? "fill-red-500 text-red-500" : "text-gray-400"}
                    />
                  </button>
                </div>
                <h3 className="font-black text-sm md:text-xl text-[#222] uppercase tracking-tighter leading-none mb-1">
                  {shop.name}
                </h3>
                <p className="text-gray-400 font-bold text-[10px] md:text-[12px] uppercase tracking-widest">
                  {shop.district}, {shop.city}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </main>
  );
}
