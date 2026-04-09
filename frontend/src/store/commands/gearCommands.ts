import type { Command, IGearStore, IGearSetStore, GearSlots, GearSetMapping } from "./types";

// ---------------------------------------------------------------------------
// EquipItemCommand
// ---------------------------------------------------------------------------

export class EquipItemCommand implements Command {
  readonly description: string;
  timestamp?: number;

  constructor(
    private readonly gearStore: IGearStore,
    private readonly slot: string,
    private readonly newItem: unknown,
    private readonly previousItem: unknown = null,
  ) {
    this.description =
      newItem && typeof newItem === "object" && "name" in newItem
        ? `Equip ${(newItem as { name: string }).name} to ${slot}`
        : `Unequip ${slot}`;
  }

  async execute(): Promise<void> {
    this.gearStore._setGearSlotDirect(this.slot, this.newItem);
  }

  async undo(): Promise<void> {
    this.gearStore._setGearSlotDirect(this.slot, this.previousItem);
  }
}

// ---------------------------------------------------------------------------
// UnequipAllCommand
// ---------------------------------------------------------------------------

export class UnequipAllCommand implements Command {
  readonly description = "Unequip all gear";
  timestamp?: number;

  private readonly previousGearSlots: GearSlots;

  constructor(
    private readonly gearStore: IGearStore,
    previousGearSlots: GearSlots,
  ) {
    this.previousGearSlots = { ...previousGearSlots };
  }

  async execute(): Promise<void> {
    const preservedSlots: GearSlots = {};
    for (const [slot, item] of Object.entries(this.previousGearSlots)) {
      if (this.gearStore.isSlotLocked(slot) && item !== null) {
        preservedSlots[slot] = item;
      }
    }
    this.gearStore._setAllGearSlotsDirect(preservedSlots);
  }

  async undo(): Promise<void> {
    this.gearStore._setAllGearSlotsDirect(this.previousGearSlots);
  }
}

// ---------------------------------------------------------------------------
// EquipMultipleCommand
// ---------------------------------------------------------------------------

export class EquipMultipleCommand implements Command {
  readonly description = "Load gear set";
  timestamp?: number;

  private readonly newGearSlots: GearSlots;
  private readonly previousGearSlots: GearSlots;

  constructor(
    private readonly gearStore: IGearStore,
    newGearSlots: GearSlots,
    previousGearSlots: GearSlots,
  ) {
    this.newGearSlots = { ...newGearSlots };
    this.previousGearSlots = { ...previousGearSlots };
  }

  async execute(): Promise<void> {
    await this.gearStore._equipMultipleDirect(this.newGearSlots);
  }

  async undo(): Promise<void> {
    this.gearStore._setAllGearSlotsDirect(this.previousGearSlots);
  }
}

// ---------------------------------------------------------------------------
// LoadGearSetCommand
// ---------------------------------------------------------------------------

export class LoadGearSetCommand implements Command {
  readonly description: string;
  timestamp?: number;

  private readonly gearSetData: Record<string, unknown> | null;
  private readonly gearSetMapping: GearSetMapping;
  private readonly previousGearSetData: Record<string, unknown> | null;
  private readonly previousGearSlots: GearSlots | null;

  constructor(
    private readonly gearStore: IGearStore,
    private readonly gearSetStore: IGearSetStore,
    readonly setId: number | null,
    gearSetData: Record<string, unknown> | null,
    gearSetMapping: GearSetMapping,
    readonly previousGearSetId: number | null = null,
    previousGearSetData: Record<string, unknown> | null = null,
    previousGearSlots: GearSlots | null = null,
  ) {
    this.gearSetData = gearSetData ? { ...gearSetData } : null;
    this.gearSetMapping = { ...gearSetMapping };
    this.previousGearSetData = previousGearSetData ? { ...previousGearSetData } : null;
    this.previousGearSlots = previousGearSlots ? { ...previousGearSlots } : null;
    this.description =
      typeof gearSetData?.name === "string" && gearSetData.name
        ? `Load gear set: ${gearSetData.name}`
        : "Clear gear set";
  }

  async execute(): Promise<void> {
    if (this.gearSetData) {
      this.gearSetStore._setCurrentSetDirect(this.gearSetData);
    } else {
      this.gearSetStore._createNewSetDirect();
    }

    if (this.gearSetMapping && Object.keys(this.gearSetMapping).length > 0) {
      const processedGearSlots = await this.gearStore._processGearSetData(this.gearSetMapping);
      await this.gearStore._batchUpdateGearState(processedGearSlots);
    } else {
      await this.gearStore._batchUpdateGearState({});
    }
  }

  async undo(): Promise<void> {
    if (this.previousGearSetData) {
      this.gearSetStore._setCurrentSetDirect(this.previousGearSetData);
    } else {
      this.gearSetStore._createNewSetDirect();
    }

    this.gearStore._setAllGearSlotsDirect(this.previousGearSlots ?? {});
  }
}
