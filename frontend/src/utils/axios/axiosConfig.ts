import { usePlayerStore } from "@/store/player";
import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

const AXIOS_TIMEOUT = 30000;

export const measureRequestTime = (
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig => {
  (config as InternalAxiosRequestConfig & { startTime: number }).startTime =
    Math.round(performance.now());
  return config;
};

const apiResponse = (response: AxiosResponse): AxiosResponse => {
  if (response) {
    const config = response.config as InternalAxiosRequestConfig & {
      stopTime: number;
    };
    config.stopTime = Math.round(performance.now());
    return response;
  }
  return response;
};

export const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create();

  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
      measureRequestTime(config);

      const playerStore = usePlayerStore();
      if (playerStore.userUuid) {
        config.headers["X-User-Uuid"] = playerStore.userUuid;
      }

      return config;
    },
  );

  instance.interceptors.response.use(apiResponse);
  instance.defaults.timeout = AXIOS_TIMEOUT;

  return instance;
};

export const axiosInstance = createAxiosInstance();
