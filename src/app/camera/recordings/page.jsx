"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "../../components/AppShell";

const APP_FONT_FAMILY =
  '"Noto Sans Thai", "IBM Plex Sans Thai", "IBM Plex Sans", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

const CAMERA_GROUPS = [
  { path: "tapo01", name: "กล้องที่ 1" },
  { path: "tapo02", name: "กล้องที่ 2" },
  { path: "tapo03", name: "กล้องที่ 3" },
  { path: "tapo04", name: "กล้องที่ 4" },
  { path: "tapo05", name: "กล้องที่ 5" },
  { path: "tapo06", name: "กล้องที่ 6" },
];

const DEFAULT_RETENTION_DAYS = 14;
const ACCESS_TOKEN_KEY = "camera_access_token";

const pageContainer =
  "min-h-screen bg-[radial-gradient(circle_at_8%_0%,rgba(224,242,254,0.34),transparent_34%),radial-gradient(circle_at_92%_4%,rgba(219,234,254,0.28),transparent_32%),linear-gradient(180deg,#f8fbff_0%,#ffffff_48%,#f8fafc_100%)] text-slate-900";

const cardClass =
  "rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-sm ring-1 ring-white/80 backdrop-blur-md";

const softCardClass =
  "overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-sm ring-1 ring-white/80 backdrop-blur-md";

const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm shadow-blue-100 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none";

const outlineButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50";

const dangerOutlineButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 shadow-sm transition hover:bg-rose-50 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50";

const inputClass =
  "h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100/80";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function normalizeBaseUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function getApiBaseUrl() {
  return normalizeBaseUrl(
    process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:4000/api"
  );
}

function getAccessToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ACCESS_TOKEN_KEY) || "";
}

