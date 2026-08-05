import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mapa Ferretero Chile",
  description: "Dashboard de puntos de venta físicos de Sodimac, Easy, Chilemat y MTS en Chile.",
  openGraph: {
    title: "Mapa Ferretero Chile",
    description: "Puntos de venta verificados en un mapa interactivo de Chile.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mapa Ferretero Chile",
    description: "Puntos de venta verificados en un mapa interactivo de Chile.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
