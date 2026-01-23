export const gearTypes = [
  "head",
  "cape",
  "back",
  "chest",
  "primary",
  "secondary",
  "hands",
  "legs",
  "neck",
  "feet",
  "ring",
  "tool",
  "pet",
  "consumable",
  "location",
];

export const gearSlots = [
  "head",
  "cape",
  "back",
  "chest",
  "primary",
  "secondary",
  "hands",
  "legs",
  "neck",
  "feet",
  "ring1",
  "ring2",
  "tool1",
  "tool2",
  "tool3",
  "tool4",
  "tool5",
  "tool6",
  "pet",
  "consumable",
  "service",
];

export function createEmptyGearSet() {
  return {
    head: null,
    cape: null,
    back: null,
    chest: null,
    primary: null,
    secondary: null,
    hands: null,
    legs: null,
    neck: null,
    feet: null,
    ring1: null,
    ring2: null,
    tool1: null,
    tool2: null,
    tool3: null,
    tool4: null,
    tool5: null,
    tool6: null,
    pet: null,
    consumable: null,
    service: null,
  };
}

export function createEmptyGearSetSelection() {
  return {
    id: null,
    name: "",
    tags: [],
    items: [],
    isDirty: false,
    isNew: true,
  };
}
