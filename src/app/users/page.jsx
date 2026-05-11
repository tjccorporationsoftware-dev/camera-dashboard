"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../components/AppShell";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:4000/api"
).replace(/\/$/, "");

const ACCESS_TOKEN_KEY = "camera_access_token";

const APP_FONT_FAMILY =
  '"Noto Sans Thai", "IBM Plex Sans Thai", "IBM Plex Sans", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

const ROLE_OPTIONS = [
  {
    value: "USER",
    label: "User",
    description: "ผู้ใช้งานทั่วไป",
  },
  {
    value: "ADMIN",
    label: "Admin",
    description: "ผู้ดูแลระบบ",
  },
];

const pageContainer =
  "min-h-screen bg-[radial-gradient(circle_at_8%_0%,rgba(224,242,254,0.26),transparent_34%),radial-gradient(circle_at_92%_4%,rgba(219,234,254,0.20),transparent_32%),linear-gradient(180deg,#fbfdff_0%,#ffffff_48%,#f8fafc_100%)] text-slate-900";

const cardClass =
  "rounded-[2rem] border border-sky-100/65 bg-white/96 shadow-[0_14px_42px_rgba(15,23,42,0.045)] ring-1 ring-white/80 backdrop-blur-md";

const softCardClass =
  "overflow-hidden rounded-[2rem] border border-sky-100/65 bg-white/96 shadow-[0_14px_42px_rgba(15,23,42,0.045)] ring-1 ring-white/80 backdrop-blur-md";

const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 px-4 text-sm font-bold text-white shadow-sm shadow-blue-100 transition hover:from-blue-700 hover:to-sky-600 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none";

const outlineButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-white/90 px-4 text-sm font-bold text-slate-700 shadow-sm shadow-sky-50 transition hover:border-blue-200 hover:bg-blue-50/70 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50";

const dangerOutlineButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 shadow-sm transition hover:bg-rose-50 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50";

const inputClass =
  "h-11 rounded-2xl border border-sky-100 bg-white/95 px-3 text-sm font-semibold text-slate-800 shadow-sm shadow-sky-50 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100/80 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getAuthHeaders() {
  if (typeof window === "undefined") return {};

  const token = localStorage.getItem(ACCESS_TOKEN_KEY);

  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function readJson(response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      message: text,
    };
  }
}

async function apiFetch(path, options = {}, router) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  const json = await readJson(response);

  if (response.status === 401) {
    localStorage.removeItem(ACCESS_TOKEN_KEY);

    if (router) {
      router.replace("/login");
    }

    throw new Error(json.message || "กรุณาเข้าสู่ระบบใหม่");
  }

  if (response.status === 403) {
    throw new Error(json.message || "คุณไม่มีสิทธิ์ใช้งานหน้านี้");
  }

  if (!response.ok) {
    throw new Error(json.message || json.error || "เกิดข้อผิดพลาด");
  }

  return json;
}

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function normalizeRole(role) {
  return String(role || "USER").toUpperCase();
}

