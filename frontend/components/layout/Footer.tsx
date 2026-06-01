import Link from "next/link";

const links = [
  { href: "/kvkk",                  label: "KVKK" },
  { href: "/gizlilik-politikasi",   label: "Gizlilik Politikası" },
  { href: "/kullanici-sozlesmesi",  label: "Kullanıcı Sözleşmesi" },
  { href: "/cerez-politikasi",      label: "Çerez Politikası" },
  { href: "/ticari-ileti-izni",     label: "Ticari İleti İzni" },
];

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white py-10 px-6 mt-16">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <p className="text-[11px] text-gray-300 font-medium text-center md:text-left">
          © 2026 HM MARKETING SP. Z O.O. · Randezy · destek@randezy.com
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[11px] font-bold text-gray-400 hover:text-[#00A3AD] uppercase tracking-wide transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
