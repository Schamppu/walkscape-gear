import getHost from "../getHost";
import { axiosInstance as axios } from "./axiosConfig";

export function getKeyword({ id }) {
  return axios.get(`${getHost()}keywords`, {
    params: { id },
  });
}
