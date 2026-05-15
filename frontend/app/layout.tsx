import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="antialiased bg-white" suppressHydrationWarning>
        {/* Navbar'ı buradan sildik, sayfalara özel Navbar kullanacağız */}
        {children}
      </body>
    </html>
  );
}