function getInitials(user) {
  const text = String(user?.fullName || user?.username || "?").trim();

  if (!text) return "?";

  return text
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function SectionLabel({ children }) {
  return (
    <div className="inline-flex rounded-full border border-sky-100 bg-sky-50/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 shadow-sm shadow-sky-50">
      {children}
    </div>
  );
}

function RoleBadge({ role }) {
  const safeRole = normalizeRole(role);

  if (safeRole === "ADMIN") {
    return (
      <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 shadow-sm shadow-blue-50">
        ADMIN
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm shadow-slate-100">
      USER
    </span>
  );
}

function StatusBadge({ active }) {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 shadow-sm shadow-emerald-50">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        ใช้งานอยู่
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 shadow-sm shadow-rose-50">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
      ปิดใช้งาน
    </span>
  );
}

function AlertBox({ type = "success", title, message, onClose }) {
  const isError = type === "error";

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 rounded-3xl border px-4 py-3 text-sm shadow-sm",
        isError
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      )}
    >
      <div>
        <p className="font-bold">
          {title || (isError ? "พบข้อผิดพลาด" : "สำเร็จ")}
        </p>

        {message && <p className="mt-1 font-medium">{message}</p>}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "rounded-xl px-2 py-1 text-xs font-bold transition",
            isError
              ? "text-rose-700 hover:bg-rose-100"
              : "text-emerald-700 hover:bg-emerald-100"
          )}
        >
          ปิด
        </button>
      )}
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-3xl border border-dashed border-sky-200 bg-white/80 px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl border border-sky-100 bg-sky-50 text-blue-700">
        <UserIcon name="user" />
      </div>

      <p className="text-sm font-bold text-slate-700">{title}</p>

      {description && (
        <p className="mt-1 text-sm font-medium text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
}

function ModalShell({ title, description, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 px-4 py-6 backdrop-blur-md">
      <div className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-[2rem] border border-sky-100 bg-white/95 shadow-2xl shadow-blue-950/15 ring-1 ring-white/80 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4 border-b border-sky-100/80 bg-gradient-to-r from-sky-50/65 via-white to-blue-50/35 px-6 py-5">
          <div>
            <SectionLabel>Form</SectionLabel>

            <h2 className="mt-2 text-lg font-bold tracking-tight text-slate-950">
              {title}
            </h2>

            {description && (
              <p className="mt-1 text-sm font-medium text-slate-500">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[calc(90vh-110px)] overflow-y-auto p-6 [scrollbar-color:#bae6fd_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-sky-200 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-sky-50/50">
          {children}
        </div>
      </div>
    </div>
  );
}

function UserFormModal({
  mode = "create",
  initialUser,
  loading,
  onClose,
  onSubmit,
}) {
  const isEdit = mode === "edit";

  const [form, setForm] = useState({
    username: initialUser?.username || "",
    fullName: initialUser?.fullName || "",
    password: "",
    role: normalizeRole(initialUser?.role || "USER"),
    isActive:
      typeof initialUser?.isActive === "boolean" ? initialUser.isActive : true,
  });

  function updateField(name, value) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <ModalShell
      title={isEdit ? "แก้ไขผู้ใช้งาน" : "เพิ่มผู้ใช้งานใหม่"}
      description={
        isEdit
          ? "ปรับข้อมูล ชื่อ-นามสกุล สิทธิ์ และสถานะผู้ใช้งาน"
          : "สร้างบัญชีผู้ใช้งานสำหรับเข้าสู่ระบบ"
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField label="ชื่อผู้ใช้">
          <input
            value={form.username}
            disabled={isEdit || loading}
            onChange={(event) => updateField("username", event.target.value)}
            placeholder="เช่น user01"
            className={cn(inputClass, "w-full")}
          />

          {isEdit && (
            <p className="mt-1 text-xs font-medium text-slate-400">
              ไม่สามารถแก้ไข username หลังสร้างบัญชีแล้ว
            </p>
          )}
        </FormField>

        <FormField label="ชื่อ-นามสกุล">
          <input
            value={form.fullName}
            disabled={loading}
            onChange={(event) => updateField("fullName", event.target.value)}
            placeholder="เช่น ผู้ใช้งาน ทดสอบ"
            className={cn(inputClass, "w-full")}
          />
        </FormField>

        {!isEdit && (
          <FormField label="รหัสผ่าน">
            <input
              type="password"
              value={form.password}
              disabled={loading}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="อย่างน้อย 8 ตัวอักษร"
              className={cn(inputClass, "w-full")}
            />
          </FormField>
        )}

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
            สิทธิ์ผู้ใช้งาน
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            {ROLE_OPTIONS.map((role) => {
              const active = form.role === role.value;

              return (
                <button
                  key={role.value}
                  type="button"
                  disabled={loading}
                  onClick={() => updateField("role", role.value)}
                  className={cn(
                    "rounded-3xl border p-4 text-left shadow-sm transition focus:outline-none focus:ring-4 focus:ring-blue-100/70 disabled:cursor-not-allowed disabled:opacity-60",
                    active
                      ? "border-blue-300 bg-blue-50/80 shadow-blue-100"
                      : "border-sky-100 bg-white/90 hover:border-blue-200 hover:bg-blue-50/50"
                  )}
                >
                  <p
                    className={cn(
                      "text-sm font-bold",
                      active ? "text-blue-700" : "text-slate-800"
                    )}
                  >
                    {role.label}
                  </p>

                  <p
                    className={cn(
                      "mt-1 text-xs font-medium",
                      active ? "text-blue-600" : "text-slate-500"
                    )}
                  >
                    {role.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {isEdit && (
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-3xl border border-sky-100 bg-slate-50/70 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-800">
                สถานะการใช้งาน
              </p>

              <p className="mt-0.5 text-xs font-medium text-slate-500">
                ปิดการใช้งานแล้วผู้ใช้นี้จะเข้าสู่ระบบไม่ได้
              </p>
            </div>

            <input
              type="checkbox"
              checked={form.isActive}
              disabled={loading}
              onChange={(event) =>
                updateField("isActive", event.target.checked)
              }
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-sky-100 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={outlineButton}
          >
            ยกเลิก
          </button>

          <button type="submit" disabled={loading} className={primaryButton}>
            {loading
              ? "กำลังบันทึก..."
              : isEdit
              ? "บันทึกการแก้ไข"
              : "เพิ่มผู้ใช้งาน"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function PasswordModal({ user, loading, onClose, onSubmit }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    onSubmit({
      password,
      confirmPassword,
    });
  }

  return (
    <ModalShell
      title="รีเซ็ตรหัสผ่าน"
      description={`กำหนดรหัสผ่านใหม่ให้ ${user?.fullName || user?.username}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-bold text-amber-900">
            ผู้ใช้จะต้องใช้รหัสผ่านใหม่นี้ในการเข้าสู่ระบบครั้งถัดไป
          </p>
        </div>

        <FormField label="รหัสผ่านใหม่">
          <input
            type="password"
            value={password}
            disabled={loading}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="อย่างน้อย 8 ตัวอักษร"
            className={cn(inputClass, "w-full")}
          />
        </FormField>

        <FormField label="ยืนยันรหัสผ่านใหม่">
          <input
            type="password"
            value={confirmPassword}
            disabled={loading}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="กรอกรหัสผ่านซ้ำ"
            className={cn(inputClass, "w-full")}
          />
        </FormField>

        <div className="flex flex-col-reverse gap-2 border-t border-sky-100 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={outlineButton}
          >
            ยกเลิก
          </button>

          <button type="submit" disabled={loading} className={primaryButton}>
            {loading ? "กำลังบันทึก..." : "รีเซ็ตรหัสผ่าน"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
        {label}
      </label>

      {children}
    </div>
  );
}

function SummaryCard({ label, value, description, tone = "slate", icon }) {
  const toneMap = {
    blue: {
      card: "border-sky-100 bg-gradient-to-br from-sky-50/70 via-white to-white",
      icon:
        "border-sky-200 bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-sky-100",
      value: "text-slate-950",
      label: "text-sky-600",
      glow: "bg-sky-100/70",
    },
    green: {
      card:
        "border-emerald-100 bg-gradient-to-br from-emerald-50/55 via-white to-white",
      icon:
        "border-emerald-200 bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-emerald-100",
      value: "text-slate-950",
      label: "text-emerald-600",
      glow: "bg-emerald-100/65",
    },
    violet: {
      card:
        "border-violet-100 bg-gradient-to-br from-violet-50/55 via-white to-white",
      icon:
        "border-violet-200 bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-violet-100",
      value: "text-slate-950",
      label: "text-violet-600",
      glow: "bg-violet-100/65",
    },
    rose: {
      card: "border-rose-100 bg-gradient-to-br from-rose-50/55 via-white to-white",
      icon:
        "border-rose-200 bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-rose-100",
      value: "text-slate-950",
      label: "text-rose-600",
      glow: "bg-rose-100/65",
    },
    slate: {
      card:
        "border-slate-200 bg-gradient-to-br from-slate-50/80 via-white to-sky-50/35",
      icon:
        "border-slate-200 bg-gradient-to-br from-slate-600 to-slate-700 text-white shadow-slate-100",
      value: "text-slate-950",
      label: "text-slate-500",
      glow: "bg-slate-100/80",
    },
  };

  const selected = toneMap[tone] || toneMap.slate;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[2rem] border p-5 shadow-[0_12px_34px_rgba(15,23,42,0.045)] ring-1 ring-white/80 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_44px_rgba(15,23,42,0.06)]",
        selected.card
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full blur-3xl transition group-hover:scale-110",
          selected.glow
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "text-xs font-bold uppercase tracking-wide",
              selected.label
            )}
          >
            {label}
          </p>

          <p
            className={cn(
              "mt-3 text-3xl font-black tracking-tight tabular-nums",
              selected.value
            )}
          >
            {Number(value || 0).toLocaleString("th-TH")}
          </p>

          <p className="mt-2 truncate text-sm font-medium text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-lg",
            selected.icon
          )}
        >
          <UserIcon name={icon || "user"} />
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);

  const activeUsers = useMemo(
    () => users.filter((user) => user.isActive).length,
    [users]
  );

  const adminUsers = useMemo(
    () => users.filter((user) => normalizeRole(user.role) === "ADMIN").length,
    [users]
  );

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return users.filter((user) => {
      const roleMatched =
        roleFilter === "ALL" || normalizeRole(user.role) === roleFilter;

      const statusMatched =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && user.isActive) ||
        (statusFilter === "INACTIVE" && !user.isActive);

      if (!roleMatched || !statusMatched) return false;

      if (!q) return true;

      const searchable = [
        user.username,
        user.fullName,
        user.role,
        user.isActive ? "active ใช้งาน" : "inactive ปิดใช้งาน",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(q);
    });
  }, [users, search, roleFilter, statusFilter]);

  async function loadCurrentUser() {
    const json = await apiFetch("/auth/me", { cache: "no-store" }, router);

    const user = json.data?.user || null;

    setCurrentUser(user);

    return user;
  }

  async function loadUsers() {
    const json = await apiFetch("/users", { cache: "no-store" }, router);

    const list = Array.isArray(json.data) ? json.data : [];

    setUsers(list);

    return list;
  }

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const user = await loadCurrentUser();

      if (normalizeRole(user?.role) !== "ADMIN") {
        throw new Error("คุณไม่มีสิทธิ์จัดการผู้ใช้งาน");
      }

      await loadUsers();
    } catch (err) {
      setError(err?.message || "โหลดข้อมูลผู้ใช้งานไม่สำเร็จ");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(form) {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const username = form.username.trim();
      const fullName = form.fullName.trim();
      const password = form.password;

      if (!username) {
        throw new Error("กรุณากรอกชื่อผู้ใช้");
      }

      if (!fullName) {
        throw new Error("กรุณากรอกชื่อ-นามสกุล");
      }

      if (!password || password.length < 8) {
        throw new Error("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      }

      await apiFetch(
        "/users",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            fullName,
            password,
            role: form.role,
          }),
        },
        router
      );

      setCreateOpen(false);
      setSuccess("เพิ่มผู้ใช้งานสำเร็จ");

      await loadUsers();
    } catch (err) {
      setError(err?.message || "เพิ่มผู้ใช้งานไม่สำเร็จ");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpdateUser(form) {
    if (!editingUser?.id) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const fullName = form.fullName.trim();

      if (!fullName) {
        throw new Error("กรุณากรอกชื่อ-นามสกุล");
      }

      await apiFetch(
        `/users/${editingUser.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName,
            role: form.role,
            isActive: form.isActive,
          }),
        },
        router
      );

      setEditingUser(null);
      setSuccess("แก้ไขผู้ใช้งานสำเร็จ");

      await loadUsers();
    } catch (err) {
      setError(err?.message || "แก้ไขผู้ใช้งานไม่สำเร็จ");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResetPassword({ password, confirmPassword }) {
    if (!passwordUser?.id) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      if (!password || password.length < 8) {
        throw new Error("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      }

      if (password !== confirmPassword) {
        throw new Error("รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน");
      }

      await apiFetch(
        `/users/${passwordUser.id}/password`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password,
          }),
        },
        router
      );

      setPasswordUser(null);
      setSuccess("รีเซ็ตรหัสผ่านสำเร็จ");

      await loadUsers();
    } catch (err) {
      setError(err?.message || "รีเซ็ตรหัสผ่านไม่สำเร็จ");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleActive(user) {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      if (currentUser?.id === user.id && user.isActive) {
        throw new Error("ไม่สามารถปิดการใช้งานบัญชีของตัวเองได้");
      }

      const nextActive = !user.isActive;

      await apiFetch(
        `/users/${user.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: user.fullName,
            role: user.role,
            isActive: nextActive,
          }),
        },
        router
      );

      setSuccess(
        nextActive ? "เปิดใช้งานผู้ใช้สำเร็จ" : "ปิดการใช้งานผู้ใช้สำเร็จ"
      );

      await loadUsers();
    } catch (err) {
      setError(err?.message || "ปรับสถานะผู้ใช้งานไม่สำเร็จ");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteUser(user) {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      if (currentUser?.id === user.id) {
        throw new Error("ไม่สามารถลบบัญชีของตัวเองได้");
      }

      const ok = window.confirm(
        `ต้องการลบผู้ใช้งานนี้ออกจากระบบใช่ไหม?\n\nชื่อ: ${
          user.fullName || "-"
        }\nUsername: ${user.username}\n\nเมื่อลบแล้วบัญชีนี้จะไม่สามารถเข้าสู่ระบบได้อีก`
      );

      if (!ok) return;

      await apiFetch(
        `/users/${user.id}`,
        {
          method: "DELETE",
        },
        router
      );

      setSuccess("ลบผู้ใช้งานสำเร็จ");

      await loadUsers();
    } catch (err) {
      setError(err?.message || "ลบผู้ใช้งานไม่สำเร็จ");
    } finally {
      setActionLoading(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell>
      <main className={pageContainer} style={{ fontFamily: APP_FONT_FAMILY }}>
        <div className="mx-auto max-w-[1720px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <section className={cn(cardClass, "mb-5 overflow-hidden")}>
            <div className="border-b border-sky-100/80 bg-gradient-to-r from-sky-50/65 via-white to-blue-50/35 px-5 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-100 bg-gradient-to-br from-white to-sky-50 text-blue-700 shadow-sm shadow-sky-100">
                      <UserIcon name="users" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-xl font-bold tracking-tight text-slate-950">
                          User Management
                        </h1>

                        <span className="rounded-full border border-sky-100 bg-white/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 shadow-sm">
                          Admin Console
                        </span>
                      </div>

                      <p className="mt-1 text-sm font-medium text-slate-500">
                        จัดการบัญชีผู้ใช้งาน เพิ่มผู้ใช้ แก้ไขสิทธิ์ รีเซ็ตรหัสผ่าน และลบผู้ใช้งาน
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <RoleBadge role="ADMIN" />
                    <span className="inline-flex rounded-full border border-sky-100 bg-sky-50/80 px-2.5 py-1 text-xs font-bold text-blue-700">
                      {users.length.toLocaleString("th-TH")} บัญชี
                    </span>
                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      ใช้งาน {activeUsers.toLocaleString("th-TH")}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={loadAll}
                    disabled={loading || actionLoading}
                    className={outlineButton}
                  >
                    <span className={loading ? "animate-spin" : ""}>
                      <UserIcon name="reload" />
                    </span>
                    {loading ? "กำลังโหลด..." : "รีเฟรช"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    disabled={loading || actionLoading}
                    className={primaryButton}
                  >
                    <UserIcon name="plus" />
                    เพิ่มผู้ใช้งาน
                  </button>
                </div>
              </div>
            </div>
          </section>

          {(error || success) && (
            <section className="mb-5 space-y-3">
              {error && (
                <AlertBox
                  type="error"
                  title="พบข้อผิดพลาด"
                  message={error}
                  onClose={() => setError("")}
                />
              )}

              {success && (
                <AlertBox
                  type="success"
                  title="สำเร็จ"
                  message={success}
                  onClose={() => setSuccess("")}
                />
              )}
            </section>
          )}

          <section className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="ผู้ใช้งานทั้งหมด"
              value={users.length}
              description="จำนวนบัญชีในระบบ"
              tone="blue"
              icon="users"
            />

            <SummaryCard
              label="บัญชีที่ใช้งานอยู่"
              value={activeUsers}
              description="สามารถเข้าสู่ระบบได้"
              tone="green"
              icon="check"
            />

            <SummaryCard
              label="ผู้ดูแลระบบ"
              value={adminUsers}
              description="Role ADMIN"
              tone="violet"
              icon="shield"
            />

            <SummaryCard
              label="ปิดใช้งาน"
              value={Math.max(users.length - activeUsers, 0)}
              description="บัญชีที่ถูกระงับ"
              tone="rose"
              icon="ban"
            />
          </section>

          <section className={cn(cardClass, "mb-5 overflow-hidden")}>
            <div className="flex flex-col gap-4 border-b border-sky-100/80 bg-gradient-to-r from-white via-sky-50/45 to-blue-50/25 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <SectionLabel>Filters</SectionLabel>

                <h2 className="mt-2 text-base font-bold tracking-tight text-slate-950">
                  ตัวกรองข้อมูล
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-500">
                  ค้นหาผู้ใช้งานจากชื่อผู้ใช้ ชื่อ-นามสกุล หรือสิทธิ์
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[280px_170px_170px_auto]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ค้นหา user..."
                  className={cn(inputClass, "w-full")}
                />

                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className={cn(inputClass, "w-full")}
                >
                  <option value="ALL">ทุกสิทธิ์</option>
                  <option value="ADMIN">Admin</option>
                  <option value="USER">User</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className={cn(inputClass, "w-full")}
                >
                  <option value="ALL">ทุกสถานะ</option>
                  <option value="ACTIVE">ใช้งานอยู่</option>
                  <option value="INACTIVE">ปิดใช้งาน</option>
                </select>

                <button
                  type="button"
                  onClick={clearFilters}
                  className={outlineButton}
                >
                  ล้างตัวกรอง
                </button>
              </div>
            </div>
          </section>

          <section className={softCardClass}>
            <div className="flex flex-col justify-between gap-3 border-b border-sky-100/80 bg-gradient-to-r from-white via-sky-50/45 to-blue-50/25 px-5 py-4 sm:flex-row sm:items-center">
              <div>
                <SectionLabel>User Database</SectionLabel>

                <h2 className="mt-2 text-base font-bold tracking-tight text-slate-950">
                  รายชื่อผู้ใช้งาน
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  แสดง {filteredUsers.length.toLocaleString("th-TH")} จาก{" "}
                  {users.length.toLocaleString("th-TH")} บัญชี
                </p>
              </div>
            </div>

            {loading ? (
              <div className="p-6">
                <div className="rounded-3xl border border-dashed border-sky-200 bg-slate-50/70 p-10 text-center">
                  <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-sky-100 border-t-blue-600" />
                  <p className="text-sm font-bold text-slate-600">
                    กำลังโหลดรายชื่อผู้ใช้งาน...
                  </p>
                </div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="ไม่พบผู้ใช้งาน"
                  description="ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง"
                />
              </div>
            ) : (
              <div className="overflow-x-auto bg-white/80">
                <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-sky-100">
                      <TableHead>ผู้ใช้งาน</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>เข้าสู่ระบบล่าสุด</TableHead>
                      <TableHead>สร้างเมื่อ</TableHead>
                      <TableHead align="right">จัดการ</TableHead>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.map((user) => {
                      const isSelf = currentUser?.id === user.id;

                      return (
                        <tr
                          key={user.id}
                          className="border-b border-sky-50 transition hover:bg-sky-50/35"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white text-sm font-black text-blue-700 shadow-sm shadow-sky-50">
                                {getInitials(user)}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-bold text-slate-900">
                                    {user.fullName || "-"}
                                  </p>

                                  {isSelf && (
                                    <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                      คุณ
                                    </span>
                                  )}
                                </div>

                                <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                                  @{user.username}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <RoleBadge role={user.role} />
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <StatusBadge active={user.isActive} />
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-xs font-medium text-slate-500">
                            {formatDateTime(user.lastLoginAt)}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-xs font-medium text-slate-500">
                            {formatDateTime(user.createdAt)}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              <ActionButton
                                onClick={() => setEditingUser(user)}
                                disabled={actionLoading}
                              >
                                แก้ไข
                              </ActionButton>

                              <ActionButton
                                tone="blue"
                                onClick={() => setPasswordUser(user)}
                                disabled={actionLoading}
                              >
                                รีเซ็ต
                              </ActionButton>

                              <ActionButton
                                tone={user.isActive ? "rose" : "green"}
                                onClick={() => handleToggleActive(user)}
                                disabled={actionLoading || isSelf}
                              >
                                {user.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                              </ActionButton>

                              <ActionButton
                                tone="rose"
                                onClick={() => handleDeleteUser(user)}
                                disabled={actionLoading || isSelf}
                              >
                                ลบ
                              </ActionButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {createOpen && (
          <UserFormModal
            mode="create"
            loading={actionLoading}
            onClose={() => setCreateOpen(false)}
            onSubmit={handleCreateUser}
          />
        )}

        {editingUser && (
          <UserFormModal
            mode="edit"
            initialUser={editingUser}
            loading={actionLoading}
            onClose={() => setEditingUser(null)}
            onSubmit={handleUpdateUser}
          />
        )}

        {passwordUser && (
          <PasswordModal
            user={passwordUser}
            loading={actionLoading}
            onClose={() => setPasswordUser(null)}
            onSubmit={handleResetPassword}
          />
        )}
      </main>
    </AppShell>
  );
}

function TableHead({ children, align = "left" }) {
  return (
    <th
      className={cn(
        "whitespace-nowrap bg-sky-50/80 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-600",
        align === "right" && "text-right"
      )}
    >
      {children}
    </th>
  );
}

function ActionButton({ children, tone = "slate", disabled, onClick }) {
  const toneClass = {
    slate:
      "border-sky-100 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100",
    green:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    rose: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-2xl border px-3 py-1.5 text-xs font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40",
        toneClass[tone] || toneClass.slate
      )}
    >
      {children}
    </button>
  );
}

function UserIcon({ name }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.15,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  if (name === "users") {
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg {...common}>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }

  if (name === "reload") {
    return (
      <svg {...common}>
        <path d="M21 12a9 9 0 0 0-15.5-6.2L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 15.5 6.2L21 16" />
        <path d="M21 21v-5h-5" />
      </svg>
    );
  }

  if (name === "plus") {
    return (
      <svg {...common}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m20 6-11 11-5-5" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-5" />
      </svg>
    );
  }

  if (name === "ban") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="m5.7 5.7 12.6 12.6" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}
