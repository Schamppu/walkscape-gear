/**
 * Tests for deleteUserData in dbService.js
 *
 * Goals:
 * - Verify only the target user's data is deleted.
 * - Verify a second user's data is never touched.
 * - Verify all tables are included in the deletion.
 * - Verify gear set child rows are resolved before the transaction.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock — vi.hoisted runs before imports so the reference is available
// inside vi.mock factories.
// ---------------------------------------------------------------------------
const mockPrisma = vi.hoisted(() => ({
  gearSet: {
    findMany: vi.fn(),
    deleteMany: vi.fn().mockReturnValue("op:gearSet.deleteMany"),
  },
  gearSetItem: {
    deleteMany: vi.fn().mockReturnValue("op:gearSetItem.deleteMany"),
  },
  gearSetTag: {
    deleteMany: vi.fn().mockReturnValue("op:gearSetTag.deleteMany"),
  },
  playerStat: {
    deleteMany: vi.fn().mockReturnValue("op:playerStat.deleteMany"),
  },
  ownedItem: {
    deleteMany: vi.fn().mockReturnValue("op:ownedItem.deleteMany"),
  },
  factionReputation: {
    deleteMany: vi.fn().mockReturnValue("op:factionReputation.deleteMany"),
  },
  userSetting: {
    deleteMany: vi.fn().mockReturnValue("op:userSetting.deleteMany"),
  },
  user: {
    deleteMany: vi.fn().mockReturnValue("op:user.deleteMany"),
  },
  $transaction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../generated/prisma/index.js", () => ({
  // Must be a regular function (not arrow) so `new PrismaClient()` works.
  // Returning an object from a constructor returns that object instead of `this`.
  PrismaClient: vi.fn(function () {
    return mockPrisma;
  }),
}));

vi.mock("../../prisma/tag-data.js", () => ({
  validTags: [],
}));

// Import after mocks are registered
const { deleteUserData } = await import("./dbService.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const USER_A = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";

const GEAR_SET_IDS_A = [1, 2];
const GEAR_SET_IDS_B = [3];

beforeEach(() => {
  vi.clearAllMocks();
  // Default: user A has gear sets 1 and 2
  mockPrisma.gearSet.findMany.mockResolvedValue(
    GEAR_SET_IDS_A.map((id) => ({ id })),
  );
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("deleteUserData", () => {
  it("queries gear sets only for the target user", async () => {
    await deleteUserData(USER_A);
    expect(mockPrisma.gearSet.findMany).toHaveBeenCalledOnce();
    expect(mockPrisma.gearSet.findMany).toHaveBeenCalledWith({
      where: { userUuid: USER_A },
      select: { id: true },
    });
  });

  it("passes all 8 delete operations to $transaction", async () => {
    await deleteUserData(USER_A);
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    const ops = mockPrisma.$transaction.mock.calls[0][0];
    expect(ops).toHaveLength(8);
  });

  it("deletes gear set child rows scoped to the resolved gear set IDs", async () => {
    await deleteUserData(USER_A);

    expect(mockPrisma.gearSetItem.deleteMany).toHaveBeenCalledWith({
      where: { gearSetId: { in: GEAR_SET_IDS_A } },
    });
    expect(mockPrisma.gearSetTag.deleteMany).toHaveBeenCalledWith({
      where: { gearSetId: { in: GEAR_SET_IDS_A } },
    });
  });

  it("deletes all user-level rows scoped to the target UUID only", async () => {
    await deleteUserData(USER_A);

    const byUuid = { where: { userUuid: USER_A } };
    expect(mockPrisma.gearSet.deleteMany).toHaveBeenCalledWith(byUuid);
    expect(mockPrisma.playerStat.deleteMany).toHaveBeenCalledWith(byUuid);
    expect(mockPrisma.ownedItem.deleteMany).toHaveBeenCalledWith(byUuid);
    expect(mockPrisma.factionReputation.deleteMany).toHaveBeenCalledWith(byUuid);
    expect(mockPrisma.userSetting.deleteMany).toHaveBeenCalledWith(byUuid);
    expect(mockPrisma.user.deleteMany).toHaveBeenCalledWith(byUuid);
  });

  it("never references a different user's UUID in any delete call", async () => {
    await deleteUserData(USER_A);

    const allDeleteCalls = [
      mockPrisma.gearSet.deleteMany,
      mockPrisma.gearSetItem.deleteMany,
      mockPrisma.gearSetTag.deleteMany,
      mockPrisma.playerStat.deleteMany,
      mockPrisma.ownedItem.deleteMany,
      mockPrisma.factionReputation.deleteMany,
      mockPrisma.userSetting.deleteMany,
      mockPrisma.user.deleteMany,
    ].flatMap((fn) => fn.mock.calls);

    const serialized = JSON.stringify(allDeleteCalls);
    expect(serialized).not.toContain(USER_B);
  });

  it("never references a second user's gear set IDs in child-row deletes", async () => {
    await deleteUserData(USER_A);

    const childCalls = [
      ...mockPrisma.gearSetItem.deleteMany.mock.calls,
      ...mockPrisma.gearSetTag.deleteMany.mock.calls,
    ];
    const ids = childCalls.flatMap(([{ where }]) => where.gearSetId.in);
    for (const id of ids) {
      expect(GEAR_SET_IDS_B).not.toContain(id);
    }
  });

  it("handles a user with no gear sets without error", async () => {
    mockPrisma.gearSet.findMany.mockResolvedValue([]);

    await deleteUserData(USER_A);

    expect(mockPrisma.gearSetItem.deleteMany).toHaveBeenCalledWith({
      where: { gearSetId: { in: [] } },
    });
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
  });

  it("does not call $transaction if gear set lookup fails", async () => {
    mockPrisma.gearSet.findMany.mockRejectedValue(new Error("DB error"));

    await expect(deleteUserData(USER_A)).rejects.toThrow("DB error");
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
