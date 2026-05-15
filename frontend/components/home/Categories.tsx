"use client";

import React from 'react';
import Link from 'next/link';

const CATEGORIES = [
  { name: 'Kuaför', slug: 'kuafor' },
  { name: 'Berber', slug: 'berber' },
  { name: 'Güzellik Merkezi', slug: 'guzellik' },
  { name: 'Tırnak', slug: 'tirnak' },
  { name: 'Fizyoterapi', slug: 'fizyoterapi' },
  { name: 'Kaş ve Kirpik', slug: 'kas-kirpik' },
  { name: 'Masaj', slug: 'masaj' },
  { name: 'Dövme', slug: 'dovme' },
];

export default function Categories() {
  return (
    <div className="w-full flex items-center justify-center overflow-x-auto no-scrollbar py-4 gap-8">
      {CATEGORIES.map((cat) => (
        <Link 
          key={cat.slug}
          href={`/s/${cat.slug}`}
          className="relative text-white/90 text-[15px] font-bold tracking-tight whitespace-nowrap group transition-colors hover:text-white"
        >
          {cat.name}
          <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-white transition-all duration-300 group-hover:w-full"></span>
        </Link>
      ))}
      <button className="text-white/90 text-[15px] font-bold hover:text-white transition-colors">
        Dahası...
      </button>
    </div>
  );
}