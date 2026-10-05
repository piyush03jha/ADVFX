import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Custom 3D Print & Build",
  description:
    "Upload your design or describe your idea and get a custom 3D printed model, quoted and built to order.",
};

export default function CustomLayout({ children }: { children: React.ReactNode }) {
  return children;
}