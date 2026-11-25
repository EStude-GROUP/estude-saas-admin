"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, RefreshCw } from "lucide-react";
import {
  platformApi,
  type Plan,
  type RevenueGranularity,
  type RevenueGroup,
  type RevenueReport,
} from "@/lib/platform-api";
import { CustomSelect } from "@/components/ui/custom-select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader } from "@/components/ui/data-table";
import { TableScrollArea } from "@/components/ui/table-scroll-area";
import { EmptyState, Notice, amount, errorText, secondaryClass } from "./console-ui";

const presets = [
  { id: "30d", label: "30 ngày" },
  { id: "3m", label: "3 tháng" },
  { id: "6m", label: "6 tháng" },
  { id: "12m", label: "12 tháng" },
  { id: "year", label: "Năm nay" },
  { id: "custom", label: "Tùy chọn" },
] as const;
type Preset = (typeof presets)[number]["id"];
const kindLabel: Record<string, string> = { NEW: "Mua mới", RENEW: "Gia hạn", UPGRADE: "Nâng cấp" };
const palette = ["#2563eb", "#8b5cf6", "#10b981", "#f59e0b", "#94a3b8"];

const money = (value: number) => `${amount(value)} ₫`;
function compact(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace(".", ",")} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".", ",")} tr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}
const ymd = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
function presetRange(preset: Exclude<Preset, "custom">) {
  const today = new Date();
  const to = ymd(today);
  if (preset === "30d") return { from: ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)), to, granularity: "day" as const };
  if (preset === "3m") return { from: ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 89)), to, granularity: "day" as const };
  if (preset === "6m") return { from: ymd(new Date(today.getFullYear(), today.getMonth() - 5, 1)), to, granularity: "month" as const };
  if (preset === "12m") return { from: ymd(new Date(today.getFullYear(), today.getMonth() - 11, 1)), to, granularity: "month" as const };
  return { from: ymd(new Date(today.getFullYear(), 0, 1)), to, granularity: "month" as const };
}
function labelOf(key: string, granularity: RevenueGranularity) {
  const [y, m, d] = key.split("-");
  return granularity === "day" ? `${d}/${m}` : `${m}/${y.slice(2)}`;
}
function longLabel(key: string, granularity: RevenueGranularity) {
  const [y, m, d] = key.split("-");
  return granularity === "day" ? `${d}/${m}/${y}` : `Tháng ${m}/${y}`;
}
// A round upper bound so gridlines land on readable values (1, 2, 2.5, 5 x 10^k).
function niceMax(value: number) {
  if (value <= 0) return 1;
  const exponent = 10 ** Math.floor(Math.log10(value));
  const fraction = value / exponent;
  const step = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return step * exponent;
}
const percent = (value: number, base: number) => (base > 0 ? Math.round((value / base) * 100) : null);

