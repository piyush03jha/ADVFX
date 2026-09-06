import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";

import "./globals.css";

import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { AddressProvider } from "@/context/AddressContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "FORMA — Premium 3D Models & Collectibles",
  description:
    "Premium 3D models, custom 3D creations, and physical collectibles built with obsessive attention to detail.",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          <AddressProvider>
            <CartProvider>
              <WishlistProvider>{children}</WishlistProvider>
            </CartProvider>
          </AddressProvider>
        </AuthProvider>

        <Footer />
      </body>
    </html>
  );
}
