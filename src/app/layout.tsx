import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const switzer = localFont({
  src: [
    { path: "../../public/fonts/Switzer-Variable.woff2",       style: "normal" },
    { path: "../../public/fonts/Switzer-VariableItalic.woff2", style: "italic" },
  ],
  variable: "--font-switzer",
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
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={switzer.variable}>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
