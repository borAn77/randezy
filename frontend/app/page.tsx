"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { Search, X, MapPin } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import { supabase } from "../lib/supabase";

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
  const shopsRef = useRef<HTMLDivElement>(null);

  // Load city from localStorage (client-side only)
  useEffect(() => {
    const saved = localStorage.getItem("randezy_city") || "";
    setSelectedCity(saved);
  }, []);

  useEffect(() => {
    supabase
      .from('shops')
      .select('*')
      .eq('is_active', true)
      .then(({ data, error }) => {
        if (error) { setError(true); } else { setShops(data || []); }
        setLoading(false);
      });
  }, []);

  // Unique, sorted cities from DB
  const cities = useMemo(() => {
    return [...new Set(shops.map(s => s.city).filter(Boolean))].sort() as string[];
  }, [shops]);

  const handleCitySelect = (city: string) => {
    const next = selectedCity === city ? "" : city;
    setSelectedCity(next);
    localStorage.setItem("randezy_city", next);
    shopsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredShops = shops.filter(shop => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      shop.name?.toLowerCase().includes(q) ||
      shop.district?.toLowerCase().includes(q) ||
      shop.city?.toLowerCase().includes(q);
    const matchesCategory = !selectedCategory || shop.category === selectedCategory;
    const matchesCity = !selectedCity || shop.city === selectedCity;
    return matchesSearch && matchesCategory && matchesCity;
  });

  const handleCategoryClick = (cat: string) => {
    if (cat === "Dahası...") return;
    const dbCat = CATEGORY_MAP[cat];
    setSelectedCategory(prev => prev === dbCat ? "" : dbCat);
    shopsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    shopsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const isFiltered = searchQuery || selectedCategory || selectedCity;

  return (
    <main className="min-h-screen bg-white font-sans">
      <section className="relative h-[100vh] w-full flex flex-col text-white overflow-hidden">
        <div className="absolute inset-0 bg-[#050505]">
          <img
            src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1600"
            className="w-full h-full object-cover opacity-50 object-top scale-105"
            alt="Hero Background"
          />
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
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') shopsRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                placeholder="Hizmet veya işletme ara..."
                className="w-full py-3 md:py-4 text-black outline-none font-bold text-sm placeholder:text-gray-300 min-w-0"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-gray-300 hover:text-black transition-colors ml-2 flex-shrink-0">
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              onClick={() => shopsRef.current?.scrollIntoView({ behavior: 'smooth' })}
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
                        ? 'bg-[#00A3AD] border-[#00A3AD] text-white shadow-lg shadow-[#00A3AD]/30'
                        : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
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

          {/* Categories — horizontally scrollable on mobile */}
          <div className="flex overflow-x-auto md:flex-wrap md:justify-center gap-6 md:gap-10 mt-6 md:mt-10 font-black text-[10px] md:text-[11px] uppercase tracking-[0.15em] md:tracking-[0.2em] w-full max-w-3xl pb-1 scrollbar-hide">
            {[...Object.keys(CATEGORY_MAP), "Dahası..."].map((c) => {
              const isActive = selectedCategory === CATEGORY_MAP[c];
              return (
                <div key={c} onClick={() => handleCategoryClick(c)} className="cursor-pointer group flex flex-col items-center flex-shrink-0">
                  <span className={`transition-colors whitespace-nowrap ${isActive ? 'text-[#00A3AD]' : 'text-white'}`}>{c}</span>
                  <div className={`h-[2.5px] w-full mt-1.5 rounded-full transition-opacity ${isActive ? 'opacity-100 bg-[#00A3AD]' : 'bg-white opacity-0 group-hover:opacity-100'}`}></div>
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
              {selectedCity && (
                <span className="text-lg md:text-2xl font-black text-[#00A3AD] tracking-tighter">— {selectedCity}</span>
              )}
            </div>
            <p className="text-[10px] md:text-[12px] font-bold text-gray-400 italic mt-1 uppercase tracking-widest">
              {selectedCity ? `${selectedCity}'daki işletmeler` : "Randezy topluluğunun favorileri."}
            </p>
          </div>
          <button onClick={clearFilters} className="text-[#00A3AD] font-black text-[10px] md:text-[12px] tracking-[0.15em] md:tracking-[0.2em] border-b-2 border-[#00A3AD] pb-1 hover:text-[#008A94] transition-colors uppercase">
            TÜMÜNÜ GÖR
          </button>
        </div>
      </section>

      {/* Shops grid */}
      <section ref={shopsRef} className="max-w-[1400px] mx-auto px-4 sm:px-8 md:px-20 py-12 md:py-24 bg-white">

        {/* Active city badge */}
        {selectedCity && !loading && (
          <div className="flex items-center gap-3 mb-8 md:mb-10">
            <div className="flex items-center gap-2 bg-[#00A3AD]/10 border border-[#00A3AD]/20 text-[#00A3AD] px-4 py-2 rounded-full">
              <MapPin size={13} />
              <span className="text-[11px] font-black uppercase tracking-widest">{selectedCity}</span>
            </div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">{filteredShops.length} işletme</span>
            <button
              onClick={() => handleCitySelect(selectedCity)}
              className="text-[10px] font-black text-gray-400 hover:text-red-400 transition-colors uppercase tracking-widest flex items-center gap-1"
            >
              <X size={10} /> Şehri Kaldır
            </button>
          </div>
        )}

        {error ? (
          <div className="text-center font-black text-red-400 py-20 uppercase tracking-widest italic">Dükkanlar yüklenemedi.</div>
        ) : loading ? (
          <div className="text-center font-black text-gray-200 py-20 uppercase tracking-widest italic">Dükkanlar Hazırlanıyor...</div>
        ) : (
          <>
            {(searchQuery || selectedCategory) && (
              <div className="flex items-center justify-between mb-8 md:mb-12">
                <p className="font-black text-xs md:text-sm text-gray-400 uppercase tracking-widest">
                  <span className="text-black">{filteredShops.length}</span> sonuç
                  {selectedCategory && <span className="text-[#00A3AD] ml-2">• {selectedCategory}</span>}
                  {searchQuery && <span className="text-[#00A3AD] ml-2">• &ldquo;{searchQuery}&rdquo;</span>}
                </p>
                <button onClick={clearFilters} className="text-xs font-black text-gray-400 hover:text-black uppercase tracking-widest border-b border-gray-300 transition-colors pb-0.5">
                  Temizle
                </button>
              </div>
            )}

            {filteredShops.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <p className="font-black text-gray-300 uppercase tracking-widest italic">
                  {selectedCity ? `${selectedCity}'da işletme bulunamadı.` : "Sonuç bulunamadı."}
                </p>
                {selectedCity && (
                  <button
                    onClick={() => handleCitySelect(selectedCity)}
                    className="text-[#00A3AD] font-black text-xs uppercase tracking-widest border-b border-[#00A3AD] pb-0.5"
                  >
                    Tüm şehirleri göster
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-12">
                {filteredShops.map((shop: any) => (
                  <Link href={`/shop/${shop.id}`} key={shop.id} className="group cursor-pointer">
                    <div className="relative h-52 sm:h-64 md:h-80 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden mb-3 md:mb-6 shadow-2xl transition-all group-hover:-translate-y-2 ring-1 ring-black/5">
                      <img src={shop.image_url} className="w-full h-full object-cover" alt={shop.name} />
                      <div className="absolute top-3 right-3 md:top-6 md:right-6 bg-white/95 backdrop-blur-md px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black text-black shadow-lg">
                        ⭐ {shop.score ?? "—"}
                      </div>
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
          </>
        )}
      </section>
    </main>
  );
}
