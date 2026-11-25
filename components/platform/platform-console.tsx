"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Building2,
  UsersRound,
  Layers3,
  ListChecks,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
  ArrowUpRight,
  Settings2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Globe,
  LayoutDashboard,
  ArrowRight,
  LoaderCircle,
  Check,
  LockKeyhole,
  CircleHelp,
  TrendingUp,
} from "lucide-react";
import {
  platformApi,
  onPlatformSessionExpired,
  PlatformError,
  type Operator,
  type Overview,
  type Plan,
  type Tenant,
  type TenantSort,
  type TenantSortKey,
} from "@/lib/platform-api";
import { tenantPage } from "@/lib/console-rules";
import { DebouncedSearchInput } from "@/components/ui/debounced-search-input";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import { TenantPanel } from "./tenant-panel";
import { DomainSettingsPanel } from "./domain-settings-panel";
import { AdminAccountsPanel } from "./admin-accounts-panel";
import { BillingOrdersPanel } from "./billing-orders-panel";
import { RevenuePanel } from "./revenue-panel";
import { OverviewPanel } from "./overview-panel";
import { CustomSelect } from "@/components/ui/custom-select";
import { Table, TableBody, TableCell, TableHead, TableHeader } from "@/components/ui/data-table";
import { TableScrollArea } from "@/components/ui/table-scroll-area";
import { previewTenantDomains } from "@/lib/tenant-domains";
import {
  Badge,
  EmptyState,
  DiscardChangesDialog,
  PasswordField,
  SuccessNotice,
  Field,
  Modal,
  Notice,
  amount,
  dateText,
  dateOnlyText,
  errorText,
  inputClass,
  primaryClass,
  secondaryClass, PanelLoading } from "./console-ui";

