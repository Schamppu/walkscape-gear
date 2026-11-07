import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { validTags } from "../../prisma/tag-data.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { HttpError } from "../utils/httpError.js";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
export const prisma = new PrismaClient({ adapter });

const ALLOWED_STATS = new Set([
  "level",
  "achievementPoints",
  "totalWealth",
  "agility",
  "carpentry",
  "cooking",
  "crafting",
  "fishing",
  "foraging",
  "mining",
  "smithing",
  "trinketry",
  "woodcutting",
  "tailoring",
  "hunting",
  "wrentmarkLocations",
  "syrenthiaLocations",
  "grand_duchy_of_trellin_erdwiseLocations",
  "wallisiaLocations",
  "jarvoniaLocations",
  "empire_of_wallisiaLocations",
  "totalWealth",
]);

const ALLOWED_REPUTATIONS = new Set([
  "erdwiseReputation",
  "tutorialAreaReputation",
  "halflingRebelsReputation",
  "trellinReputation",
  "jarvoniaReputation",
  "syrenthiaReputation",
]);

const DEBUG_SETTINGS = new Set([
  "debugActivity",
  "debugData",
  "debugGear",
  "debugGearSet",
  "debugHistory",
  "debugIcon",
  "debugItems",
  "debugPlayer",
  "debugRoute",
  "debugSettings",
  "debugURL",
  "debugOptimiser",
]);

const ALLOWED_SETTINGS = new Set([
  "showOwned",
  "showUseful",
  "openStatRequirements",
  "showUnmetRequirements",
  "hideInventoryAttr",
  "undoRedo",
  "activityOptimiserPriority",
  "recipeOptimiserPriority",
  "qoRecipeOptimiserPriority",
  "gearLayout",
  "showGearSets",
  "showCombined",
  "hideOwnedCollectibles",
  "hideUnmetLevelActivities",
  "shownDropRate",
  "thousandSeparator",
  "decimalSeparator",
  "showChestLootTables",
  ...DEBUG_SETTINGS,
]);

// Built-in optimiser presets the player can hide: `hideOptimiserPreset:<slug>`.
// The slugs live in the frontend, so cap how many a user can store instead.
const HIDE_OPTIMISER_PRESET_PREFIX = "hideOptimiserPreset:";
const HIDE_OPTIMISER_PRESET_SETTING = /^hideOptimiserPreset:[a-z0-9-]{1,40}$/;
const MAX_HIDDEN_OPTIMISER_PRESETS = 20;

const isAllowedSetting = (setting) =>
  ALLOWED_SETTINGS.has(setting) || HIDE_OPTIMISER_PRESET_SETTING.test(setting);

// Shape checks for saved optimiser presets. Mirrors the target lists in
// frontend/src/domain/advancedOptimiser/config.ts.
const OPTIMISER_X_VALUES = new Set([
  "xp",
  "rewardRolls",
  "fineMaterials",
  "chests",
  "tokens",
  "coins",
  "collectibles",
  "eternalCrafts",
]);
const OPTIMISER_Y_VALUES = new Set(["step", "action", "material"]);
const OPTIMISER_MAX_WEIGHT = 10;
const OPTIMISER_PRESET_MAX_TARGETS = 8;
const OPTIMISER_PRESET_MAX_NAME_LENGTH = 50;
const OPTIMISER_PRESET_MAX_COUNT = 50;
// Control and invisible formatting characters (zero-width, bidi overrides).
const OPTIMISER_PRESET_NAME_FORBIDDEN = /[\p{Cc}\p{Cf}]/u;
// Preset ids are a Postgres SERIAL (INT4).
const MAX_DB_INT = 2147483647;

const isValidPresetId = (id) =>
  Number.isInteger(id) && id > 0 && id <= MAX_DB_INT;

