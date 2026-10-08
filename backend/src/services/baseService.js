import cachedApi from "./cachedApi.js";

const MULTIPLE_UNSUPPORTED_STATUSES = new Set([404, 405, 501]);
const multipleSupportByResource = new Map();

function toIdKey(id) {
  return String(id);
}

function dedupeIds(ids) {
  const seen = new Set();
  const uniqueIds = [];

  for (const id of ids) {
    const key = toIdKey(id);
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueIds.push(id);
  }

  return uniqueIds;
}

function sortIds(ids) {
  return [...ids].sort((left, right) => toIdKey(left).localeCompare(toIdKey(right)));
}

function isMultipleUnsupported(error) {
  return MULTIPLE_UNSUPPORTED_STATUSES.has(error?.response?.status);
}

export default class BaseService {
  constructor(resourceName) {
    this.resourceName = resourceName;
  }

  async list() {
    const response = await cachedApi.get(`/${this.resourceName}`);
    return response.data;
  }

  async getById(id) {
    const response = await cachedApi.get(`/${this.resourceName}/${id}`);
    return response.data;
  }

  async getMultiple(ids) {
    const requestedIds = Array.isArray(ids) ? ids : [];
    if (requestedIds.length === 0) {
      return [];
    }

    const resultsById = new Map();
    const uniqueIds = dedupeIds(requestedIds);
    const missingIds = [];

    for (const id of uniqueIds) {
      const cached = cachedApi.peek("get", `/${this.resourceName}/${id}`);
      if (cached) {
        resultsById.set(toIdKey(id), cached.data);
      } else {
        missingIds.push(id);
      }
    }

    if (missingIds.length > 0) {
      const fetchedById = await this.fetchMissingMultiple(missingIds);
      for (const [id, item] of fetchedById.entries()) {
        resultsById.set(id, item);
      }
    }

    return requestedIds.map((id) => resultsById.get(toIdKey(id)));
  }

  async getIds(ids, target) {
    const response = await cachedApi.post(
      `/${this.resourceName}/ids`,
      { ids, target },
      { responseType: "json" },
    );
    return response.data;
  }

  async search(params) {
    const response = await cachedApi.get(`/${this.resourceName}/search`, { params });
    return response.data;
  }

  async fetchMissingMultiple(ids) {
    const canUseBatch = multipleSupportByResource.get(this.resourceName) !== false;

    if (!canUseBatch) {
      return this.fetchIndividually(ids);
    }

    try {
      const normalizedIds = sortIds(dedupeIds(ids));
      const response = await cachedApi.post(
        `/${this.resourceName}/multiple`,
        { ids: normalizedIds },
        { responseType: "json" },
      );

      multipleSupportByResource.set(this.resourceName, true);
      return this.indexMultipleResponse(ids, response);
    } catch (error) {
      if (!isMultipleUnsupported(error)) {
        throw error;
      }

      multipleSupportByResource.set(this.resourceName, false);
      return this.fetchIndividually(ids);
    }
  }

  async fetchIndividually(ids) {
    const items = await Promise.all(ids.map((id) => this.getById(id)));
    return new Map(items.map((item, index) => [toIdKey(ids[index]), item]));
  }

  indexMultipleResponse(requestedIds, response) {
    if (!Array.isArray(response.data)) {
      throw new Error(`Unexpected /${this.resourceName}/multiple response shape`);
    }

    const byId = new Map();
    for (const item of response.data) {
      if (item?.id === undefined || item?.id === null) continue;

      const id = toIdKey(item.id);
      byId.set(id, item);
      cachedApi.prime(
        "get",
        `/${this.resourceName}/${item.id}`,
        {
          data: item,
          headers: response.headers,
          status: response.status,
        },
      );
    }

    const missingIds = requestedIds.filter((id) => !byId.has(toIdKey(id)));
    if (missingIds.length === 0) {
      return byId;
    }

    return this.fetchIndividually(missingIds).then((fallbackById) => {
      for (const [id, item] of fallbackById.entries()) {
        byId.set(id, item);
      }
      return byId;
    });
  }
}
