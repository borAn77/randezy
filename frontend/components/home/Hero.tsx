"use client";

import React from 'react';
import Categories from './Categories';

export default function Hero() {
  return (
    <section className="relative h-[88vh] min-h-[580px] w-full flex flex-col items-center justify-end overflow-hidden pb-4">
      
      {/* FOTOĞRAF AYARLARI: Tam istediğin o merkezi kadraj */}
      <div 
        className="absolute inset-0 bg-cover bg-[center_top] z-0 scale-110" 
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070')" }}
      >
        <div className="absolute inset-0 bg-black/45"></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl px-6 flex flex-col items-center text-center">
        <h1 className="text-white text-4xl md:text-5xl font-black mb-3 leading-tight tracking-tighter drop-shadow-2xl">
          Değişime hazır mısın?
        </h1>
        <p className="text-white/90 text-sm md:text-base mb-8 font-semibold max-w-xl drop-shadow-md">
          Bölgendeki en iyi uzmanları keşfet ve anında randevunu al!
        </p>
        
        {/* Arama Çubuğu */}
        <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl flex items-center p-1 mb-8 border border-white/20">
          <div className="flex-1 flex items-center px-4 py-2.5">
            <span className="text-lg mr-2">🔍</span>
            <input 
              type="text" 
              placeholder="Hizmet veya işletme adı ara..." 
              className="w-full outline-none text-gray-800 font-bold text-sm placeholder:text-gray-400 bg-transparent"
            />
          </div>
          <button className="bg-black text-white px-6 py-2.5 rounded-lg font-black text-sm hover:bg-zinc-800 transition-all active:scale-95">
            Ara
          </button>
        </div>

        <Categories />
      </div>

      <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
    </section>
  );
}