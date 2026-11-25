import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { act, create } from "react-test-renderer";
import { loadComponent } from "./component-loader.mjs";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const ui = loadComponent("components/platform/console-ui.tsx");
const cn = loadComponent("lib/cn.ts");
const settle = () => new Promise(setImmediate);
const text = (renderer) => JSON.stringify(renderer.toJSON());

const row = {
  id: "c-1", number: "HD-2026-000001", orderCode: 123, kind: "NEW", status: "ACTIVE",
  schoolName: "Trường A", customerName: "Trần Thị Bích", customerEmail: "bich@example.com",
  planName: "Tiêu chuẩn", cycle: "YEAR", amount: 7990000, periodStart: "2026-11-25T00:00:00Z", periodEnd: "2027-11-25T00:00:00Z",
  signedAt: "2026-11-25T02:30:00Z", termsVersion: "2026-11-25", emailStatus: "FAILED", emailAttempts: 5, createdAt: "2026-11-25T02:31:00Z",
};
const detail = {
  ...row, acceptedIp: "203.0.113.7",
  content: { title: "HỢP ĐỒNG", version: "2026-11-25", provider: { name: "EStude" }, customer: { name: "Trần Thị Bích" }, limits: [],
    sections: [{ heading: "Điều 1. Căn cứ", paragraphs: ["Nội dung điều một.", "- Mục con"] }] },
};

function mountPanel(t, overrides = {}) {
  const calls = { list: [], resend: [], terminate: [] };
  const api = {
    contracts: async (query) => { calls.list.push(query); return { data: [row], total: 41 }; },
    contractSummary: async () => ({ total: 41, active: 30, expiringSoon: 4, terminated: 2, emailPending: 1, emailFailed: 3 }),
    contract: async () => detail,
    resendContract: async (id) => { calls.resend.push(id); return { data: { queued: true } }; },
    terminateContract: async (id, reason) => { calls.terminate.push([id, reason]); return { data: { terminated: true } }; },
    ...overrides,
  };
  const { ContractsPanel } = loadComponent("components/platform/contracts-panel.tsx", {
    "@/lib/platform-api": { platformApi: api, contractPageSize: 20, contractPdfUrl: (id) => `/pdf/${id}` },
    "@/components/ui/custom-select": { CustomSelect: () => null },
    "@/components/ui/debounced-search-input": { DebouncedSearchInput: () => null },
    "@/components/ui/data-table": loadComponent("components/ui/data-table.tsx", { "@/lib/cn": cn, "@/components/ui/loading-bar": { LoadingBar: () => null } }),
    "@/components/ui/table-scroll-area": loadComponent("components/ui/table-scroll-area.tsx", { "@/lib/cn": cn }),
    "./console-ui": { ...ui, Modal: ({ children, footer, title }) => React.createElement("test-modal", { title }, children, footer) },
  });
  return { ContractsPanel, calls };
}

async function mount(t, Component) {
  let renderer;
  await act(async () => { renderer = create(React.createElement(Component)); await settle(); });
  t.after(async () => { await act(async () => renderer.unmount()); });
  return renderer;
}
const button = (renderer, label) => renderer.root.findAllByType("button").find((node) => node.props["aria-label"] === label || node.children.filter((c) => typeof c === "string").join("").trim() === label);

test("contract list shows summary, rows, delivery state and pages through results", async (t) => {
  const { ContractsPanel, calls } = mountPanel(t);
  const renderer = await mount(t, ContractsPanel);
  const shown = text(renderer);
  for (const expected of ["HD-2026-000001", "Trần Thị Bích", "bich@example.com", "Trường A", "7.990.000", "Gửi lỗi", "Hiệu lực", "Hiển thị 1–20 / 41 hợp đồng"]) {
    assert.ok(shown.includes(expected), `missing ${expected}`);
  }
  assert.match(shown, /"3"/, "failed-email count is shown on its card");
  assert.deepEqual(calls.list[0], { q: "", status: "", email: "", page: 0 });
  await act(async () => { button(renderer, "Sau").props.onClick(); await settle(); });
  assert.equal(calls.list.at(-1).page, 1);
  await act(async () => { renderer.root.findByProps({ ariaLabel: "Lọc theo trạng thái hợp đồng" }).props.onValueChange("EXPIRED"); await settle(); });
  assert.deepEqual(calls.list.at(-1), { q: "", status: "EXPIRED", email: "", page: 0 }, "changing a filter returns to the first page");
  await act(async () => { renderer.root.findByProps({ ariaLabel: "Lọc theo trạng thái email" }).props.onValueChange("FAILED"); await settle(); });
  assert.equal(calls.list.at(-1).email, "FAILED");
});

test("contract dialog shows the frozen text, resends the e-mail and terminates only with a reason", async (t) => {
  const { ContractsPanel, calls } = mountPanel(t);
  const renderer = await mount(t, ContractsPanel);
  await act(async () => { button(renderer, "Xem hợp đồng HD-2026-000001").props.onClick(); await settle(); });
  const dialog = text(renderer);
  for (const expected of ["Điều 1. Căn cứ", "Nội dung điều một.", "203.0.113.7", "Phiên bản", "Tải PDF"]) {
    assert.ok(dialog.includes(expected), `dialog is missing ${expected}`);
  }
  await act(async () => { button(renderer, "Gửi lại email").props.onClick(); await settle(); });
  assert.deepEqual(calls.resend, ["c-1"]);
  assert.match(text(renderer), /Đã xếp lịch gửi lại email/);

  await act(async () => { button(renderer, "Chấm dứt hợp đồng").props.onClick(); });
  const confirm = () => button(renderer, "Xác nhận chấm dứt");
  assert.equal(confirm().props.disabled, true, "a reason is required");
  await act(async () => { renderer.root.findByProps({ "aria-label": "Lý do chấm dứt" }).props.onChange({ target: { value: "Khách hàng yêu cầu" } }); });
  assert.equal(confirm().props.disabled, false);
  await act(async () => { confirm().props.onClick(); await settle(); });
  assert.deepEqual(calls.terminate, [["c-1", "Khách hàng yêu cầu"]]);
});

test("an empty or failed contract list explains itself instead of showing a blank table", async (t) => {
  const { ContractsPanel } = mountPanel(t, { contracts: async () => ({ data: [], total: 0 }) });
  const empty = await mount(t, ContractsPanel);
  assert.match(text(empty), /Chưa có hợp đồng nào/);
  const failing = mountPanel(t, { contracts: async () => { throw new Error("Control API unavailable"); } });
  const failed = await mount(t, failing.ContractsPanel);
  assert.match(text(failed), /Control API unavailable/);
  assert.match(text(failed), /Chưa tải được danh sách hợp đồng/);
});
