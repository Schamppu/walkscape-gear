import getHost from "../getHost";
import { axiosInstance as axios } from "./axiosConfig";

const proxy = ({ method = "GET", url, options = {} }) => {
  if (method == "GET") {
    return axios.get(`${getHost()}/db/${url}`, options);
  } else if (method == "POST") {
    return axios.post(`${getHost()}/db/${url}`, options);
  }
};

export const fetchPlayerStats = async () => {
  const { data } = await axios.get(`${getHost()}/db/user_stats`);
  return data;
};

export const upsertPlayerStats = async (payload) => {
  const { data } = await axios.post(`${getHost()}/db/user_stats`, payload);
  return data;
};
