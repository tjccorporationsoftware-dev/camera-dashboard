"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "../components/AppShell";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from "recharts";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL 
).replace(/\/$/, "");

const ALL_COMPANIES = "__ALL_COMPANIES__";
const PAGE_SIZE = 60;

const CATEGORY_MAPPING = {
  AG: "เกษตร",
  CS: "ก่อสร้าง",
  ED: "สื่อการสอน",
  EL: "งานไฟฟ้า",
  FT: "เฟอร์นิเจอร์",
  HA: "ครัวเรือน",
  IT: "เทคโนโลยี",
  MA: "เครื่องจักร",
  MD: "อุปกรณ์การแพทย์",
  MS: "เวชภัณฑ์",
  MU: "ดนตรี",
  OE: "อุปกรณ์ที่ใช้ในสำนักงาน",
  OS: "วัสดุสำนักงาน",
  SA: "สุขภัณฑ์",
  SC: "โซล่าเซลล์",
  SI: "วิทยาศาสตร์",
  SP: "กีฬา",
  TO: "เครื่องมือช่าง",
};

const CHART_COLORS = [
  "#3b82f6",
  "#14b8a6",
  "#8b5cf6",
  "#f59e0b",
  "#22c55e",
  "#06b6d4",
  "#64748b",
  "#ec4899",
  "#ef4444",
  "#6366f1",
  "#84cc16",
  "#f97316",
];

const APP_FONT_FAMILY =
  '"Noto Sans Thai", "IBM Plex Sans", "Segoe UI", system-ui, -apple-system, sans-serif';

const CHART_TICK_STYLE = {
  fill: "#64748b",
  fontWeight: 600,
  fontFamily: APP_FONT_FAMILY,
  fontSize: 11,
};

const IMPORT_MODE = "REPLACE_COMPANY_STOCK";

const METRIC_OPTIONS = [
  { key: "count", label: "จำนวนรายการ", shortLabel: "รายการ" },
  { key: "totalQty", label: "ยอดคงเหลือ", shortLabel: "คงเหลือ" },
];

const ACCESS_TOKEN_KEY = "camera_access_token";

const COMPANY_LOGOS = {
  ART: "/company-logos/logo_art.jpg",
  ASC: "/company-logos/ascent.png",
  TJ: "/company-logos/logo_tangjai.png",
  TJC: "/company-logos/tjc-logo.jpg",
};

function getCompanyLogoUrl(companyOrCode) {
  const rawCode =
    typeof companyOrCode === "string"
      ? companyOrCode
      : companyOrCode?.code || "";

  const code = String(rawCode || "").trim().toUpperCase();

  if (!code || code === ALL_COMPANIES) return "";

  if (typeof companyOrCode === "object") {
    return (
      companyOrCode.logoUrl ||
      companyOrCode.logo ||
      companyOrCode.logoPath ||
      COMPANY_LOGOS[code] ||
      `/company-logos/${code.toLowerCase()}.png`
    );
  }

  return COMPANY_LOGOS[code] || `/company-logos/${code.toLowerCase()}.png`;
}

