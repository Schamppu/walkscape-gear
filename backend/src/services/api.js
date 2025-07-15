import axios from "axios";

const isProd = process.env.NODE_ENV === "production";

console.log(
  `API base URL: ${process.env.API_BASE_URL || "http://localhost:3000"}`
);

const api = axios.create({
  baseURL: process.env.API_BASE_URL || "http://localhost:3000",
  timeout: 5000,
});

if (isProd) {
  api.interceptors.request.use((config) => {
    config.headers["Authorization"] = `Bearer ${process.env.API_SECRET}`;
    return config;
  });
}

export default api;
