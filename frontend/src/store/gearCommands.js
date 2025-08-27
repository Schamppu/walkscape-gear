// Command classes for gear operations

export class EquipItemCommand {
  constructor(gearStore, slot, newItem, previousItem = null) {
    this.gearStore = gearStore;
    this.slot = slot;
    this.newItem = newItem;
    this.previousItem = previousItem;
    this.description = newItem
      ? `Equip ${newItem.name} to ${slot}`
      : `Unequip ${slot}`;
  }

  async execute() {
    // Don't record history during execute/undo
    this.gearStore._setGearSlotDirect(this.slot, this.newItem);
  }

  async undo() {
    // Don't record history during execute/undo
    this.gearStore._setGearSlotDirect(this.slot, this.previousItem);
  }
}

export class UnequipAllCommand {
  constructor(gearStore, previousGearSlots) {
    this.gearStore = gearStore;
    this.previousGearSlots = { ...previousGearSlots }; // Deep copy
    this.description = "Unequip all gear";
  }

  async execute() {
    // Don't record history during execute/undo
    this.gearStore._setAllGearSlotsDirect({});
  }

  async undo() {
    // Don't record history during execute/undo
    this.gearStore._setAllGearSlotsDirect(this.previousGearSlots);
  }
}

export class EquipMultipleCommand {
  constructor(gearStore, newGearSlots, previousGearSlots) {
    this.gearStore = gearStore;
    this.newGearSlots = { ...newGearSlots }; // Deep copy
    this.previousGearSlots = { ...previousGearSlots }; // Deep copy
    this.description = "Load gear set";
  }

  async execute() {
    // Don't record history during execute/undo
    await this.gearStore._equipMultipleDirect(this.newGearSlots);
  }

  async undo() {
    // Don't record history during execute/undo
    this.gearStore._setAllGearSlotsDirect(this.previousGearSlots);
  }
}

export class LoadGearSetCommand {
  constructor(
    gearStore,
    gearSetStore,
    setId,
    gearSetData,
    gearSetMapping,
    previousGearSetId = null,
    previousGearSetData = null,
    previousGearSlots = null
  ) {
    this.gearStore = gearStore;
    this.gearSetStore = gearSetStore;
    this.setId = setId;
    this.gearSetData = gearSetData ? { ...gearSetData } : null; // Deep copy
    this.gearSetMapping = { ...gearSetMapping }; // The raw gear set mapping
    this.previousGearSetId = previousGearSetId;
    this.previousGearSetData = previousGearSetData
      ? { ...previousGearSetData }
      : null;
    this.previousGearSlots = previousGearSlots
      ? { ...previousGearSlots }
      : null;
    this.description = gearSetData?.name
      ? `Load gear set: ${gearSetData.name}`
      : `Clear gear set`;
  }

  async execute() {
    // Don't record history during execute/undo
    // Set gear set state
    if (this.gearSetData) {
      this.gearSetStore._setCurrentSetDirect(this.gearSetData);
    } else {
      this.gearSetStore._createNewSetDirect();
    }

    // Process and equip the gear
    if (this.gearSetMapping && Object.keys(this.gearSetMapping).length > 0) {
      const processedGearSlots = await this.gearStore._processGearSetData(
        this.gearSetMapping
      );
      await this.gearStore._equipMultipleDirect(processedGearSlots);
    } else {
      // Clear all gear if no mapping provided
      await this.gearStore._equipMultipleDirect({});
    }
  }

  async undo() {
    // Don't record history during execute/undo
    // Restore previous gear set state
    if (this.previousGearSetData) {
      this.gearSetStore._setCurrentSetDirect(this.previousGearSetData);
    } else {
      this.gearSetStore._createNewSetDirect();
    }

    // Restore previous gear
    if (this.previousGearSlots) {
      this.gearStore._setAllGearSlotsDirect(this.previousGearSlots);
    } else {
      this.gearStore._setAllGearSlotsDirect({});
    }
  }
}
