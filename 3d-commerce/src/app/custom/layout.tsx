import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Custom 3D Print & Build",
  description: "Share reference images, dimensions and requirements with the Voxel3D team to request a custom physical 3D printed product.",
  alternates: { canonical: "/custom" },
};

export default function CustomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
