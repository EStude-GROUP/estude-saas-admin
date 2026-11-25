"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { KeyRound, Plus, X } from "lucide-react";
import {
  platformApi,
  type AdminDirectoryAccount,
  type Tenant,
} from "@/lib/platform-api";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { CustomSelect } from "@/components/ui/custom-select";
import { Table, TableBody, TableCell, TableHead, TableHeader } from "@/components/ui/data-table";
import { TableScrollArea } from "@/components/ui/table-scroll-area";
import { DebouncedSearchInput } from "@/components/ui/debounced-search-input";
import { TenantAdminPasswordPanel } from "./tenant-admin-password-panel";
import {
  Badge,
  DiscardChangesDialog,
  EmptyState,
  Field,
  Modal,
  Notice,
  PasswordField,
  SuccessNotice,
  dangerClass,
  errorText,
  inputClass,
  primaryClass,
  secondaryClass, PanelLoading } from "./console-ui";

type Action =
  | { kind: "password" | "status"; account: AdminDirectoryAccount }
  | { kind: "create"; school: Tenant };
const emptyDraft = {
  fullName: "",
  accountName: "",
  newPassword: "",
  confirmNewPassword: "",
};

export function AdminAccountsPanel({
  onDirtyChange,
  onBusyChange,
}: {
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [items, setItems] = useState<AdminDirectoryAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [school, setSchool] = useState<Tenant | null>(null);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolPage, setSchoolPage] = useState(0);
  const [schools, setSchools] = useState<Tenant[]>([]);
  const [schoolTotal, setSchoolTotal] = useState(0);
  const [schoolError, setSchoolError] = useState("");
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [revision, setRevision] = useState(0);
  const [action, setAction] = useState<Action | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [passwordDirty, setPasswordDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [discard, setDiscard] = useState(false);
  const lock = useRef(false);
  const sequence = useRef(0);
  const dirty = passwordDirty || Object.values(draft).some(Boolean);
  useUnsavedChanges(dirty || busy);
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);
  useEffect(
    () => () => {
      onDirtyChange(false);
      onBusyChange(false);
    },
    [onDirtyChange, onBusyChange],
  );
  const load = useCallback(async () => {
    const current = ++sequence.current;
    setLoading(true);
    setLoadError("");
    try {
      const result = await platformApi.adminDirectory(
        query,
        school?.id ?? "",
        status,
        page,
      );
      if (current !== sequence.current) return;
      if (page > 0 && result.total <= page * 20) {
        setPage(Math.max(0, Math.ceil(result.total / 20) - 1));
        return;
      }
      setItems(result.items);
      setTotal(result.total);
    } catch (cause) {
      if (current === sequence.current) {
        setItems([]);
        setLoadError(errorText(cause));
      }
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, [page, query, school?.id, status]);
  useEffect(() => {
    const guard = sequence;
    void load();
    return () => {
      ++guard.current;
    };
  }, [load, revision]);
  useEffect(() => {
    let live = true;
    setSchoolsLoading(true);
    setSchoolError("");
    const timer = setTimeout(() => {
      void platformApi
        .tenants(schoolSearch, "", schoolPage)
        .then((result) => {
          if (!live) return;
          setSchools(result.data);
          setSchoolTotal(result.total);
        })
        .catch((cause) => {
          if (live) {
            setSchools([]);
            setSchoolError(errorText(cause));
          }
        })
        .finally(() => {
          if (live) setSchoolsLoading(false);
        });
    }, 200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [schoolSearch, schoolPage, revision]);

  function open(next: Action) {
    setAction(next);
    setError("");
    setDraft(emptyDraft);
    setSuccess("");
  }
  function close() {
    if (busy || lock.current) return;
    if (dirty) {
      setDiscard(true);
      return;
    }
    setAction(null);
    setError("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!action || action.kind === "password" || lock.current) return;
    setError("");
    if (action.kind === "create") {
      if (draft.newPassword !== draft.confirmNewPassword) {
        setError("Mật khẩu xác nhận không khớp.");
        return;
      }
      const bytes = new TextEncoder().encode(draft.newPassword).length;
      if (
        bytes < 8 ||
        bytes > 128 ||
        /\s/u.test(draft.newPassword) ||
        !/[a-z]/.test(draft.newPassword) ||
        !/[A-Z]/.test(draft.newPassword) ||
        !/[0-9]/.test(draft.newPassword) ||
        !/[^a-zA-Z0-9]/u.test(draft.newPassword)
      ) {
        setError(
          "Mật khẩu cần 8–128 byte, có chữ hoa, chữ thường, số và ký tự đặc biệt; không chứa khoảng trắng.",
        );
        return;
      }
    }
    lock.current = true;
    setBusy(true);
    try {
      if (action.kind === "create") {
        await platformApi.createTenantAdmin(action.school.id, draft);
        setSuccess(
          `Đã cấp tài khoản ${draft.accountName.trim().toLowerCase()} cho ${action.school.name}.`,
        );
      } else {
        const target = action.account;
        const next = target.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
        await platformApi.setTenantAdminStatus(
          target.tenantId,
          target.id,
          next,
          target.status,
        );
        setSuccess(
          `Đã ${next === "LOCKED" ? "khóa" : "mở khóa"} tài khoản ${target.accountName}.`,
        );
      }
      setDraft(emptyDraft);
      setAction(null);
      setRevision((value) => value + 1);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const field = (key: keyof typeof draft) => ({
    value: draft[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setDraft((value) => ({ ...value, [key]: event.target.value })),
  });

  return (
    <section aria-label="Tài khoản quản trị trường" className="space-y-3">
      {success && (
        <SuccessNotice dismiss={() => setSuccess("")}>{success}</SuccessNotice>
      )}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/20" aria-busy={loading}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-3">
          <h2 className="font-bold">
            Tài khoản quản trị{" "}
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">{total}</span>
          </h2>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
            <div className="w-full min-w-0 sm:w-72">
            <DebouncedSearchInput
                aria-label="Tìm tài khoản quản trị"
                value={search}
                onValueChange={setSearch}
                onSearch={(value) => {
                  setQuery(value);
                  setPage(0);
                }}
                maxLength={150}
                placeholder="Tìm họ tên, tài khoản, trường…"
              />
            </div>
            <CustomSelect
              className="w-full sm:w-60"
              ariaLabel="Trường quản trị"
              value={school?.id ?? ""}
              searchable
              searchPlaceholder="Tìm tên hoặc mã trường…"
              isSearching={schoolsLoading}
              disabled={busy}
                            options={[
                { value: "", label: "Tất cả trường" },
                ...(school && !schools.some((item) => item.id === school.id)
                  ? [{ value: school.id, label: school.name }]
                  : []),
                ...schools.map((item) => ({
                  value: item.id,
                  label: `${item.name} (${item.slug})`,
                })),
              ]}
              onSearchChange={(value) => {
                if (value !== schoolSearch) {
                  setSchoolSearch(value);
                  setSchoolPage(0);
                }
              }}
              onValueChange={(value) => {
                setSchool(
                  value
                    ? (schools.find((item) => item.id === value) ??
                        (school?.id === value ? school : null))
                    : null,
                );
                setPage(0);
              }}
            />
            <CustomSelect
              className="w-full sm:w-48"
              ariaLabel="Trạng thái quản trị"
              value={status}
                            options={[
                { value: "", label: "Tất cả trạng thái" },
                { value: "ACTIVE", label: "Hoạt động" },
                { value: "LOCKED", label: "Đã khóa" },
                { value: "INACTIVE", label: "Ngừng hoạt động" },
                { value: "PENDING", label: "Chờ kích hoạt" },
              ]}
              onValueChange={(value) => {
                setStatus(value);
                setPage(0);
              }}
            />
            {(search || query || status || school) && (
              <button
                type="button"
                className={`${secondaryClass}`}
                onClick={() => {
                  setSearch("");
                  setQuery("");
                  setStatus("");
                  setSchool(null);
                  setSchoolSearch("");
                  setSchoolPage(0);
                  setPage(0);
                }}
              >
                <X size={15} />
                Xóa bộ lọc
              </button>
            )}
            <button
              type="button"
              className={`${primaryClass}`}
              disabled={!school || loading || busy || Boolean(loadError)}
              title={
                !school ? "Chọn trường trong bộ lọc để cấp tài khoản" : undefined
              }
              onClick={() => school && open({ kind: "create", school })}
            >
              <Plus size={16} />
              Cấp tài khoản
            </button>
          </div>
        </div>
        {(!school || schoolTotal > 20 || schoolPage > 0 || schoolError) && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2 text-xs text-slate-500">
            <p>{school ? `Đang lọc tài khoản của ${school.name}.` : "Chọn một trường trong bộ lọc để cấp tài khoản mới."}</p>
          {(schoolTotal > 20 || schoolPage > 0) && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="font-medium text-blue-600 disabled:text-slate-300"
                disabled={schoolPage === 0 || schoolsLoading}
                onClick={() => setSchoolPage((value) => value - 1)}
              >
                Trường trước
              </button>
              <span>
                {schoolTotal} trường · Trang {schoolPage + 1}
              </span>
              <button
                type="button"
                className="font-medium text-blue-600 disabled:text-slate-300"
                disabled={
                  (schoolPage + 1) * 20 >= schoolTotal || schoolsLoading
                }
                onClick={() => setSchoolPage((value) => value + 1)}
              >
                Trường tiếp
              </button>
            </div>
          )}
          </div>
        )}
        {schoolError && <div className="p-3"><Notice>{schoolError}</Notice></div>}
        {loadError && (
          <div className="p-3">
            <Notice>
              {loadError}
              <button type="button" className="ml-3 font-semibold underline" onClick={() => setRevision((value) => value + 1)}>Thử lại</button>
            </Notice>
          </div>
        )}
        {loading ? (
          <PanelLoading label="Đang tải tài khoản quản trị…" />
        ) : items.length === 0 ? (
          <EmptyState
            title={
              loadError
                ? "Chưa tải được danh sách"
                : "Chưa có tài khoản phù hợp"
            }
            description="Tìm kiếm theo tên đăng nhập, trường hoặc thay đổi bộ lọc."
          />
        ) : (
          <TableScrollArea aria-label="Danh sách tài khoản quản trị">
            <Table className="min-w-[780px]">
              <TableHeader className="normal-case tracking-normal">
                <tr>
                  {["#", "Họ và tên", "Tên đăng nhập", "Trường học", "Trạng thái", "Thao tác"].map((label) => (
                    <TableHead key={label}>{label}</TableHead>
                  ))}
                </tr>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <tr key={`${item.tenantId}:${item.id}`} className="hover:bg-slate-50/60">
                    <TableCell className="w-14 text-center text-slate-400">{page * 20 + index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700">
                          {item.fullName.trim().split(/\s+/).slice(-2).map((part) => part.charAt(0)).join("").toUpperCase()}
                        </span>
                        <span className="font-semibold">{item.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="rounded-md bg-slate-50 px-2 py-1 font-mono text-xs">{item.accountName}</span>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{item.schoolName}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-500">{item.slug}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge status={item.status} label={item.status === "INACTIVE" ? "Ngừng hoạt động" : undefined} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-3">
                        <button className={secondaryClass} onClick={() => open({ kind: "password", account: item })}>
                          <KeyRound size={15} />
                          Đổi mật khẩu
                        </button>
                        <ToggleSwitch
                          checked={item.status === "ACTIVE"}
                          aria-label={`${item.status === "ACTIVE" ? "Khóa" : "Mở khóa"} tài khoản ${item.accountName} của ${item.schoolName}`}
                          title={item.status === "ACTIVE" ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                          disabled={loading || busy || action !== null}
                          loading={busy && action?.kind === "status" && action.account.tenantId === item.tenantId && action.account.id === item.id}
                          onCheckedChange={() => open({ kind: "status", account: item })}
                        />
                      </div>
                    </TableCell>
                  </tr>
                ))}
              </TableBody>
            </Table>
          </TableScrollArea>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>
            {loading
              ? "Đang tải…"
              : total
                ? `Hiển thị ${page * 20 + 1}–${Math.min((page + 1) * 20, total)} / ${total} tài khoản`
                : "0 tài khoản"}
          </span>
          <div className="flex items-center gap-2">
            <span className="mr-2 text-xs">
              Trang {page + 1} / {Math.max(1, Math.ceil(total / 20))}
            </span>
            <button
              className={secondaryClass}
              disabled={loading || page === 0}
              onClick={() => setPage((value) => value - 1)}
            >
              Trước
            </button>
            <button
              className={secondaryClass}
              disabled={loading || (page + 1) * 20 >= total}
              onClick={() => setPage((value) => value + 1)}
            >
              Tiếp
            </button>
          </div>
        </div>
      </div>
      {action && (
        <Modal
          title={
            action.kind === "create"
              ? "Cấp tài khoản quản trị"
              : action.kind === "password"
                ? "Đổi mật khẩu quản trị"
                : action.account.status === "ACTIVE"
                  ? "Khóa tài khoản quản trị"
                  : "Mở khóa tài khoản quản trị"
          }
          close={close}
          closeDisabled={busy}
        >
          <p className="mb-5 text-sm font-semibold text-slate-600">
            {action.kind === "create"
              ? action.school.name
              : `${action.account.schoolName} · ${action.account.accountName}`}
          </p>
          {action.kind === "password" ? (
            <TenantAdminPasswordPanel
              id={action.account.tenantId}
              account={action.account}
              onDirtyChange={setPasswordDirty}
              onBusyChange={setBusy}
            />
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error && <Notice>{error}</Notice>}
              <fieldset disabled={busy} className="space-y-4">
                {action.kind === "create" ? (
                  <>
                    <p className="text-sm text-slate-500">
                      Mỗi trường tối đa 3 tài khoản, tính cả tài khoản đang
                      khóa.
                    </p>
                    <Field label="Họ tên">
                      <input
                        {...field("fullName")}
                        aria-label="Họ tên quản trị"
                        className={inputClass}
                        minLength={2}
                        maxLength={150}
                        required
                      />
                    </Field>
                    <Field label="Tên đăng nhập">
                      <input
                        {...field("accountName")}
                        aria-label="Tên đăng nhập quản trị"
                        className={inputClass}
                        minLength={3}
                        maxLength={50}
                        pattern="[a-z0-9._\-]{3,50}"
                        autoCapitalize="none"
                        autoComplete="off"
                        required
                      />
                    </Field>
                    <p className="text-xs text-slate-500">
                      3–50 ký tự: chữ thường, số, dấu chấm, gạch dưới hoặc gạch
                      ngang.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <PasswordField
                        {...field("newPassword")}
                        label="Mật khẩu mới"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        maxLength={128}
                        disabled={busy}
                      />
                      <PasswordField
                        {...field("confirmNewPassword")}
                        label="Nhập lại mật khẩu mới"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        maxLength={128}
                        disabled={busy}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      8–128 byte, có chữ hoa, chữ thường, số và ký tự đặc biệt;
                      không chứa khoảng trắng.
                    </p>
                  </>
                ) : (
                  <p className="text-sm leading-6 text-slate-600">
                    {action.account.status === "ACTIVE"
                      ? "Tài khoản sẽ không thể đăng nhập và các phiên hiện tại sẽ bị thu hồi. Các tài khoản khác của trường vẫn hoạt động."
                      : "Tài khoản sẽ được phép đăng nhập lại. Mật khẩu hiện tại được giữ nguyên."}
                  </p>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    className={secondaryClass}
                    onClick={close}
                    disabled={busy}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className={
                      action.kind === "status" &&
                      action.account.status === "ACTIVE"
                        ? dangerClass
                        : primaryClass
                    }
                    disabled={busy}
                  >
                    {busy
                      ? "Đang lưu…"
                      : action.kind === "create"
                        ? "Cấp tài khoản"
                        : action.account.status === "ACTIVE"
                          ? "Xác nhận khóa"
                          : "Xác nhận mở khóa"}
                  </button>
                </div>
              </fieldset>
            </form>
          )}
        </Modal>
      )}
      {discard && (
        <DiscardChangesDialog
          cancel={() => setDiscard(false)}
          discard={() => {
            setDiscard(false);
            setAction(null);
            setDraft(emptyDraft);
            setPasswordDirty(false);
            setError("");
          }}
        />
      )}
    </section>
  );
}
