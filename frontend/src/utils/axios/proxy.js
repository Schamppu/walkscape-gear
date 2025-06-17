import getHost from "./getHost";
import { axiosInstance as axios } from "./axiosConfig";

export function createProxyInstance(basePath = "/api") {
  return ({ method = "GET", url, options = {} }) => {
    const fullUrl = `${getHost()}${basePath}/${url}`;
    if (method === "GET") {
      return axios.get(fullUrl, options);
    } else if (method === "POST") {
      return axios.post(fullUrl, options);
    }
  };
}
