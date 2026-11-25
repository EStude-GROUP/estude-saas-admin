"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Building2, Clock, ListChecks } from "lucide-react";
import { platformApi, type Overview, type RevenueReport, type Tenant } from "@/lib/platform-api";
import { Table, TableBody, TableCell, TableHead, TableHeader } from "@/components/ui/data-table";
import { TableScrollArea } from "@/components/ui/table-scroll-area";
import { Badge, amount, dateOnlyText, secondaryClass } from "./console-ui";

const card = "rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20";

function compact(value: number) {
  if (value >= 1_000_000_000) return `${+(value / 1_000_000_000).toFixed(1)} tỷ`.replace(".", ",");
  if (value >= 1_000_000) return `${+(value / 1_000_000).toFixed(1)} tr`.replace(".", ",");
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

function MonthBars({ report }: { report: RevenueReport }) {
  const max = Math.max(1, ...report.series.map((point) => point.amount));
  return (
    <div className="mt-4 flex h-40 items-end gap-1.5" role="img" aria-label="Doanh thu theo tháng trong 12 tháng gần nhất">
      {report.series.map((point, i) => {
        const [year, month] = point.key.split("-");
        const last = i === report.series.length - 1;
        return (
          <div key={point.key} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end text-center">
            <span className="mb-1 hidden text-[10px] font-semibold text-slate-600 group-hover:block">{point.amount ? compact(point.amount) : ""}</span>
            <div
              className={`w-full rounded-t-md ${last ? "bg-blue-600" : "bg-blue-200"} group-hover:bg-blue-500`}
              style={{ height: `${point.amount ? Math.max(4, (point.amount / max) * 100) : 2}%` }}
              title={`${month}/${year}: ${amount(point.amount)} ₫ · ${point.orders} đơn`}
            />
            <span className="mt-1.5 text-[10px] text-slate-500">{month}</span>
          </div>
        );
      })}
    </div>
  );
}

function AttentionRow({ icon: Icon, label, value, tone, onClick }: { icon: typeof ListChecks; label: string; value?: number; tone: "amber" | "rose" | "slate"; onClick?: () => void }) {
  const hot = (value ?? 0) > 0;
  const colors = !hot ? "bg-slate-50 text-slate-600" : tone === "rose" ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-900";
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm ${colors} ${onClick ? "transition hover:brightness-95" : ""}`}>
      <span className="flex items-center gap-2"><Icon size={16} aria-hidden="true" />{label}</span>
      <span className="font-bold">{value === undefined ? "—" : amount(value)}</span>
    </Tag>
  );
}

export function OverviewPanel({ overview, onNavigate, onManage }: { overview: Overview | null; onNavigate: (tab: "tenants" | "plans" | "orders" | "revenue" | "domains") => void; onManage: (tenantId: string) => void }) {
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [recent, setRecent] = useState<Tenant[] | null>(null);
  useEffect(() => {
    let live = true;
    platformApi.billingRevenue({ granularity: "month" }).then((report) => live && setRevenue(report)).catch(() => live && setRevenue(null));
    platformApi.tenants("", "", 0, { key: "createdAt", order: "desc" }).then((result) => live && setRecent(result.data.slice(0, 5))).catch(() => live && setRecent([]));
    return () => { live = false; };
  }, []);
  const summary = revenue?.summary;
  const delta = summary && summary.previousTotal > 0 ? Math.round(((summary.total - summary.previousTotal) / summary.previousTotal) * 100) : null;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <section className={card}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Doanh thu 12 tháng gần nhất</h2>
              <p className="mt-2 text-2xl font-bold">{summary ? `${amount(summary.total)} ₫` : "—"}</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                {summary ? `${amount(summary.orders)} đơn đã thanh toán` : ""}
                {delta !== null ? (
                  <span className={`inline-flex items-center gap-0.5 font-semibold ${delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {delta >= 0 ? <ArrowUpRight size={13} aria-hidden="true" /> : <ArrowDownRight size={13} aria-hidden="true" />}
                    {Math.abs(delta)}% so với kỳ trước
                  </span>
                ) : null}
              </p>
            </div>
            <button type="button" className={secondaryClass} onClick={() => onNavigate("revenue")}>Xem báo cáo<ArrowRight size={14} aria-hidden="true" /></button>
          </div>
          {revenue ? <MonthBars report={revenue} /> : <div className="mt-4 h-40 animate-pulse rounded-xl bg-slate-100" aria-hidden="true" />}
        </section>

        <section className={card}>
          <h2 className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle size={16} className="text-amber-500" aria-hidden="true" />Cần chú ý</h2>
          <div className="mt-4 space-y-2">
            <AttentionRow icon={ListChecks} label="Yêu cầu tạo trường đang chờ" value={overview?.pending} tone="amber" />
            <AttentionRow icon={AlertTriangle} label="Tạo trường thất bại" value={overview?.failed} tone="rose" />
            <AttentionRow icon={Clock} label="Gói sắp hết hạn (14 ngày)" value={overview?.expiringSoon} tone="amber" onClick={() => onNavigate("tenants")} />
            <AttentionRow icon={Building2} label="Trường đang tạm khóa" value={overview?.suspended} tone="rose" onClick={() => onNavigate("tenants")} />
            <AttentionRow icon={ListChecks} label="Đơn chờ thanh toán" value={summary?.pendingOrders} tone="slate" onClick={() => onNavigate("orders")} />
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/20">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-3">
          <h2 className="font-bold">Trường mới gần đây</h2>
          <button type="button" className={secondaryClass} onClick={() => onNavigate("tenants")}>Xem tất cả<ArrowRight size={14} aria-hidden="true" /></button>
        </div>
        {recent === null ? (
          <div className="h-32 animate-pulse bg-slate-50" aria-hidden="true" />
        ) : recent.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">Chưa có trường nào.</p>
        ) : (
          <TableScrollArea aria-label="Trường mới gần đây">
            <Table>
              <TableHeader className="normal-case tracking-normal">
                <tr>
                  <TableHead>Trường học</TableHead>
                  <TableHead>Gói dịch vụ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hạn dùng</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Thao tác</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {recent.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50/60">
                    <TableCell className="font-semibold">{tenant.name}<span className="ml-2 font-mono text-xs font-normal text-slate-500">{tenant.slug}</span></TableCell>
                    <TableCell className="whitespace-nowrap">{tenant.planName || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{tenant.subscriptionStatus ? <Badge status={tenant.subscriptionStatus} /> : <Badge status={tenant.status} />}</TableCell>
                    <TableCell className="whitespace-nowrap text-slate-600">{tenant.periodEnd ? dateOnlyText(tenant.periodEnd) : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-slate-600">{dateOnlyText(tenant.createdAt)}</TableCell>
                    <TableCell><button type="button" className="text-sm font-semibold text-blue-700 hover:underline" onClick={() => onManage(tenant.id)} aria-label={`Quản lý ${tenant.name}`}>Quản lý</button></TableCell>
                  </tr>
                ))}
              </TableBody>
            </Table>
          </TableScrollArea>
        )}
      </section>
    </div>
  );
}
