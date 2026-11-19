import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nile South Games | Player account" };

export default function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
