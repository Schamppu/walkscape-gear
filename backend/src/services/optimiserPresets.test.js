/**
 * Tests for the optimiser preset functions in dbService.js
 *
 * Goals:
 * - Verify payload validation rejects malformed presets.
 * - Verify every query is scoped to the requesting user.
 * - Verify new presets go to the top of the list.
 * - Verify reordering only accepts the user's own presets.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  optimiserPreset: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  userSetting: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../generated/prisma/client.js", () => ({
  PrismaClient: vi.fn(function () {
    return mockPrisma;
  }),
}));

vi.mock("../../prisma/tag-data.js", () => ({
  validTags: [],
}));

const {
  upsertOptimiserPreset,
  deleteOptimiserPreset,
  reorderOptimiserPresets,
  upsertUserSettings,
} = await import("./dbService.js");

const USER_A = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";

const validPreset = () => ({
  name: "  My preset  ",
  targets: [
    { x: "xp", y: "step", weight: 10 },
    { x: "rewardRolls", y: "material", weight: 3 },
  ],
});

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.user.findUnique.mockResolvedValue({ userUuid: USER_A });
  mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });
  mockPrisma.optimiserPreset.create.mockImplementation(({ data }) => ({
    id: 1,
    ...data,
  }));
  mockPrisma.optimiserPreset.findMany.mockResolvedValue([]);
  mockPrisma.optimiserPreset.count.mockResolvedValue(0);
  mockPrisma.userSetting.findMany.mockResolvedValue([]);
  mockPrisma.$transaction.mockResolvedValue([]);
});

describe("upsertOptimiserPreset validation", () => {
  it.each([
    ["a missing name", { ...validPreset(), name: "   " }],
    ["a long name", { ...validPreset(), name: "x".repeat(51) }],
    ["no targets", { ...validPreset(), targets: [] }],
    [
      "too many targets",
      {
        ...validPreset(),
        targets: Array(9).fill({ x: "xp", y: "step", weight: 1 }),
      },
    ],
    [
      "an unknown x",
      { ...validPreset(), targets: [{ x: "gold", y: "step", weight: 1 }] },
    ],
    [
      "an unknown y",
      { ...validPreset(), targets: [{ x: "xp", y: "hour", weight: 1 }] },
    ],
    [
      "a weight over 10",
      { ...validPreset(), targets: [{ x: "xp", y: "step", weight: 11 }] },
    ],
    [
      "a fractional weight",
      { ...validPreset(), targets: [{ x: "xp", y: "step", weight: 2.5 }] },
    ],
    [
      "duplicate targets",
      {
        ...validPreset(),
        targets: [
          { x: "xp", y: "step", weight: 1 },
          { x: "xp", y: "step", weight: 2 },
        ],
      },
    ],
    ["an invalid id", { ...validPreset(), id: "1" }],
    ["an id beyond INT4", { ...validPreset(), id: 2147483648 }],
    ["a zero-width name", { ...validPreset(), name: "​" }],
    ["a bidi override", { ...validPreset(), name: "abc‮def" }],
    ["a newline", { ...validPreset(), name: "a\nb" }],
    ["a null byte", { ...validPreset(), name: "a\u0000b" }],
  ])("rejects %s", async (_, payload) => {
    await expect(upsertOptimiserPreset(USER_A, payload)).rejects.toMatchObject({
      status: 400,
    });
    expect(mockPrisma.optimiserPreset.create).not.toHaveBeenCalled();
    expect(mockPrisma.optimiserPreset.updateMany).not.toHaveBeenCalled();
  });

  it("stores only the known target fields and a trimmed name", async () => {
    const payload = validPreset();
    payload.targets[0].extra = "ignored";
    await upsertOptimiserPreset(USER_A, payload);
    const { data } = mockPrisma.optimiserPreset.create.mock.calls[0][0];
    expect(data.name).toBe("My preset");
    expect(data.targets).toEqual([
      { x: "xp", y: "step", weight: 10 },
      { x: "rewardRolls", y: "material", weight: 3 },
    ]);
  });

  it("accepts emoji and accented names, normalised to NFC", async () => {
    await upsertOptimiserPreset(USER_A, { ...validPreset(), name: "Café ⚔️" });
    expect(mockPrisma.optimiserPreset.create.mock.calls[0][0].data.name).toBe(
      "Café ⚔️",
    );
  });
});

describe("upsertOptimiserPreset", () => {
  it("creates a new preset above the current first one", async () => {
    mockPrisma.optimiserPreset.findFirst.mockResolvedValue({ sortOrder: -2 });
    await upsertOptimiserPreset(USER_A, validPreset());
    expect(mockPrisma.optimiserPreset.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userUuid: USER_A } }),
    );
    expect(
      mockPrisma.optimiserPreset.create.mock.calls[0][0].data,
    ).toMatchObject({
      userUuid: USER_A,
      sortOrder: -3,
    });
  });

  it("refuses to create beyond the per-user cap", async () => {
    mockPrisma.optimiserPreset.count.mockResolvedValue(50);
    await expect(
      upsertOptimiserPreset(USER_A, validPreset()),
    ).rejects.toMatchObject({ status: 400 });
    expect(mockPrisma.optimiserPreset.count).toHaveBeenCalledWith({
      where: { userUuid: USER_A },
    });
    expect(mockPrisma.optimiserPreset.create).not.toHaveBeenCalled();
  });

  it("still allows updates at the cap", async () => {
    mockPrisma.optimiserPreset.count.mockResolvedValue(50);
    mockPrisma.optimiserPreset.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.optimiserPreset.findUnique.mockResolvedValue({ id: 5 });
    await expect(
      upsertOptimiserPreset(USER_A, { ...validPreset(), id: 5 }),
    ).resolves.toEqual({ id: 5 });
  });

  it("starts the first preset at sort order 0", async () => {
    mockPrisma.optimiserPreset.findFirst.mockResolvedValue(null);
    await upsertOptimiserPreset(USER_A, validPreset());
    expect(
      mockPrisma.optimiserPreset.create.mock.calls[0][0].data.sortOrder,
    ).toBe(0);
  });

  it("updates only the user's own preset", async () => {
    mockPrisma.optimiserPreset.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.optimiserPreset.findUnique.mockResolvedValue({ id: 5 });
    await upsertOptimiserPreset(USER_A, { ...validPreset(), id: 5 });
    expect(mockPrisma.optimiserPreset.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5, userUuid: USER_A } }),
    );
  });

  it("reports another user's preset as not found", async () => {
    mockPrisma.optimiserPreset.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      upsertOptimiserPreset(USER_A, { ...validPreset(), id: 5 }),
    ).rejects.toMatchObject({
      status: 404,
      message: "Optimiser preset not found",
    });
  });
});

describe("deleteOptimiserPreset", () => {
  it("deletes scoped to the user", async () => {
    mockPrisma.optimiserPreset.deleteMany.mockResolvedValue({ count: 1 });
    await deleteOptimiserPreset(USER_A, 5);
    expect(mockPrisma.optimiserPreset.deleteMany).toHaveBeenCalledWith({
      where: { id: 5, userUuid: USER_A },
    });
  });

  it("reports a missing preset as not found", async () => {
    mockPrisma.optimiserPreset.deleteMany.mockResolvedValue({ count: 0 });
    await expect(deleteOptimiserPreset(USER_A, 5)).rejects.toMatchObject({
      status: 404,
    });
  });

  it.each([NaN, 0, 2147483648])(
    "rejects id %s without querying",
    async (id) => {
      await expect(deleteOptimiserPreset(USER_A, id)).rejects.toMatchObject({
        status: 400,
      });
      expect(mockPrisma.optimiserPreset.deleteMany).not.toHaveBeenCalled();
    },
  );
});

describe("reorderOptimiserPresets", () => {
  beforeEach(() => {
    mockPrisma.optimiserPreset.findMany.mockResolvedValue([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ]);
  });

  it("sets the sort order from the list position", async () => {
    await reorderOptimiserPresets(USER_A, [3, 1, 2]);
    expect(mockPrisma.optimiserPreset.updateMany.mock.calls).toEqual([
      [{ where: { id: 3, userUuid: USER_A }, data: { sortOrder: 0 } }],
      [{ where: { id: 1, userUuid: USER_A }, data: { sortOrder: 1 } }],
      [{ where: { id: 2, userUuid: USER_A }, data: { sortOrder: 2 } }],
    ]);
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
  });

  it.each([
    ["a missing preset", [1, 2]],
    ["another user's preset", [1, 2, 4]],
    ["a duplicate", [1, 1, 2]],
    ["a non-integer id", [1, 2, "3"]],
    ["an id beyond INT4", [1, 2, 2147483648]],
    ["no list", undefined],
  ])("rejects an order with %s", async (_, ids) => {
    await expect(reorderOptimiserPresets(USER_A, ids)).rejects.toMatchObject({
      status: 400,
    });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("hidden built-in preset settings", () => {
  it("accepts hideOptimiserPreset:<slug> settings", async () => {
    await upsertUserSettings(USER_A, [
      { setting: "hideOptimiserPreset:max-xp", value: true, display: 0 },
    ]);
    expect(mockPrisma.userSetting.upsert).toHaveBeenCalledOnce();
  });

  it.each([
    "hideOptimiserPreset:",
    "hideOptimiserPreset:Max XP",
    "hideOptimiserPresetmax-xp",
  ])("rejects %s", async (setting) => {
    await expect(
      upsertUserSettings(USER_A, [{ setting, value: true, display: 0 }]),
    ).rejects.toThrow("No valid settings provided");
  });

  const hidden = (n, from = 0) =>
    Array.from({ length: n }, (_, i) => ({
      setting: `hideOptimiserPreset:p${from + i}`,
    }));

  it("rejects going beyond 20 hidden presets", async () => {
    mockPrisma.userSetting.findMany.mockResolvedValue(hidden(19));
    await expect(
      upsertUserSettings(
        USER_A,
        hidden(2, 19).map((s) => ({ ...s, value: true, display: 0 })),
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(mockPrisma.userSetting.upsert).not.toHaveBeenCalled();
  });

  it("allows re-saving an already-hidden preset at the cap", async () => {
    mockPrisma.userSetting.findMany.mockResolvedValue(hidden(20));
    await upsertUserSettings(USER_A, [
      { setting: "hideOptimiserPreset:p0", value: false, display: 0 },
    ]);
    expect(mockPrisma.userSetting.upsert).toHaveBeenCalledOnce();
  });

  it("does not look up hidden presets for other settings", async () => {
    await upsertUserSettings(USER_A, [
      { setting: "showOwned", value: true, display: 0 },
    ]);
    expect(mockPrisma.userSetting.findMany).not.toHaveBeenCalled();
  });
});
