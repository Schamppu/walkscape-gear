import getHost from "./getHost";
import { axiosInstance as axios } from "./axiosConfig";
import type {
  DbPlayerStats,
  DbOwnedItem,
  DbFactionReputations,
  DbTag,
  DbGearSet,
  DbGearSetDetail,
  UpsertGearSetPayload,
  UpsertGearSetResponse,
  DeleteGearSetResponse,
  DbUserSettings,
  UpsertSettingEntry,
} from "@/domain/types";

export const fetchPlayerStats = async (): Promise<DbPlayerStats> => {
  const { data } = await axios.get<DbPlayerStats>(`${getHost()}/db/user_stats`);
  return data;
};

export const upsertPlayerStats = async (payload: DbPlayerStats): Promise<void> => {
  await axios.post(`${getHost()}/db/user_stats`, payload);
};

export const fetchOwnedItems = async (): Promise<DbOwnedItem[]> => {
  const { data } = await axios.get<DbOwnedItem[]>(`${getHost()}/db/owned_items`);
  return data;
};

export const upsertOwnedItems = async (payload: { items: DbOwnedItem[] }): Promise<void> => {
  await axios.post(`${getHost()}/db/owned_items`, payload);
};

export const fetchFactionReputations = async (): Promise<DbFactionReputations> => {
  const { data } = await axios.get<DbFactionReputations>(
    `${getHost()}/db/faction_reputations`,
  );
  return data;
};

export const upsertFactionReputations = async (payload: {
  reputations: DbFactionReputations;
}): Promise<void> => {
  await axios.post(`${getHost()}/db/faction_reputations`, payload);
};

export const getGearSetTags = async (): Promise<DbTag[]> => {
  const { data } = await axios.get<DbTag[]>(`${getHost()}/db/gear_set_tags`);
  return data;
};

export const getGearSets = async (): Promise<DbGearSet[]> => {
  const { data } = await axios.get<DbGearSet[]>(`${getHost()}/db/gear_sets`);
  return data;
};

export const getGearSet = async (id: number): Promise<DbGearSetDetail> => {
  const { data } = await axios.get<DbGearSetDetail>(
    `${getHost()}/db/gear_sets/${id}`,
  );
  return data;
};

export const upsertGearSet = async (
  payload: UpsertGearSetPayload,
): Promise<UpsertGearSetResponse> => {
  const { data } = await axios.post<UpsertGearSetResponse>(
    `${getHost()}/db/gear_sets`,
    payload,
  );
  return data;
};

export const deleteGearSet = async (id: number): Promise<DeleteGearSetResponse> => {
  const { data } = await axios.delete<DeleteGearSetResponse>(
    `${getHost()}/db/gear_sets/${id}`,
  );
  return data;
};

export const getSettings = async (): Promise<DbUserSettings> => {
  const { data } = await axios.get<DbUserSettings>(
    `${getHost()}/db/user_settings`,
  );
  return data;
};

export const upsertSettings = async (payload: UpsertSettingEntry[]): Promise<void> => {
  await axios.post(`${getHost()}/db/user_settings`, payload);
};

export const deleteUserData = async (): Promise<void> => {
  await axios.delete(`${getHost()}/db/user_data`);
};
