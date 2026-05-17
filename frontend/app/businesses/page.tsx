"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/layout/Navbar";
import { api, type Business } from "../../lib/api";
import { MapPin, Clock, Search, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";

const CATEGORIES = ["Kuaför", "Berber", "Güzellik Salonu", "Spa", "Diğer"];
const CITIES = ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana", "Konya", "Gaziantep"];

export default function BusinessesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [city, setCity] = useState(searchParams.get("city") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [showFilters, setShowFilters] = useState(false);

  const PAGE_SIZE = 12;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    fetchBusinesses(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function fetchBusinesses(p: number) {
    setLoading(true);
    try {
      const result = await api.searchBusinesses({ city, category, q, page: p, page_size: PAGE_SIZE });
      setBusinesses(result.items);
      setTotal(result.total);
    } catch {
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchBusinesses(1);
  }

  return (
    <main className="min-h-screen bg-[#F9F9F9] text-[#111]">
      <Navbar />
      <div className="max-w-7xl mx-auto pt-32 px-6 pb-20">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="mb-10 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="İşletme ara..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-12 pr-5 py-5 rounded-2xl bg-white border-2 border-gray-100 text-sm font-bold outline-none focus:border-[#00A3AD]"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-6 py-5 rounded-2xl border-2 border-gray-100 bg-white text-sm font-bold hover:border-[#00A3AD] transition-all"
          >
            <SlidersHorizontal size={16} />
            Filtrele
          </button>
          <button
            type="submit"
            className="px-10 py-5 rounded-2xl bg-black text-white text-sm font-black uppercase tracking-widest hover:bg-[#00A3AD] transition-all"
          >
            Ara
          </button>
        </form>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-[2rem] p-8 mb-10 border border-gray-100 shadow-xl animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-black text-[#00A3AD] uppercase tracking-widest mb-3">Şehir</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCity("")}
                    className={`px-4 py-2 rounded-full text-xs font-bold border-2 transition-all ${
                      city === "" ? "border-[#00A3AD] bg-[#E6F6F7] text-[#00A3AD]" : "border-gray-100 text-gray-500"
                    }`}
                  >
                    Tümü
                  </button>
                  {CITIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCity(c)}
                      className={`px-4 py-2 rounded-full text-xs font-bold border-2 transition-all ${
                        city === c ? "border-[#00A3AD] bg-[#E6F6F7] text-[#00A3AD]" : "border-gray-100 text-gray-500"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-[#00A3AD] uppercase tracking-widest mb-3">Kategori</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCategory("")}
                    className={`px-4 py-2 rounded-full text-xs font-bold border-2 transition-all ${
                      category === "" ? "border-[#00A3AD] bg-[#E6F6F7] text-[#00A3AD]" : "border-gray-100 text-gray-500"
                    }`}
                  >
                    Tümü
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-4 py-2 rounded-full text-xs font-bold border-2 transition-all ${
                        category === cat ? "border-[#00A3AD] bg-[#E6F6F7] text-[#00A3AD]" : "border-gray-100 text-gray-500"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results count */}
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
          {loading ? "Aranıyor..." : `${total} işletme bulundu`}
        </p>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-[2rem] h-72 animate-pulse" />
            ))}
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-4xl font-black text-gray-200 uppercase tracking-tighter">Sonuç Bulunamadı</p>
            <p className="text-gray-400 text-sm mt-3 font-medium">Filtrelerinizi değiştirmeyi deneyin</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {businesses.map((biz) => (
              <Link key={biz.id} href={`/b/${biz.slug}`} className="group">
                <div className="bg-white rounded-[2rem] overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                  <div className="h-44 bg-gradient-to-br from-gray-100 to-gray-200 relative">
                    {biz.cover_image_url ? (
                      <img
                        src={biz.cover_image_url}
                        alt={biz.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-5xl font-black text-gray-300">{biz.name[0]}</span>
                      </div>
                    )}
                    <span className="absolute top-3 left-3 bg-black text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                      {biz.category}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-black text-sm uppercase tracking-tight text-black mb-2 group-hover:text-[#00A3AD] transition-colors">
                      {biz.name}
                    </h3>
                    {biz.city && (
                      <p className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                        <MapPin size={12} />
                        {biz.city}
                        {biz.address && ` · ${biz.address}`}
                      </p>
                    )}
                    <button className="mt-4 w-full py-3 rounded-xl bg-[#00A3AD] text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">
                      Randevu Al
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-12">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-3 rounded-2xl border-2 border-gray-100 disabled:opacity-30 hover:border-[#00A3AD] transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-black text-gray-500">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-3 rounded-2xl border-2 border-gray-100 disabled:opacity-30 hover:border-[#00A3AD] transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