function AccountMenu({
  operator,
  onLogout,
  disabled,
}: {
  operator: Operator;
  onLogout: () => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setOpen(false);
      } else if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative ml-auto shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-3 rounded-xl p-1.5 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-blue-700 to-blue-500 text-sm font-bold uppercase text-white shadow-md shadow-blue-500/20">
          {operator.accountName.slice(0, 2)}
        </span>
        <span className="hidden md:block">
          <span className="block max-w-44 truncate text-sm font-bold text-slate-900" title={operator.accountName}>
            {operator.accountName}
          </span>
          <span className="block text-xs font-medium text-blue-600">Quản trị viên nền tảng</span>
        </span>
        <ChevronDown className={`hidden size-4 text-slate-400 transition-transform md:block ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/15"
        >
          <button
            type="button"
            role="menuitem"
            disabled={disabled}
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
          >
            <LogOut className="size-4" /> Đăng xuất
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Login({
  onLogin,
  initialError,
}: {
  onLogin: (operator: Operator) => void;
  initialError: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      onLogin(
        await platformApi.login(
          String(data.get("account")),
          String(data.get("password")),
        ),
      );
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[#102b66] p-12 text-white lg:flex lg:flex-col xl:p-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 top-24 h-[600px] w-[600px] rounded-full border border-white/10 shadow-[0_0_0_80px_#ffffff04,0_0_0_160px_#ffffff03]"
        />
        <div className="relative flex items-center gap-3">
          <span className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/20">
            <ShieldCheck size={25} />
          </span>
          <span className="text-2xl font-bold tracking-tight">
            EStude
            <span className="ml-3 text-xs font-medium uppercase tracking-[0.2em] text-blue-200">
              Platform
            </span>
          </span>
        </div>
        <div className="relative my-auto max-w-lg py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-blue-300/10 px-3 py-1.5 text-xs text-blue-100">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-300" />
            Không gian quản trị SaaS
          </span>
          <h2 className="mt-7 text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            Một nền tảng.
            <br />
            <span className="text-blue-300">Kết nối mọi trường học.</span>
          </h2>
          <p className="mt-6 max-w-sm text-base leading-7 text-blue-100/75">
            Quản lý trường học, gói dịch vụ và vận hành hệ thống từ một không
            gian thống nhất.
          </p>
          <div className="mt-10 space-y-5">
            {[
              "Không gian dữ liệu riêng cho từng trường",
              "Quản lý dịch vụ và hạn mức sử dụng",
              "Theo dõi tác vụ và lịch sử quản trị",
            ].map((text) => (
              <div
                key={text}
                className="flex items-center gap-3 text-sm text-blue-50"
              >
                <span className="rounded-full bg-blue-400/15 p-1 text-blue-200">
                  <Check size={14} />
                </span>
                {text}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-blue-200/60">
          EStude · Nền tảng quản lý học tập
        </p>
      </section>
      <section className="flex min-w-0 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2.5 font-bold text-blue-700 lg:hidden">
            <ShieldCheck size={26} />
            <span className="text-xl">EStude Platform</span>
          </div>
          <div className="mb-6 inline-flex rounded-2xl border border-blue-100 bg-blue-50 p-3 text-blue-600">
            <LockKeyhole size={24} />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            Chào mừng trở lại
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Quản trị hệ thống
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Đăng nhập tài khoản SaaS để quản lý và vận hành các trường học trên
            EStude.
          </p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <Field label="Tài khoản SaaS">
              <input
                name="account"
                autoComplete="username"
                required
                maxLength={50}
                className={inputClass}
                placeholder="Nhập tên tài khoản"
                autoFocus
                disabled={busy}
              />
            </Field>
            <PasswordField
              label="Mật khẩu"
              name="password"
              autoComplete="current-password"
              required
              maxLength={128}
              placeholder="Nhập mật khẩu"
              disabled={busy}
            />
            {(error || initialError) && (
              <Notice>{error || initialError}</Notice>
            )}
            <button
              disabled={busy}
              className={`${primaryClass} w-full py-3`}
              type="submit"
            >
              {busy ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : null}
              {busy ? "Đang đăng nhập…" : "Đăng nhập"}
              {!busy && <ArrowRight size={17} />}
            </button>
          </form>
          <div className="mt-8 flex items-start gap-2 border-t border-slate-100 pt-6 text-xs leading-5 text-slate-400">
            <CircleHelp size={16} className="mt-0.5 shrink-0" />
            <p>
              Dành cho quản trị viên nền tảng. Giáo viên, học sinh và quản trị
              trường đăng nhập tại cổng riêng của trường.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function NewTenant({ done, close }: { done: () => void; close: () => void }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [account, setAccount] = useState("admin");
  const [password, setPassword] = useState("");
  const [baseDomain, setBaseDomain] = useState("");
  const [initialDomain, setInitialDomain] = useState("");
  const [domainReady, setDomainReady] = useState(false);
  const dirty =
    name !== "" ||
    slug !== "" ||
    account !== "admin" ||
    password !== "" ||
    baseDomain !== initialDomain;
  useUnsavedChanges(dirty || busy);
  const loadDomain = useCallback(async () => {
    setError("");
    setDomainReady(false);
    try {
      const settings = await platformApi.domainSettings();
      setBaseDomain(settings.baseDomain);
      setInitialDomain(settings.baseDomain);
      setDomainReady(true);
    } catch (e) {
      setError(errorText(e));
    }
  }, []);
  useEffect(() => {
    void loadDomain();
  }, [loadDomain]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget,
      data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await platformApi.createTenant({
        name: String(data.get("name")),
        slug: String(data.get("slug")),
        baseDomain,
        adminAccount: String(data.get("account")),
        adminPassword: String(data.get("password")),
      });
      form.reset();
      done();
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Tạo trường"
      close={close}
      confirmDiscard={dirty}
      closeDisabled={busy}
    >
      {(requestClose) => (
        <>
          <p className="text-sm leading-6 text-slate-500">
            Hệ thống sẽ tạo không gian dữ liệu riêng và tài khoản admin cho
            trường. Trường mới bắt đầu với gói Starter dùng thử 30 ngày.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Tên trường">
              <input
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
                required
                minLength={2}
                maxLength={150}
                className={inputClass}
                placeholder="Trường THPT…"
                autoFocus
              />
            </Field>
            <Field label="Subdomain của trường">
              <input
                name="slug"
                required
                pattern={"[a-z][a-z0-9\\-]{1,48}[a-z0-9]"}
                minLength={3}
                maxLength={50}
                className={inputClass}
                placeholder="demo-school"
                value={slug}
                disabled={busy}
                onChange={(e) => setSlug(e.target.value)}
              />
            </Field>
            <p className="text-xs text-slate-500">
              3–50 ký tự thường, số hoặc dấu gạch ngang; bắt đầu bằng chữ, kết
              thúc bằng chữ hoặc số. Mã này xuất hiện trong địa chỉ của trường.
            </p>
            <Field label="Tên miền gốc">
              <input
                name="baseDomain"
                value={baseDomain}
                onChange={(e) => setBaseDomain(e.target.value)}
                required
                maxLength={253}
                placeholder="estude.vn"
                disabled={busy || !domainReady}
                autoCapitalize="none"
                spellCheck={false}
                className={inputClass}
              />
            </Field>
            {!domainReady && (
              <button
                type="button"
                onClick={() => void loadDomain()}
                className={secondaryClass}
              >
                Tải lại tên miền mặc định
              </button>
            )}
            <div className="rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-600">
              <p className="font-medium">Địa chỉ các portal sẽ được đăng ký</p>
              {previewTenantDomains(slug, baseDomain).map((domain) => (
                <p key={domain.id} className="break-all">
                  {domain.hostname}
                </p>
              ))}
              <p>
                DNS và HTTPS được tự thiết lập nếu máy chủ đã bật kết nối Cloudflare và Vercel.
              </p>
            </div>
            <Field label="Tài khoản admin của trường">
              <input
                name="account"
                required
                pattern={"[a-zA-Z0-9._\\-]{3,50}"}
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                disabled={busy}
                autoComplete="off"
                className={inputClass}
              />
            </Field>
            <PasswordField
              label="Mật khẩu admin của trường"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
            <p className="text-xs text-slate-500">
              8–128 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt; không
              chứa khoảng trắng. Lưu mật khẩu trước khi tạo.
            </p>
            {error && <Notice>{error}</Notice>}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                className={secondaryClass}
                onClick={requestClose}
                disabled={busy}
              >
                Hủy
              </button>
              <button
                type="submit"
                className={primaryClass}
                disabled={busy || !domainReady}
              >
                {busy ? "Đang gửi…" : "Tạo trường"}
              </button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}

function NewPlan({ done, close, plan }: { done: () => void; close: () => void; plan?: Plan }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [publicSale, setPublicSale] = useState(plan?.publicSale ?? true);
  useUnsavedChanges(dirty || busy);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const gib = Number(data.get("storage")),
        tokens = Number(data.get("tokens")),
        emails = Number(data.get("emails"));
      if (
        ![gib, tokens, emails].every((n) => Number.isSafeInteger(n) && n >= 0)
      )
        throw new Error("Hạn mức phải là số nguyên không âm.");
      const prices: Partial<Record<"MONTH" | "YEAR", number>> = {};
      for (const cycle of ["MONTH", "YEAR"] as const) {
        const raw = String(data.get(cycle) ?? "").trim();
        if (!raw) continue;
        const price = Number(raw);
        if (!Number.isSafeInteger(price) || price < 2000 || price > 1000000000)
          throw new Error("Giá phải là số nguyên từ 2.000 đến 1.000.000.000 đồng.");
        prices[cycle] = price;
      }
      const sale = {
        name: String(data.get("name")),
        description: String(data.get("description") ?? ""),
        tier: Number(data.get("tier") ?? 1),
        sortOrder: Number(data.get("sortOrder") ?? 0),
        publicSale: data.get("publicSale") === "on",
        prices,
      };
      if (sale.publicSale && (!Object.keys(prices).length || sale.tier < 1))
        throw new Error("Gói mở bán cần ít nhất một giá tháng/năm và cấp bậc từ 1 trở lên.");
      if (plan) await platformApi.updatePlanSale(plan.id, {
        ...sale, active: data.get("active") === "on", expectedRevision: plan.revision,
      });
      else await platformApi.createPlan({
        ...sale,
        code: String(data.get("code")),
        limits: {
          storage_bytes: gib * 1024 ** 3,
          ai_tokens: tokens,
          email_messages: emails,
        },
        features: { ai: data.get("ai") === "on" },
      });
      done();
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={plan ? "Chỉnh sửa gói & giá bán" : "Tạo gói dịch vụ"}
      close={close}
      confirmDiscard={dirty}
      closeDisabled={busy}
    >
      {(requestClose) => (
        <form
          onSubmit={submit}
          onChange={() => setDirty(true)}
          className="space-y-4"
        >
          <fieldset disabled={busy} className="min-w-0 space-y-4">
            <Field label="Tên gói">
              <input
                name="name"
                required
                minLength={2}
                maxLength={120}
                defaultValue={plan?.name}
                className={inputClass}
              />
            </Field>
            <Field label="Mã gói">
              <input
                name="code"
                required
                pattern="[a-z][a-z0-9_]{1,63}"
                placeholder="school_pro"
                defaultValue={plan?.code}
                disabled={!!plan}
                className={inputClass}
              />
            </Field>
            <Field label="Mô tả hiển thị trên bảng giá">
              <textarea name="description" maxLength={500} rows={3} defaultValue={plan?.description} className={inputClass} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Giá tháng (VND)">
                <input name="MONTH" type="number" min={2000} max={1000000000} step={1} defaultValue={plan?.prices?.MONTH} placeholder="299000" className={inputClass} />
              </Field>
              <Field label="Giá năm (VND)">
                <input name="YEAR" type="number" min={2000} max={1000000000} step={1} defaultValue={plan?.prices?.YEAR} placeholder="2990000" className={inputClass} />
              </Field>
            </div>
            <p className="text-xs text-slate-500">Để trống một giá nếu không bán theo chu kỳ đó. Giá đã bao gồm thuế.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cấp bậc gói">
                <input name="tier" type="number" required min={publicSale ? 1 : 0} max={100} step={1} defaultValue={plan?.tier ?? 1} className={inputClass} />
              </Field>
              <Field label="Thứ tự hiển thị">
                <input name="sortOrder" type="number" required min={0} max={10000} step={1} defaultValue={plan?.sortOrder ?? 0} className={inputClass} />
              </Field>
            </div>
            <p className="text-xs text-slate-500">Cấp bậc lớn hơn là gói nâng cấp. Thứ tự nhỏ hơn được hiển thị trước.</p>
            <label className="flex items-center gap-2 text-sm">
              <input name="publicSale" type="checkbox" checked={publicSale} disabled={plan?.code === "starter"} onChange={(e) => setPublicSale(e.target.checked)} />
              Hiển thị trên bảng giá và cho phép mua
            </label>
            {plan && <label className="flex items-center gap-2 text-sm">
              <input name="active" type="checkbox" defaultChecked={plan.active} /> Gói đang hoạt động
            </label>}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Dung lượng (GiB)">
                <input
                  type="number"
                  name="storage"
                  min={0}
                  max={931}
                  step={1}
                  required
                  defaultValue={plan ? (plan.limits?.storage_bytes ?? 0) / 1024 ** 3 : 5}
                  disabled={!!plan}
                  className={inputClass}
                />
              </Field>
              <Field label="AI tokens / tháng">
                <input
                  type="number"
                  name="tokens"
                  min={0}
                  max={1000000000000}
                  step={1}
                  required
                  defaultValue={plan ? plan.limits?.ai_tokens ?? 0 : 100000}
                  disabled={!!plan}
                  className={inputClass}
                />
              </Field>
              <Field label="Email / tháng">
                <input
                  type="number"
                  name="emails"
                  min={0}
                  max={1000000000000}
                  step={1}
                  required
                  defaultValue={plan ? plan.limits?.email_messages ?? 0 : 1000}
                  disabled={!!plan}
                  className={inputClass}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="ai" defaultChecked={plan ? plan.features?.ai : true} disabled={!!plan} /> Cho phép tính
              năng AI
            </label>
            <p className="text-xs leading-5 text-slate-500">
              {plan ? "Giá mới áp dụng cho đơn tạo sau khi lưu. Đơn đã tạo giữ nguyên số tiền. Hạn mức được giữ để bảo toàn quyền lợi các trường đang dùng gói." : "Gói được mở bán sẽ xuất hiện trên trang quảng cáo để khách chọn mua và thanh toán qua PayOS."}
            </p>
            {error && <Notice>{error}</Notice>}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={requestClose}
                className={secondaryClass}
                disabled={busy}
              >
                Hủy
              </button>
              <button type="submit" disabled={busy} className={primaryClass}>
                {busy ? "Đang lưu…" : plan ? "Lưu thay đổi" : "Tạo gói"}
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </Modal>
  );
}

const tabs = [
  { id: "overview", name: "Tổng quan", icon: LayoutDashboard },
  { id: "tenants", name: "Trường học", icon: Building2 },
  { id: "admins", name: "Quản trị trường", icon: UsersRound },
  { id: "domains", name: "Tên miền", icon: Globe },
  { id: "plans", name: "Gói dịch vụ", icon: Layers3 },
  { id: "orders", name: "Đơn thanh toán", icon: ListChecks },
  { id: "revenue", name: "Báo cáo doanh thu", icon: TrendingUp },
] as const;
type Tab = (typeof tabs)[number]["id"];
const expiredSessionMessage =
  "Phiên quản trị đã hết hạn hoặc không còn hiệu lực. Vui lòng đăng nhập lại.";

function SortableTh({
  label,
  sortKey,
  sort,
  onSort,
  className = "",
}: {
  className?: string;
  label: string;
  sortKey: TenantSortKey;
  sort: TenantSort;
  onSort: (key: TenantSortKey) => void;
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.order === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={className}
      aria-sort={active ? (sort.order === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1.5 rounded font-medium hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${active ? "text-blue-700" : ""}`}
      >
        {label}
        <Icon size={13} aria-hidden="true" />
      </button>
    </TableHead>
  );
}