function Delta({ current, previous }: { current: number; previous: number }) {
  const change = percent(current - previous, previous);
  if (change === null)
    return <span className="text-xs text-slate-500">{current > 0 ? "Chưa có kỳ trước để so sánh" : "Chưa có doanh thu"}</span>;
  const Icon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
  const tone = change > 0 ? "bg-emerald-50 text-emerald-700" : change < 0 ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold ${tone}`}>
        <Icon size={12} aria-hidden="true" />
        {change > 0 ? "+" : ""}
        {change}%
      </span>
      so với kỳ trước
    </span>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const points = values.map((value, i) => `${values.length === 1 ? 50 : (i / (values.length - 1)) * 100},${28 - (value / max) * 26}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full" aria-hidden="true">
      <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const W = 900, H = 300, L = 58, R = 16, T = 16, B = 30;

function TrendChart({ report }: { report: RevenueReport }) {
  const { series, range } = report;
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<SVGSVGElement>(null);
  const top = niceMax(Math.max(1, ...series.map((p) => Math.max(p.amount, p.previousAmount))));
  const x = (i: number) => (series.length === 1 ? (L + W - R) / 2 : L + (i / (series.length - 1)) * (W - L - R));
  const y = (value: number) => T + (1 - value / top) * (H - T - B);
  const line = (pick: (p: RevenueReport["series"][number]) => number) => series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(pick(p)).toFixed(1)}`).join(" ");
  const area = `${line((p) => p.amount)} L${x(series.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const every = Math.max(1, Math.ceil(series.length / 8));
  const active = hover === null ? null : series[hover];
  function move(event: React.MouseEvent<SVGSVGElement>) {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const position = ((event.clientX - rect.left) / rect.width) * W;
    const index = series.length === 1 ? 0 : Math.round(((position - L) / (W - L - R)) * (series.length - 1));
    setHover(Math.min(series.length - 1, Math.max(0, index)));
  }
  return (
    <div className="relative">
      <svg
        ref={box}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Biểu đồ doanh thu ${series.length} ${range.granularity === "day" ? "ngày" : "tháng"}, cao nhất ${money(top)}`}
        onMouseMove={move}
        onMouseLeave={() => setHover(null)}
      >
        {[0, 1, 2, 3, 4].map((tick) => {
          const value = (top / 4) * tick;
          return (
            <g key={tick}>
              <line x1={L} x2={W - R} y1={y(value)} y2={y(value)} stroke="#e2e8f0" strokeDasharray={tick ? "3 4" : undefined} />
              <text x={L - 8} y={y(value) + 4} textAnchor="end" fontSize="11" fill="#64748b">{compact(value)}</text>
            </g>
          );
        })}
        <path d={area} fill="#2563eb" fillOpacity="0.1" />
        <path d={line((p) => p.previousAmount)} fill="none" stroke="#94a3b8" strokeWidth="1.75" strokeDasharray="5 4" />
        <path d={line((p) => p.amount)} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" />
        {series.length <= 40 && series.map((p, i) => <circle key={p.key} cx={x(i)} cy={y(p.amount)} r={hover === i ? 5 : 2.5} fill="#2563eb" stroke="#fff" strokeWidth="1.5" />)}
        {series.map((p, i) => ((series.length - 1 - i) % every === 0 ? <text key={p.key} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#64748b">{labelOf(p.key, range.granularity)}</text> : null))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="#2563eb" strokeOpacity="0.35" />}
      </svg>
      {active && hover !== null ? (
        <div
          role="tooltip"
          className="pointer-events-none absolute top-2 z-10 w-52 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg shadow-slate-900/10"
          style={{ left: `${Math.min(78, Math.max(0, (x(hover) / W) * 100 - 12))}%` }}
        >
          <p className="font-semibold text-slate-800">{longLabel(active.key, range.granularity)}</p>
          <p className="mt-1.5 flex items-center justify-between gap-3"><span className="flex items-center gap-1.5 text-slate-600"><i className="size-2 rounded-full bg-blue-600" />Kỳ này</span><span className="font-semibold">{money(active.amount)}</span></p>
          <p className="mt-1 flex items-center justify-between gap-3"><span className="flex items-center gap-1.5 text-slate-600"><i className="size-2 rounded-full bg-slate-400" />{active.previousKey ? longLabel(active.previousKey, range.granularity) : "Kỳ trước"}</span><span>{money(active.previousAmount)}</span></p>
          <p className="mt-1 text-slate-500">{amount(active.orders)} đơn trong kỳ này</p>
        </div>
      ) : null}
    </div>
  );
}

function Donut({ rows }: { rows: RevenueGroup[] }) {
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const slices = rows.length > 5 ? [...rows.slice(0, 4), { label: "Khác", amount: rows.slice(4).reduce((s, r) => s + r.amount, 0), orders: rows.slice(4).reduce((s, r) => s + r.orders, 0) }] : rows;
  const radius = 54, circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="mt-4 flex flex-col items-center gap-5">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 140 140" className="size-full -rotate-90" role="img" aria-label="Tỷ trọng doanh thu theo gói dịch vụ">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="18" />
          {total > 0 && slices.map((slice, i) => {
            const length = (slice.amount / total) * circumference;
            const element = <circle key={slice.label} cx="70" cy="70" r={radius} fill="none" stroke={palette[i % palette.length]} strokeWidth="18" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} />;
            offset += length;
            return element;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] text-slate-500">Tổng</span>
          <span className="text-base font-bold">{compact(total)}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2 text-sm">
        {slices.map((slice, i) => (
          <li key={slice.label} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2"><i className="size-2.5 shrink-0 rounded-full" style={{ background: palette[i % palette.length] }} /><span className="truncate" title={slice.label}>{slice.label}</span></span>
            <span className="shrink-0 text-slate-600"><span className="font-semibold text-slate-900">{percent(slice.amount, total) ?? 0}%</span> · {compact(slice.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Ranked({ rows, label }: { rows: RevenueGroup[]; label?: (value: string) => string }) {
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const max = Math.max(1, ...rows.map((row) => row.amount));
  return (
    <ol className="mt-4 space-y-3">
      {rows.map((row, i) => (
        <li key={row.label || i}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-md bg-slate-100 text-[11px] font-semibold text-slate-600">{i + 1}</span><span className="truncate" title={label ? label(row.label) : row.label}>{(label ? label(row.label) : row.label) || "Không rõ"}</span></span>
            <span className="shrink-0 font-semibold">{money(row.amount)}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(3, (row.amount / max) * 100)}%` }} /></div>
            <span className="w-9 shrink-0 text-right text-xs text-slate-500">{percent(row.amount, total) ?? 0}%</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function SchoolTable({ rows }: { rows: RevenueGroup[] }) {
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return (
    <TableScrollArea className="mt-3" aria-label="Trường đóng góp nhiều nhất">
      <Table>
        <TableHeader>
          <tr>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Trường</TableHead>
            <TableHead className="text-right">Doanh thu</TableHead>
            <TableHead className="text-right">Tỷ trọng</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <tr key={row.label || i}>
              <TableCell>{i + 1}</TableCell>
              <TableCell className="max-w-[160px] truncate" title={row.label}>{row.label || "Không rõ"}</TableCell>
              <TableCell className="whitespace-nowrap text-right font-semibold">{money(row.amount)}</TableCell>
              <TableCell className="text-right text-slate-500">{percent(row.amount, total) ?? 0}%</TableCell>
            </tr>
          ))}
        </TableBody>
      </Table>
    </TableScrollArea>
  );
}

