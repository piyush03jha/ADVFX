import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Custom 3D Printed Models from Photos",
  description:
    "Request a custom 3D printed model in India. Share JPG or PNG photos, dimensions and requirements for the Voxel3D team to review.",
  alternates: { canonical: absoluteUrl("/custom") },
  openGraph: {
    type: "website",
    url: absoluteUrl("/custom"),
    title: "Custom 3D Printed Models from Photos | Voxel3D",
    description:
      "Share JPG or PNG reference photos and dimensions. Voxel3D reviews custom physical model requests for production and delivery in India.",
  },
};

export default function CustomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
