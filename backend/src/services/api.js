import axios from "axios";

const isProd = process.env.NODE_ENV === "production";

const api = axios.create({
  baseURL: process.env.API_BASE_URL || "http://localhost:3000",
  timeout: 5000,
});

console.log("isProd", isProd, process.env.NODE_ENV);
if (isProd) {
  api.interceptors.request.use((config) => {
    config.headers["Authorization"] = `Bearer ${process.env.API_SECRET}`;
    return config;
  });
}

export default api;
