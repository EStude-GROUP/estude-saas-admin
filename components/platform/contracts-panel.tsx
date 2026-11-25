"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, Download, FileText, FileWarning, Mail, RefreshCw, Send, ShieldCheck, Timer } from "lucide-react";
import {
  contractPageSize,
  contractPdfUrl,
  platformApi,
  type ContractDetail,
  type ContractSummary,
  type ContractView,
} from "@/lib/platform-api";
import { CustomSelect } from "@/components/ui/custom-select";
import { DebouncedSearchInput } from "@/components/ui/debounced-search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader } from "@/components/ui/data-table";
import { TableScrollArea } from "@/components/ui/table-scroll-area";
import {
  Badge,
  EmptyState,
  Modal,
  Notice,
  PanelLoading,
  SuccessNotice,
  amount,
  dangerClass,
  dateOnlyText,
  dateText,
  errorText,
  inputClass,
  secondaryClass,
} from "./console-ui";

const kindLabel = { NEW: "Đăng ký mới", RENEW: "Gia hạn", UPGRADE: "Nâng cấp" } as const;
const cycleLabel = { MONTH: "Tháng", YEAR: "Năm" } as const;
const statusLabel = { ACTIVE: "Hiệu lực", EXPIRED: "Hết hạn", TERMINATED: "Đã chấm dứt" } as const;
const emailLabel = { SENT: "Đã gửi", PENDING: "Chờ gửi", FAILED: "Gửi lỗi" } as const;
const emailBadge = { SENT: "SENT", PENDING: "PENDING", FAILED: "FAILED" } as const;

function term(contract: Pick<ContractView, "periodStart" | "periodEnd">) {
  if (!contract.periodStart || !contract.periodEnd) return "Chờ kích hoạt";
  return `${dateOnlyText(contract.periodStart)} – ${dateOnlyText(contract.periodEnd)}`;
}

function Stat({ icon: Icon, label, value, hint, tone }: { icon: typeof FileText; label: string; value?: number; hint?: string; tone: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30">
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-3 text-3xl font-bold tracking-tight">{value === undefined ? "—" : amount(value)}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
      <div className={`rounded-xl p-2.5 ${tone}`}><Icon size={21} aria-hidden="true" /></div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-slate-800">{children}</dd>
    </div>
  );
}