function getCompanyInitials(code, name) {
  const safeCode = String(code || "").trim().toUpperCase();

  if (safeCode === ALL_COMPANIES) return "ALL";
  if (safeCode) return safeCode.slice(0, 3);

  return String(name || "CO")
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const pageContainer = "min-h-screen bg-slate-50 text-slate-900";

const cardClass =
  "rounded-3xl border border-slate-200 bg-white shadow-sm";

const chartCard =
  "overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm";

const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300";

const outlineButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

const ghostButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

const inputClass =
  "h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100/70";

function formatNumber(value) {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getMetricUnit(metricKey) {
  const units = {
    count: "รายการ",
    totalQty: "หน่วย",
    totalValue: "บาท",
    chartValue: "",
    totalRows: "แถว",
    importedRows: "แถว",
    errorRows: "แถว",
  };

  return units[metricKey] || "";
}

function formatChartValueWithUnit(metricKey, value) {
  const number = Number(value || 0);
  if (number === 0) return "";

  const unit = getMetricUnit(metricKey);
  const formatted =
    metricKey === "totalValue" ? formatMoney(number) : formatNumber(number);

  return unit ? `${formatted} ${unit}` : formatted;
}

function formatAxisNumber(value) {
  const number = Number(value || 0);

  if (Math.abs(number) >= 1000000) {
    return `${(number / 1000000).toLocaleString("th-TH", {
      maximumFractionDigits: 1,
    })}M`;
  }

  if (Math.abs(number) >= 1000) {
    return `${(number / 1000).toLocaleString("th-TH", {
      maximumFractionDigits: 0,
    })}K`;
  }

  return formatNumber(number);
}

function normalizeSku(value) {
  return String(value || "").trim().toUpperCase();
}

function getCategoryCodeFromSku(sku) {
  const text = normalizeSku(sku);
  if (!text) return "";

  const match = text.match(/^([A-Z]{2})(?:[\s_.-]|\d|$)/);
  if (!match) return "";

  const code = match[1];
  return CATEGORY_MAPPING[code] ? code : "";
}

function getProductCategoryCode(product) {
  return (
    String(product?.categoryCode || "").trim().toUpperCase() ||
    getCategoryCodeFromSku(product?.sku)
  );
}

function getProductCategoryName(product) {
  const code = getProductCategoryCode(product);
  return product?.category || CATEGORY_MAPPING[code] || "ไม่ระบุหมวด";
}

function buildSummary(rows = []) {
  const totalRows = rows.length;

  const totalQty = rows.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const totalValue = rows.reduce(
    (sum, item) => sum + Number(item.totalCost || item.totalValue || 0),
    0
  );

  const uniqueSku = new Set(
    rows.map((item) => String(item.sku || "").trim()).filter(Boolean)
  ).size;

  const categories = new Set(
    rows.map((item) => item.categoryCode || "").filter(Boolean)
  ).size;

  return {
    totalRows,
    totalQty,
    totalValue,
    uniqueSku,
    categories,
  };
}

function buildCategorySummary(rows = []) {
  const summary = new Map();

  for (const row of rows) {
    const code = row.categoryCode || "UNKNOWN";
    const name = row.categoryName || "ไม่ระบุหมวด";

    if (!summary.has(code)) {
      summary.set(code, {
        code,
        name,
        count: 0,
        totalQty: 0,
        totalValue: 0,
      });
    }

    const item = summary.get(code);
    item.count += 1;
    item.totalQty += Number(row.quantity || 0);
    item.totalValue += Number(row.totalCost || row.totalValue || 0);
  }

  return Array.from(summary.values()).sort(
    (a, b) => b.count - a.count || String(a.code).localeCompare(String(b.code))
  );
}

function buildTopItemData(rows = [], metricKey = "totalValue", limit = 10) {
  const map = new Map();

  for (const row of rows) {
    const sku = String(row.sku || "-").trim() || "-";
    const name = String(row.name || "-").trim() || "-";
    const companyCode = String(row.companyCode || "").trim();
    const key = `${companyCode}-${sku}-${name}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        sku,
        name,
        companyCode,
        label: sku.length > 18 ? `${sku.slice(0, 18)}…` : sku,
        count: 0,
        totalQty: 0,
        totalValue: 0,
      });
    }

    const item = map.get(key);
    item.count += 1;
    item.totalQty += Number(row.quantity || 0);
    item.totalValue += Number(row.totalCost || row.totalValue || 0);
  }

  return Array.from(map.values())
    .sort(
      (a, b) =>
        Number(b[metricKey] || 0) - Number(a[metricKey] || 0) ||
        b.totalQty - a.totalQty
    )
    .slice(0, limit);
}

function getAuthHeaders() {
  if (typeof window === "undefined") return {};

  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;

  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  if (!res.ok) {
    const message =
      data?.message || data?.error || `เกิดข้อผิดพลาดจาก API สถานะ ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

function formatTooltipValue(metricKey, value) {
  if (metricKey === "totalValue") return formatMoney(value);
  return formatNumber(value);
}

function DashboardTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const source = payload[0]?.payload;

  return (
    <div
      style={{ fontFamily: APP_FONT_FAMILY }}
      className="min-w-[250px] rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-lg shadow-slate-200/70"
    >
      <div className="mb-3 border-b border-slate-100 pb-2">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">
          {label || source?.label || "ข้อมูล"}
        </div>

        {source?.name && (
          <div className="mt-1 text-sm font-bold leading-snug text-slate-900">
            {source.companyCode ? `${source.companyCode} · ` : ""}
            {source.name}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {payload.map((entry, index) => {
          const metricKey = source?.unitKey || entry.dataKey;
          const unit = getMetricUnit(metricKey);

          return (
            <div
              key={`${entry.name}-${index}`}
              className="flex items-center gap-3"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />

              <span className="text-xs font-semibold text-slate-500">
                {entry.name}
              </span>

              <span className="ml-auto text-sm font-bold tabular-nums text-slate-900">
                {formatTooltipValue(metricKey, entry.value)}
                {unit ? ` ${unit}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function InventoryDashboardPage() {
  const fileInputRef = useRef(null);

  const [companies, setCompanies] = useState([]);
  const [companyData, setCompanyData] = useState({});
  const [selectedCompanyCode, setSelectedCompanyCode] =
    useState(ALL_COMPANIES);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState("ALL");
  const [mainMetric, setMainMetric] = useState("count");
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [file, setFile] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadCompanyCode, setUploadCompanyCode] = useState("");
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAllCompaniesSelected = selectedCompanyCode === ALL_COMPANIES;

  const selectedCompany = useMemo(() => {
    if (selectedCompanyCode === ALL_COMPANIES) {
      return {
        code: ALL_COMPANIES,
        name: "ภาพรวมทุกบริษัท",
      };
    }

    return companies.find((item) => item.code === selectedCompanyCode) || null;
  }, [companies, selectedCompanyCode]);

  const uploadCompany = useMemo(
    () => companies.find((item) => item.code === uploadCompanyCode) || null,
    [companies, uploadCompanyCode]
  );

  const allRows = useMemo(() => {
    return companies.flatMap((company) => {
      const rows = companyData[company.code]?.rows || [];

      return rows.map((row) => {
        const categoryCode = getProductCategoryCode(row);
        const categoryName = getProductCategoryName({
          ...row,
          categoryCode,
        });

        return {
          ...row,
           companyCode: company.code,
  companyName: company.name,
  companyLogoUrl: getCompanyLogoUrl(company),
  categoryCode,
  categoryName,
        };
      });
    });
  }, [companies, companyData]);

  const globalSummary = useMemo(() => buildSummary(allRows), [allRows]);

  const companySummaries = useMemo(() => {
    return companies.map((company) => {
      const rows = allRows.filter((row) => row.companyCode === company.code);

      return {
        company,
        rows,
        summary: buildSummary(rows),
        categorySummary: buildCategorySummary(rows),
        latestBatch: companyData[company.code]?.latestBatch || null,
        batches: companyData[company.code]?.batches || [],
      };
    });
  }, [allRows, companies, companyData]);

  const selectedViewRows = useMemo(() => {
    if (!selectedCompanyCode) return [];
    if (selectedCompanyCode === ALL_COMPANIES) return allRows;

    return allRows.filter((row) => row.companyCode === selectedCompanyCode);
  }, [allRows, selectedCompanyCode]);

  const selectedViewSummary = useMemo(
    () => buildSummary(selectedViewRows),
    [selectedViewRows]
  );

  const selectedViewCategorySummary = useMemo(
    () => buildCategorySummary(selectedViewRows),
    [selectedViewRows]
  );

  const selectedCategoryName = useMemo(() => {
    if (selectedCategoryCode === "ALL") return "ทุกหมวดหมู่";
    if (selectedCategoryCode === "UNKNOWN") return "ไม่ระบุหมวด";

    return CATEGORY_MAPPING[selectedCategoryCode] || selectedCategoryCode;
  }, [selectedCategoryCode]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return selectedViewRows.filter((row) => {
      const categoryMatched =
        selectedCategoryCode === "ALL" ||
        (selectedCategoryCode === "UNKNOWN" && !row.categoryCode) ||
        row.categoryCode === selectedCategoryCode;

      if (!categoryMatched) return false;
      if (!q) return true;

      const searchable = [
        row.rowNo,
        row.sku,
        row.name,
        row.companyCode,
        row.companyName,
        row.categoryCode,
        row.categoryName,
        row.brand,
        row.model,
        row.spec,
        row.unit,
        row.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(q);
    });
  }, [selectedViewRows, selectedCategoryCode, search]);

  const visibleSummary = useMemo(() => buildSummary(visibleRows), [visibleRows]);

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const tableStartIndex = (safeCurrentPage - 1) * PAGE_SIZE;

  const paginatedRows = useMemo(
    () => visibleRows.slice(tableStartIndex, tableStartIndex + PAGE_SIZE),
    [visibleRows, tableStartIndex]
  );

  const hasStockValue = useMemo(
    () =>
      selectedViewRows.some(
        (item) => Number(item.totalCost || item.totalValue || 0) > 0
      ),
    [selectedViewRows]
  );

  const mainChartData = useMemo(() => {
    const rows = isAllCompaniesSelected
      ? companySummaries.map((item, index) => ({
          label: item.company.code,
          name: item.company.name,
          count: item.summary.totalRows,
          totalQty: item.summary.totalQty,
          totalValue: item.summary.totalValue,
          color: CHART_COLORS[index % CHART_COLORS.length],
        }))
      : selectedViewCategorySummary.slice(0, 12).map((item, index) => ({
          label: item.code,
          name: item.name,
          count: item.count,
          totalQty: item.totalQty,
          totalValue: item.totalValue,
          color: CHART_COLORS[index % CHART_COLORS.length],
        }));

    return rows
      .sort((a, b) => Number(b[mainMetric] || 0) - Number(a[mainMetric] || 0))
      .slice(0, 12);
  }, [
    companySummaries,
    isAllCompaniesSelected,
    selectedViewCategorySummary,
    mainMetric,
  ]);

  const selectedMetricOption = useMemo(
    () => METRIC_OPTIONS.find((item) => item.key === mainMetric),
    [mainMetric]
  );

  const donutMetric = hasStockValue ? "totalValue" : "count";
  const donutMetricName = hasStockValue ? "มูลค่า" : "จำนวนรายการ";

  const donutData = useMemo(() => {
    return selectedViewCategorySummary.map((item, index) => ({
      ...item,
      chartValue: Number(item[donutMetric] || 0),
      unitKey: donutMetric,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [donutMetric, selectedViewCategorySummary]);

  const donutChartData = useMemo(() => {
    return donutData.slice(0, 8);
  }, [donutData]);

  const donutTotal = useMemo(() => {
    return donutData.reduce(
      (sum, item) => sum + Number(item.chartValue || 0),
      0
    );
  }, [donutData]);

  const topItemMetric = hasStockValue ? "totalValue" : "totalQty";
  const topItemMetricName = hasStockValue ? "มูลค่า" : "คงเหลือ";

  const topItemData = useMemo(() => {
    return buildTopItemData(selectedViewRows, topItemMetric, 10).map(
      (item, index) => ({
        ...item,
        color: CHART_COLORS[index % CHART_COLORS.length],
      })
    );
  }, [selectedViewRows, topItemMetric]);

  const selectedBatches = useMemo(() => {
    if (isAllCompaniesSelected) {
      return companies
        .flatMap((company) => {
          const batches = companyData[company.code]?.batches || [];

          return batches.map((batch) => ({
            ...batch,
            companyCode: company.code,
          }));
        })
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return companyData[selectedCompanyCode]?.batches || [];
  }, [companies, companyData, isAllCompaniesSelected, selectedCompanyCode]);

  const importQualityData = useMemo(() => {
    return [...selectedBatches]
      .slice(0, 8)
      .reverse()
      .map((batch, index) => ({
        name: isAllCompaniesSelected
          ? `${batch.companyCode || "-"}-${index + 1}`
          : `${index + 1}`,
        totalRows: Number(batch.totalRows || 0),
        importedRows: Number(batch.importedRows || 0),
        errorRows: Number(batch.errorRows || 0),
      }));
  }, [isAllCompaniesSelected, selectedBatches]);

  async function loadCompanies() {
    try {
      setError("");
      setLoadingCompanies(true);

      const data = await apiFetch("/inventory/companies");
      const list = Array.isArray(data?.data) ? data.data : [];

      setCompanies(list);
      setSelectedCompanyCode((prev) => prev || ALL_COMPANIES);
      setUploadCompanyCode((prev) => prev || list[0]?.code || "");

      await loadDashboardData(list);
    } catch (err) {
      setError(
        err.status === 401
          ? "กรุณาเข้าสู่ระบบก่อนใช้งาน"
          : err.message || "โหลดข้อมูลไม่สำเร็จ"
      );
    } finally {
      setLoadingCompanies(false);
    }
  }

  async function loadDashboardData(companyList = companies) {
    if (!companyList.length) {
      setCompanyData({});
      return;
    }

    try {
      setLoadingDashboard(true);

      const entries = await Promise.all(
        companyList.map(async (company) => {
          const [rowsPayload, batchesPayload] = await Promise.all([
            apiFetch(
              `/inventory/${encodeURIComponent(
                company.code
              )}/excel-rows?limit=10000&batchId=latest`
            ),
            apiFetch(
              `/inventory/${encodeURIComponent(company.code)}/import-batches`
            ),
          ]);

          return [
            company.code,
            {
              rows: Array.isArray(rowsPayload?.data) ? rowsPayload.data : [],
              latestBatch: rowsPayload?.meta?.batch || null,
              batches: Array.isArray(batchesPayload?.data)
                ? batchesPayload.data
                : [],
            },
          ];
        })
      );

      setCompanyData(Object.fromEntries(entries));
    } catch (err) {
      setError(
        err.status === 401
          ? "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่"
          : err.message || "โหลดข้อมูลไม่สำเร็จ"
      );
    } finally {
      setLoadingDashboard(false);
    }
  }

  function validateAndSetFile(nextFile) {
    if (!nextFile) return;

    const ext = nextFile.name.split(".").pop()?.toLowerCase();

    if (!["xls", "xlsx"].includes(ext)) {
      setError("รองรับเฉพาะไฟล์ .xls และ .xlsx");
      return;
    }

    setFile(nextFile);
    setError("");
    setSuccess("");
  }

  function clearUploadFile() {
    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function openUploadModal(companyCode = selectedCompanyCode) {
    const code =
      companyCode && companyCode !== ALL_COMPANIES
        ? companyCode
        : companies[0]?.code || "";

    setUploadCompanyCode(code);
    setFile(null);
    setError("");
    setSuccess("");
    setIsUploadOpen(true);

    setTimeout(() => {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }, 0);
  }

  function closeUploadModal() {
    if (uploading) return;

    setIsUploadOpen(false);
    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!uploadCompanyCode) {
      setError("กรุณาเลือกบริษัท");
      return;
    }

    if (!file) {
      setError("กรุณาเลือกไฟล์ Excel");
      return;
    }

    const confirmed = window.confirm(
      `ระบบจะรีเซ็ตสินค้าที่ไม่มีในไฟล์เป็น 0 เฉพาะของบริษัท ${
        uploadCompany?.name || uploadCompanyCode
      }\nยืนยันดำเนินการ?`
    );

    if (!confirmed) return;

    try {
      setUploading(true);
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("file", file);

      const data = await apiFetch(
        `/inventory/${encodeURIComponent(
          uploadCompanyCode
        )}/import-excel?mode=${encodeURIComponent(IMPORT_MODE)}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = data?.data;

      setSelectedCompanyCode(uploadCompanyCode);
      setSelectedCategoryCode("ALL");
      setSearch("");
      setCurrentPage(1);

      setSuccess(
        `นำเข้าสำเร็จ: ${result?.importedRows ?? 0} จาก ${
          result?.totalRows ?? 0
        } แถว`
      );

      setIsUploadOpen(false);
      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadDashboardData(companies);
    } catch (err) {
      setError(
        err.status === 401 ? "Session หมดอายุ" : err.message || "นำเข้าไม่สำเร็จ"
      );
    } finally {
      setUploading(false);
    }
  }

  function handleCompanyChange(companyCode) {
    setSelectedCompanyCode(companyCode);
    setSelectedCategoryCode("ALL");
    setSearch("");
    setCurrentPage(1);
    setError("");
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCompanyCode, selectedCategoryCode, search]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <AppShell>
      <div className={pageContainer} style={{ fontFamily: APP_FONT_FAMILY }}>
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex min-h-[76px] max-w-[1720px] items-center justify-between px-8">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="13" rx="2" />
                  <path d="M8 21h8" />
                  <path d="M12 17v4" />
                  <path d="M7 12l3-3 3 2 4-5" />
                </svg>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">
                    Inventory Management Dashboard
                  </h1>

                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Clean View
                  </span>
                </div>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  ภาพรวมสินค้า คลังคงเหลือ หมวดหมู่ และคุณภาพการนำเข้าข้อมูล
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-430 px-8 py-8">
          {(error || success) && (
            <div className="mb-5 space-y-2">
              {error && (
                <AlertBox
                  type="error"
                  title="ข้อผิดพลาด"
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
            </div>
          )}

          <section className={cn(cardClass, "mb-5 overflow-hidden")}>
            <div className="border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <SectionLabel>Company Overview</SectionLabel>
                  <h2 className="mt-2 text-base font-bold tracking-tight text-slate-900">
                    ภาพรวมบริษัทและคลังสินค้า
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    เลือกดูภาพรวมทุกบริษัท หรือเจาะจงรายบริษัทเพื่อวิเคราะห์ข้อมูล
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600">
                  {selectedCompany?.name || "ภาพรวมทุกบริษัท"}
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-5">
                {loadingCompanies ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-42 animate-pulse rounded-3xl border border-slate-200 bg-slate-100"
                    />
                  ))
                ) : (
                  <>
                    <CompanyCard
                      item={{
                        company: {
                          code: ALL_COMPANIES,
                          name: "รวมทุกบริษัท",
                        },
                        summary: globalSummary,
                      }}
                      active={selectedCompanyCode === ALL_COMPANIES}
                      onClick={() => handleCompanyChange(ALL_COMPANIES)}
                      onUpload={null}
                    />

                    {companySummaries.map((item) => (
                      <CompanyCard
                        key={item.company.code}
                        item={item}
                        active={selectedCompanyCode === item.company.code}
                        onClick={() => handleCompanyChange(item.company.code)}
                        onUpload={() => openUploadModal(item.company.code)}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>
          </section>

          <section className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
            <MetricCard
              label="รายการที่แสดงผล"
              value={formatNumber(visibleSummary.totalRows)}
              desc={selectedCategoryName}
              tone="blue"
              icon="list"
            />

            <MetricCard
              label="ยอดคงเหลือรวม"
              value={formatNumber(visibleSummary.totalQty)}
              desc="จำนวนสินค้าในคลัง"
              tone="emerald"
              icon="box"
            />

            <MetricCard
              label="จำนวน SKU"
              value={formatNumber(selectedViewSummary.uniqueSku)}
              desc="รหัสสินค้าที่ไม่ซ้ำ"
              tone="violet"
              icon="barcode"
            />

            <MetricCard
              label="หมวดหมู่"
              value={formatNumber(selectedViewSummary.categories)}
              desc={isAllCompaniesSelected ? "รวมทุกบริษัท" : "เฉพาะบริษัทนี้"}
              tone="slate"
              icon="grid"
            />
          </section>

          <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.55fr_1fr]">
            <div className={chartCard}>
              <ChartHeader
                eyebrow="Comparative Analysis"
                title={
                  isAllCompaniesSelected
                    ? "เปรียบเทียบข้อมูลแยกตามบริษัท"
                    : "เปรียบเทียบข้อมูลแยกตามหมวดหมู่"
                }
                desc={`จัดอันดับจากมากไปน้อย · หน่วย: ${
                  getMetricUnit(mainMetric) || "-"
                }`}
                right={
                  <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                    {METRIC_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        className={cn(
                          "rounded-xl px-3 py-1.5 text-xs font-bold transition",
                          mainMetric === opt.key
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-blue-700"
                        )}
                        onClick={() => setMainMetric(opt.key)}
                        type="button"
                      >
                        {opt.shortLabel}
                      </button>
                    ))}
                  </div>
                }
              />

              <div className="h-[380px] px-4 pb-5">
                {mainChartData.length === 0 ? (
                  <EmptyChart label="ไม่มีข้อมูล" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={mainChartData}
                      layout="vertical"
                      margin={{ top: 8, right: 100, left: 18, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 6"
                        horizontal={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        type="number"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={formatAxisNumber}
                        tick={CHART_TICK_STYLE}
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={92}
                        tickLine={false}
                        axisLine={false}
                        tick={{
                          ...CHART_TICK_STYLE,
                          fill: "#334155",
                          fontWeight: 700,
                        }}
                      />
                      <Tooltip
                        content={<DashboardTooltip />}
                        cursor={{ fill: "rgba(59,130,246,0.06)" }}
                      />
                      <Bar
                        dataKey={mainMetric}
                        name={selectedMetricOption?.label || "จำนวน"}
                        radius={[0, 12, 12, 0]}
                        barSize={17}
                      >
                        <LabelList
                          dataKey={mainMetric}
                          position="right"
                          formatter={(v) =>
                            formatChartValueWithUnit(mainMetric, v)
                          }
                          fontSize={10}
                          fill="#334155"
                          fontWeight={700}
                          fontFamily={APP_FONT_FAMILY}
                        />

                        {mainChartData.map((entry, index) => (
                          <Cell
                            key={entry.label}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className={chartCard}>
              <ChartHeader
                eyebrow="Category Distribution"
                title="สัดส่วนหมวดหมู่สินค้า"
                desc={`แสดงสัดส่วนตามหมวดหมู่ · หน่วย: ${
                  getMetricUnit(donutMetric) || "-"
                }`}
              />

              <div className="grid gap-5 px-4 pb-5 pt-4 2xl:grid-cols-[220px_1fr]">
                <div className="relative mx-auto h-[220px] w-[220px] rounded-full bg-white p-2 ring-1 ring-slate-100">
                  {donutChartData.length === 0 ? (
                    <EmptyChart label="ไม่มีข้อมูล" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutChartData}
                          dataKey="chartValue"
                          nameKey="code"
                          innerRadius={72}
                          outerRadius={96}
                          stroke="#ffffff"
                          strokeWidth={4}
                          paddingAngle={3}
                          cornerRadius={7}
                        >
                          {donutChartData.map((entry, index) => (
                            <Cell
                              key={entry.code}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>

                        <Tooltip content={<DashboardTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}

                  {donutData.length > 0 && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
                        {donutMetricName}
                      </span>

                      <span className="mt-1 text-2xl font-bold text-slate-900">
                        {formatAxisNumber(donutTotal)}
                      </span>

                      <span className="mt-1 text-[10px] font-medium text-slate-400">
                        {formatNumber(donutData.length)} หมวดหมู่
                      </span>
                    </div>
                  )}
                </div>

                <DonutLegend data={donutData} metricKey={donutMetric} />
              </div>
            </div>
          </section>

          <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <div className={chartCard}>
              <ChartHeader
                eyebrow="Top Inventory"
                title={
                  hasStockValue
                    ? "สินค้ามูลค่าสูงสุด 10 อันดับ"
                    : "สินค้าคงเหลือสูงสุด 10 อันดับ"
                }
                desc={`จัดอันดับตาม ${topItemMetricName} · หน่วย: ${
                  getMetricUnit(topItemMetric) || "-"
                }`}
              />

              <div className="h-[380px] px-4 pb-5">
                {topItemData.length === 0 ? (
                  <EmptyChart label="ไม่มีข้อมูลสินค้า" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topItemData}
                      layout="vertical"
                      margin={{ top: 8, right: 108, left: 18, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 6"
                        horizontal={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        type="number"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={formatAxisNumber}
                        tick={CHART_TICK_STYLE}
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={112}
                        tickLine={false}
                        axisLine={false}
                        tick={{
                          ...CHART_TICK_STYLE,
                          fill: "#334155",
                          fontWeight: 700,
                        }}
                      />
                      <Tooltip
                        content={<DashboardTooltip />}
                        cursor={{ fill: "rgba(59,130,246,0.06)" }}
                      />
                      <Bar
                        dataKey={topItemMetric}
                        name={topItemMetricName}
                        radius={[0, 12, 12, 0]}
                        barSize={17}
                      >
                        <LabelList
                          dataKey={topItemMetric}
                          position="right"
                          formatter={(v) =>
                            formatChartValueWithUnit(topItemMetric, v)
                          }
                          fontSize={10}
                          fill="#334155"
                          fontWeight={700}
                          fontFamily={APP_FONT_FAMILY}
                        />

                        {topItemData.map((entry, index) => (
                          <Cell
                            key={entry.key}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className={chartCard}>
              <ChartHeader
                eyebrow="Import Quality"
                title="คุณภาพการนำเข้าข้อมูล"
                desc="เปรียบเทียบจำนวนแถวที่สำเร็จและผิดพลาด"
              />

              <div className="h-[380px] px-4 pb-5">
                {importQualityData.length === 0 ? (
                  <EmptyChart label="ไม่มีประวัติ" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={importQualityData}
                      margin={{ top: 24, right: 16, left: -14, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 6"
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tick={CHART_TICK_STYLE}
                        dy={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={formatAxisNumber}
                        tick={CHART_TICK_STYLE}
                      />
                      <Tooltip
                        content={<DashboardTooltip />}
                        cursor={{ fill: "rgba(59,130,246,0.06)" }}
                      />
                      <Legend
                        wrapperStyle={{
                          fontSize: 12,
                          paddingTop: 12,
                          fontWeight: 700,
                          color: "#475569",
                          fontFamily: APP_FONT_FAMILY,
                        }}
                        iconType="circle"
                        iconSize={8}
                      />
                      <Bar
                        dataKey="importedRows"
                        name="สำเร็จ"
                        stackId="import"
                        fill="#22c55e"
                        barSize={30}
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="errorRows"
                        name="ผิดพลาด"
                        stackId="import"
                        fill="#ef4444"
                        radius={[10, 10, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>

          <section className={cn(cardClass, "overflow-hidden")}>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <SectionLabel>Product Database</SectionLabel>

                <h2 className="mt-2 text-base font-bold tracking-tight text-slate-900">
                  ฐานข้อมูลสินค้า
                </h2>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-600">
                    {selectedCompany?.name || "-"}
                  </span>

                  <span className="text-slate-300">/</span>

                  <span className="font-medium text-slate-500">
                    {selectedCategoryName}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <select
                    value={selectedCategoryCode}
                    onChange={(e) => setSelectedCategoryCode(e.target.value)}
                    className={cn(inputClass, "w-[240px] appearance-none pr-9")}
                  >
                    <option value="ALL">ทุกหมวดหมู่</option>

                    {selectedViewCategorySummary.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name} ({c.count})
                      </option>
                    ))}

                    <option value="UNKNOWN">ไม่ระบุหมวด</option>
                  </select>

                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    ▼
                  </div>
                </div>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหารหัส, ชื่อ, รุ่น..."
                  className={cn(inputClass, "w-[280px]")}
                />

                <button
                  type="button"
                  className={ghostButton}
                  onClick={() => {
                    setSearch("");
                    setSelectedCategoryCode("ALL");
                  }}
                >
                  ล้างค่า
                </button>
              </div>
            </div>

            <InventoryTable
              loading={loadingDashboard}
              rows={paginatedRows}
              startIndex={tableStartIndex}
            />

            <PaginationBar
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalRows={visibleRows.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </section>
        </main>

        {isUploadOpen && (
          <UploadModal
            companies={companies}
            uploadCompanyCode={uploadCompanyCode}
            setUploadCompanyCode={setUploadCompanyCode}
            uploading={uploading}
            closeUploadModal={closeUploadModal}
            handleUpload={handleUpload}
            file={file}
            fileInputRef={fileInputRef}
            validateAndSetFile={validateAndSetFile}
            clearUploadFile={clearUploadFile}
            handleDrop={handleDrop}
          />
        )}
      </div>
    </AppShell>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
      {children}
    </div>
  );
}

function ChartHeader({ eyebrow, title, desc, right }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
          {eyebrow}
        </div>

        <h3 className="mt-1.5 text-base font-bold tracking-tight text-slate-900">
          {title}
        </h3>

        <p className="mt-1 text-xs font-medium text-slate-500">{desc}</p>
      </div>

      {right}
    </div>
  );
}

function AlertBox({ type, title, message, onClose }) {
  const isError = type === "error";

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-3xl border px-4 py-3 text-sm",
        isError
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      )}
    >
      <div>
        <div className="font-bold">{title}</div>
        <div className="mt-0.5 font-medium">{message}</div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="rounded-xl p-1 opacity-70 transition hover:bg-white/70 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

function CompanyLogo({
  company,
  code,
  name,
  logoUrl,
  size = "md",
  active = false,
  className = "",
}) {
  const [failed, setFailed] = useState(false);

  const companyCode = company?.code || code || "";
  const companyName = company?.name || name || "";
  const resolvedLogoUrl =
    logoUrl || company?.logoUrl || company?.logo || getCompanyLogoUrl(company || companyCode);

  const initials = getCompanyInitials(companyCode, companyName);

  const sizeMap = {
    sm: "h-9 w-9 rounded-xl",
    md: "h-12 w-12 rounded-2xl",
    lg: "h-16 w-16 rounded-3xl",
  };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border bg-white shadow-sm",
        active ? "border-blue-200 ring-4 ring-blue-100/70" : "border-slate-200",
        sizeMap[size] || sizeMap.md,
        className
      )}
    >
      {!failed && resolvedLogoUrl ? (
        <img
          src={resolvedLogoUrl}
          alt={`โลโก้ ${companyName || companyCode}`}
          className="h-full w-full object-contain p-1.5"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className={cn(
            "font-black tracking-tight",
            size === "sm" ? "text-[11px]" : "text-sm",
            active ? "text-blue-700" : "text-slate-500"
          )}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

function CompanyCard({ item, active, onClick, onUpload }) {
  const isAll = item.company.code === ALL_COMPANIES;

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative min-h-[168px] cursor-pointer overflow-hidden rounded-3xl border bg-white p-4 outline-none transition focus:ring-4 focus:ring-blue-100/70",
        active
          ? "border-blue-300 bg-blue-50/40"
          : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"
      )}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <CompanyLogo
            company={item.company}
            size="lg"
            active={active}
          />

          <div className="min-w-0">
            <span
              className={cn(
                "inline-flex h-7 items-center rounded-full border px-2.5 text-[10px] font-bold uppercase tracking-wide",
                active
                  ? "border-blue-200 bg-white text-blue-700"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              )}
            >
              {isAll ? "ALL" : item.company.code}
            </span>

            <div
              className={cn(
                "mt-2 line-clamp-2 text-sm font-bold leading-relaxed",
                active ? "text-slate-900" : "text-slate-800"
              )}
            >
              {item.company.name}
            </div>
          </div>
        </div>

        {onUpload && (
          <button
            type="button"
            className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-400 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onUpload();
            }}
            title="นำเข้าไฟล์ Excel"
          >
            ↑
          </button>
        )}
      </div>

      <div className="relative mt-4 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3">
        <CompanyStat
          label="QTY"
          value={formatNumber(item.summary.totalQty)}
          active={active}
        />

        <CompanyStat
          label="SKU"
          value={formatNumber(item.summary.uniqueSku)}
          active={active}
        />

        <CompanyStat
          label="CAT"
          value={formatNumber(item.summary.categories)}
          active={active}
        />
      </div>
    </article>
  );
}

function CompanyStat({ label, value, active }) {
  return (
    <div>
      <div
        className={cn(
          "text-[9px] font-bold uppercase tracking-wide",
          active ? "text-blue-600" : "text-slate-400"
        )}
      >
        {label}
      </div>

      <div className="mt-1 text-xs font-bold tabular-nums text-slate-900">
        {value}
      </div>
    </div>
  );
}

function MetricCard({ label, value, desc, tone, icon }) {
  const toneMap = {
    blue: {
      border: "border-blue-100",
      icon: "bg-blue-50 text-blue-700 border-blue-100",
    },
    emerald: {
      border: "border-emerald-100",
      icon: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    violet: {
      border: "border-violet-100",
      icon: "bg-violet-50 text-violet-700 border-violet-100",
    },
    slate: {
      border: "border-slate-200",
      icon: "bg-slate-50 text-slate-700 border-slate-100",
    },
  };

  const selected = toneMap[tone] || toneMap.blue;

  return (
    <div
      className={cn(
        "rounded-3xl border bg-white p-5 shadow-sm",
        selected.border
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {label}
          </div>

          <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
            {value}
          </div>

          <div className="mt-2 truncate text-sm font-medium text-slate-500">
            {desc}
          </div>
        </div>

        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
            selected.icon
          )}
        >
          <MetricIcon name={icon} />
        </div>
      </div>
    </div>
  );
}

function MetricIcon({ name }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.1,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  if (name === "box") {
    return (
      <svg {...common}>
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    );
  }

  if (name === "barcode") {
    return (
      <svg {...common}>
        <path d="M4 7V5a1 1 0 0 1 1-1h2" />
        <path d="M17 4h2a1 1 0 0 1 1 1v2" />
        <path d="M20 17v2a1 1 0 0 1-1 1h-2" />
        <path d="M7 20H5a1 1 0 0 1-1-1v-2" />
        <path d="M7 8v8" />
        <path d="M10 8v8" />
        <path d="M14 8v8" />
        <path d="M17 8v8" />
      </svg>
    );
  }

  if (name === "grid") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

function DonutLegend({ data, metricKey }) {
  if (!data.length) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white">
        <span className="text-sm font-bold text-slate-400">
          ไม่มีข้อมูลหมวดหมู่
        </span>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + Number(item.chartValue || 0), 0);

  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            Category List
          </div>

          <div className="mt-0.5 text-xs font-medium text-slate-500">
            เลื่อนดูรายการหมวดหมู่ทั้งหมด
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
          {formatNumber(data.length)} หมวดหมู่
        </div>
      </div>

      <div className="max-h-[320px] space-y-2 overflow-y-auto pr-2 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-50">
        {data.map((item) => {
          const rawValue = Number(item.chartValue || 0);
          const percent = total ? Math.round((rawValue / total) * 100) : 0;
          const safePercent = rawValue > 0 ? Math.max(percent, 1) : 0;

          return (
            <div
              key={item.code}
              className="rounded-2xl border border-slate-200 bg-white p-3 transition hover:bg-slate-50"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />

                  <span className="truncate text-xs font-medium text-slate-600">
                    <strong className="mr-1 font-bold text-slate-900">
                      {item.code}
                    </strong>
                    {item.name}
                  </span>
                </div>

                <span className="shrink-0 text-xs font-bold text-slate-700">
                  {percent}%
                </span>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${safePercent}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>

              <div className="mt-1.5 text-right text-[11px] font-medium text-slate-400">
                {formatChartValueWithUnit(metricKey, rawValue)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InventoryTable({ loading, rows, startIndex = 0 }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="font-bold text-slate-700">กำลังโหลดข้อมูล...</div>
        <div className="mt-1 text-sm font-medium text-slate-400">
          กรุณารอสักครู่
        </div>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="font-bold text-slate-700">ไม่พบข้อมูลสินค้า</div>
        <div className="mt-1 text-sm font-medium text-slate-400">
          ลองปรับตัวกรองการค้นหา
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200">
            <TableHead>ลำดับ</TableHead>
            <TableHead>รหัสสินค้า</TableHead>
            <TableHead>ชื่อสินค้า</TableHead>
            <TableHead>บริษัท</TableHead>
            <TableHead>หมวดหมู่</TableHead>
            <TableHead align="right">คงเหลือ</TableHead>
            <TableHead>หน่วย</TableHead>
            <TableHead align="right">มูลค่า</TableHead>
            <TableHead>สถานะ</TableHead>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.companyCode || "CO"}-${row.batchId}-${row.id}-${row.rowNo}-${index}`}
              className="border-b border-slate-100 transition hover:bg-slate-50"
            >
              <td className="px-5 py-3">
                <span className="font-mono text-xs font-medium text-slate-400">
                  {(startIndex + index + 1).toString().padStart(3, "0")}
                </span>
              </td>

              <td className="px-5 py-3">
                <span className="inline-flex whitespace-nowrap rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs font-bold text-slate-700">
                  {row.sku || "-"}
                </span>
              </td>

              <td className="px-5 py-3">
                <div className="min-w-[260px] max-w-[520px] text-sm font-bold text-slate-800">
                  {row.name || "-"}
                </div>

                {(row.brand || row.model || row.spec) && (
                  <div className="mt-1 max-w-[520px] text-xs font-medium leading-relaxed text-slate-400">
                    {[row.brand, row.model, row.spec].filter(Boolean).join(" · ")}
                  </div>
                )}
              </td>

              <td className="px-5 py-3">
                <span className="whitespace-nowrap text-sm font-bold text-slate-600">
                  {row.companyCode || "-"}
                </span>
              </td>

              <td className="px-5 py-3">
                {!row.categoryCode ? (
                  <span className="text-xs font-medium text-slate-300">
                    ไม่ระบุ
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="rounded-xl border border-blue-100 bg-blue-50 px-2 py-1 font-mono text-[11px] font-bold text-blue-700">
                      {row.categoryCode}
                    </span>

                    <span className="whitespace-nowrap text-xs font-medium text-slate-500">
                      {row.categoryName}
                    </span>
                  </div>
                )}
              </td>

              <td className="px-5 py-3 text-right">
                <div className="text-sm font-bold tabular-nums text-slate-900">
                  {formatNumber(row.quantity)}
                </div>
              </td>

              <td className="px-5 py-3">
                <span className="text-sm font-medium text-slate-400">
                  {row.unit || "-"}
                </span>
              </td>

              <td className="px-5 py-3 text-right">
                <span className="whitespace-nowrap text-sm font-bold tabular-nums text-slate-700">
                  {formatMoney(row.totalCost || row.totalValue || 0)}
                </span>
              </td>

              <td className="px-5 py-3">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableHead({ children, align = "left" }) {
  return (
    <th
      className={cn(
        "whitespace-nowrap bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500",
        align === "right" && "text-right"
      )}
    >
      {children}
    </th>
  );
}

function StatusBadge({ status }) {
  const s = String(status || "").toUpperCase();

  if (s === "IMPORTED") {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
        Imported
      </span>
    );
  }

  if (s === "SKIPPED") {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
        Skipped
      </span>
    );
  }

  if (s === "ERROR") {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
        Error
      </span>
    );
  }

  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
      {status || "-"}
    </span>
  );
}

function PaginationBar({
  currentPage,
  totalPages,
  totalRows,
  pageSize,
  onPageChange,
}) {
  const startRow = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, totalRows);
  const pages = [];

  const minPage = Math.max(1, currentPage - 2);
  const maxPage = Math.min(totalPages, currentPage + 2);

  for (let p = minPage; p <= maxPage; p += 1) {
    pages.push(p);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4">
      <div className="text-sm font-medium text-slate-400">
        แสดง{" "}
        <strong className="font-bold text-slate-700">
          {formatNumber(startRow)}
        </strong>{" "}
        –{" "}
        <strong className="font-bold text-slate-700">
          {formatNumber(endRow)}
        </strong>{" "}
        จาก{" "}
        <strong className="font-bold text-slate-700">
          {formatNumber(totalRows)}
        </strong>{" "}
        รายการ
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
        >
          ‹ ก่อนหน้า
        </button>

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={cn(
              "inline-flex h-9 min-w-9 items-center justify-center rounded-2xl border px-3 text-sm font-bold transition",
              p === currentPage
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            )}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          className="inline-flex h-9 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
        >
          ถัดไป ›
        </button>
      </div>
    </div>
  );
}

function EmptyChart({ label }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white">
      <span className="text-sm font-bold text-slate-400">{label}</span>
    </div>
  );
}

function UploadModal({
  companies,
  uploadCompanyCode,
  setUploadCompanyCode,
  uploading,
  closeUploadModal,
  handleUpload,
  file,
  fileInputRef,
  validateAndSetFile,
  clearUploadFile,
  handleDrop,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-[560px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
        <div className="flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <div className="text-lg font-bold tracking-tight text-slate-900">
              อัปโหลดไฟล์ Excel
            </div>

            <div className="mt-1 text-sm font-medium text-slate-500">
              เลือกบริษัทและอัปโหลดข้อมูลสินค้าล่าสุด
            </div>
          </div>

          <button
            type="button"
            onClick={closeUploadModal}
            disabled={uploading}
            className="rounded-2xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleUpload}>
          <div className="space-y-5 px-6 py-6">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
                บริษัทปลายทาง
              </label>

              <select
                value={uploadCompanyCode}
                onChange={(e) => setUploadCompanyCode(e.target.value)}
                disabled={uploading}
                className={cn(inputClass, "w-full")}
              >
                {companies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-blue-50/70 px-4 py-3">
              <div className="text-sm font-bold text-blue-800">
                โหมดนำเข้า: แทนที่ยอดคงเหลือ
              </div>

              <div className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
                ระบบจะอัปเดตข้อมูลจากไฟล์ Excel และรายการที่ไม่มีในไฟล์จะถูกปรับเป็น 0 เฉพาะบริษัทที่เลือก
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">
                ไฟล์ข้อมูล (.xls, .xlsx)
              </label>

              <div
                className={cn(
                  "cursor-pointer rounded-3xl border-2 border-dashed px-6 py-8 text-center transition",
                  file
                    ? "border-blue-200 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50"
                )}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xls,.xlsx"
                  disabled={uploading}
                  onChange={(e) =>
                    validateAndSetFile(e.target.files?.[0] || null)
                  }
                  className="hidden"
                />

                {file ? (
                  <>
                    <div className="font-bold text-slate-900">{file.name}</div>

                    <div className="mt-1 text-sm font-medium text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-bold text-slate-700">
                      คลิกหรือลากไฟล์มาวาง
                    </div>

                    <div className="mt-1 text-sm font-medium text-slate-400">
                      รองรับเฉพาะ Excel (.xls, .xlsx)
                    </div>
                  </>
                )}
              </div>

              {file && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    className="text-xs font-bold text-rose-600 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearUploadFile();
                    }}
                  >
                    ลบไฟล์ทิ้ง
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
            <button
              type="button"
              className={ghostButton}
              onClick={closeUploadModal}
              disabled={uploading}
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              className={primaryButton}
              disabled={uploading || !file || !uploadCompanyCode}
            >
              {uploading ? "กำลังอัปโหลด..." : "ยืนยันนำเข้าข้อมูล"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}