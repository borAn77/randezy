import Link from "next/link";

interface Section {
  title: string;
  content: string | React.ReactNode;
}

interface Props {
  title: string;
  subtitle?: string;
  sections: Section[];
}

export default function LegalLayout({ title, subtitle, sections }: Props) {
  return (
    <main className="min-h-screen bg-[#F9F9F9]">
      <nav className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-black tracking-tighter uppercase text-black hover:text-[#00A3AD] transition-colors">
            randezy
          </Link>
          <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
            ← Ana Sayfa
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pt-28 pb-20">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-black mb-2">{title}</h1>
          {subtitle && <p className="text-sm text-gray-400 font-medium">{subtitle}</p>}
        </div>

        <div className="space-y-8">
          {sections.map((section, i) => (
            <div key={i} className="bg-white rounded-2xl p-7 border border-gray-100">
              <h2 className="text-[13px] font-black uppercase tracking-widest text-[#00A3AD] mb-4">{section.title}</h2>
              {typeof section.content === "string" ? (
                <p className="text-[14px] text-gray-600 leading-relaxed whitespace-pre-line">{section.content}</p>
              ) : (
                <div className="text-[14px] text-gray-600 leading-relaxed">{section.content}</div>
              )}
            </div>
          ))}
        </div>

        <p className="mt-10 text-[11px] text-gray-300 font-medium text-center">Son güncelleme: 01.06.2026</p>
      </div>
    </main>
  );
}