function ContractDialog({ id, close, changed }: { id: string; close: () => void; changed: () => void }) {
  const [detail, setDetail] = useState<ContractDetail | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState(false);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    try {
      setDetail(await platformApi.contract(id));
      setError("");
    } catch (e) {
      setError(errorText(e));
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    setError("");
    try {
      await action();
      setNotice(done);
      await load();
      changed();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const active = detail?.status === "ACTIVE";
  return (
    <Modal
      title={detail ? `Hợp đồng ${detail.number}` : "Hợp đồng"}
      titleBadge={detail ? <Badge status={detail.status} label={statusLabel[detail.status]} /> : undefined}
      close={close}
      size="wide"
      closeDisabled={busy}
      footer={
        detail ? (
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <a className={secondaryClass} href={contractPdfUrl(detail.id)} download>
              <Download size={16} aria-hidden="true" /> Tải PDF
            </a>
            <button type="button" className={secondaryClass} disabled={busy} onClick={() => void run(() => platformApi.resendContract(detail.id), "Đã xếp lịch gửi lại email hợp đồng.")}>
              <Send size={16} aria-hidden="true" /> Gửi lại email
            </button>
            {detail.status !== "TERMINATED" && (
              <button type="button" className={dangerClass} disabled={busy} onClick={() => setEnding(true)}>
                <Ban size={16} aria-hidden="true" /> Chấm dứt hợp đồng
              </button>
            )}
          </div>
        ) : undefined
      }
    >
      {error && <Notice>{error}</Notice>}
      {notice && <div className="mb-3"><SuccessNotice dismiss={() => setNotice("")}>{notice}</SuccessNotice></div>}
      {!detail && !error && <PanelLoading label="Đang tải hợp đồng…" />}
      {detail && (
        <div className="space-y-5">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Khách hàng">{detail.customerName}<span className="block text-xs font-normal text-slate-500">{detail.customerEmail}{detail.customerPhone ? ` · ${detail.customerPhone}` : ""}</span></Detail>
            <Detail label="Trường học">{detail.schoolName ?? "Chưa thiết lập"}</Detail>
            <Detail label="Loại hợp đồng">{kindLabel[detail.kind]}</Detail>
            <Detail label="Gói dịch vụ">{detail.planName} · {cycleLabel[detail.cycle]}</Detail>
            <Detail label="Giá trị">{amount(detail.amount)} ₫</Detail>
            <Detail label="Thời hạn">{term(detail)}</Detail>
            <Detail label="Mã đơn hàng">{detail.orderCode}</Detail>
            <Detail label="Chấp thuận điều khoản">{dateText(detail.signedAt)}<span className="block text-xs font-normal text-slate-500">Phiên bản {detail.termsVersion}{detail.acceptedIp ? ` · IP ${detail.acceptedIp}` : ""}</span></Detail>
            <Detail label="Email hợp đồng">
              <Badge status={emailBadge[detail.emailStatus]} label={emailLabel[detail.emailStatus]} />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                {detail.emailSentAt ? `Gửi lúc ${dateText(detail.emailSentAt)}` : `${detail.emailAttempts} lần thử`}
                {detail.emailStatus === "FAILED" ? " · cần kiểm tra cấu hình SMTP hoặc địa chỉ email" : ""}
              </span>
            </Detail>
          </dl>
          {detail.terminatedAt && (
            <Notice>Đã chấm dứt lúc {dateText(detail.terminatedAt)}{detail.terminatedReason ? `: ${detail.terminatedReason}` : "."}</Notice>
          )}
          <section aria-label="Nội dung hợp đồng" className="rounded-xl border border-slate-200 bg-slate-50/60">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
              <h3 className="flex items-center gap-2 text-sm font-semibold"><FileText size={16} className="text-blue-600" aria-hidden="true" />Nội dung hợp đồng</h3>
              <span className="text-xs text-slate-500">Bản lưu tại thời điểm giao kết, không thay đổi</span>
            </div>
            <div className="max-h-[22rem] space-y-4 overflow-y-auto p-4 text-sm leading-6 text-slate-700">
              {detail.content.basis && detail.content.basis.length > 0 && (
                <div className="space-y-0.5 italic text-slate-600">
                  {detail.content.basis.map((line) => <p key={line}>{line}</p>)}
                </div>
              )}
              {detail.content.sections.map((section) => (
                <div key={section.heading}>
                  <h4 className="font-semibold text-slate-900">{section.heading}</h4>
                  <div className="mt-1 space-y-1.5">
                    {section.paragraphs.map((paragraph, index) =>
                      paragraph.startsWith("- ") ? <p key={index} className="pl-3">• {paragraph.slice(2)}</p> : <p key={index}>{paragraph}</p>,
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
          {ending && (
            <section className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4" aria-label="Chấm dứt hợp đồng">
              <p className="text-sm font-semibold text-rose-900">Chấm dứt hợp đồng {detail.number}?</p>
              <p className="text-sm text-rose-800">Thao tác này đánh dấu hợp đồng đã chấm dứt để lưu vết; nó không hoàn tiền và không khóa trường. Lý do sẽ được lưu lại.</p>
              <textarea className={`${inputClass} min-h-20`} value={reason} maxLength={500} placeholder="Lý do chấm dứt (ít nhất 5 ký tự)" aria-label="Lý do chấm dứt" onChange={(event) => setReason(event.target.value)} />
              <div className="flex justify-end gap-2">
                <button type="button" className={secondaryClass} disabled={busy} onClick={() => { setEnding(false); setReason(""); }}>Hủy</button>
                <button type="button" className={dangerClass} disabled={busy || reason.trim().length < 5} onClick={() => void run(async () => { await platformApi.terminateContract(detail.id, reason.trim()); setEnding(false); setReason(""); }, "Đã chấm dứt hợp đồng.")}>
                  Xác nhận chấm dứt
                </button>
              </div>
            </section>
          )}
          {!active && !detail.terminatedAt && <p className="text-xs text-slate-500">Hợp đồng đã hết thời hạn dịch vụ; gia hạn sẽ tạo hợp đồng bổ sung mới.</p>}
        </div>
      )}
    </Modal>
  );
}

export function ContractsPanel() {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [email, setEmail] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<ContractView[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<ContractSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [opened, setOpened] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const [list, stats] = await Promise.all([
        platformApi.contracts({ q: query, status, email, page }),
        platformApi.contractSummary().catch(() => null),
      ]);
      setRows(list.data);
      setTotal(list.total);
      if (stats) setSummary(stats);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }, [query, status, email, page]);
  useEffect(() => {
    void load();
  }, [load]);

  const filtered = Boolean(query || status || email);
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat icon={FileText} label="Tổng hợp đồng" value={summary?.total} tone="text-blue-600 bg-blue-50" />
        <Stat icon={ShieldCheck} label="Đang hiệu lực" value={summary?.active} tone="text-emerald-600 bg-emerald-50" />
        <Stat icon={Timer} label="Sắp hết hạn" value={summary?.expiringSoon} hint="Trong 30 ngày tới" tone="text-amber-600 bg-amber-50" />
        <Stat icon={summary && summary.emailFailed > 0 ? FileWarning : Mail} label="Email chưa gửi được" value={summary ? summary.emailFailed : undefined} hint={summary ? `${amount(summary.emailPending)} đang chờ gửi` : undefined} tone={summary && summary.emailFailed > 0 ? "text-rose-600 bg-rose-50" : "text-slate-600 bg-slate-100"} />
      </div>

      {error && <Notice>{error}</Notice>}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/20" aria-busy={busy}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-3">
          <h2 className="font-bold">
            Danh sách hợp đồng
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">{total}</span>
          </h2>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
            <div className="w-full min-w-0 sm:w-64">
              <DebouncedSearchInput
                aria-label="Tìm hợp đồng"
                value={draft}
                onValueChange={setDraft}
                onSearch={(value) => {
                  setQuery(value);
                  setPage(0);
                }}
                maxLength={150}
                placeholder="Tìm số HĐ, khách, trường…"
              />
            </div>
            <CustomSelect
              ariaLabel="Lọc theo trạng thái hợp đồng"
              className="w-full sm:w-44"
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(0);
              }}
              options={[
                { value: "", label: "Mọi trạng thái" },
                { value: "ACTIVE", label: "Hiệu lực" },
                { value: "EXPIRED", label: "Hết hạn" },
                { value: "TERMINATED", label: "Đã chấm dứt" },
              ]}
            />
            <CustomSelect
              ariaLabel="Lọc theo trạng thái email"
              className="w-full sm:w-44"
              value={email}
              onValueChange={(value) => {
                setEmail(value);
                setPage(0);
              }}
              options={[
                { value: "", label: "Mọi email" },
                { value: "SENT", label: "Đã gửi" },
                { value: "PENDING", label: "Chờ gửi" },
                { value: "FAILED", label: "Gửi lỗi" },
              ]}
            />
            <button type="button" className={secondaryClass} disabled={busy} onClick={() => void load()}>
              <RefreshCw size={16} aria-hidden="true" className={busy ? "animate-spin" : ""} /> Làm mới
            </button>
          </div>
        </div>
        {rows.length > 0 && (
          <TableScrollArea className="table-scroll" aria-label="Danh sách hợp đồng">
            <Table className="min-w-[68rem]">
              <TableHeader className="normal-case tracking-normal">
                <tr>
                  <TableHead>Số hợp đồng</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Trường học</TableHead>
                  <TableHead>Gói</TableHead>
                  <TableHead className="text-right">Giá trị</TableHead>
                  <TableHead>Thời hạn</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Thao tác</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60">
                    <TableCell className="whitespace-nowrap">
                      <span className="rounded-md bg-slate-50 px-2 py-1 font-mono text-xs">{row.number}</span>
                      <span className="mt-1 block text-xs text-slate-500">{kindLabel[row.kind]}</span>
                    </TableCell>
                    <TableCell>
                      <span className="block font-semibold">{row.customerName}</span>
                      <span className="block text-xs text-slate-500">{row.customerEmail}</span>
                    </TableCell>
                    <TableCell>{row.schoolName ?? <span className="text-slate-400">Chưa thiết lập</span>}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.planName}<span className="text-slate-500"> · {cycleLabel[row.cycle]}</span></TableCell>
                    <TableCell className="whitespace-nowrap text-right font-semibold">{amount(row.amount)} ₫</TableCell>
                    <TableCell className="whitespace-nowrap text-slate-600">{term(row)}</TableCell>
                    <TableCell className="whitespace-nowrap"><Badge status={row.status} label={statusLabel[row.status]} /></TableCell>
                    <TableCell className="whitespace-nowrap"><Badge status={emailBadge[row.emailStatus]} label={emailLabel[row.emailStatus]} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <button type="button" className="text-sm font-semibold text-blue-700 hover:underline" onClick={() => setOpened(row.id)} aria-label={`Xem hợp đồng ${row.number}`}>Xem</button>
                        <a className="text-slate-500 hover:text-blue-700" href={contractPdfUrl(row.id)} download aria-label={`Tải PDF hợp đồng ${row.number}`} title="Tải PDF"><Download size={16} aria-hidden="true" /></a>
                      </div>
                    </TableCell>
                  </tr>
                ))}
              </TableBody>
            </Table>
          </TableScrollArea>
        )}
        {!rows.length && (busy ? (
          <PanelLoading label="Đang tải hợp đồng…" />
        ) : (
          <EmptyState
            title={error ? "Chưa tải được danh sách hợp đồng" : filtered ? "Không có hợp đồng phù hợp" : "Chưa có hợp đồng nào"}
            description={filtered ? "Thử đổi từ khóa hoặc bỏ bộ lọc." : "Hợp đồng được lập tự động và gửi qua email ngay khi khách hàng thanh toán thành công."}
          />
        ))}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>{total ? `Hiển thị ${page * contractPageSize + 1}–${Math.min((page + 1) * contractPageSize, total)} / ${total} hợp đồng` : "0 hợp đồng"}</span>
          <div className="flex gap-2">
            <button type="button" className={secondaryClass} disabled={page === 0 || busy} onClick={() => setPage((value) => value - 1)}>Trước</button>
            <button type="button" className={secondaryClass} disabled={(page + 1) * contractPageSize >= total || busy} onClick={() => setPage((value) => value + 1)}>Sau</button>
          </div>
        </div>
      </div>
      {opened && <ContractDialog id={opened} close={() => setOpened(null)} changed={() => void load()} />}
    </section>
  );
}