function getAuthHeaders() {
  const token = getAccessToken();

  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

function withAccessToken(url) {
  const token = getAccessToken();

  if (!token) return url;

  const separator = url.includes("?") ? "&" : "?";

  return `${url}${separator}access_token=${encodeURIComponent(token)}`;
}

async function readJson(response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function apiRequest(url, options = {}, router) {
  const response = await fetch(url, {
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
    router.replace("/login");
    throw new Error(json.message || "กรุณาเข้าสู่ระบบใหม่");
  }

  if (!response.ok) {
    throw new Error(json.message || "เกิดข้อผิดพลาด");
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

function formatDuration(seconds) {
  const safeSeconds = Number(seconds) || 0;

  if (!safeSeconds) return "-";

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainSeconds = Math.floor(safeSeconds % 60);

  if (hours > 0) return `${hours} ชม. ${minutes} นาที`;
  if (minutes > 0) return `${minutes} นาที ${remainSeconds} วิ`;

  return `${remainSeconds} วิ`;
}

function formatSize(size) {
  const bytes = Number(size) || 0;

  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;

  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;

  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;

  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

function toTimeMs(value) {
  if (!value) return null;

  const ms = new Date(value).getTime();

  return Number.isFinite(ms) ? ms : null;
}

function parseMediaMtxFileTime(fileName) {
  const match = String(fileName || "").match(
    /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/
  );

  if (!match) return null;

  const [, yyyy, mm, dd, hh, mi, ss] = match;

  const date = new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    Number(hh),
    Number(mi),
    Number(ss)
  );

  const ms = date.getTime();

  return Number.isFinite(ms) ? ms : null;
}

function getSortTimeMs(item) {
  return (
    toTimeMs(item?.startTime) ||
    toTimeMs(item?.eventDateTime) ||
    toTimeMs(item?.createdAt) ||
    toTimeMs(item?.modifiedAt) ||
    parseMediaMtxFileTime(item?.fileName) ||
    0
  );
}

function sortNewestFirst(list) {
  return [...list].sort((a, b) => {
    const timeDiff = getSortTimeMs(b) - getSortTimeMs(a);

    if (timeDiff !== 0) return timeDiff;

    return String(b.fileName || "").localeCompare(String(a.fileName || ""));
  });
}

function getRetentionDays(item) {
  const days = Number(item?.retentionDays || DEFAULT_RETENTION_DAYS);

  return Number.isFinite(days) && days > 0 ? days : DEFAULT_RETENTION_DAYS;
}

function getRetentionStartAtMs(item) {
  return (
    toTimeMs(item?.retentionStartAt) ||
    toTimeMs(item?.createdAt) ||
    toTimeMs(item?.startTime) ||
    toTimeMs(item?.modifiedAt) ||
    parseMediaMtxFileTime(item?.fileName)
  );
}

function getAutoDeleteAtMs(item) {
  const explicitDeleteAt =
    toTimeMs(item?.autoDeleteAt) ||
    toTimeMs(item?.deleteAt) ||
    toTimeMs(item?.retention?.autoDeleteAt);

  if (explicitDeleteAt) return explicitDeleteAt;

  const startAtMs = getRetentionStartAtMs(item);
  if (!startAtMs) return null;

  const retentionDays = getRetentionDays(item);

  return startAtMs + retentionDays * 24 * 60 * 60 * 1000;
}

function getRemainingMs(item, nowMs = Date.now()) {
  const deleteAtMs = getAutoDeleteAtMs(item);

  if (!deleteAtMs) return null;

  return deleteAtMs - nowMs;
}

function formatRemainingTime(item, nowMs = Date.now()) {
  const remainingMs = getRemainingMs(item, nowMs);

  if (remainingMs === null) return "-";

  if (remainingMs <= 0) {
    return "รอลบในรอบถัดไป";
  }

  const totalMinutes = Math.ceil(remainingMs / 1000 / 60);
  const days = Math.floor(totalMinutes / 60 / 24);
  const hours = Math.floor((totalMinutes - days * 24 * 60) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days} วัน ${hours} ชม.`;
  if (hours > 0) return `${hours} ชม. ${minutes} นาที`;

  return `${minutes} นาที`;
}

function getRetentionTone(item, nowMs = Date.now()) {
  const remainingMs = getRemainingMs(item, nowMs);

  if (remainingMs === null) return "slate";
  if (remainingMs <= 0) return "red";

  const remainingHours = remainingMs / 1000 / 60 / 60;

  if (remainingHours <= 24) return "red";
  if (remainingHours <= 48) return "amber";

  return "green";
}

function getAutoDeleteAtText(item) {
  const deleteAtMs = getAutoDeleteAtMs(item);

  if (!deleteAtMs) return "-";

  return formatDateTime(new Date(deleteAtMs).toISOString());
}

function getItemTitle(item) {
  if (!item) return "-";

  if (item.hasSessionInfo && item.recordTypeLabel) {
    return item.recordTypeLabel;
  }

  return "ไฟล์วิดีโอ";
}

function getItemName(item) {
  if (!item) return "-";

  return `${item.cameraName || item.cameraPath || "กล้อง"} - ${
    item.fileName || "-"
  }`;
}

function getDisplayTime(item) {
  return (
    item.startTime ||
    item.eventDateTime ||
    item.createdAt ||
    item.modifiedAt ||
    null
  );
}

function SectionLabel({ children }) {
  return (
    <div className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
      {children}
    </div>
  );
}

function Pill({ children, tone = "slate" }) {
  const baseStyle =
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold";

  const styles = {
    slate: "border-slate-200 bg-white text-slate-700",
    blue: "border-sky-100 bg-sky-50 text-blue-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    red: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
  };

  return (
    <span className={`${baseStyle} ${styles[tone] || styles.slate}`}>
      {children}
    </span>
  );
}

function DetailBox({ label, value, className = "" }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3",
        className
      )}
    >
      <p className="mb-1 text-xs font-bold text-slate-500">{label}</p>
      <p className="truncate text-sm font-bold text-slate-900">
        {value || "-"}
      </p>
    </div>
  );
}

function AlertBox({ type = "success", title, message, onAction, actionText }) {
  const isError = type === "error";

  return (
    <section
      className={cn(
        "flex flex-col justify-between gap-4 rounded-3xl border px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center",
        isError
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      )}
    >
      <div>
        <h3 className="font-bold">{title}</h3>
        <p className="mt-1 font-medium">{message}</p>
      </div>

      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className={cn(
            "rounded-2xl border bg-white px-3 py-2 text-sm font-bold transition",
            isError
              ? "border-rose-200 text-rose-700 hover:bg-rose-50"
              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          )}
        >
          {actionText}
        </button>
      )}
    </section>
  );
}

function EmptyState({ title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-sky-100 bg-sky-50 text-blue-700">
        <VideoIcon name="video" />
      </div>

      <div className="mt-3 text-sm font-bold text-slate-700">{title}</div>

      {desc && (
        <div className="mt-1 max-w-md text-sm font-medium text-slate-400">
          {desc}
        </div>
      )}
    </div>
  );
}

export default function CameraRecordingsPage() {
  const router = useRouter();
  const videoRef = useRef(null);

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [videoNonce, setVideoNonce] = useState(Date.now());

  const [countByCamera, setCountByCamera] = useState({});
  const [selectedCameraPath, setSelectedCameraPath] = useState("tapo01");
  const [retentionNow, setRetentionNow] = useState(Date.now());

  async function loadItems(keepId = "") {
    try {
      setLoading(true);
      setError("");
      setVideoError("");
      setVideoLoading(false);

      const json = await apiRequest(
        `${apiBaseUrl}/recording-files`,
        {
          cache: "no-store",
        },
        router
      );

      const list = sortNewestFirst(Array.isArray(json.data) ? json.data : []);

      setItems(list);
      setCountByCamera(json.meta?.countByCamera || {});

      const keep = keepId ? list.find((item) => item.id === keepId) : null;

      const currentCameraNewestItem = list.find(
        (item) => item.cameraPath === selectedCameraPath
      );

      const newestItem = list[0] || null;

      const nextSelected = keep || currentCameraNewestItem || newestItem;

      setSelected(nextSelected);

      if (!keep && nextSelected?.cameraPath) {
        setSelectedCameraPath(nextSelected.cameraPath);
      }

      setVideoNonce(Date.now());
    } catch (err) {
      setError(err?.message || "โหลดรายการวิดีโอไม่สำเร็จ");
      setItems([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(item) {
    setSelected(item);
    setSelectedCameraPath(item.cameraPath || selectedCameraPath);
    setVideoError("");
    setVideoLoading(true);
    setVideoNonce(Date.now());
  }

  function handleCameraPathChange(nextPath) {
    setSelectedCameraPath(nextPath);
    setVideoError("");
    setVideoLoading(false);

    const nextCameraItems = sortNewestFirst(
      items.filter((item) => item.cameraPath === nextPath)
    );

    setSelected(nextCameraItems[0] || null);
    setVideoNonce(Date.now());
  }

  function retryVideo() {
    setVideoError("");
    setVideoLoading(true);
    setVideoNonce(Date.now());
  }

  async function deleteSelected() {
    if (!selected?.id) return;

    const ok = window.confirm(
      `ต้องการลบไฟล์วิดีโอนี้ใช่ไหม?\n${getItemName(selected)}`
    );

    if (!ok) return;

    try {
      setActionLoading(true);
      setError("");
      setVideoError("");

      await apiRequest(
        `${apiBaseUrl}/recording-files/${selected.id}`,
        {
          method: "DELETE",
        },
        router
      );

      await loadItems("");
    } catch (err) {
      setError(err?.message || "ลบไฟล์วิดีโอไม่สำเร็จ");
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setRetentionNow(Date.now());
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  const selectedCameraGroup = useMemo(() => {
    return (
      CAMERA_GROUPS.find((camera) => camera.path === selectedCameraPath) ||
      CAMERA_GROUPS[0]
    );
  }, [selectedCameraPath]);

  const selectedCameraItems = useMemo(() => {
    return sortNewestFirst(
      items.filter((item) => item.cameraPath === selectedCameraPath)
    );
  }, [items, selectedCameraPath]);

  const totalSizeText = useMemo(() => {
    const total = selectedCameraItems.reduce(
      (sum, item) => sum + Number(item.size || 0),
      0
    );

    return formatSize(total);
  }, [selectedCameraItems]);

  const videoUrl = useMemo(() => {
    if (!selected?.id) return "";

    return withAccessToken(
      `${apiBaseUrl}/recording-files/${selected.id}/browser-video?t=${videoNonce}`
    );
  }, [selected, apiBaseUrl, videoNonce]);

  const rawVideoUrl = useMemo(() => {
    if (!selected?.id) return "";

    return withAccessToken(
      `${apiBaseUrl}/recording-files/${selected.id}/raw-video?t=${videoNonce}`
    );
  }, [selected, apiBaseUrl, videoNonce]);

  const downloadUrl = useMemo(() => {
    if (!selected?.id) return "";

    return withAccessToken(
      `${apiBaseUrl}/recording-files/${selected.id}/download`
    );
  }, [selected, apiBaseUrl]);

  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    video.pause();
    video.removeAttribute("src");
    video.load();

    if (!videoUrl) {
      setVideoLoading(false);
      return;
    }

    setVideoLoading(true);
    setVideoError("");

    const timer = setTimeout(() => {
      video.src = videoUrl;
      video.load();
    }, 120);

    return () => clearTimeout(timer);
  }, [videoUrl]);

  const newestVideo = items[0] || null;

  return (
    <AppShell>
      <main className={pageContainer} style={{ fontFamily: APP_FONT_FAMILY }}>
        <div className="mx-auto max-w-[1720px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <section className={cn(cardClass, "mb-5 overflow-hidden")}>
            <div className="border-b border-slate-200 bg-white px-5 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-blue-700">
                      <VideoIcon name="video" />
                    </div>

                    <div className="min-w-0">
                      <h1 className="text-xl font-bold tracking-tight text-slate-950">
                        วิดีโอที่บันทึกไว้
                      </h1>

                      <p className="mt-1 text-sm font-medium text-slate-500">
                        ดูวิดีโอย้อนหลังแบบเรียบง่าย เรียงจากรายการล่าสุดก่อนเสมอ
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={items.length > 0 ? "green" : "slate"}>
                    รวม {items.length} ไฟล์
                  </Pill>

                  {newestVideo && (
                    <Pill tone="blue">
                      ล่าสุด {formatDateTime(getDisplayTime(newestVideo))}
                    </Pill>
                  )}

                  <button
                    type="button"
                    onClick={() => loadItems(selected?.id)}
                    disabled={loading || actionLoading}
                    className={outlineButton}
                  >
                    <span className={loading ? "animate-spin" : ""}>
                      <VideoIcon name="reload" />
                    </span>
                    รีเฟรช
                  </button>
                </div>
              </div>
            </div>
          </section>

          {loading && (
            <section className={cn(cardClass, "mb-5 p-12 text-center")}>
              <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-sky-100 border-t-blue-600" />

              <p className="text-sm font-bold text-slate-700">
                กำลังโหลดรายการวิดีโอ...
              </p>
            </section>
          )}

          {error && (
            <div className="mb-5">
              <AlertBox
                type="error"
                title="พบข้อผิดพลาด"
                message={error}
                onAction={() => loadItems(selected?.id)}
                actionText="ลองโหลดใหม่"
              />
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
              <section className="space-y-5">
                <div className={softCardClass}>
                  <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                      <SectionLabel>Player</SectionLabel>

                      <h2 className="mt-2 truncate text-base font-bold tracking-tight text-slate-950">
                        {selected ? getItemTitle(selected) : "ยังไม่ได้เลือกวิดีโอ"}
                      </h2>

                      <p className="mt-1 truncate text-xs font-medium text-slate-500">
                        {selected
                          ? `${selected.cameraName || selected.cameraPath || "กล้อง"} • ${formatDateTime(
                              getDisplayTime(selected)
                            )}`
                          : "เลือกวิดีโอจากรายการด้านขวา"}
                      </p>
                    </div>

                    {selected && (
                      <div className="flex flex-wrap gap-2">
                        <Pill tone="green">พร้อมเล่น</Pill>
                        <Pill tone={getRetentionTone(selected, retentionNow)}>
                          ลบใน {formatRemainingTime(selected, retentionNow)}
                        </Pill>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-950 p-4">
                    <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-slate-800 bg-black shadow-inner">
                      {selected ? (
                        <>
                          {videoLoading && !videoError && videoUrl && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                              <div className="flex flex-col items-center">
                                <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-500 border-t-white" />

                                <span className="text-sm font-bold text-white">
                                  กำลังโหลดวิดีโอ...
                                </span>
                              </div>
                            </div>
                          )}

                          {videoError && (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/90 px-6 text-center text-white backdrop-blur-md">
                              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-300">
                                {videoError}
                              </div>

                              <div className="flex flex-wrap justify-center gap-3">
                                <button
                                  type="button"
                                  onClick={retryVideo}
                                  className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-200"
                                >
                                  ลองเล่นใหม่
                                </button>

                                {rawVideoUrl && (
                                  <a
                                    href={rawVideoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-2xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
                                  >
                                    เปิดไฟล์ตรง
                                  </a>
                                )}
                              </div>
                            </div>
                          )}

                          <video
                            ref={videoRef}
                            controls
                            preload="metadata"
                            playsInline
                            crossOrigin="use-credentials"
                            className="absolute inset-0 h-full w-full object-contain"
                            onLoadStart={() => {
                              if (videoUrl) {
                                setVideoLoading(true);
                                setVideoError("");
                              }
                            }}
                            onLoadedMetadata={() => setVideoLoading(false)}
                            onCanPlay={() => setVideoLoading(false)}
                            onPlaying={() => setVideoLoading(false)}
                            onError={() => {
                              setVideoLoading(false);
                              setVideoError(
                                "ไม่สามารถเปิดเล่นวิดีโอได้ ไฟล์อาจถูกลบหรือเบราว์เซอร์ยังอ่านไฟล์นี้ไม่ได้"
                              );
                            }}
                          />
                        </>
                      ) : (
                        <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-2 text-center text-slate-400">
                          <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-slate-200">
                            <VideoIcon name="video" />
                          </div>

                          <div className="mt-2 text-base font-bold text-slate-200">
                            ยังไม่มีไฟล์วิดีโอ
                          </div>

                          <div className="max-w-md px-6 text-sm text-slate-500">
                            เมื่อมีการบันทึกวิดีโอ รายการล่าสุดจะแสดงขึ้นมาก่อน
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selected ? (
                  <div className={cn(cardClass, "overflow-hidden")}>
                    <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center">
                      <div>
                        <SectionLabel>Details</SectionLabel>

                        <h3 className="mt-2 text-base font-bold tracking-tight text-slate-950">
                          รายละเอียดวิดีโอ
                        </h3>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {downloadUrl && (
                          <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={primaryButton}
                          >
                            <VideoIcon name="download" />
                            ดาวน์โหลด
                          </a>
                        )}

                        {rawVideoUrl && (
                          <a
                            href={rawVideoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={outlineButton}
                          >
                            <VideoIcon name="external" />
                            เปิดไฟล์ตรง
                          </a>
                        )}

                        {/* <button
                          type="button"
                          onClick={deleteSelected}
                          disabled={actionLoading || !selected}
                          className={dangerOutlineButton}
                        >
                          <VideoIcon name="trash" />
                          {actionLoading ? "กำลังลบ..." : "ลบไฟล์"}
                        </button> */}
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <DetailBox label="ประเภท" value={getItemTitle(selected)} />

                        <DetailBox
                          label="กล้อง"
                          value={selected.cameraName || selected.cameraPath || "-"}
                        />

                        <DetailBox
                          label="ผู้บันทึก"
                          value={selected.recorderName || "-"}
                        />

                        <DetailBox
                          label="วันที่บันทึก"
                          value={formatDateTime(getDisplayTime(selected))}
                        />

                        <DetailBox
                          label="ระยะเวลา"
                          value={formatDuration(selected.duration)}
                        />

                        <DetailBox
                          label="ขนาดไฟล์"
                          value={selected.sizeLabel || formatSize(selected.size)}
                        />

                        <DetailBox
                          label="ลบอัตโนมัติใน"
                          value={formatRemainingTime(selected, retentionNow)}
                        />

                        <DetailBox
                          label="วันเวลาที่จะลบ"
                          value={getAutoDeleteAtText(selected)}
                        />

                        <DetailBox
                          label="ชื่อไฟล์"
                          value={selected.fileName}
                          className="sm:col-span-2 lg:col-span-4"
                        />
                      </div>

                      {selected.note && (
                        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="mb-1 text-xs font-bold text-slate-500">
                            หมายเหตุ / เลขเอกสาร
                          </p>

                          <p className="whitespace-pre-wrap text-sm font-medium text-slate-900">
                            {selected.note}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="ยังไม่ได้เลือกวิดีโอ"
                    desc="เลือกไฟล์จากรายการด้านขวาเพื่อดูรายละเอียดและเล่นวิดีโอ"
                  />
                )}
              </section>

              <aside className={cn(softCardClass, "flex h-fit max-h-screen flex-col")}>
                <div className="border-b border-slate-200 bg-white px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <SectionLabel>Recordings</SectionLabel>

                      <h2 className="mt-2 text-base font-bold tracking-tight text-slate-950">
                        รายการวิดีโอ
                      </h2>

                      <p className="mt-1 text-xs font-medium text-slate-500">
                        เรียงจากใหม่ไปเก่า
                      </p>
                    </div>

                    <Pill tone={selectedCameraItems.length > 0 ? "green" : "slate"}>
                      {selectedCameraItems.length} ไฟล์
                    </Pill>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
                      เลือกกล้อง
                    </label>

                    <select
                      value={selectedCameraPath}
                      onChange={(e) => handleCameraPathChange(e.target.value)}
                      className={cn(inputClass, "w-full")}
                    >
                      {CAMERA_GROUPS.map((camera) => (
                        <option key={camera.path} value={camera.path}>
                          {camera.name} — {countByCamera[camera.path] || 0} ไฟล์
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {selectedCameraGroup?.name || "กล้อง"}
                        </p>

                        <p className="mt-0.5 text-xs font-medium text-slate-500">
                          รวมพื้นที่ {totalSizeText}
                        </p>
                      </div>

                      <Pill tone="blue">{selectedCameraPath}</Pill>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 [scrollbar-color:#bae6fd_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-sky-200 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-sky-50/50">
                  {selectedCameraItems.length === 0 ? (
                    <EmptyState
                      title={`ยังไม่มีไฟล์วิดีโอของ ${
                        selectedCameraGroup?.name || "กล้องนี้"
                      }`}
                      desc="เมื่อมีการบันทึกวิดีโอ ไฟล์จะแสดงในรายการนี้"
                    />
                  ) : (
                    <div className="space-y-2">
                      {selectedCameraItems.map((item, index) => {
                        const active = selected?.id === item.id;

                        return (
                          <RecordingItemCard
                            key={item.id}
                            item={item}
                            active={active}
                            isNewest={index === 0}
                            retentionNow={retentionNow}
                            onClick={() => handleSelect(item)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}

function RecordingItemCard({ item, active, isNewest, retentionNow, onClick }) {
  const retentionTone = getRetentionTone(item, retentionNow);
  const displayTime = getDisplayTime(item);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-3xl border p-4 text-left transition duration-200 focus:outline-none focus:ring-4 focus:ring-blue-100/70",
        active
          ? "border-blue-300 bg-blue-50 shadow-sm shadow-blue-100"
          : "border-slate-200 bg-white hover:border-blue-200 hover:bg-sky-50/60 hover:shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {isNewest && <Pill tone="blue">ล่าสุด</Pill>}

            <Pill tone={item.hasSessionInfo ? "green" : "slate"}>
              {item.hasSessionInfo ? "มีข้อมูลบันทึก" : "ไฟล์วิดีโอ"}
            </Pill>
          </div>

          <p className="mt-2 truncate text-sm font-bold text-slate-950">
            {getItemTitle(item)}
          </p>

          <p className="mt-1 truncate text-xs font-medium text-slate-500">
            {formatDateTime(displayTime)}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs font-bold text-slate-900">
            {formatDuration(item.duration)}
          </p>

          <p className="mt-1 text-[11px] font-medium text-slate-400">
            {item.sizeLabel || formatSize(item.size)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <CompactInfo label="ผู้บันทึก" value={item.recorderName || "-"} />
        <CompactInfo label="ลบใน" value={formatRemainingTime(item, retentionNow)} tone={retentionTone} />
      </div>

      {item.note && (
        <p className="mt-3 line-clamp-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-medium leading-relaxed text-slate-600">
          {item.note}
        </p>
      )}
    </button>
  );
}

function CompactInfo({ label, value, tone = "slate" }) {
  const valueClass =
    tone === "red"
      ? "text-rose-700"
      : tone === "amber"
      ? "text-amber-700"
      : tone === "green"
      ? "text-emerald-700"
      : "text-slate-800";

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-bold text-slate-400">{label}</p>
      <p className={cn("mt-0.5 truncate text-xs font-bold", valueClass)}>
        {value || "-"}
      </p>
    </div>
  );
}

function VideoIcon({ name }) {
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

  if (name === "video") {
    return (
      <svg {...common}>
        <path d="M15 10.5 21 7v10l-6-3.5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3.5Z" />
        <path d="M7 9h4" />
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

  if (name === "download") {
    return (
      <svg {...common}>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
    );
  }

  if (name === "external") {
    return (
      <svg {...common}>
        <path d="M14 3h7v7" />
        <path d="M10 14 21 3" />
        <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
      </svg>
    );
  }

  if (name === "trash") {
    return (
      <svg {...common}>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6 18 20H6L5 6" />
        <path d="M10 11v5" />
        <path d="M14 11v5" />
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