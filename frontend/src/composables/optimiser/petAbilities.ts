import { useItemsStore } from "@/store/items";
import { useDataStore } from "@/store/data";
import { unlockedAbilityIds } from "@/domain/abilities/petAbilityAttrs";
import type { PetAbility } from "@/domain/types/pet";

/**
 * Fetches the ability details for every owned pet's unlocked abilities, so
 * that candidate pets' ability attributes are available when the (synchronous)
 * scorer / worker job snapshots the ability context.
 */
export const prefetchPetAbilityDetails = async (): Promise<void> => {
  const itemsStore = useItemsStore();
  const dataStore = useDataStore();

  const ids = new Set<string>();
  for (const [id, owned] of Object.entries(itemsStore.ownedItems)) {
    const pet = itemsStore.petsMap[id] as unknown as
      | { abilities?: PetAbility[] }
      | undefined;
    if (!pet?.abilities?.length) continue;
    for (const aid of unlockedAbilityIds(pet, owned.petLevel ?? 0)) {
      ids.add(aid);
    }
  }
  if (ids.size) await dataStore.fetchDetailedAbilities([...ids]);
};
