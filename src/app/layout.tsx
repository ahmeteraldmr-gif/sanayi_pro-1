import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "SanayiPro | Oto Servis Yönetim Sistemi",
  description:
    "Oto servisler için müşteri, araç, iş emri, stok, randevu ve işletme takibini tek çalışma alanında birleştiren modern servis yönetim platformu.",
  applicationName: "SanayiPro",
  openGraph: {
    title: "SanayiPro | Oto Servis Yönetim Sistemi",
    description:
      "Servise giren her araç için net bir sonraki adım. Kabulden teslimata servisinizin günlük çalışma alanı.",
    locale: "tr_TR",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#F6F7F9" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
