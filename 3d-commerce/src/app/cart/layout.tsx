import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Cart",
  robots: { index: false, follow: true },
};

export default function NoIndexLayout({ children }: { children: React.ReactNode }) {
  return children;
}
