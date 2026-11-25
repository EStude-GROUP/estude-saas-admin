import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/sales/legal-pages";

export const metadata: Metadata = { title: "EStude | Điều khoản và chính sách" };
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LegalDocumentPage slug={slug} />;
}
