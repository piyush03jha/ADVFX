import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: true },
};

export default function NoIndexLayout({ children }: { children: React.ReactNode }) {
  return children;
}
