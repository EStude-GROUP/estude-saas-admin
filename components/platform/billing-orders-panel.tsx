"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { platformApi, type BillingOrder, type Plan } from "@/lib/platform-api";
import { CustomSelect } from "@/components/ui/custom-select";
import { Table, TableBody, TableCell, TableHead, TableHeader } from "@/components/ui/data-table";
import { TableScrollArea } from "@/components/ui/table-scroll-area";
import { Badge, EmptyState, Notice, amount, dateText, errorText, secondaryClass, PanelLoading } from "./console-ui";

const filters = [
  { value: "", label: "Tất cả" },
  { value: "PENDING", label: "Đang chờ" },
  { value: "PAID", label: "Đã thanh toán" },
  { value: "FAILED", label: "Cần xử lý" },
  { value: "CANCELLED", label: "Đã huỷ" },
  { value: "EXPIRED", label: "Hết hạn" },
];
const kindLabel = { NEW: "Mua mới", RENEW: "Gia hạn", UPGRADE: "Nâng cấp" } as const;
const cycleText = { MONTH: "Tháng", YEAR: "Năm" } as const;

export function BillingOrdersPanel() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [orders, setOrders] = useState<BillingOrder[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<BillingOrder | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setOrders(await platformApi.billingOrders(status, page));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }, [status, page]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    platformApi.plans().then(setPlans).catch(() => undefined);
  }, []);

  async function open(code: number) {
    try {
      setSelected(await platformApi.billingOrder(code));
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function reconcile(code: number) {
    setBusy(true);
    try {
      setSelected((await platformApi.reconcileBillingOrder(code)).data);
      await load();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  const planName = (code: string) => plans.find((plan) => plan.code === code)?.name ?? code;
  return (
    <section className="space-y-3">
      {error && <Notice>{error}</Notice>}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/20" aria-busy={busy}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-3">
          <h2 className="font-bold">Danh sách đơn thanh toán</h2>
          <div className="flex flex-wrap items-center gap-2">
            <CustomSelect
              ariaLabel="Lọc theo trạng thái"
              className="w-48"
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(0);
              }}
              options={filters}
            />
            <button type="button" className={secondaryClass} disabled={busy} onClick={() => void load()}>
              <RefreshCw size={16} aria-hidden="true" className={busy ? "animate-spin" : ""} /> Làm mới
            </button>
          </div>
        </div>
        {orders.length > 0 && (
          <TableScrollArea className="table-scroll" aria-label="Danh sách đơn thanh toán">
            <Table className="min-w-[56rem]">
              <TableHeader className="normal-case tracking-normal">
                <tr>
                  <TableHead>Mã đơn</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Trường / người mua</TableHead>
                  <TableHead>Gói</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Tạo lúc</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <tr key={o.orderCode} className="cursor-pointer hover:bg-slate-50/60" onClick={() => void open(o.orderCode)}>
                    <TableCell className="whitespace-nowrap">
                      <span className="rounded-md bg-slate-50 px-2 py-1 font-mono text-xs">{o.orderCode}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{kindLabel[o.kind]}</TableCell>
                    <TableCell>
                      <span className="block font-semibold">{o.schoolName ?? o.slug ?? o.contactName ?? "—"}</span>
                      <span className="block text-xs text-slate-500">{o.contactEmail}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="font-medium">{planName(o.planCode)}</span>
                      <span className="text-slate-500"> · {cycleText[o.cycle]}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-semibold">{amount(o.amount)} ₫</TableCell>
                    <TableCell>
                      <Badge status={o.status} />
                      {o.fulfilmentStatus === "FAILED" && <span className="ml-2"><Badge status="FAILED" label="Cần xử lý" /></span>}
                      {o.status === "PAID" && o.kind === "NEW" && o.fulfilmentStatus === "NONE" && !o.slug && <span className="ml-2 text-xs text-blue-700">Chờ khách thiết lập trường</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-slate-600">{dateText(o.createdAt)}</TableCell>
                  </tr>
                ))}
              </TableBody>
            </Table>
          </TableScrollArea>
        )}
        {!orders.length && (busy ? <PanelLoading label="Đang tải đơn thanh toán…" /> : <EmptyState title="Chưa có đơn hàng" description="Đơn xuất hiện ở đây ngay khi khách bắt đầu thanh toán." />)}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>{orders.length ? `Trang ${page + 1} · ${orders.length} đơn` : `Trang ${page + 1}`}</span>
          <div className="flex gap-2">
            <button type="button" className={secondaryClass} disabled={page === 0 || busy} onClick={() => setPage((p) => p - 1)}>Trước</button>
            <button type="button" className={secondaryClass} disabled={orders.length < 20 || busy} onClick={() => setPage((p) => p + 1)}>Sau</button>
          </div>
        </div>
      </div>
      {selected && (
        <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm" aria-label={`Chi tiết đơn ${selected.orderCode}`}>
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold">Đơn {selected.orderCode}</h3>
            <div className="flex gap-2">
              <button type="button" className={secondaryClass} disabled={busy} onClick={() => void reconcile(selected.orderCode)}>Đối chiếu với PayOS</button>
              <button type="button" className={secondaryClass} onClick={() => setSelected(null)}>Đóng</button>
            </div>
          </div>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <div><dt className="text-slate-500">Giá niêm yết</dt><dd>{amount(selected.listAmount)} ₫</dd></div>
            <div><dt className="text-slate-500">Khấu trừ nâng cấp</dt><dd>{amount(selected.creditAmount)} ₫</dd></div>
            <div><dt className="text-slate-500">Người mua</dt><dd>{selected.contactName} · {selected.contactEmail}</dd></div>
            <div><dt className="text-slate-500">Kích hoạt</dt><dd>{selected.status === "PAID" && selected.kind === "NEW" && selected.fulfilmentStatus === "NONE" && !selected.slug ? "Chờ khách thiết lập trường" : selected.fulfilmentStatus}{selected.fulfilmentError ? ` — ${selected.fulfilmentError}` : ""}</dd></div>
            {selected.paidAt && <div><dt className="text-slate-500">Thanh toán lúc</dt><dd>{dateText(selected.paidAt)}</dd></div>}
            {selected.periodEnd && <div><dt className="text-slate-500">Hiệu lực đến</dt><dd>{dateText(selected.periodEnd)}</dd></div>}
          </dl>
          {selected.fulfilmentStatus === "FAILED" && (
            <Notice>Đã nhận tiền nhưng chưa kích hoạt tự động. Xử lý thủ công (tạo trường/đổi gói trong trang Trường học) hoặc hoàn tiền qua PayOS, rồi ghi chú lại.</Notice>
          )}
          {!!selected.payments?.length && (
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500"><tr><th scope="col">Nguồn</th><th scope="col">Tham chiếu</th><th scope="col">Số tiền</th><th scope="col">Kết quả</th></tr></thead>
              <tbody>
                {selected.payments.map((p) => (
                  <tr key={`${p.source}-${p.reference}`}><td>{p.source}</td><td className="font-mono">{p.reference}</td><td>{amount(p.amount)}</td><td>{p.outcome}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </aside>
      )}
    </section>
  );
}
