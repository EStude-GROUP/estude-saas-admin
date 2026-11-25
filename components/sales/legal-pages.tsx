"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, FileText } from "lucide-react";
import { legalLinks, legalPublic, type LegalDocument, type LegalIndex } from "@/lib/legal-public";
import { Notice, PanelLoading } from "@/components/platform/console-ui";
import { SalesShell } from "./sales-shell";

function useLoaded<T>(load: () => Promise<T>, key: string) {
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>({ key });
  useEffect(() => {
    let live = true;
    load()
      .then((data) => live && setState({ key, data }))
      .catch((error: unknown) => live && setState({ key, error: error instanceof Error ? error.message : "Không tải được tài liệu." }));
    return () => {
      live = false;
    };
    // `load` is recreated on every render; `key` identifies what is being loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state.key === key ? state : { key };
}

export function LegalIndexPage() {
  const state = useLoaded<LegalIndex>(() => legalPublic.index(), "index");
  return (
    <SalesShell>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">Điều khoản và chính sách</h1>
        <p className="mt-2 text-slate-600">Các tài liệu pháp lý áp dụng khi bạn đăng ký và sử dụng EStude.</p>
        {state.error && <div className="mt-6"><Notice>{state.error}</Notice></div>}
        {!state.data && !state.error && <PanelLoading label="Đang tải tài liệu…" rows={3} />}
        {state.data && (
          <ul className="mt-8 space-y-3">
            {state.data.documents.map((doc) => (
              <li key={doc.slug}>
                <Link href={`/legal/${doc.slug}`} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm">
                  <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><FileText size={20} aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{doc.title}</span>
                    <span className="mt-0.5 block text-sm text-slate-500">{doc.summary}</span>
                    <span className="mt-1 block text-xs text-slate-400">Phiên bản {doc.version} · cập nhật {doc.updatedAt}</span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </SalesShell>
  );
}

export function LegalDocumentPage({ slug }: { slug: string }) {
  const state = useLoaded<LegalDocument>(() => legalPublic.document(slug), slug);
  const doc = state.data;
  return (
    <SalesShell>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <nav aria-label="Vị trí" className="mb-6 flex items-center gap-1.5 text-sm text-slate-500">
          <Link href="/legal" className="hover:text-blue-700">Điều khoản và chính sách</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span className="truncate text-slate-700">{doc?.title ?? "…"}</span>
        </nav>
        {state.error && <Notice>{state.error}</Notice>}
        {!doc && !state.error && <PanelLoading label="Đang tải tài liệu…" rows={4} />}
        {doc && (
          <article>
            <h1 className="text-3xl font-bold tracking-tight">{doc.title}</h1>
            <p className="mt-2 text-sm text-slate-500">Phiên bản {doc.version} · cập nhật ngày {doc.updatedAt}</p>
            <div className="mt-8 space-y-8">
              {doc.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="text-lg font-semibold">{section.heading}</h2>
                  <div className="mt-3 space-y-3 leading-7 text-slate-700">
                    {section.paragraphs.map((paragraph, index) =>
                      paragraph.startsWith("- ") ? (
                        <p key={index} className="flex gap-2 pl-2"><span aria-hidden="true">•</span><span>{paragraph.slice(2)}</span></p>
                      ) : (
                        <p key={index}>{paragraph}</p>
                      ),
                    )}
                  </div>
                </section>
              ))}
            </div>
            <aside className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="font-semibold">Tài liệu liên quan</p>
              <ul className="mt-2 space-y-1">
                {legalLinks.filter((link) => link.slug !== slug).map((link) => (
                  <li key={link.slug}><Link className="text-blue-700 hover:underline" href={`/legal/${link.slug}`}>{link.label}</Link></li>
                ))}
              </ul>
            </aside>
          </article>
        )}
      </main>
    </SalesShell>
  );
}
