"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ACCESS_TOKEN_KEY = "camera_access_token";

const APP_FONT_FAMILY =
  '"Noto Sans Thai", "IBM Plex Sans", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

const inputClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100/70 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

const primaryButton =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getApiBaseUrl() {
  const url =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL;

  return url.endsWith("/") ? url.slice(0, -1) : url;
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

function getTokenFromLoginResponse(json) {
  return (
    json?.data?.token ||
    json?.data?.accessToken ||
    json?.token ||
    json?.accessToken ||
    ""
  );
}

export default function LoginPage() {
  const router = useRouter();
  const apiBaseUrl = getApiBaseUrl();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const username = form.username.trim();
      const password = form.password;

      if (!username) {
        throw new Error("กรุณากรอกชื่อผู้ใช้");
      }

      if (!password.trim()) {
        throw new Error("กรุณากรอกรหัสผ่าน");
      }

      localStorage.removeItem(ACCESS_TOKEN_KEY);

      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const json = await readJson(response);

      if (!response.ok) {
        throw new Error(json.message || "เข้าสู่ระบบไม่สำเร็จ");
      }

      const token = getTokenFromLoginResponse(json);

      if (token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
      } else {
        console.warn(
          "Login สำเร็จ แต่ backend ยังไม่ได้ส่ง token กลับมา กรุณาเช็ค auth.routes.js"
        );
      }

      router.replace("/dashboard");
    } catch (err) {
      setError(err?.message || "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(name, value) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  }

  return (
    <main
      className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900"
      style={{ fontFamily: APP_FONT_FAMILY }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-[1180px] items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden border-r border-slate-200 bg-slate-50 p-8 lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
                Secure Access
              </div>

              <h1 className="mt-5 max-w-md text-3xl font-bold tracking-tight text-slate-900">
                Camera Management Dashboard
              </h1>

              <p className="mt-3 max-w-md text-sm font-medium leading-7 text-slate-500">
                ระบบควบคุมกล้อง บันทึกวิดีโอ และจัดการสิทธิ์ผู้ใช้งาน
                สำหรับการใช้งานภายในองค์กรอย่างปลอดภัย
              </p>

              <div className="mt-8 grid grid-cols-1 gap-3">
                <FeatureItem
                  icon="camera"
                  title="Live Monitoring"
                  desc="ดูภาพสดจากกล้องและควบคุมการบันทึก"
                />

                <FeatureItem
                  icon="video"
                  title="Recorded Video"
                  desc="จัดการวิดีโอย้อนหลัง ดาวน์โหลด และลบไฟล์"
                />

                <FeatureItem
                  icon="shield"
                  title="Role Permission"
                  desc="ควบคุมสิทธิ์ผู้ใช้งานและป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต"
                />
              </div>
            </div>

           
          </div>

          <form onSubmit={handleLogin} className="p-6 sm:p-8 lg:p-10">
            <div className="mx-auto max-w-[440px]">
              <div className="mb-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-blue-100 bg-blue-50 text-xl font-black tracking-tight text-blue-700 shadow-sm">
                  TJC
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    เข้าสู่ระบบ
                  </h2>

                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Clean View
                  </span>
                </div>

                <p className="mt-2 text-sm font-medium text-slate-500">
                  กรุณาเข้าสู่ระบบก่อนใช้งานกล้องและวิดีโอย้อนหลัง
                </p>
              </div>

              <div className="mb-5 rounded-3xl border border-blue-100 bg-blue-50/80 px-4 py-3 lg:hidden">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                  API Server
                </p>

                <p className="mt-1 break-all text-xs font-semibold text-blue-900">
                  {apiBaseUrl}
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
                    ชื่อผู้ใช้
                  </label>

                  <div className="relative">
                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <LoginIcon name="user" />
                    </div>

                    <input
                      value={form.username}
                      onChange={(e) =>
                        handleInputChange("username", e.target.value)
                      }
                      autoComplete="username"
                      placeholder="เช่น admin"
                      disabled={loading}
                      className={cn(inputClass, "pl-11")}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
                    รหัสผ่าน
                  </label>

                  <div className="relative">
                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <LoginIcon name="lock" />
                    </div>

                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      autoComplete="current-password"
                      placeholder="กรอกรหัสผ่าน"
                      disabled={loading}
                      className={cn(inputClass, "pl-11")}
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className={primaryButton}>
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      กำลังเข้าสู่ระบบ...
                    </>
                  ) : (
                    <>
                      <LoginIcon name="login" />
                      เข้าสู่ระบบ
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function FeatureItem({ icon, title, desc }) {
  return (
    <div className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
        <LoginIcon name={icon} />
      </div>

      <div>
        <div className="text-sm font-bold text-slate-900">{title}</div>
        <div className="mt-1 text-xs font-medium leading-5 text-slate-500">
          {desc}
        </div>
      </div>
    </div>
  );
}

function LoginIcon({ name }) {
  const common = {
    width: 19,
    height: 19,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.15,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  if (name === "user") {
    return (
      <svg {...common}>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }

  if (name === "lock") {
    return (
      <svg {...common}>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }

  if (name === "login") {
    return (
      <svg {...common}>
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
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

  if (name === "video") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m10 9 5 3-5 3V9Z" />
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

  if (name === "key") {
    return (
      <svg {...common}>
        <circle cx="7.5" cy="14.5" r="3.5" />
        <path d="M10 12 21 1" />
        <path d="m15 6 3 3" />
        <path d="m17 4 3 3" />
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