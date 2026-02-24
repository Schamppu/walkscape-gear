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
      const result = await serviceFn(userUuid, getPayload(req));
      if (result) {
        res.json(result);
      } else {
        res.sendStatus(204);
      }
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

export const getGearSetTags = async (req, res) => {
  try {
    const tags = await dbService.getGearSetTags();
    res.json(tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({ error: "Failed to load tags" });
  }
};

export const getGearSets = async (req, res) => {
  const userUuid = getUserUuid(req, res);
  if (!userUuid) return;
  
  // Check if includeItems query parameter is present
  const includeItems = req.query.includeItems === 'true';
  
  try {
    const result = await dbService.getGearSets(userUuid, includeItems);
    res.json(result || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getGearSet = async (req, res) => {
  const userUuid = getUserUuid(req, res);
  if (!userUuid) return;
  
  const gearSetId = parseInt(req.params.id);
  if (!gearSetId || isNaN(gearSetId)) {
    return res.status(400).json({ error: "Invalid gear set ID" });
  }

  try {
    const result = await dbService.getGearSet(userUuid, gearSetId);
    res.json(result);
  } catch (e) {
    if (e.message === "Gear set not found") {
      res.status(404).json({ error: e.message });
    } else {
      res.status(500).json({ error: e.message });
    }
  }
};
export const upsertGearSet = makeUpsertHandler(dbService.upsertGearSet);

export const deleteGearSet = async (req, res) => {
  const userUuid = getUserUuid(req, res);
  if (!userUuid) return;

  const gearSetId = parseInt(req.params.id);
  if (!gearSetId || isNaN(gearSetId)) {
    return res.status(400).json({ error: "Invalid gear set ID" });
  }

  try {
    const result = await dbService.deleteGearSet(userUuid, gearSetId);
    res.json(result);
  } catch (error) {
    console.error("Error in deleteGearSet controller:", error);
    res.status(400).json({ error: error.message });
  }
};

export const getUserSettings = makeGetHandler(dbService.getUserSettings);
export const upsertUserSettings = makeUpsertHandler(dbService.upsertUserSettings);

export const deleteUserData = async (req, res) => {
  const userUuid = getUserUuid(req, res);
  if (!userUuid) return;
  try {
    await dbService.deleteUserData(userUuid);
    res.json({ message: "All user data deleted" });
  } catch (e) {
    console.error("Error deleting user data:", e);
    res.status(500).json({ error: e.message });
  }
};
