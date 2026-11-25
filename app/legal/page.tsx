import type { Metadata } from "next";
import { LegalIndexPage } from "@/components/sales/legal-pages";

export const metadata: Metadata = { title: "EStude | Điều khoản và chính sách" };
export default function Page() {
  return <LegalIndexPage />;
}
