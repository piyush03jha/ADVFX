import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { AddressProvider } from "@/context/AddressContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  HOME_DESCRIPTION,
  HOME_TITLE,
  SITE_DESCRIPTION,
  SITE_LOGO_PATH,
  SITE_PUBLISHED_ISO,
  SITE_NAME,
  SITE_SAME_AS,
  SITE_TAGLINE,
  SITE_URL,
  absoluteUrl,
} from "@/lib/site";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  verification: {
    google: "GW05kSEMr1BuVx_Ca6KQs6bE8DsTCQv8kKxB-8zLLSY",
  },

  title: {
    default: HOME_TITLE,
    template: `%s | ${SITE_NAME}`,
  },

  description: HOME_DESCRIPTION,
  alternates: {
    canonical: "/",
    types: {
      "text/plain": [
        { url: "/llms.txt", title: "llms.txt" },
        { url: "/llms-small.txt", title: "llms-small.txt" },
      ],
    },
  },
  // `article:*` tags are for articles, not a storefront, and a modified_time of
  // "now" on every request is misleading to crawlers, so they are not emitted.
  applicationName: SITE_NAME,
  category: "shopping",
  keywords: [
    "Voxel3D",
    "voxel3d.org",
    "buy 3D printed models in India",
    "3D printed models",
    "3D printed figures",
    "3D printed collectibles",
    "buy 3D printed figurines online",
    "custom 3D printed models from photos",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },

  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description:
      "Buy physical 3D printed models, figures and collectibles in India. Explore selected 3D previews or request a custom physical model from reference images.",
    url: SITE_URL,
    locale: "en_IN",
    images: [{ url: SITE_LOGO_PATH, alt: `${SITE_NAME} logo` }],
  },

  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description:
      "Buy physical 3D printed models, figures, miniatures and collectibles in India from Voxel3D. Explore selected 3D previews or request a custom physical model from reference images.",
    images: [SITE_LOGO_PATH],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": absoluteUrl("/#organization"),
      name: SITE_NAME,
      alternateName: ["Voxel 3D", "voxel3d.org"],
      url: SITE_URL,
      logo: absoluteUrl(SITE_LOGO_PATH),
      description: SITE_DESCRIPTION,
      foundingDate: SITE_PUBLISHED_ISO.slice(0, 10),
      areaServed: { "@type": "Country", name: "India" },
      knowsAbout: [
        "Physical 3D printed models",
        "3D printed figures and collectibles",
        "Miniatures and display models",
        "Custom physical model requests from reference images",
        "Interactive 3D product previews",
      ],
      ...(SITE_SAME_AS.length ? { sameAs: SITE_SAME_AS } : {}),
    },
    {
      "@type": "WebSite",
      "@id": absoluteUrl("/#website"),
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: "Voxel3D",
      inLanguage: "en-IN",
      publisher: { "@id": absoluteUrl("/#organization") },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/shop?search={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0b0f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      style={{ colorScheme: "dark" }}
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} dark h-full antialiased`}
    >
      <head>
        {/* Dark by default; only switch to light if the visitor chose it. Runs before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var l=localStorage.getItem("advfx-theme-v2")==="light",r=document.documentElement;r.classList.toggle("dark",!l);r.dataset.theme=l?"light":"dark";r.style.colorScheme=l?"light":"dark"}catch(e){}`,
          }}
        />
        {/* First visit to the home page: cover the page with the intro background from the very
            first paint, so the site is not shown and then hidden again when the logo
            animation starts. LogoIntro removes the mark once its own overlay is up; the timer is
            a safety net so the page can never stay covered. The cover never blocks clicks. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var d=document.documentElement,p=false;for(var i=0;i<2;i++){try{if((i?sessionStorage:localStorage).getItem("voxel-intro-played")==="1")p=true}catch(e){}}if((location.pathname==="/"&&!p)||/[?&]intro(=|&|$)/.test(location.search)){d.setAttribute("data-intro","pending");setTimeout(function(){d.removeAttribute("data-intro")},8000)}}catch(e){}`,
          }}
        />
        <link
          rel="preconnect"
          href="https://api.voxel3d.org"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://api.voxel3d.org" />
      </head>

      <body className="flex min-h-full flex-col">
        <JsonLd data={organizationJsonLd} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to main content
        </a>
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
