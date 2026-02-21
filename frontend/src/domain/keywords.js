/**
 * Purpose:
 * Allows the tool to compute and display the keywords 
 * associated with the currently equipped gear set.
 *
 * Responsibilities:
 * - Extract keywords from the equipped gear set
 * - Count the occurrences of each keyword
 *
 * Does NOT:
 * - Mutate global state
 */

export function equippedKeywords(gearSet) {
  gearSet
    .filter((item) => "keywords" in item)
    .flatMap(({ keywords }) => keywords);
}

export function getKeywordCounts(gearSet) {
  equippedKeywords(gearSet).reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
}
