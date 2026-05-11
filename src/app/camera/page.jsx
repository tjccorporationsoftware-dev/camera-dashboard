"use client";

import AppShell from "../components/AppShell";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const APP_FONT_FAMILY =
  '"Noto Sans Thai", "IBM Plex Sans", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

const ACCESS_TOKEN_KEY = "camera_access_token";

const pageContainer = "min-h-screen bg-slate-50 text-slate-900";
const cardClass = "rounded-3xl border border-slate-200 bg-white shadow-sm";
const softCardClass =
  "rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden";

const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300";

const outlineButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

const dangerButton =
  "inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:bg-slate-300";

const inputClass =
  "rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100/70";

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

function getStreamBaseUrl() {
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_STREAM_URL || "");
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

function appendQueryParams(url, params = {}) {
  if (!url) return "";

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();

  if (!query) return url;

  const separator = url.includes("?") ? "&" : "?";

  return `${url}${separator}${query}`;
}

function buildCameraStreamUrl(camera, reloadKey) {
  if (!camera) return "";

  const streamBaseUrl = getStreamBaseUrl();
  const cameraPath = camera.path || camera.id || "";
  const cameraId = camera.id || camera.path || "";

  if (!cameraPath) return "";

  let baseUrl = "";

  if (streamBaseUrl) {
    const encodedCameraPath = encodeURIComponent(cameraPath);
    const encodedCameraId = encodeURIComponent(cameraId);

    if (
      streamBaseUrl.includes("{cameraPath}") ||
      streamBaseUrl.includes("{path}") ||
      streamBaseUrl.includes("{cameraId}") ||
      streamBaseUrl.includes("{id}")
    ) {
      baseUrl = streamBaseUrl
        .replaceAll("{cameraPath}", encodedCameraPath)
        .replaceAll("{path}", encodedCameraPath)
        .replaceAll("{cameraId}", encodedCameraId)
        .replaceAll("{id}", encodedCameraId);
    } else if (streamBaseUrl.includes("?")) {
      baseUrl = streamBaseUrl;
    } else {
      baseUrl = `${streamBaseUrl}/${encodedCameraPath}`;
    }
  } else {
    baseUrl = camera.liveUrl || "";
  }

  if (!baseUrl) return "";

  return appendQueryParams(baseUrl, {
    autoplay: "true",
    muted: "true",
    camera: cameraId,
    cameraPath,
    reload: reloadKey,
    access_token: getAccessToken(),
  });
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
      timeStyle: "medium",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatElapsedClock(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainSeconds = Math.floor(safeSeconds % 60);

  const pad = (value) => String(value).padStart(2, "0");

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(remainSeconds)}`;
  }

  return `${pad(minutes)}:${pad(remainSeconds)}`;
}

function formatElapsedText(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainSeconds = Math.floor(safeSeconds % 60);

  if (hours > 0) {
    return `${hours} ชั่วโมง ${minutes} นาที ${remainSeconds} วินาที`;
  }

  return `${minutes} นาที ${remainSeconds} วินาที`;
}

function getElapsedSeconds(startTime, nowMs = Date.now()) {
  if (!startTime) return 0;

  const startMs = new Date(startTime).getTime();

  if (!Number.isFinite(startMs)) return 0;

  return Math.max(0, Math.floor((nowMs - startMs) / 1000));
}

function getDisplayName(user) {
  return user?.fullName || user?.name || user?.username || user?.email || "";
}

function getUserId(user) {
  return user?.id || user?.userId || user?.uid || "";
}

function getUsername(user) {
  return user?.username || user?.email || "";
}

function getRecordingOwnerText(session) {
  return session?.recorderName || session?.startedByUsername || "ผู้ใช้งานอื่น";
}

function isSessionOwner(session, user) {
  if (!session || !user) return false;

  const userId = getUserId(user);
  const username = getUsername(user);
  const displayName = getDisplayName(user);

  if (userId && session.startedByUserId && session.startedByUserId === userId) {
    return true;
  }

  if (
    username &&
    session.startedByUsername &&
    session.startedByUsername === username
  ) {
    return true;
  }

  if (
    displayName &&
    session.recorderName &&
    session.recorderName === displayName
  ) {
    return true;
  }

  return false;
}

function canCurrentUserEnterCamera(activeSession, currentUser) {
  if (!activeSession) return true;

  return isSessionOwner(activeSession, currentUser);
}

function canCurrentUserStopSession(session, user) {
  if (!session) return false;

  return isSessionOwner(session, user);
}

function getActiveSessionForCamera(activeSessions, camera) {
  if (!camera?.path) return null;

  return activeSessions[camera.path] || null;
}

function isCameraLockedByOtherUser(activeSessions, camera, currentUser) {
  const activeSession = getActiveSessionForCamera(activeSessions, camera);

  if (!activeSession) return false;

  return !canCurrentUserEnterCamera(activeSession, currentUser);
}

function SectionLabel({ children }) {
  return (
    <div className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
      {children}
    </div>
  );
}

function Pill({ children, tone = "slate" }) {
  const baseStyle =
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold";

  const styles = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
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

function DetailBox({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="max-w-[62%] truncate text-right text-sm font-bold text-slate-900">
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

function EmptyBox({ title, desc }) {
  return (
    <section className={cn(cardClass, "p-6 text-center")}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
        <CameraIcon name="camera" />
      </div>

      <div className="mt-3 text-sm font-bold text-slate-700">{title}</div>
      {desc && <div className="mt-1 text-sm font-medium text-slate-400">{desc}</div>}
    </section>
  );
}

export default function CameraPage() {
  const router = useRouter();
  const apiBaseUrl = getApiBaseUrl();

  const [currentUser, setCurrentUser] = useState(null);
  const [cameras, setCameras] = useState([]);

  const [selectedCameraId, setSelectedCameraId] = useState("");

  const [activeSessions, setActiveSessions] = useState({});

  const [loading, setLoading] = useState(true);
  const [actionLoadingCamera, setActionLoadingCamera] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [reloadKey, setReloadKey] = useState(0);
  const [nowText, setNowText] = useState(formatDateTime(new Date()));
  const [clockTick, setClockTick] = useState(Date.now());

  const [form, setForm] = useState({
    recordType: "INBOUND",
    note: "",
  });

  const selectedCamera = useMemo(() => {
    if (!selectedCameraId) return null;

    return (
      cameras.find(
        (item) => item.id === selectedCameraId || item.path === selectedCameraId
      ) || null
    );
  }, [cameras, selectedCameraId]);

  const selectedActiveSession = useMemo(() => {
    return getActiveSessionForCamera(activeSessions, selectedCamera);
  }, [activeSessions, selectedCamera]);

  const currentUserActiveSession = useMemo(() => {
    return (
      Object.values(activeSessions).find((session) =>
        isSessionOwner(session, currentUser)
      ) || null
    );
  }, [activeSessions, currentUser]);

  const canStopSelectedSession = useMemo(() => {
    return canCurrentUserStopSession(selectedActiveSession, currentUser);
  }, [selectedActiveSession, currentUser]);

  const selectedCameraIsLockedByOther = useMemo(() => {
    return Boolean(
      selectedCamera &&
        selectedActiveSession &&
        !canCurrentUserEnterCamera(selectedActiveSession, currentUser)
    );
  }, [selectedCamera, selectedActiveSession, currentUser]);

  const currentUserIsRecordingAnotherCamera = useMemo(() => {
    if (!currentUserActiveSession || !selectedCamera) return false;

    return currentUserActiveSession.cameraPath !== selectedCamera.path;
  }, [currentUserActiveSession, selectedCamera]);

  const selectedElapsedSeconds = useMemo(() => {
    if (!selectedActiveSession?.startTime) return 0;

    return getElapsedSeconds(selectedActiveSession.startTime, clockTick);
  }, [selectedActiveSession?.startTime, clockTick]);

  const activeCount = useMemo(() => {
    return Object.values(activeSessions).filter(Boolean).length;
  }, [activeSessions]);

  async function loadCurrentUser() {
    const json = await apiRequest(
      `${apiBaseUrl}/auth/me`,
      {
        cache: "no-store",
      },
      router
    );

    const user = json.data?.user || null;

    setCurrentUser(user);

    return user;
  }

  async function loadCameras() {
    const json = await apiRequest(
      `${apiBaseUrl}/cameras`,
      {
        cache: "no-store",
      },
      router
    );

    const list = Array.isArray(json.data) ? json.data : [];

    setCameras(list);

    return list;
  }

  async function loadCameraSessions(cameraList) {
    const safeList = Array.isArray(cameraList) ? cameraList : cameras;
    const activeMap = {};

    await Promise.all(
      safeList.map(async (camera) => {
        const params = new URLSearchParams({
          cameraPath: camera.path,
        });

        try {
          const activeJson = await apiRequest(
            `${apiBaseUrl}/recording-sessions/active?${params.toString()}`,
            {
              cache: "no-store",
            },
            router
          );

          activeMap[camera.path] = activeJson.data || null;
        } catch {
          activeMap[camera.path] = null;
        }
      })
    );

    setActiveSessions(activeMap);
  }

  async function loadAll() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const [, cameraList] = await Promise.all([
        loadCurrentUser(),
        loadCameras(),
      ]);

      await loadCameraSessions(cameraList);
    } catch (err) {
      setError(err?.message || "เกิดข้อผิดพลาด");
      setCameras([]);
      setActiveSessions({});
    } finally {
      setLoading(false);
    }
  }

  function showMessage(text, timeout = 3500) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, timeout);
  }

  function selectCamera(camera) {
    const activeSession = getActiveSessionForCamera(activeSessions, camera);
    const lockedByOther = isCameraLockedByOtherUser(
      activeSessions,
      camera,
      currentUser
    );

    if (lockedByOther) {
      setError("");
      showMessage(
        `${camera.name} กำลังถูกอัดอยู่โดย ${getRecordingOwnerText(
          activeSession
        )} ไม่สามารถเข้าใช้งานจอนี้ได้`,
        4500
      );

      return;
    }

    setSelectedCameraId(camera.id);

    if (activeSession) {
      showMessage(`${camera.name} กำลังอัดอยู่`, 3000);
    } else {
      showMessage(`เลือก ${camera.name} แล้ว`, 2500);
    }
  }

  async function startRecording() {
    try {
      setActionLoadingCamera(selectedCamera?.path || "");
      setError("");
      setMessage("");

      if (!selectedCamera?.path) {
        throw new Error("กรุณาเลือกจอก่อนเริ่มอัด");
      }

      if (selectedCameraIsLockedByOther) {
        throw new Error(
          `${selectedCamera.name} กำลังถูกอัดอยู่โดย ${getRecordingOwnerText(
            selectedActiveSession
          )} กรุณาเลือกจออื่น`
        );
      }

      if (selectedActiveSession) {
        throw new Error(`${selectedCamera.name} กำลังถูกอัดอยู่แล้ว`);
      }

      if (currentUserIsRecordingAnotherCamera) {
        throw new Error(
          `คุณกำลังอัด ${
            currentUserActiveSession.cameraName ||
            currentUserActiveSession.cameraPath
          } อยู่ กรุณาหยุดรายการเดิมก่อน`
        );
      }

      const recorderName = getDisplayName(currentUser);

      if (!recorderName) {
        throw new Error("ไม่พบชื่อผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่");
      }

      const startTime = new Date();

      await apiRequest(
        `${apiBaseUrl}/recording-sessions/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cameraPath: selectedCamera.path,
            recordType: form.recordType,
            recorderName,
            eventDateTime: startTime.toISOString(),
            note: form.note,
          }),
        },
        router
      );

      showMessage(`เริ่มอัดวิดีโอจาก ${selectedCamera.name} แล้ว`, 3000);

      await loadCameraSessions(cameras);
    } catch (err) {
      setError(err?.message || "เริ่มอัดไม่สำเร็จ");
    } finally {
      setActionLoadingCamera("");
    }
  }

  async function stopRecording() {
    try {
      setActionLoadingCamera(selectedCamera?.path || "");
      setError("");
      setMessage("");

      if (!selectedActiveSession?.id) {
        throw new Error("ไม่มีรายการที่กำลังอัด");
      }

      if (!canStopSelectedSession) {
        throw new Error(
          `${selectedCamera?.name || "กล้องนี้"} กำลังถูกอัดอยู่โดย ${getRecordingOwnerText(
            selectedActiveSession
          )} คุณไม่มีสิทธิ์หยุดรายการนี้`
        );
      }

      await apiRequest(
        `${apiBaseUrl}/recording-sessions/${selectedActiveSession.id}/stop`,
        {
          method: "POST",
        },
        router
      );

      showMessage(`หยุดอัดวิดีโอจาก ${selectedCamera.name} แล้ว`, 3000);

      setForm((prev) => ({
        ...prev,
        note: "",
      }));

      setSelectedCameraId("");

      await loadCameraSessions(cameras);
    } catch (err) {
      setError(err?.message || "หยุดอัดไม่สำเร็จ");
    } finally {
      setActionLoadingCamera("");
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowText(formatDateTime(new Date()));
      setClockTick(Date.now());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (cameras.length === 0) return;

    const timer = setInterval(() => {
      loadCameraSessions(cameras).catch(() => {});
    }, 5000);

    return () => {
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameras]);

  useEffect(() => {
    if (!selectedCamera || !selectedCameraIsLockedByOther) return;

    showMessage(
      `${selectedCamera.name} กำลังถูกอัดอยู่โดย ${getRecordingOwnerText(
        selectedActiveSession
      )} ระบบปิดจอหลักแล้ว`,
      4500
    );

    setSelectedCameraId("");
  }, [
    selectedCamera,
    selectedCameraIsLockedByOther,
    selectedActiveSession,
  ]);

  const selectedLiveUrl = useMemo(() => {
    return buildCameraStreamUrl(selectedCamera, reloadKey);
  }, [selectedCamera, reloadKey]);

  const startButtonDisabled = Boolean(
    actionLoadingCamera ||
      !selectedCamera ||
      selectedActiveSession ||
      currentUserIsRecordingAnotherCamera
  );

  function getStartButtonText() {
    if (actionLoadingCamera) return "กำลังเตรียมการ...";

    if (!selectedCamera) {
      return "กรุณาเลือกจอก่อนเริ่มอัด";
    }

    if (selectedCameraIsLockedByOther) {
      return `จอนี้ถูกอัดโดย ${getRecordingOwnerText(selectedActiveSession)}`;
    }

    if (selectedActiveSession) {
      return "จอนี้กำลังอัดอยู่";
    }

    if (currentUserIsRecordingAnotherCamera) {
      return `คุณกำลังอัด ${
        currentUserActiveSession.cameraName ||
        currentUserActiveSession.cameraPath
      } อยู่`;
    }

    return "เริ่มบันทึกวิดีโอ (Start Recording)";
  }

  return (
    <AppShell>
      <main className={pageContainer} style={{ fontFamily: APP_FONT_FAMILY }}>
        <div className="mx-auto max-w-[1720px] px-8 py-8">
          <section className="mb-5 rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                    <CameraIcon name="camera" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl font-bold tracking-tight text-slate-900">
                        Live Camera Console
                      </h1>

                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        Clean View
                      </span>
                    </div>

                    <p className="mt-1 text-sm font-medium text-slate-500">
                      ระบบมอนิเตอร์กล้องและบันทึกวิดีโอ พร้อมควบคุมสิทธิ์การใช้งานแต่ละจอ
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Pill tone="blue">CCTV Recording</Pill>

                  <Pill tone={activeCount > 0 ? "red" : "green"}>
                    {activeCount > 0
                      ? `กำลังอัด ${activeCount} กล้อง`
                      : "สถานะ: พร้อมใช้งาน"}
                  </Pill>

                  {currentUserActiveSession && (
                    <Pill tone="amber">
                      คุณกำลังอัด{" "}
                      {currentUserActiveSession.cameraName ||
                        currentUserActiveSession.cameraPath}
                    </Pill>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setReloadKey((prev) => prev + 1)}
                  disabled={loading}
                  className={outlineButton}
                >
                  <CameraIcon name="reload" />
                  รีโหลดกล้อง
                </button>

                <button
                  type="button"
                  onClick={loadAll}
                  disabled={loading || Boolean(actionLoadingCamera)}
                  className={primaryButton}
                >
                  <span className={loading ? "animate-spin" : ""}>
                    <CameraIcon name="reload" />
                  </span>
                  รีเฟรชข้อมูล
                </button>
              </div>
            </div>
          </section>

          {loading && (
            <section className={cn(cardClass, "mb-5 p-12 text-center")}>
              <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
              <p className="text-sm font-bold text-slate-700">
                กำลังโหลดระบบกล้อง...
              </p>
              <p className="mt-1 text-sm font-medium text-slate-400">
                กรุณารอสักครู่
              </p>
            </section>
          )}

          {!loading && error && (
            <div className="mb-5">
              <AlertBox
                type="error"
                title="พบข้อผิดพลาด"
                message={error}
                onAction={loadAll}
                actionText="ลองใหม่อีกครั้ง"
              />
            </div>
          )}

          {!loading && message && (
            <div className="mb-5">
              <AlertBox type="success" title="แจ้งเตือน" message={message} />
            </div>
          )}

          {!loading && cameras.length === 0 && !error && (
            <div className="mb-5">
              <EmptyBox
                title="ไม่พบข้อมูลกล้อง"
                desc="กรุณาตรวจสอบการตั้งค่ากล้องหรือ API"
              />
            </div>
          )}

          {!loading && cameras.length > 0 && (
            <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className={softCardClass}>
                <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center">
                  <div>
                    <SectionLabel>Main Feed</SectionLabel>

                    <h2 className="mt-2 text-base font-bold tracking-tight text-slate-900">
                      มอนิเตอร์กล้องหลัก
                    </h2>

                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {selectedCamera
                        ? `${selectedCamera.name} • IP: ${
                            selectedCamera.ip || "ไม่ระบุ"
                          }`
                        : "ยังไม่ได้เลือกจอ กรุณาเลือกจาก Camera Wall ด้านล่าง"}
                    </p>
                  </div>

                  <Pill
                    tone={
                      selectedActiveSession
                        ? canStopSelectedSession
                          ? "red"
                          : "amber"
                        : selectedCamera
                        ? "slate"
                        : "blue"
                    }
                  >
                    {selectedActiveSession ? (
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-600" />
                        {canStopSelectedSession
                          ? "RECORDING"
                          : "LOCKED BY OTHER"}
                      </span>
                    ) : selectedCamera ? (
                      "STANDBY"
                    ) : (
                      "WAITING SELECT"
                    )}
                  </Pill>
                </div>

                <div className="bg-slate-950 p-4">
                  <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-slate-800 bg-black shadow-inner">
                    {selectedLiveUrl ? (
                      <iframe
                        key={`selected-main-${selectedCamera?.id}-${reloadKey}`}
                        src={selectedLiveUrl}
                        className="absolute inset-0 h-full w-full border-0"
                        allow="autoplay; fullscreen"
                      />
                    ) : (
                      <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-2 text-center text-slate-400">
                        <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-slate-200">
                          <CameraIcon name="monitor" />
                        </div>

                        <div className="mt-2 text-base font-bold text-slate-200">
                          กรุณาเลือกจอก่อน
                        </div>

                        <div className="max-w-md px-6 text-sm text-slate-500">
                          Main Feed จะยังไม่แสดงวิดีโอ จนกว่าจะเลือกกล้องจาก
                          Camera Wall ด้านล่าง
                        </div>
                      </div>
                    )}

                    {selectedCamera && (
                      <div className="absolute left-4 top-4 z-10 rounded-2xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-bold text-white shadow-sm backdrop-blur-sm">
                        {selectedCamera.name}
                      </div>
                    )}

                    {selectedActiveSession && (
                      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-black/70 px-4 py-2 text-right shadow-lg backdrop-blur-md">
                        <span className="h-3 w-3 animate-pulse rounded-full bg-rose-500" />

                        <div>
                          <p className="font-mono text-xl font-bold tracking-widest text-white">
                            {formatElapsedClock(selectedElapsedSeconds)}
                          </p>

                          <p className="text-[11px] font-medium text-white/70">
                            โดย {getRecordingOwnerText(selectedActiveSession)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <aside className="h-fit">
                <section className={softCardClass}>
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
                    <div>
                      <SectionLabel>Controller</SectionLabel>

                      <h2 className="mt-2 text-base font-bold tracking-tight text-slate-900">
                        แผงควบคุม
                      </h2>
                    </div>

                    <Pill
                      tone={
                        selectedActiveSession
                          ? canStopSelectedSession
                            ? "red"
                            : "amber"
                          : selectedCamera
                          ? "slate"
                          : "blue"
                      }
                    >
                      {selectedActiveSession
                        ? canStopSelectedSession
                          ? "Active"
                          : "Locked"
                        : selectedCamera
                        ? "Ready"
                        : "Select Screen"}
                    </Pill>
                  </div>

                  <div className="p-5">
                    {!selectedCamera ? (
                      <div className="rounded-3xl border border-blue-100 bg-blue-50/80 p-4 text-sm text-blue-900">
                        <div className="font-bold">
                          กรุณาเลือกจอจาก Camera Wall
                        </div>

                        <div className="mt-1 text-xs font-medium leading-relaxed text-blue-700">
                          เมื่อเลือกจอแล้ว ระบบจะแสดง Main Feed และปุ่มเริ่มอัดของจอนั้น
                        </div>
                      </div>
                    ) : selectedActiveSession ? (
                      <div className="space-y-5">
                        <div
                          className={cn(
                            "relative overflow-hidden rounded-3xl border p-5 text-center shadow-inner",
                            canStopSelectedSession
                              ? "border-rose-200 bg-rose-50"
                              : "border-amber-200 bg-amber-50"
                          )}
                        >
                          <div
                            className={cn(
                              "absolute left-0 top-0 h-1 w-full",
                              canStopSelectedSession
                                ? "bg-rose-500"
                                : "bg-amber-500"
                            )}
                          />

                          <h3
                            className={cn(
                              "mb-1 text-sm font-bold",
                              canStopSelectedSession
                                ? "text-rose-800"
                                : "text-amber-900"
                            )}
                          >
                            {canStopSelectedSession
                              ? "กำลังบันทึกวิดีโอ"
                              : "จอนี้มีผู้ใช้อื่นกำลังบันทึกอยู่"}
                          </h3>

                          <p
                            className={cn(
                              "my-3 font-mono text-4xl font-bold tracking-tight",
                              canStopSelectedSession
                                ? "text-rose-700"
                                : "text-amber-800"
                            )}
                          >
                            {formatElapsedClock(selectedElapsedSeconds)}
                          </p>

                          <p
                            className={cn(
                              "text-xs font-bold",
                              canStopSelectedSession
                                ? "text-rose-600"
                                : "text-amber-700"
                            )}
                          >
                            {formatElapsedText(selectedElapsedSeconds)}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <DetailBox
                            label="กล้อง"
                            value={
                              selectedActiveSession.cameraName ||
                              selectedCamera?.name
                            }
                          />

                          <DetailBox
                            label="ประเภท"
                            value={selectedActiveSession.recordTypeLabel}
                          />

                          <DetailBox
                            label="ผู้ทำรายการ"
                            value={getRecordingOwnerText(selectedActiveSession)}
                          />

                          <DetailBox
                            label="วันที่และเวลา"
                            value={formatDateTime(
                              selectedActiveSession.startTime
                            )}
                          />

                          {selectedActiveSession.note && (
                            <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <p className="mb-1 text-xs font-bold text-slate-500">
                                หมายเหตุ
                              </p>

                              <p className="whitespace-pre-wrap text-sm font-medium text-slate-900">
                                {selectedActiveSession.note}
                              </p>
                            </div>
                          )}
                        </div>

                        {canStopSelectedSession ? (
                          <button
                            type="button"
                            onClick={stopRecording}
                            disabled={Boolean(actionLoadingCamera)}
                            className={dangerButton}
                          >
                            {actionLoadingCamera
                              ? "กำลังประมวลผล..."
                              : "ยุติการบันทึก (Stop Recording)"}
                          </button>
                        ) : (
                          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            <div className="font-bold">
                              ไม่สามารถอัดหรือหยุดจอนี้ได้
                            </div>

                            <div className="mt-1">
                              {selectedCamera?.name} กำลังถูกอัดโดย{" "}
                              <span className="font-bold">
                                {getRecordingOwnerText(selectedActiveSession)}
                              </span>
                            </div>

                            <div className="mt-2 text-xs font-medium leading-relaxed text-amber-700">
                              กรุณาเลือกกล้องอื่นเพื่อเริ่มอัด ผู้ใช้หลายคนสามารถอัดพร้อมกันได้ แต่ต้องเป็นคนละจอ
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <DetailBox
                          label="อุปกรณ์ที่เลือก"
                          value={selectedCamera?.name || "ยังไม่ได้เลือกกล้อง"}
                        />

                        {currentUserIsRecordingAnotherCamera && (
                          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            <div className="font-bold">
                              คุณกำลังอัดอีกจออยู่
                            </div>

                            <div className="mt-1 text-xs font-medium leading-relaxed">
                              คุณกำลังอัด{" "}
                              <span className="font-bold">
                                {currentUserActiveSession.cameraName ||
                                  currentUserActiveSession.cameraPath}
                              </span>{" "}
                              กรุณาหยุดรายการเดิมก่อนเริ่มอัดจอใหม่
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
                            ประเภทการทำรายการ{" "}
                            <span className="text-rose-500">*</span>
                          </label>

                          <select
                            value={form.recordType}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                recordType: e.target.value,
                              }))
                            }
                            className={cn(inputClass, "block w-full")}
                          >
                            <option value="INBOUND">
                              รับเข้าสินค้า (Inbound)
                            </option>
                            <option value="OUTBOUND">
                              ส่งออกสินค้า (Outbound)
                            </option>
                          </select>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          <DetailBox
                            label="ผู้ทำรายการ"
                            value={getDisplayName(currentUser) || "-"}
                          />

                          <DetailBox label="วันที่และเวลา" value={nowText} />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
                            หมายเหตุ / เลขที่เอกสาร
                          </label>

                          <textarea
                            value={form.note}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                note: e.target.value,
                              }))
                            }
                            rows={4}
                            placeholder="ระบุรายละเอียดเพิ่มเติม..."
                            className={cn(inputClass, "block w-full resize-none")}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={startRecording}
                          disabled={startButtonDisabled}
                          className={cn(primaryButton, "h-auto w-full py-3.5")}
                        >
                          {getStartButtonText()}
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              </aside>
            </section>
          )}

          {!loading && cameras.length > 0 && (
            <section className={softCardClass}>
              <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center">
                <div>
                  <SectionLabel>Camera Wall</SectionLabel>

                  <h2 className="mt-2 text-base font-bold tracking-tight text-slate-900">
                    Camera Monitoring Wall
                  </h2>

                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Live Grid 6 Channels
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">
                    Online Monitor
                  </span>

                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                </div>
              </div>

              <div className="grid w-full grid-cols-1 gap-3 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {cameras.slice(0, 6).map((camera) => {
                  const activeSession = getActiveSessionForCamera(
                    activeSessions,
                    camera
                  );

                  const isRecording = Boolean(activeSession);
                  const isSelected = selectedCamera?.id === camera.id;

                  const lockedByOther = isCameraLockedByOtherUser(
                    activeSessions,
                    camera,
                    currentUser
                  );

                  const isOwnerRecording =
                    isRecording && isSessionOwner(activeSession, currentUser);

                  const elapsedSeconds = isRecording
                    ? getElapsedSeconds(activeSession.startTime, clockTick)
                    : 0;

                  const liveUrl = buildCameraStreamUrl(camera, reloadKey);

                  return (
                    <button
                      key={camera.id}
                      type="button"
                      onClick={() => selectCamera(camera)}
                      disabled={lockedByOther}
                      className={cn(
                        "group relative aspect-video w-full overflow-hidden rounded-3xl border bg-black text-left shadow-sm transition focus:outline-none focus:ring-4 focus:ring-blue-100/70",
                        isSelected && !lockedByOther
                          ? "border-blue-300 ring-4 ring-blue-100"
                          : "border-slate-200",
                        lockedByOther
                          ? "cursor-not-allowed"
                          : "cursor-pointer hover:border-blue-200"
                      )}
                    >
                      {liveUrl ? (
                        <iframe
                          key={`wall-${camera.id}-${reloadKey}`}
                          src={liveUrl}
                          className={cn(
                            "pointer-events-none h-full w-full transition-opacity duration-300",
                            lockedByOther
                              ? "opacity-35 grayscale"
                              : "opacity-80 group-hover:opacity-100"
                          )}
                          allow="autoplay; fullscreen"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-950 text-xs font-bold text-slate-400">
                          ไม่พบ URL กล้อง
                        </div>
                      )}

                      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/70 px-3 py-1.5 text-[12px] font-bold text-white backdrop-blur-sm">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            isSelected && !lockedByOther
                              ? "bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,1)]"
                              : lockedByOther
                              ? "bg-amber-400"
                              : "bg-slate-500"
                          )}
                        />
                        {camera.name}
                      </div>

                      {isRecording && (
                        <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-2xl border border-rose-400/50 bg-rose-600/90 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg backdrop-blur-sm">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                          REC {formatElapsedClock(elapsedSeconds)}
                        </div>
                      )}

                      {isRecording && !lockedByOther && (
                        <div
                          className={cn(
                            "absolute right-4 top-14 max-w-[75%] truncate rounded-2xl px-3 py-1 text-[11px] font-bold text-white",
                            isOwnerRecording
                              ? "bg-rose-700/90"
                              : "bg-slate-700/90"
                          )}
                        >
                          โดย {getRecordingOwnerText(activeSession)}
                        </div>
                      )}

                      {lockedByOther && (
                        <>
                          <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-[1px]" />

                          <div className="absolute left-4 top-4 z-30 rounded-2xl bg-amber-400 px-3 py-1 text-[11px] font-black text-slate-950">
                            LOCKED
                          </div>

                          <div className="absolute inset-x-4 bottom-4 z-30 rounded-3xl border border-amber-300/60 bg-black/80 p-3 text-left text-white shadow-lg">
                            <div className="text-xs font-bold text-amber-300">
                              จอนี้กำลังถูกใช้งาน
                            </div>

                            <div className="mt-1 truncate text-[11px] font-medium text-white/80">
                              อัดโดย {getRecordingOwnerText(activeSession)}
                            </div>

                            <div className="mt-1 text-[11px] font-medium text-white/60">
                              ไม่สามารถกดเข้าจอนี้ได้
                            </div>
                          </div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>
    </AppShell>
  );
}

function CameraIcon({ name }) {
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

  if (name === "camera") {
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

  if (name === "monitor") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
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