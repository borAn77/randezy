"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
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
  const shopsRef = useRef<HTMLDivElement>(null);

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

  const filteredShops = shops.filter(shop => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      shop.name?.toLowerCase().includes(q) ||
      shop.district?.toLowerCase().includes(q) ||
      shop.city?.toLowerCase().includes(q);
    const matchesCategory = !selectedCategory || shop.category === selectedCategory;
    return matchesSearch && matchesCategory;
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

  const isFiltered = searchQuery || selectedCategory;

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

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 -mt-20">
          <h2 className="text-[64px] font-black mb-4 tracking-tighter leading-tight text-white">
            Değişime hazır mısın?
          </h2>
          <p className="text-lg font-bold opacity-80 mb-12 tracking-tight">
            Bölgendeki en iyi uzmanları keşfet ve anında randevunu al!
          </p>

          <div className="bg-white rounded-2xl p-1.5 flex items-center shadow-2xl w-full max-w-[700px]">
            <div className="flex-1 flex items-center px-6">
              <Search className="text-gray-300 mr-4 flex-shrink-0" size={22} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') shopsRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                placeholder="Hizmet veya işletme adı ara..."
                className="w-full py-4 text-black outline-none font-bold text-sm placeholder:text-gray-300"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-gray-300 hover:text-black transition-colors ml-2">
                  <X size={18} />
                </button>
              )}
            </div>
            <button
              onClick={() => shopsRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-[#222] text-white px-10 py-4 rounded-xl font-black text-sm uppercase tracking-widest flex-shrink-0"
            >
              Ara
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-10 mt-16 font-black text-[11px] uppercase tracking-[0.2em]">
            {[...Object.keys(CATEGORY_MAP), "Dahası..."].map((c) => {
              const isActive = selectedCategory === CATEGORY_MAP[c];
              return (
                <div key={c} onClick={() => handleCategoryClick(c)} className="cursor-pointer group flex flex-col items-center">
                  <span className={`transition-colors ${isActive ? 'text-[#00A3AD]' : 'text-white'}`}>{c}</span>
                  <div className={`h-[2.5px] w-full mt-1.5 rounded-full transition-opacity ${isActive ? 'opacity-100 bg-[#00A3AD]' : 'bg-white opacity-0 group-hover:opacity-100'}`}></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full bg-white px-20 py-8 flex justify-between items-center border-t border-gray-100">
          <div>
            <h3 className="text-2xl font-black text-[#222] tracking-tighter leading-none">Öne Çıkanlar</h3>
            <p className="text-[12px] font-bold text-gray-400 italic mt-1.5 uppercase tracking-widest">Randezy topluluğunun favorileri.</p>
          </div>
          <button onClick={clearFilters} className="text-[#00A3AD] font-black text-[12px] tracking-[0.2em] border-b-2 border-[#00A3AD] pb-1 hover:text-[#008A94] transition-colors uppercase">
            TÜMÜNÜ GÖR
          </button>
        </div>
      </section>

      <section ref={shopsRef} className="max-w-[1400px] mx-auto px-20 py-24 bg-white">
        {error ? (
          <div className="text-center font-black text-red-400 py-20 uppercase tracking-widest italic">Dükkanlar yüklenemedi.</div>
        ) : loading ? (
          <div className="text-center font-black text-gray-200 py-20 uppercase tracking-widest italic">Dükkanlar Hazırlanıyor...</div>
        ) : (
          <>
            {isFiltered && (
              <div className="flex items-center justify-between mb-12">
                <p className="font-black text-sm text-gray-400 uppercase tracking-widest">
                  <span className="text-black">{filteredShops.length}</span> sonuç
                  {selectedCategory && <span className="text-[#00A3AD] ml-2">• {selectedCategory}</span>}
                  {searchQuery && <span className="text-[#00A3AD] ml-2">• &ldquo;{searchQuery}&rdquo;</span>}
                </p>
                <button onClick={clearFilters} className="text-xs font-black text-gray-400 hover:text-black uppercase tracking-widest border-b border-gray-300 transition-colors pb-0.5">
                  Filtreyi Temizle
                </button>
              </div>
            )}

            {filteredShops.length === 0 ? (
              <div className="text-center py-20 font-black text-gray-300 uppercase tracking-widest italic">
                Sonuç bulunamadı.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                {filteredShops.map((shop: any) => (
                  <Link href={`/shop/${shop.id}`} key={shop.id} className="group cursor-pointer">
                    <div className="relative h-80 rounded-[2.5rem] overflow-hidden mb-6 shadow-2xl transition-all group-hover:-translate-y-2 ring-1 ring-black/5">
                      <img src={shop.image_url} className="w-full h-full object-cover" alt={shop.name} />
                      <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black text-black shadow-lg">
                        ⭐ {shop.score ?? "—"}
                      </div>
                    </div>
                    <h3 className="font-black text-xl text-[#222] uppercase tracking-tighter leading-none mb-1">
                      {shop.name}
                    </h3>
                    <p className="text-gray-400 font-bold text-[12px] uppercase tracking-widest">
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
