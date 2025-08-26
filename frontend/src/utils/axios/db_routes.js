import getHost from "./getHost";
import { axiosInstance as axios } from "./axiosConfig";

export const fetchPlayerStats = async () => {
  const { data } = await axios.get(`${getHost()}/db/user_stats`);
  return data;
};

export const upsertPlayerStats = async (payload) => {
  const { data } = await axios.post(`${getHost()}/db/user_stats`, payload);
  return data;
};

export const fetchOwnedItems = async () => {
  const { data } = await axios.get(`${getHost()}/db/owned_items`);
  return data;
};

export const upsertOwnedItems = async (payload) => {
  const { data } = await axios.post(`${getHost()}/db/owned_items`, payload);
  return data;
};

export const fetchFactionRepuations = async () => {
  const { data } = await axios.get(`${getHost()}/db/faction_reputations`);
  return data;
};

export const upsertFactionReputations = async (payload) => {
  const { data } = await axios.post(
    `${getHost()}/db/faction_reputations`,
    payload
  );
  return data;
};

export const getGearSetTags = async () => {
  const { data } = await axios.get(`${getHost()}/db/gear_set_tags`);
  return data;
};

export const getGearSets = async () => {
  const { data } = await axios.get(`${getHost()}/db/gear_sets`);
  return data;
};

export const getGearSet = async (id) => {
  const { data } = await axios.get(`${getHost()}/db/gear_sets/${id}`);
  return data;
};

export const upsertGearSet = async (payload) => {
  const { data } = await axios.post(`${getHost()}/db/gear_sets`, payload);
  return data;
};

export const deleteGearSet = async (id) => {
  const { data } = await axios.delete(`${getHost()}/db/gear_sets/${id}`);
  return data;
};

export const getSettings = async () => {
  const { data } = await axios.get(`${getHost()}/db/user_settings`);
  return data;
};

export const upsertSettings = async (payload) => {
  const { data } = await axios.post(`${getHost()}/db/user_settings`, payload);
  return data;
};
