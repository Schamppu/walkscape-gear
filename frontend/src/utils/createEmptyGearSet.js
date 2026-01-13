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
