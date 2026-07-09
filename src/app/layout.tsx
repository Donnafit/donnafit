import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Montserrat, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const switzer = localFont({
  src: [
    { path: "../../public/fonts/Switzer-Variable.woff2",       style: "normal" },
    { path: "../../public/fonts/Switzer-VariableItalic.woff2", style: "italic" },
  ],
  variable: "--font-switzer",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "700", "800", "900"],
  variable: "--font-montserrat",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: "Donna FIT | Marmitas Fitness",
  description: "Marmitas fitness saudáveis e saborosas entregues na sua porta.",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${switzer.variable} ${montserrat.variable} ${jakarta.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
