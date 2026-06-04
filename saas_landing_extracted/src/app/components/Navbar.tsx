import { useState } from "react";
import { motion } from "motion/react";
import { Menu, X } from "lucide-react";

const links = [
  { label: "Özellikler", href: "#ozellikler" },
  { label: "Sektörler", href: "#sektorler" },
  { label: "Fiyatlandırma", href: "#fiyatlandirma" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#00A3AD] flex items-center justify-center text-white font-extrabold text-lg">
              R
            </div>
            <span className="text-xl font-bold text-black">Randezy</span>
          </a>

          {/* Masaüstü menü */}
          <nav className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-medium text-gray-600 hover:text-black transition-colors">
                {l.label}
              </a>
            ))}
          </nav>

          {/* Sağ butonlar */}
          <div className="hidden md:flex items-center gap-3">
            <a href="#" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">
              Giriş yap
            </a>
            <motion.a
              href="#"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="bg-[#00A3AD] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
            >
              Ücretsiz dene
            </motion.a>
          </div>

          {/* Mobil menü butonu */}
          <button className="md:hidden text-black" onClick={() => setOpen((v) => !v)} aria-label="Menü">
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobil menü */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-3">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="block text-sm font-medium text-gray-700" onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <a href="#" className="block bg-[#00A3AD] text-white px-5 py-2.5 rounded-xl text-sm font-semibold text-center">
            Ücretsiz dene
          </a>
        </div>
      )}
    </header>
  );
}
