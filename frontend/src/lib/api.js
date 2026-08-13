import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";
export const API = `${BACKEND_URL.replace(/\/$/, "")}/api`;

const client = axios.create({ baseURL: API });

client.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("nirog_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default client;

export function formatApiError(err) {
  const detail = err?.response?.data?.detail;
  if (detail == null) return err?.message || "Something went wrong";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export async function fetchApi(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API}${path.startsWith("/api") ? path.substring(4) : (path.startsWith("/") ? path : "/" + path)}`;
  const token = localStorage.getItem("nirog_token");
  const headers = { ...options.headers };
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}