const portalLabels: Record<string, string> = {
  admin: "Quản trị",
  teacher: "Giảng viên",
  student: "Học sinh",
  parent: "Phụ huynh",
};

// The list sits in a horizontally scrolling wrapper, which would clip an absolutely
// positioned popup, so the tooltip is fixed to the viewport at the hovered cell.
function DomainCell({ tenant }: { tenant: Tenant }) {
  const [position, setPosition] = useState<{ x: number; y: number; above: boolean } | null>(null);
  const domains = tenant.domains ?? [];
  const extra = (tenant.domainCount ?? 0) - 1;
  function show(element: HTMLElement) {
    const box = element.getBoundingClientRect();
    const width = 352;
    const above = box.bottom + 200 > window.innerHeight;
    setPosition({
      x: Math.max(8, Math.min(box.left, window.innerWidth - width - 12)),
      y: above ? box.top - 6 : box.bottom + 6,
      above,
    });
  }
  return (
    <div
      tabIndex={0}
      className="inline-block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      aria-label={domains.length ? `Tên miền: ${domains.map((item) => item.hostname).join(", ")}` : undefined}
      onMouseEnter={(event) => show(event.currentTarget)}
      onMouseLeave={() => setPosition(null)}
      onFocus={(event) => show(event.currentTarget)}
      onBlur={() => setPosition(null)}
    >
      <span className="font-mono">{tenant.adminHost}</span>
      {extra > 0 ? <span className="ml-1 text-slate-500">+{extra}</span> : null}
      {position && domains.length > 0 ? (
        <div
          role="tooltip"
          style={{ left: position.x, top: position.y, transform: position.above ? "translateY(-100%)" : undefined }}
          className="pointer-events-none fixed z-50 w-[22rem] rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg shadow-slate-900/10"
        >
          <p className="mb-2 font-semibold text-slate-800">{domains.length} tên miền</p>
          <ul className="space-y-1.5">
            {domains.map((item) => (
              <li key={item.hostname} className="flex items-center justify-between gap-4">
                <span className="text-slate-500">{portalLabels[item.portal] ?? item.portal}</span>
                <span className="font-mono text-slate-800">{item.hostname}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

const manageClass =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";

export function PlatformConsole() {
  const [operator, setOperator] = useState<Operator | null>(null),
    [initializing, setInitializing] = useState(true);
  const [tab, setTab] = useState<Tab>("overview"),
    [overview, setOverview] = useState<Overview | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]),
    [total, setTotal] = useState(0),
    [plans, setPlans] = useState<Plan[]>([]);
  const [draft, setDraft] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(0),
    [sort, setSort] = useState<TenantSort>({ key: "createdAt", order: "desc" });
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [directoryError, setDirectoryError] = useState("");
  const [plansError, setPlansError] = useState("");
  const [domainDirty, setDomainDirty] = useState(false);
  const [domainBusy, setDomainBusy] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<
    Tab | "logout" | null
  >(null);
  function changeTab(next: Tab) {
    if (next === tab || domainBusy) return;
    if (domainDirty) setPendingNavigation(next);
    else setTab(next);
  }
  const loadSequence = useRef(0);
  const [modal, setModal] = useState<"tenant" | "plan" | null>(null),
    [selected, setSelected] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const clearSession = useCallback((message = "") => {
    ++loadSequence.current;
    setOperator(null);
    setDomainDirty(false);
    setDomainBusy(false);
    setDirectoryError("");
    setPlansError("");
    setPendingNavigation(null);
    setSelected(null);
    setModal(null);
    setEditingPlan(null);
    setOverview(null);
    setTenants([]);
    setTotal(0);
    setPlans([]);
    setNotice("");
    setError(message);
    setBusy(false);
    setTab("overview");
    setDraft("");
    setQuery("");
    setStatus("");
    setPage(0);
  }, []);
  useEffect(() => {
    if (!operator) return;
    return onPlatformSessionExpired(() => clearSession(expiredSessionMessage));
  }, [operator, clearSession]);
  useEffect(() => {
    let live = true;
    platformApi
      .me()
      .then((op) => {
        if (live) setOperator(op);
      })
      .catch((error) => {
        if (live && (!(error instanceof PlatformError) || error.status !== 401))
          setError(errorText(error));
      })
      .finally(() => {
        if (live) setInitializing(false);
      });
    return () => {
      live = false;
    };
  }, []);
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setBusy(true);
    try {
      const [summary, directory, packages] = await Promise.allSettled([
        platformApi.overview(),
        platformApi.tenants(query, status, page, sort),
        platformApi.plans(),
      ]);
      if (sequence !== loadSequence.current) return;
      const failures = [summary, directory, packages].filter(
        (result) => result.status === "rejected",
      );
      if (
        failures.some(
          (result) =>
            result.reason instanceof PlatformError &&
            result.reason.status === 401,
        )
      ) {
        clearSession(expiredSessionMessage);
        return;
      }
      if (summary.status === "fulfilled") setOverview(summary.value);
      if (packages.status === "fulfilled") {
        setPlans(packages.value);
        setPlansError("");
      } else setPlansError(errorText(packages.reason));
      if (directory.status === "fulfilled") {
        setDirectoryError("");
        const validPage = tenantPage(directory.value.total, page);
        if (validPage !== page) {
          setPage(validPage);
          return;
        }
        setTenants(directory.value.data);
        setTotal(directory.value.total);
      } else {
        // Do not label the previous search's rows as results of the new filter.
        setTenants([]);
        setTotal(0);
        setDirectoryError(errorText(directory.reason));
      }
      setError(failures.map((result) => errorText(result.reason)).join(" "));
    } catch (error) {
      if (sequence !== loadSequence.current) return;
      if (error instanceof PlatformError && error.status === 401) {
        clearSession(expiredSessionMessage);
        return;
      }
      setError(errorText(error));
    } finally {
      if (sequence === loadSequence.current) setBusy(false);
    }
  }, [query, status, page, sort, clearSession]);
  useEffect(() => {
    if (operator) void load();
  }, [operator, load]);
  useEffect(() => {
    if (!operator || !overview?.pending) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      await load();
      if (!stopped) timer = setTimeout(poll, 5000);
    };
    timer = setTimeout(poll, 5000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [operator, overview?.pending, load]);
  function changeSort(key: TenantSortKey) {
    setSort((current) =>
      current.key === key
        ? { key, order: current.order === "asc" ? "desc" : "asc" }
        : { key, order: key === "createdAt" ? "desc" : "asc" },
    );
    setPage(0);
  }
  function logout() {
    if (domainBusy) return;
    if (domainDirty) setPendingNavigation("logout");
    else void executeLogout();
  }
  async function executeLogout() {
    setBusy(true);
    try {
      await platformApi.logout();
      clearSession();
    } catch (error) {
      if (error instanceof PlatformError && error.status === 401) {
        clearSession(expiredSessionMessage);
      } else {
        setError(errorText(error));
      }
    } finally {
      setBusy(false);
    }
  }
  if (initializing)
    return (
      <main
        className="flex min-h-screen flex-col items-center justify-center gap-4 text-sm text-slate-500"
        role="status"
      >
        <span className="rounded-2xl bg-blue-50 p-4 text-blue-600">
          <ShieldCheck size={28} />
        </span>
        <span className="inline-flex items-center gap-2">
          <LoaderCircle size={16} className="animate-spin" />
          Đang kiểm tra phiên quản trị…
        </span>
      </main>
    );
  if (!operator)
    return (
      <Login
        initialError={error}
        onLogin={(op) => {
          setOperator(op);
          setError("");
        }}
      />
    );
  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <a
        href="#console-content"
        className="sr-only z-50 rounded-lg bg-blue-600 p-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Đến nội dung chính
      </a>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200/80 bg-white px-4 py-7 lg:flex">
        <div className="flex items-center gap-3 px-3">
          <div className="rounded-xl bg-blue-600 p-2.5 text-white shadow-md shadow-blue-600/20">
            <ShieldCheck size={24} />
          </div>
          <div className="text-xl font-bold tracking-tight">
            EStude
            <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              SaaS Console
            </span>
          </div>
        </div>
        <nav className="mt-8 space-y-1.5" aria-label="Điều hướng quản trị">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => changeTab(item.id)}
              disabled={domainBusy}
              aria-pressed={tab === item.id}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${tab === item.id ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              <item.icon size={18} />
              {item.name}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-8">
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
            onClick={logout}
            disabled={busy}
          >
            <LogOut size={17} />
            Đăng xuất
          </button>
        </div>
      </aside>
      <div className="min-w-0 lg:ml-64">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-8">
          <h1 className="truncate text-base font-bold tracking-tight text-blue-700 sm:text-lg">
            {tabs.find((item) => item.id === tab)?.name}
          </h1>
          <AccountMenu operator={operator} onLogout={logout} disabled={busy} />
        </header>
        <main
          id="console-content"
          className="flex w-full min-w-0 flex-col gap-3 p-3 sm:gap-4 sm:p-4"
        >
          <nav
            className="-mx-3 flex gap-1 overflow-x-auto border-y border-slate-200/70 bg-white px-3 py-2 sm:-mx-4 sm:px-4 lg:hidden"
            aria-label="Điều hướng mobile"
          >
            {tabs.map((item) => (
              <button
                key={item.id}
                onClick={() => changeTab(item.id)}
                disabled={domainBusy}
                aria-pressed={tab === item.id}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-medium ${tab === item.id ? "bg-blue-50 text-blue-700" : "text-slate-500"}`}
              >
                <item.icon size={15} />
                {item.name}
              </button>
            ))}
            <button
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
              onClick={logout}
              disabled={busy}
            >
              <LogOut size={15} />
              Đăng xuất
            </button>
          </nav>
          {error && <Notice>{error}</Notice>}
          {notice && (
            <SuccessNotice dismiss={() => setNotice("")}>
              {notice}
            </SuccessNotice>
          )}
          {tab === "overview" && <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {[
              {
                label: "Tổng trường học",
                hint:
                  overview?.newThisMonth !== undefined
                    ? `${amount(overview.newThisMonth)} trường mới trong tháng`
                    : undefined,
                value: overview?.total,
                icon: Building2,
                color: "text-slate-600 bg-slate-100",
              },
              {
                label: "Đang hoạt động",
                hint: overview?.expiringSoon
                  ? `${amount(overview.expiringSoon)} gói sắp hết hạn (14 ngày)`
                  : undefined,
                value: overview?.active,
                icon: ShieldCheck,
                color: "text-emerald-600 bg-emerald-50",
              },
              {
                label: "Đang tạm khóa",
                value: overview?.suspended,
                icon: Layers3,
                color: "text-rose-600 bg-rose-50",
              },
              {
                label: "Chờ tạo trường",
                value: overview?.pending,
                icon: ListChecks,
                color: "text-slate-600 bg-slate-100",
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="flex min-w-0 items-start justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30"
              >
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-3 text-3xl font-bold tracking-tight">
                    {metric.value === undefined ? "—" : amount(metric.value)}
                  </p>
                  {metric.hint ? (
                    <p className="mt-1 text-xs text-slate-500">{metric.hint}</p>
                  ) : null}
                </div>
                <div className={`rounded-xl p-2.5 ${metric.color}`}>
                  <metric.icon size={21} />
                </div>
              </div>
            ))}
          </div>}
          {tab === "overview" && <OverviewPanel overview={overview} onNavigate={changeTab} onManage={setSelected} />}
          {tab === "domains" && (
            <DomainSettingsPanel
              onSaved={() => void load()}
              onDirtyChange={setDomainDirty}
              onBusyChange={setDomainBusy}
            />
          )}
          {tab === "tenants" && (
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/20">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-3">
                <h2 className="font-bold">
                  Danh sách trường{" "}
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                    {total}
                  </span>
                </h2>
                <div className="flex w-full flex-wrap gap-2 md:w-auto">
                  <div className="w-full min-w-0 sm:w-72">
                    <DebouncedSearchInput
                      aria-label="Tìm trường"
                      value={draft}
                      onValueChange={setDraft}
                      onSearch={(value) => {
                        setQuery(value);
                        setPage(0);
                      }}
                      maxLength={150}
                      placeholder="Tên hoặc mã trường…"
                    />
                  </div>
                  <CustomSelect
                    ariaLabel="Lọc trạng thái"
                    className="w-48"
                    value={status}
                    onValueChange={(value) => {
                      setStatus(value);
                      setPage(0);
                    }}
                    options={[
                      { value: "", label: "Tất cả trạng thái" },
                      { value: "ACTIVE", label: "Hoạt động" },
                      { value: "SUSPENDED", label: "Tạm khóa" },
                    ]}
                  />
                  {(query || status) && (
                    <button
                      type="button"
                      className={secondaryClass}
                      onClick={() => {
                        setDraft("");
                        setQuery("");
                        setStatus("");
                        setPage(0);
                      }}
                    >
                      <X size={14} />
                      Xóa bộ lọc
                    </button>
                  )}
                  <button
                    type="button"
                    className={primaryClass}
                    onClick={() => setModal("tenant")}
                  >
                    <Plus size={17} />
                    Tạo trường
                  </button>
                </div>
              </div>
              <div aria-busy={busy}>
                <div className="divide-y divide-slate-100 sm:hidden">
                  {tenants.map((tenant) => (
                    <article key={tenant.id} className="space-y-3 p-4">
                      <div className="flex items-start gap-3">
                        <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                          <Building2 size={19} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="break-words text-sm font-semibold leading-6">
                            {tenant.name}
                          </h3>
                          <p className="mt-1 break-all font-mono text-xs text-slate-500">
                            {tenant.slug}
                          </p>
                        </div>
                      </div>
                      {tenant.planName ? (
                        <p className="text-xs text-slate-600">
                          Gói <span className="font-semibold">{tenant.planName}</span>
                          {tenant.periodEnd ? ` · đến ${dateOnlyText(tenant.periodEnd)}` : ""}
                        </p>
                      ) : null}
                      {tenant.adminHost ? (
                        <p className="break-all font-mono text-xs text-slate-500">{tenant.adminHost}</p>
                      ) : null}
                      <div className="flex items-center justify-between gap-3">
                        <Badge status={tenant.status} />
                        <button
                          onClick={() => setSelected(tenant.id)}
                          className={manageClass}
                          aria-label={`Quản lý ${tenant.name}`}
                        >
                          <Settings2 size={14} />
                          Quản lý
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Ngày tạo: {dateText(tenant.createdAt)}
                      </p>
                    </article>
                  ))}
                </div>
                <TableScrollArea className="table-scroll hidden sm:block" aria-label="Danh sách trường học">
                  <Table className="min-w-[1500px]">
                    <TableHeader className="normal-case tracking-normal">
                      <tr>
                        <SortableTh label="Trường học" sortKey="name" sort={sort} onSort={changeSort} className="min-w-[300px]" />
                        <TableHead>Mã trường</TableHead>
                        <SortableTh label="Gói dịch vụ" sortKey="plan" sort={sort} onSort={changeSort} />
                        <TableHead>Trạng thái gói</TableHead>
                        <TableHead>Hạn dùng</TableHead>
                        <TableHead>Tên miền</TableHead>
                        <SortableTh label="Trạng thái" sortKey="status" sort={sort} onSort={changeSort} />
                        <SortableTh label="Ngày tạo" sortKey="createdAt" sort={sort} onSort={changeSort} />
                        <TableHead>Thao tác</TableHead>
                      </tr>
                    </TableHeader>
                    <TableBody>
                      {tenants.map((tenant) => (
                        <tr key={tenant.id} className="hover:bg-slate-50/60">
                          <TableCell className="min-w-[300px] px-4 py-3 font-semibold">
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <Building2 size={19} />
                              </span>
                              <span>{tenant.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-4 py-3 text-slate-500">
                            <span className="rounded-md bg-slate-50 px-2 py-1 font-mono text-xs">
                              {tenant.slug}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                            {tenant.planName || <span className="font-normal text-slate-500">—</span>}
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-4 py-3">
                            {tenant.subscriptionStatus ? (
                              <Badge status={tenant.subscriptionStatus} />
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                            {tenant.periodEnd ? dateOnlyText(tenant.periodEnd) : "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                            {tenant.adminHost ? (
                              <DomainCell tenant={tenant} />
                            ) : (
                              <span className="text-slate-500">Chưa cấu hình</span>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <Badge status={tenant.status} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                            {dateText(tenant.createdAt)}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <button
                              onClick={() => setSelected(tenant.id)}
                              className={manageClass}
                              aria-label={`Quản lý ${tenant.name}`}
                            >
                              <Settings2 size={14} />
                              Quản lý
                            </button>
                          </TableCell>
                        </tr>
                      ))}
                    </TableBody>
                  </Table>
                </TableScrollArea>
                {!tenants.length &&
                  (busy ? (
                    <PanelLoading label="Đang tải danh sách trường…" />
                  ) : (
                    <EmptyState
                      title={
                        directoryError
                          ? "Chưa tải được danh sách trường"
                          : query || status
                            ? "Không tìm thấy trường phù hợp"
                            : "Bắt đầu với trường học đầu tiên"
                      }
                      description={
                        directoryError
                          ? "Thử làm mới để tải lại dữ liệu."
                          : query || status
                            ? "Thử một tên trường khác hoặc xóa bộ lọc hiện tại."
                            : "Tạo trường để thiết lập không gian học tập và tài khoản quản trị riêng."
                      }
                    >
                      {!directoryError && !query && !status && (
                        <button
                          className={primaryClass}
                          onClick={() => setModal("tenant")}
                        >
                          <Plus size={16} />
                          Tạo trường
                        </button>
                      )}
                    </EmptyState>
                  ))}
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                <span>
                  {total > 0
                    ? `${page * 20 + 1}–${Math.min((page + 1) * 20, total)} / ${amount(total)} trường`
                    : "0 trường"}
                  <span className="ml-3 hidden sm:inline">
                    Trang {page + 1} / {Math.max(1, Math.ceil(total / 20))}
                  </span>
                </span>
                <div className="flex gap-2">
                  <button
                    className={secondaryClass}
                    disabled={page === 0 || busy}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Trước
                  </button>
                  <button
                    className={secondaryClass}
                    disabled={(page + 1) * 20 >= total || busy}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Sau
                  </button>
                </div>
              </div>
            </section>
          )}
          {tab === "plans" && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Gói dịch vụ</h2>
                <div className="flex gap-2">
                  <button className={secondaryClass} onClick={() => void load()} disabled={busy}>
                    <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
                    Làm mới
                  </button>
                  <button
                    onClick={() => { setEditingPlan(null); setModal("plan"); }}
                    className={primaryClass}
                  >
                    <Plus size={16} />
                    Tạo gói
                  </button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {plans.map((plan) => (
                  <article
                    key={plan.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-widest text-blue-600">
                        {plan.code}
                      </p>
                      {!plan.active && <Badge status="INACTIVE" />}
                    </div>
                    <h3 className="mt-2 text-xl font-bold">{plan.name}</h3>
                    <p className="mt-2 text-sm text-slate-500">{plan.description}</p>
                    <p className="mt-3 text-sm font-semibold text-blue-700">{plan.active && plan.publicSale ? "Đang mở bán" : "Ẩn khỏi bảng giá"}</p>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between"><dt>Giá tháng</dt><dd className="font-semibold">{plan.prices?.MONTH === undefined ? "Không bán" : `${amount(plan.prices.MONTH)} ₫`}</dd></div>
                      <div className="flex justify-between"><dt>Giá năm</dt><dd className="font-semibold">{plan.prices?.YEAR === undefined ? "Không bán" : `${amount(plan.prices.YEAR)} ₫`}</dd></div>
                      <div className="flex justify-between text-slate-500"><dt>Cấp bậc / thứ tự</dt><dd>{plan.tier} / {plan.sortOrder}</dd></div>
                    </dl>
                    <dl className="mt-5 space-y-3 text-sm">
                      {Object.entries(plan.limits ?? {}).map(
                        ([resource, value]) => (
                          <div
                            className="flex justify-between gap-3"
                            key={resource}
                          >
                            <dt className="text-slate-500">
                              {resource === "storage_bytes"
                                ? "Dung lượng"
                                : resource === "ai_tokens"
                                  ? "AI tokens / tháng"
                                  : resource === "email_messages"
                                    ? "Email / tháng"
                                    : resource}
                            </dt>
                            <dd className="font-semibold">
                              {resource === "storage_bytes"
                                ? `${amount(value / 1024 ** 3)} GiB`
                                : amount(value)}
                            </dd>
                          </div>
                        ),
                      )}
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Tính năng AI</dt>
                        <dd>{plan.features?.ai ? "Cho phép" : "Tắt"}</dd>
                      </div>
                    </dl>
                    <button type="button" className={`${secondaryClass} mt-5 w-full`} onClick={() => { setEditingPlan(plan); setModal("plan"); }}>Chỉnh sửa gói & giá</button>
                  </article>
                ))}
              </div>
              {!plans.length && busy && <PanelLoading label="Đang tải gói dịch vụ…" />}
              {!plans.length && !busy && (
                <EmptyState
                  title={
                    plansError
                      ? "Chưa tải được gói dịch vụ"
                      : "Chưa có gói dịch vụ"
                  }
                  description={
                    plansError
                      ? "Thử làm mới để tải lại danh sách gói."
                      : "Tạo gói để quản lý tính năng và hạn mức sử dụng cho từng trường."
                  }
                />
              )}
              <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
                Xem bảng giá công khai <ArrowUpRight size={15} />
              </a>
            </section>
          )}
          {tab === "admins" && <AdminAccountsPanel onDirtyChange={setDomainDirty} onBusyChange={setDomainBusy} />}
          {tab === "orders" && <BillingOrdersPanel />}
          {tab === "revenue" && <RevenuePanel />}
        </main>
      </div>
      {pendingNavigation && (
        <DiscardChangesDialog
          cancel={() => setPendingNavigation(null)}
          discard={() => {
            const next = pendingNavigation;
            setPendingNavigation(null);
            if (next === "logout") void executeLogout();
            else {
              setDomainDirty(false);
              setTab(next);
            }
          }}
        />
      )}
      {modal === "tenant" && (
        <NewTenant
          close={() => setModal(null)}
          done={() => {
            setModal(null);
            setTab("tenants");
            setDraft("");
            setQuery("");
            setStatus("");
            setPage(0);
            setNotice(
              "Đã nhận yêu cầu tạo trường. Trường sẽ xuất hiện trong danh sách khi khởi tạo hoàn tất.",
            );
            void load();
          }}
        />
      )}
      {modal === "plan" && (
        <NewPlan
          plan={editingPlan ?? undefined}
          close={() => setModal(null)}
          done={() => {
            setModal(null);
            setNotice(editingPlan ? "Đã cập nhật gói và giá bán." : "Đã tạo gói dịch vụ.");
            setEditingPlan(null);
            void load();
          }}
        />
      )}
      {selected && (
        <TenantPanel
          key={selected}
          id={selected}
          plans={plans}
          close={() => setSelected(null)}
          updated={() => void load()}
        />
      )}
    </div>
  );
}
