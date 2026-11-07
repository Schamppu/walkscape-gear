import type { AxiosResponse, AxiosRequestConfig } from "axios";
import getHost from "./getHost";
import { axiosInstance as axios } from "./axiosConfig";

export type ProxyRequest = {
  method?: "GET" | "POST";
  url: string;
  options?: AxiosRequestConfig | Record<string, unknown>;
};

export function createProxyInstance(
  basePath = "/api",
): (request: ProxyRequest) => Promise<AxiosResponse> {
  return ({ method = "GET", url, options = {} }) => {
    const fullUrl = `${getHost()}${basePath}/${url}`;
    if (method === "GET") {
      return axios.get(fullUrl, options as AxiosRequestConfig);
    }
    return axios.post(fullUrl, options);
  };
}
