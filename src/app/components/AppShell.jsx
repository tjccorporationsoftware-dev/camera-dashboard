"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const ACCESS_TOKEN_KEY = "camera_access_token";

const APP_FONT_FAMILY =
  '"Noto Sans Thai", "IBM Plex Sans", "Segoe UI", system-ui, -apple-system, sans-serif';

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getApiBaseUrl() {
  const url =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ;

  return url.endsWith("/") ? url.slice(0, -1) : url;
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

const menuItems = [
  {
    label: "หน้าหลัก",
    description: "ภาพรวมระบบ",
    href: "/dashboard",
    icon: "dashboard",
  },
  {
    label: "กล้องสด",
    description: "ดูภาพสดและอัดวิดีโอ",
    href: "/camera",
    icon: "camera",
  },
  {
    label: "วิดีโอย้อนหลัง",
    description: "ดูไฟล์ที่บันทึกไว้",
    href: "/camera/recordings",
    icon: "play",
  },
  {
    label: "จัดการผู้ใช้งาน",
    description: "เพิ่ม แก้ไข และกำหนดสิทธิ์",
    href: "/users",
    icon: "users",
  },
];

function getInitials(user) {
  const name = String(user?.fullName || user?.username || "U").trim();

  return name
    .split(/\s+/)
    .map((item) => item[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);

  function isActive(href) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    if (href === "/camera") {
      return pathname === "/camera";
    }

    return pathname.startsWith(href);
  }

  async function checkLogin() {
    try {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${apiBaseUrl}/auth/me`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          ...getAuthHeaders(),
        },
      });

      const json = await readJson(response);

      if (!response.ok) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        router.replace("/login");
        return;
      }

      setUser(json.data?.user || null);
    } catch {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      router.replace("/login");
    } finally {
      setChecking(false);
    }
  }

  async function logout() {
    try {
      await fetch(`${apiBaseUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
        },
      });
    } finally {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      router.replace("/login");
    }
  }

  useEffect(() => {
    checkLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return (
      <main
        className="min-h-screen bg-slate-50 px-6 py-6 text-slate-900"
        style={{ fontFamily: APP_FONT_FAMILY }}
      >
        <div className="mx-auto max-w-[1720px]">
          <div className="flex min-h-[70vh] items-center justify-center">
            <div className="w-full max-w-[460px] rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl border border-blue-100 bg-blue-50 text-blue-700">
                <ShellIcon name="shield" />
              </div>

              <div className="mt-4 text-base font-bold text-slate-900">
                กำลังตรวจสอบการเข้าสู่ระบบ
              </div>

              <div className="mt-1 text-sm font-medium text-slate-500">
                กรุณารอสักครู่ ระบบกำลังตรวจสอบสิทธิ์ผู้ใช้งาน
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-500" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900 lg:flex"
      style={{ fontFamily: APP_FONT_FAMILY }}
    >
      <aside className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur lg:h-screen lg:w-[318px] lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 px-5 py-5">
            {user && (
              <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white text-sm font-black text-blue-700 shadow-sm">
                    {getInitials(user)}
                  </div>

                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
                      Current User
                    </div>

                    <div className="mt-1 truncate text-sm font-bold text-slate-900">
                      {user.fullName || user.username}
                    </div>

                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600">
                        {user.role || "User"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-5">
            <div className="mb-3 flex items-center justify-between px-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
                  Navigation
                </div>

                <div className="mt-0.5 text-xs font-medium text-slate-400">
                  เมนูระบบหลัก
                </div>
              </div>

              <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                {menuItems.length} เมนู
              </div>
            </div>

            <div className="space-y-2">
              {menuItems.map((item) => {
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-3xl border px-3.5 py-3 transition focus:outline-none focus:ring-4 focus:ring-blue-100/70",
                      active
                        ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
                        : "border-transparent bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-700"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition",
                        active
                          ? "border-blue-200 bg-white text-blue-700 shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-500 group-hover:border-blue-100 group-hover:bg-white group-hover:text-blue-700"
                      )}
                    >
                      <ShellIcon name={item.icon} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "truncate text-sm font-bold",
                          active ? "text-blue-700" : "text-slate-800"
                        )}
                      >
                        {item.label}
                      </div>

                      <div
                        className={cn(
                          "mt-0.5 line-clamp-1 text-xs font-medium",
                          active ? "text-blue-600/80" : "text-slate-500"
                        )}
                      >
                        {item.description}
                      </div>
                    </div>

                    {active && (
                      <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600 shadow-sm shadow-blue-300" />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-slate-200 bg-white px-4 py-4">
            <button
              type="button"
              onClick={logout}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 focus:outline-none focus:ring-4 focus:ring-rose-100"
            >
              <ShellIcon name="logout" />
              ออกจากระบบ
            </button>

            <div className="mt-3 text-center text-[11px] font-medium text-slate-400">
              Secure Camera Management System
            </div>
          </div>
        </div>
      </aside>

      <section className="min-w-0 flex-1 bg-slate-50">{children}</section>
    </div>
  );
}

function ShellIcon({ name }) {
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

  if (name === "dashboard") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="1.8" />
        <rect x="14" y="3" width="7" height="7" rx="1.8" />
        <rect x="3" y="14" width="7" height="7" rx="1.8" />
        <rect x="14" y="14" width="7" height="7" rx="1.8" />
      </svg>
    );
  }

  if (name === "camera") {
    return (
      <svg {...common}>
        <path d="M15 10.5 21 7v10l-6-3.5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3.5Z" />
        <path d="M7 9h4" />
      </svg>
    );
  }

  if (name === "play") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m10 9 5 3-5 3V9Z" />
      </svg>
    );
  }

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

  if (name === "logout") {
    return (
      <svg {...common}>
        <path d="M10 17 15 12 10 7" />
        <path d="M15 12H3" />
        <path d="M21 19V5a2 2 0 0 0-2-2h-5" />
        <path d="M21 19a2 2 0 0 1-2 2h-5" />
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

  return (
    <svg {...common}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}