import type { Metadata } from "next";

import { AboutContent } from "@/components/about/AboutContent";
import { Navbar } from "@/components/layout/SiteNavbar";

export const metadata: Metadata = {
  title: "About Voxel3D — 3D Printed Models Made in India",
  description:
    "Learn how Voxel3D designs, prints and finishes premium 3D printed models and collectibles, and how custom orders work. Shipped across India.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-[70vh] bg-background">
        <AboutContent />
      </main>
    </>
  );
}
