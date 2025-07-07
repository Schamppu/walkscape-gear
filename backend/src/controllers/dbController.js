import * as dbService from "../services/dbService.js";

// Helper to extract userUuid and handle missing header
function getUserUuid(req, res) {
  const userUuid = req.headers["x-user-uuid"];
  if (!userUuid) {
    res.status(400).json({ error: "Missing userUuid" });
    return null;
  }
  return userUuid;
}

// Generic GET handler
function makeGetHandler(serviceFn) {
  return async (req, res) => {
    const userUuid = getUserUuid(req, res);
    if (!userUuid) return;
    try {
      const result = await serviceFn(userUuid);
      res.json(result || {});
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };
}

// Generic UPSERT handler
function makeUpsertHandler(serviceFn, getPayload = (req) => req.body) {
  return async (req, res) => {
    const userUuid = getUserUuid(req, res);
    if (!userUuid) return;
    try {
      await serviceFn(userUuid, getPayload(req));
      res.sendStatus(200);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  };
}

export const getUserInfo = makeGetHandler(dbService.getUserStats);
export const upsertUserInfo = makeUpsertHandler(dbService.upsertUserStats);

export const getUserOwnedItems = makeGetHandler(dbService.getUserOwnedItems);
export const upsertUserOwnedItems = makeUpsertHandler(
  dbService.upsertUserOwnedItems,
  (req) => req.body.items
);

export const getUserFactionReputations = makeGetHandler(
  dbService.getUserFactionReputations
);
export const upsertUserFactionReputations = makeUpsertHandler(
  dbService.upsertUserFactionReputations,
  (req) => req.body.reputations
);
