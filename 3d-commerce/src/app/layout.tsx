import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { AddressProvider } from "@/context/AddressContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: "Shop premium 3D printed models, collectibles and custom builds from Voxel3D. Made to order and shipped across India.",
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: "Premium physical 3D models, custom 3D creations, and collectibles built with obsessive attention to detail.",
    url: SITE_URL,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: "Premium physical 3D models, custom 3D creations, and collectibles built with obsessive attention to detail.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://api.voxel3d.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.voxel3d.org" />
      </head>
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          <ThemeProvider>
            <AddressProvider>
              <CartProvider>
                <WishlistProvider>{children}</WishlistProvider>
              </CartProvider>
            </AddressProvider>
            <SiteChrome />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
