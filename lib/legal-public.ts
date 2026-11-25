// Public legal texts (terms, privacy, payment/refund) served by the control API.
// The wording lives in one place, the backend, so the website, the contract PDF and
// the checkout acceptance always refer to the same version.
export type LegalSection = { heading: string; paragraphs: string[] };
export type LegalDocument = {
  slug: string;
  title: string;
  version: string;
  updatedAt: string;
  summary: string;
  sections: LegalSection[];
};
export type LegalIndex = {
  version: string;
  documents: Pick<LegalDocument, "slug" | "title" | "version" | "updatedAt" | "summary">[];
};

async function get<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/platform/v1/public/legal${path}`, {
      credentials: "omit",
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error("Không kết nối được máy chủ. Vui lòng thử lại.");
  }
  let envelope: { success?: boolean; message?: string; data: T };
  try {
    envelope = await response.json();
  } catch {
    throw new Error("Dịch vụ chưa sẵn sàng.");
  }
  if (!response.ok || !envelope.success) throw new Error(envelope.message ?? "Không tải được tài liệu.");
  return envelope.data;
}

export const legalPublic = {
  index: () => get<LegalIndex>(""),
  document: (slug: string) => get<LegalDocument>(`/${encodeURIComponent(slug)}`),
};

// Order of the links shown at checkout and in the footer.
export const legalLinks = [
  { slug: "terms", label: "Điều khoản sử dụng" },
  { slug: "privacy", label: "Chính sách bảo mật" },
  { slug: "payment-refund", label: "Chính sách thanh toán và hoàn tiền" },
] as const;
