import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export function formatApiError(detail) {
  if (detail == null) return "Bir hata oluştu. Lütfen tekrar deneyin.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

const trNum = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
const trTL = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2, minimumFractionDigits: 0 });

export const fmtNum = (v) => trNum.format(Number(v || 0));
export const fmtTL = (v) => `${trTL.format(Number(v || 0))} ₺`;
export const fmtKg = (v) => `${trNum.format(Number(v || 0))} kg`;
export const fmtDate = (v) => {
  if (!v) return "-";
  const d = String(v).slice(0, 10);
  const [y, m, dd] = d.split("-");
  return y && m && dd ? `${dd}.${m}.${y}` : d;
};

export function downloadFile(path, filename) {
  return api
    .get(path, { responseType: "blob" })
    .then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    });
}
