import "./globals.css";
import { Manrope, JetBrains_Mono } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jb-mono",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased bg-white" suppressHydrationWarning>
        {/* Navbar'ı buradan sildik, sayfalara özel Navbar kullanacağız */}
        {children}
      </body>
    </html>
  );
}