async function markUserActiveThrottled(userUuid) {
  const FIVE_MINUTES = 5 * 60 * 1000;

  await prisma.user
    .updateMany({
      where: {
        userUuid,
        OR: [
          { lastActiveAt: null },
          { lastActiveAt: { lt: new Date(Date.now() - FIVE_MINUTES) } },
        ],
      },
      data: {
        lastActiveAt: new Date(),
      },
    })
    .catch(() => {
      // swallow errors — never block a request
    });
}

export async function ensureUser(userUuid) {
  let user = await prisma.user.findUnique({ where: { userUuid } });
  if (!user) {
    try {
      user = await prisma.user.create({ data: { userUuid } });
    } catch (e) {
      // Concurrent requests for a new user can race to create it; treat as success
      if (e.code !== "P2002") throw e;
      user = await prisma.user.findUnique({ where: { userUuid } });
    }
  }

  // Fire-and-forget activity update
  markUserActiveThrottled(userUuid);

  return user;
}

export async function getUserStats(userUuid) {
  const stats = await prisma.playerStat.findMany({ where: { userUuid } });
  markUserActiveThrottled(userUuid);
  return Object.fromEntries(stats.map(({ stat, value }) => [stat, value]));
}

export async function upsertUserStats(userUuid, statsObj) {
  await ensureUser(userUuid);
  const validEntries = Object.entries(statsObj).filter(([stat]) =>
    ALLOWED_STATS.has(stat),
  );
  if (validEntries.length === 0) throw new Error("No valid stats provided");
  await Promise.all(
    validEntries.map(([stat, value]) =>
      prisma.playerStat.upsert({
        where: { userUuid_stat: { userUuid, stat } },
        update: { stat, value },
        create: { userUuid, stat, value },
      }),
    ),
  );
}

export async function getUserOwnedItems(userUuid) {
  const items = await prisma.ownedItem.findMany({
    where: { userUuid, OR: [{ owned: true }, { hidden: true }] },
  });
  return items.map(
    ({
      itemId,
      owned,
      hidden,
      quantity,
      quantityFine,
      craftedTier,
      craftedTier2,
      consumableCommon,
      consumableFine,
      petLevel,
      petRarity,
    }) => ({
      itemId,
      owned,
      hidden,
      quantity,
      quantityFine,
      craftedTier,
      craftedTier2,
      consumableCommon,
      consumableFine,
      petLevel,
      petRarity,
    }),
  );
}

export async function upsertUserOwnedItems(userUuid, items) {
  await ensureUser(userUuid);
  await Promise.all(
    items.map((item) =>
      prisma.ownedItem.upsert({
        where: { userUuid_itemId: { userUuid, itemId: item.itemId } },
        update: {
          owned: item.owned,
          hidden: item.hidden,
          quantity: item.quantity,
          quantityFine: item.quantityFine ?? 0,
          craftedTier: item.craftedTier,
          craftedTier2: item.craftedTier2,
          consumableCommon: item.consumableCommon,
          consumableFine: item.consumableFine,
          petLevel: item.petLevel,
          petRarity: item.petRarity,
        },
        create: {
          userUuid,
          itemId: item.itemId,
          owned: item.owned,
          hidden: item.hidden,
          quantity: item.quantity,
          quantityFine: item.quantityFine ?? 0,
          craftedTier: item.craftedTier,
          craftedTier2: item.craftedTier2,
          consumableCommon: item.consumableCommon,
          consumableFine: item.consumableFine,
          petLevel: item.petLevel,
          petRarity: item.petRarity,
        },
      }),
    ),
  );
}

export async function getUserFactionReputations(userUuid) {
  const reps = await prisma.factionReputation.findMany({ where: { userUuid } });
  return Object.fromEntries(
    reps.map(({ reputation, value }) => [reputation, value]),
  );
}

