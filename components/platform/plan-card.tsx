"use client";

import { Building2, Check, X } from "lucide-react";
import type { Plan } from "@/lib/platform-api";
import { Badge, amount, secondaryClass } from "./console-ui";

const limitLabels: Record<string, string> = {
  ai_tokens: "AI tokens / tháng",
  email_messages: "Email / tháng",
  storage_bytes: "Dung lượng",
};

export function sortPlans(plans: Plan[]) {
  return [...plans].sort((a, b) => a.tier - b.tier || a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
}

function compactNumber(value: number) {
  if (value >= 1_000_000_000) return `${+(value / 1_000_000_000).toFixed(1)} tỷ`.replace(".", ",");
  if (value >= 1_000_000) return `${+(value / 1_000_000).toFixed(1)} triệu`.replace(".", ",");
  return amount(value);
}

function limitValue(resource: string, value: number) {
  return resource === "storage_bytes" ? `${amount(+(value / 1024 ** 3).toFixed(1))} GiB` : compactNumber(value);
}

// Share of the 12 monthly payments saved by paying yearly.
export function yearlySaving(prices: Plan["prices"]) {
  const month = prices?.MONTH;
  const year = prices?.YEAR;
  if (!month || year === undefined || year >= month * 12) return null;
  return Math.round((1 - year / (month * 12)) * 100);
}

export function PlanCard({ plan, onEdit }: { plan: Plan; onEdit: () => void }) {
  const selling = plan.active && plan.publicSale;
  const saving = yearlySaving(plan.prices);
  const month = plan.prices?.MONTH;
  const year = plan.prices?.YEAR;
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/20 transition hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-xl font-bold">{plan.name}</h3>
          <span className="mt-1 inline-block rounded-md bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-500">{plan.code}</span>
        </div>
        {!plan.active ? <Badge status="INACTIVE" /> : selling ? <Badge status="ACTIVE" label="Đang mở bán" /> : <Badge status="CANCELLED" label="Ẩn khỏi bảng giá" />}
      </div>
      <p className="mt-3 min-h-[2.5rem] text-sm leading-5 text-slate-500">{plan.description || "Chưa có mô tả."}</p>

      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        {month === undefined ? (
          <p className="text-sm text-slate-500">Không bán theo tháng</p>
        ) : (
          <p>
            <span className="text-2xl font-bold">{amount(month)} ₫</span>
            <span className="text-sm text-slate-500"> / tháng</span>
          </p>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-slate-600">
          {year === undefined ? "Không bán theo năm" : <>{amount(year)} ₫ / năm</>}
          {saving ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Tiết kiệm {saving}%</span> : null}
        </p>
      </div>

      <dl className="mt-4 space-y-2.5 text-sm">
        {Object.entries(plan.limits ?? {}).map(([resource, value]) => (
          <div className="flex justify-between gap-3" key={resource}>
            <dt className="text-slate-500">{limitLabels[resource] ?? resource}</dt>
            <dd className="font-semibold">{limitValue(resource, value)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Tính năng AI</dt>
          <dd className={`inline-flex items-center gap-1 font-semibold ${plan.features?.ai ? "text-emerald-700" : "text-slate-400"}`}>
            {plan.features?.ai ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
            {plan.features?.ai ? "Cho phép" : "Tắt"}
          </dd>
        </div>
      </dl>

      <div className="mt-auto pt-5">
        <p className="mb-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
          <Building2 size={15} className="text-slate-400" aria-hidden="true" />
          {plan.tenantCount ? <><strong>{amount(plan.tenantCount)}</strong> trường đang dùng</> : "Chưa có trường nào dùng"}
        </p>
        <button type="button" className={`${secondaryClass} w-full`} onClick={onEdit}>Chỉnh sửa gói & giá</button>
      </div>
    </article>
  );
}
