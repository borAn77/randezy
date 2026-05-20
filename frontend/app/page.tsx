"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const shopsRef = useRef<HTMLElement>(null);

  const categoryMap: { [key: string]: string } = {
    "Kuaför": "KUAFÖR", "Berber": "BERBER", "Güzellik Merkezi": "GÜZELLİK MERKEZİ",
    "Tırnak": "TIRNAK", "Fizyoterapi": "FİZYOTERAPİ", "Kaş ve Kirpik": "KAŞ VE KİRPİK",
    "Masaj": "MASAJ", "Dövme": "DÖVME",
  };

  const filteredShops = shops.filter(shop => {
    const matchSearch = !searchQuery || shop.name?.toLowerCase().includes(searchQuery.toLowerCase()) || shop.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = !selectedCategory || shop.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  useEffect(() => {
    supabase
      .from('shops')
      .select('*')
      .eq('is_active', true)
      .then(({ data }) => {
        setShops(data || []);
        setLoading(false);
      });
  }, []);

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
              <Search className="text-gray-300 mr-4" size={22} />
              <input
                type="text"
                placeholder="Hizmet veya işletme adı ara..."
                className="w-full py-4 text-black outline-none font-bold text-sm placeholder:text-gray-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && shopsRef.current?.scrollIntoView({ behavior: 'smooth' })}
              />
            </div>
            <button onClick={() => shopsRef.current?.scrollIntoView({ behavior: 'smooth' })} className="bg-[#222] text-white px-10 py-4 rounded-xl font-black text-sm uppercase tracking-widest">
              Ara
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-10 mt-16 font-black text-[11px] opacity-100 uppercase tracking-[0.2em]">
            {["Kuaför", "Berber", "Güzellik Merkezi", "Tırnak", "Fizyoterapi", "Kaş ve Kirpik", "Masaj", "Dövme", "Dahası..."].map((c) => (
              <div key={c} onClick={() => { const mapped = categoryMap[c]; setSelectedCategory(mapped && mapped !== selectedCategory ? mapped : ""); shopsRef.current?.scrollIntoView({ behavior: 'smooth' }); }} className="cursor-pointer group flex flex-col items-center">
                <span className={`text-white ${categoryMap[c] === selectedCategory ? 'underline underline-offset-4' : ''}`}>{c}</span>
                <div className="h-[2.5px] w-full bg-white mt-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full bg-white px-20 py-8 flex justify-between items-center border-t border-gray-100">
           <div>
              <h3 className="text-2xl font-black text-[#222] tracking-tighter leading-none">Öne Çıkanlar</h3>
              <p className="text-[12px] font-bold text-gray-400 italic mt-1.5 uppercase tracking-widest">Randezy topluluğunun favorileri.</p>
           </div>
           <button onClick={() => { setSelectedCategory(""); setSearchQuery(""); shopsRef.current?.scrollIntoView({ behavior: 'smooth' }); }} className="text-[#00A3AD] font-black text-[12px] tracking-[0.2em] border-b-2 border-[#00A3AD] pb-1 hover:text-[#008A94] transition-colors uppercase">
             TÜMÜNÜ GÖR
           </button>
        </div>
      </section>

      <section ref={shopsRef} className="max-w-[1400px] mx-auto px-20 py-24 bg-white">
        {loading ? (
          <div className="text-center font-black text-gray-200 py-20 uppercase tracking-widest italic">Dükkanlar Hazırlanıyor...</div>
        ) : filteredShops.length === 0 ? (
          <div className="text-center font-black text-gray-300 py-20 uppercase tracking-widest italic">Sonuç Bulunamadı</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {filteredShops.map((shop: any) => (
              <Link href={`/shop/${shop.id}`} key={shop.id} className="group cursor-pointer">
                <div className="relative h-80 rounded-[2.5rem] overflow-hidden mb-6 shadow-2xl transition-all group-hover:-translate-y-2 ring-1 ring-black/5">
                  <img src={shop.image_url} className="w-full h-full object-cover" alt={shop.name} />
                  <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black text-black shadow-lg">
                    ⭐ {shop.score}
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
      </section>
    </main>
  );
}