const card = "rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20";

export function RevenuePanel() {
  const [preset, setPreset] = useState<Preset>("12m");
  const [custom, setCustom] = useState(() => presetRange("12m"));
  const [granularity, setGranularity] = useState<RevenueGranularity>("month");
  const [plan, setPlan] = useState("");
  const [kind, setKind] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const range = useMemo(() => (preset === "custom" ? { from: custom.from, to: custom.to } : presetRange(preset)), [preset, custom]);
  useEffect(() => {
    platformApi.plans().then(setPlans, () => setPlans([]));
  }, []);
  const load = useCallback(async () => {
    if (range.from > range.to) {
      setError("Ngày bắt đầu phải trước ngày kết thúc.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setReport(await platformApi.billingRevenue({ from: range.from, to: range.to, granularity, plan, kind }));
    } catch (e) {
      setReport(null);
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }, [range, granularity, plan, kind]);
  useEffect(() => {
    void load();
  }, [load]);

  function choosePreset(next: Preset) {
    setPreset(next);
    if (next !== "custom") setGranularity(presetRange(next).granularity);
  }
  const dirty = plan !== "" || kind !== "" || preset !== "12m";
  const summary = report?.summary;
  const insight = useMemo(() => {
    if (!report || !summary) return "";
    if (summary.total === 0) return "Chưa có doanh thu trong khoảng thời gian và bộ lọc đã chọn.";
    const change = percent(summary.total - summary.previousTotal, summary.previousTotal);
    const lead = report.byPlan[0];
    const trend = change === null ? "" : change === 0 ? ", không đổi so với kỳ trước" : `, ${change > 0 ? "tăng" : "giảm"} ${Math.abs(change)}% so với kỳ trước`;
    const best = [...report.series].sort((a, b) => b.amount - a.amount)[0];
    return `Doanh thu đạt ${money(summary.total)} từ ${amount(summary.orders)} đơn${trend}.${lead && !plan ? ` Gói ${lead.label} đóng góp nhiều nhất (${percent(lead.amount, summary.total)}%).` : ""} ${best ? `${longLabel(best.key, report.range.granularity)} là mốc cao nhất.` : ""}`.trim();
  }, [report, summary, plan]);

  return (
    <section className="space-y-4" aria-busy={busy}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <h2 className="text-lg font-bold">Báo cáo doanh thu</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600" aria-live="polite">{insight || " "}</p>
        </div>
        <button className={secondaryClass} onClick={() => void load()} disabled={busy}>
          <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      <div className={`${card} flex flex-wrap items-center gap-x-4 gap-y-3 !p-3`}>
        <div className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-slate-50 p-0.5" role="group" aria-label="Khoảng thời gian">
          {presets.map((item) => (
            <button key={item.id} type="button" aria-pressed={preset === item.id} onClick={() => choosePreset(item.id)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${preset === item.id ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{item.label}</button>
          ))}
        </div>
        {preset === "custom" && (
          <DateRangePicker
            ariaLabel="Khoảng ngày"
            from={custom.from}
            to={custom.to}
                        onChange={(range) => range.from && range.to && setCustom((c) => ({ ...c, from: range.from, to: range.to }))}
            className="w-[280px]"
          />
        )}
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5" role="group" aria-label="Nhóm theo">
          {(["day", "month"] as const).map((value) => (
            <button key={value} type="button" aria-pressed={granularity === value} onClick={() => setGranularity(value)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${granularity === value ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{value === "day" ? "Theo ngày" : "Theo tháng"}</button>
          ))}
        </div>
        <CustomSelect
          ariaLabel="Lọc theo gói"
          className="w-44"
          value={plan}
          onValueChange={setPlan}
          options={[{ value: "", label: "Tất cả gói" }, ...plans.map((item) => ({ value: item.code, label: item.name }))]}
        />
        <CustomSelect
          ariaLabel="Lọc theo loại đơn"
          className="w-44"
          value={kind}
          onValueChange={setKind}
          options={[{ value: "", label: "Mọi loại đơn" }, ...Object.entries(kindLabel).map(([value, text]) => ({ value, label: text }))]}
        />
        {dirty && <button type="button" className="text-sm font-semibold text-blue-700 hover:underline" onClick={() => { choosePreset("12m"); setPlan(""); setKind(""); }}>Đặt lại</button>}
      </div>

      {error && <Notice>{error}</Notice>}
      {!report && !error ? (
        <div role="status" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <span className="sr-only">Đang tải báo cáo doanh thu…</span>
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : null}

      {report && summary ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <div className={card}>
              <p className="text-xs font-medium text-slate-500">Doanh thu</p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{money(summary.total)}</p>
              <div className="mt-1"><Delta current={summary.total} previous={summary.previousTotal} /></div>
              <div className="mt-2"><Sparkline values={report.series.map((p) => p.amount)} /></div>
            </div>
            <div className={card}>
              <p className="text-xs font-medium text-slate-500">Số đơn đã thanh toán</p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{amount(summary.orders)}</p>
              <div className="mt-1"><Delta current={summary.orders} previous={summary.previousOrders} /></div>
            </div>
            <div className={card}>
              <p className="text-xs font-medium text-slate-500">Giá trị đơn trung bình</p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{money(summary.orders ? Math.round(summary.total / summary.orders) : 0)}</p>
              <p className="mt-1 text-xs text-slate-500">Kỳ trước: {money(summary.previousOrders ? Math.round(summary.previousTotal / summary.previousOrders) : 0)}</p>
            </div>
            <div className={card}>
              <p className="text-xs font-medium text-slate-500">Đơn đang chờ thanh toán</p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{amount(summary.pendingOrders)}</p>
              <p className="mt-1 text-xs text-slate-500">Chưa tính vào doanh thu</p>
            </div>
          </div>

          <section className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Xu hướng doanh thu</h3>
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1.5"><i className="h-0.5 w-5 rounded bg-blue-600" />Kỳ này</span>
                <span className="flex items-center gap-1.5"><i className="h-0 w-5 border-t-2 border-dashed border-slate-400" />Kỳ trước</span>
              </div>
            </div>
            {summary.total === 0 && summary.previousTotal === 0 ? (
              <EmptyState title="Chưa có doanh thu" description="Thử mở rộng khoảng thời gian hoặc bỏ bớt bộ lọc." />
            ) : (
              <div className="mt-3"><TrendChart report={report} /></div>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className={card}>
              <h3 className="text-sm font-semibold">Tỷ trọng theo gói</h3>
              {report.byPlan.length ? <Donut rows={report.byPlan} /> : <p className="mt-4 text-sm text-slate-500">Chưa có dữ liệu.</p>}
            </section>
            <section className={card}>
              <h3 className="text-sm font-semibold">Theo loại đơn</h3>
              {report.byKind.length ? <Ranked rows={report.byKind} label={(value) => kindLabel[value] ?? value} /> : <p className="mt-4 text-sm text-slate-500">Chưa có dữ liệu.</p>}
            </section>
            <section className={card}>
              <h3 className="text-sm font-semibold">Trường đóng góp nhiều nhất</h3>
              {report.topSchools.length ? <SchoolTable rows={report.topSchools} /> : <p className="mt-4 text-sm text-slate-500">Chưa có dữ liệu.</p>}
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