export async function upsertUserFactionReputations(userUuid, reputationsObj) {
  await ensureUser(userUuid);
  const validEntries = Object.entries(reputationsObj).filter(([reputation]) =>
    ALLOWED_REPUTATIONS.has(reputation),
  );
  if (validEntries.length === 0)
    throw new Error("No valid reputations provided");
  await Promise.all(
    validEntries.map(([reputation, value]) =>
      prisma.factionReputation.upsert({
        where: { userUuid_reputation: { userUuid, reputation } },
        update: { reputation, value },
        create: { userUuid, reputation, value },
      }),
    ),
  );
}

export async function getGearSetTags() {
  return await prisma.tag.findMany({ orderBy: { id: "asc" } }); // Changed from name to id
}

export async function getGearSets(userUuid, includeItems = false) {
  const gearSets = await prisma.gearSet.findMany({
    where: { userUuid },
    include: {
      items: includeItems,
      tags: { include: { tag: true } },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return gearSets.map((set) => ({
    ...set,
    tags: set.tags.map((t) => t.tag.id), // Return tag IDs instead of names
  }));
}

export async function getGearSetsForExport(userUuid) {
  const gearSets = await prisma.gearSet.findMany({
    where: { userUuid },
    select: {
      name: true,
      items: {
        select: {
          slotType: true,
          slotIndex: true,
          itemId: true,
          quality: true,
        },
        orderBy: [{ slotType: "asc" }, { slotIndex: "asc" }],
      },
      tags: {
        include: { tag: true },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return gearSets.map((set) => ({
    name: set.name,
    items: set.items,
    tags: set.tags.map((entry) => entry.tag.id),
  }));
}

export async function getGearSet(userUuid, gearSetId) {
  const gearSet = await prisma.gearSet.findFirst({
    where: {
      id: gearSetId,
      userUuid,
    },
    include: {
      items: true,
      tags: { include: { tag: true } },
    },
  });

  if (!gearSet) {
    throw new Error("Gear set not found");
  }

  return {
    ...gearSet,
    tags: gearSet.tags.map((t) => t.tag.id), // Return tag IDs instead of names
  };
}

export async function upsertGearSet(userUuid, payload) {
  const { id, name, tags, items } = payload;

  // Validate tags
  const invalidTags = tags.filter((t) => !validTags.includes(t));
  if (invalidTags.length > 0) {
    throw new Error(`Invalid tag(s): ${invalidTags.join(", ")}`);
  }

  try {
    await ensureUser(userUuid);
    const now = new Date();

    // Upsert the gear set
    const gearSet = id
      ? await prisma.gearSet.update({
          where: { id, userUuid },
          data: { name, updatedAt: now },
        })
      : await prisma.gearSet.create({
          data: { name, userUuid },
        });

    // Sync tags
    const tagRecords = await prisma.tag.findMany({
      where: { id: { in: tags } }, // Changed from name to id
    });

    await prisma.gearSetTag.deleteMany({ where: { gearSetId: gearSet.id } });
    await prisma.gearSetTag.createMany({
      data: tagRecords.map((tag) => ({
        gearSetId: gearSet.id,
        tagId: tag.id, // Now using string ID instead of numeric id
      })),
    });

    // Sync items
    await prisma.gearSetItem.deleteMany({ where: { gearSetId: gearSet.id } });
    await prisma.gearSetItem.createMany({
      data: items.map((item) => ({
        gearSetId: gearSet.id,
        slotType: item.slotType,
        slotIndex: item.slotIndex,
        itemId: item.itemId,
        quality: item.quality,
      })),
    });

    return { message: "Gear set saved", gearSetId: gearSet.id };
  } catch (error) {
    console.error("Error upserting gear set:", error);
    throw new Error("Failed to save gear set");
  }
}

export async function deleteGearSet(userUuid, gearSetId) {
  try {
    // First, verify the gear set exists and belongs to the user
    const gearSet = await prisma.gearSet.findUnique({
      where: { id: gearSetId },
    });

    if (!gearSet) {
      throw new Error("Gear set not found");
    }

    if (gearSet.userUuid !== userUuid) {
      throw new Error("You can only delete your own gear sets");
    }

    // Delete all associated data (Prisma will handle the order due to foreign key constraints)
    await prisma.gearSetTag.deleteMany({ where: { gearSetId } });
    await prisma.gearSetItem.deleteMany({ where: { gearSetId } });
    await prisma.gearSet.delete({ where: { id: gearSetId } });

    return { message: "Gear set deleted successfully" };
  } catch (error) {
    console.error("Error deleting gear set:", error);
    throw new Error(error.message || "Failed to delete gear set");
  }
}

export async function deleteUserData(userUuid) {
  // Resolve gear set IDs first (no cascade in schema)
  const gearSetIds = (
    await prisma.gearSet.findMany({
      where: { userUuid },
      select: { id: true },
    })
  ).map((g) => g.id);

  await prisma.$transaction([
    prisma.gearSetItem.deleteMany({ where: { gearSetId: { in: gearSetIds } } }),
    prisma.gearSetTag.deleteMany({ where: { gearSetId: { in: gearSetIds } } }),
    prisma.gearSet.deleteMany({ where: { userUuid } }),
    prisma.playerStat.deleteMany({ where: { userUuid } }),
    prisma.ownedItem.deleteMany({ where: { userUuid } }),
    prisma.factionReputation.deleteMany({ where: { userUuid } }),
    prisma.userSetting.deleteMany({ where: { userUuid } }),
    prisma.optimiserPreset.deleteMany({ where: { userUuid } }),
    prisma.user.deleteMany({ where: { userUuid } }),
  ]);
}

export async function getUserSettings(userUuid) {
  const settings = await prisma.userSetting.findMany({
    where: { userUuid },
  });
  return Object.fromEntries(
    settings.map(({ setting, value, display }) => [
      setting,
      { value, display },
    ]),
  );
}

export async function upsertUserSettings(userUuid, settingsArr) {
  await ensureUser(userUuid);
  const validEntries = settingsArr.filter(({ setting }) =>
    isAllowedSetting(setting),
  );
  if (validEntries.length === 0) throw new Error("No valid settings provided");

  const newHidden = validEntries
    .map(({ setting }) => setting)
    .filter((setting) => setting.startsWith(HIDE_OPTIMISER_PRESET_PREFIX));
  if (newHidden.length > 0) {
    const existing = await prisma.userSetting.findMany({
      where: {
        userUuid,
        setting: { startsWith: HIDE_OPTIMISER_PRESET_PREFIX },
      },
      select: { setting: true },
    });
    const hidden = new Set([
      ...existing.map(({ setting }) => setting),
      ...newHidden,
    ]);
    if (hidden.size > MAX_HIDDEN_OPTIMISER_PRESETS) {
      throw new HttpError(400, "Too many hidden optimiser presets");
    }
  }

  await Promise.all(
    validEntries.map(({ setting, display, value }) => {
      return prisma.userSetting.upsert({
        where: { userUuid_setting: { userUuid, setting } },
        update: { value, display },
        create: { userUuid, setting, value, display },
      });
    }),
  );
}

const OPTIMISER_PRESET_FIELDS = {
  id: true,
  name: true,
  targets: true,
  sortOrder: true,
};

/** Throws unless `payload` is `{ id?, name, targets }` with valid targets. */
function validateOptimiserPreset(payload) {
  const { id, name, targets } = payload ?? {};
  if (id !== undefined && !isValidPresetId(id)) {
    throw new HttpError(400, "Invalid preset id");
  }
  if (typeof name === "string" && OPTIMISER_PRESET_NAME_FORBIDDEN.test(name)) {
    throw new HttpError(400, "Preset name contains invalid characters");
  }
  const trimmed = typeof name === "string" ? name.normalize("NFC").trim() : "";
  if (!trimmed || trimmed.length > OPTIMISER_PRESET_MAX_NAME_LENGTH) {
    throw new HttpError(
      400,
      `Preset name must be 1-${OPTIMISER_PRESET_MAX_NAME_LENGTH} characters`,
    );
  }
  if (
    !Array.isArray(targets) ||
    targets.length === 0 ||
    targets.length > OPTIMISER_PRESET_MAX_TARGETS
  ) {
    throw new HttpError(
      400,
      `A preset needs 1-${OPTIMISER_PRESET_MAX_TARGETS} targets`,
    );
  }
  const seen = new Set();
  const cleanTargets = targets.map((t) => {
    const { x, y, weight } = t ?? {};
    if (
      !OPTIMISER_X_VALUES.has(x) ||
      !OPTIMISER_Y_VALUES.has(y) ||
      !Number.isInteger(weight) ||
      weight < 0 ||
      weight > OPTIMISER_MAX_WEIGHT
    ) {
      throw new HttpError(400, "Invalid preset target");
    }
    if (seen.has(`${x}/${y}`))
      throw new HttpError(400, "Duplicate preset target");
    seen.add(`${x}/${y}`);
    return { x, y, weight };
  });
  return { id, name: trimmed, targets: cleanTargets };
}

export async function getOptimiserPresets(userUuid) {
  return prisma.optimiserPreset.findMany({
    where: { userUuid },
    select: OPTIMISER_PRESET_FIELDS,
    orderBy: [{ sortOrder: "asc" }, { id: "desc" }],
  });
}

/** Updates the preset when `id` is given, otherwise creates it at the top of the list. */
export async function upsertOptimiserPreset(userUuid, payload) {
  const { id, name, targets } = validateOptimiserPreset(payload);
  await ensureUser(userUuid);

  if (id) {
    const { count } = await prisma.optimiserPreset.updateMany({
      where: { id, userUuid },
      data: { name, targets },
    });
    if (count === 0) throw new HttpError(404, "Optimiser preset not found");
    return prisma.optimiserPreset.findUnique({
      where: { id },
      select: OPTIMISER_PRESET_FIELDS,
    });
  }

  const presetCount = await prisma.optimiserPreset.count({
    where: { userUuid },
  });
  if (presetCount >= OPTIMISER_PRESET_MAX_COUNT) {
    throw new HttpError(
      400,
      `You can save up to ${OPTIMISER_PRESET_MAX_COUNT} presets`,
    );
  }
  const first = await prisma.optimiserPreset.findFirst({
    where: { userUuid },
    orderBy: { sortOrder: "asc" },
    select: { sortOrder: true },
  });
  return prisma.optimiserPreset.create({
    data: { userUuid, name, targets, sortOrder: (first?.sortOrder ?? 1) - 1 },
    select: OPTIMISER_PRESET_FIELDS,
  });
}

export async function deleteOptimiserPreset(userUuid, presetId) {
  if (!isValidPresetId(presetId)) throw new HttpError(400, "Invalid preset id");
  const { count } = await prisma.optimiserPreset.deleteMany({
    where: { id: presetId, userUuid },
  });
  if (count === 0) throw new HttpError(404, "Optimiser preset not found");
  return { message: "Optimiser preset deleted" };
}

/** Sets the order of the player's presets; `ids` must list exactly their presets. */
export async function reorderOptimiserPresets(userUuid, ids) {
  if (!Array.isArray(ids) || !ids.every(isValidPresetId)) {
    throw new HttpError(400, "Invalid preset order");
  }
  const owned = await prisma.optimiserPreset.findMany({
    where: { userUuid },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((p) => p.id));
  if (
    ids.length !== ownedIds.size ||
    new Set(ids).size !== ids.length ||
    !ids.every((id) => ownedIds.has(id))
  ) {
    throw new HttpError(
      400,
      "Preset order must list each of your presets once",
    );
  }

  await prisma.$transaction(
    ids.map((id, sortOrder) =>
      prisma.optimiserPreset.updateMany({
        where: { id, userUuid },
        data: { sortOrder },
      }),
    ),
  );
  return getOptimiserPresets(userUuid);
}
