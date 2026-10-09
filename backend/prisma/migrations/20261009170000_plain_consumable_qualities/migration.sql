-- Consumables use the game's plain "common" / "fine" qualities instead of the
-- tool's "consumableCommon" / "consumableFine". Rewrite saved gear sets. (The
-- frontend also maps the old names when reading, for safety.)
UPDATE "GearSetItem"
SET "quality" = CASE "quality"
  WHEN 'consumableFine' THEN 'fine'
  WHEN 'consumableCommon' THEN 'common'
END
WHERE "quality" IN ('consumableFine', 'consumableCommon');
