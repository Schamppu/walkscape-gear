-- Consumable counts become the source of truth (consumableCommon /
-- consumableFine are derived from them). Give every flagged quality a count of
-- at least 1, and clear counts of qualities that aren't flagged, so counts and
-- flags agree. Rows imported before "quantityFine" existed have all their stock
-- in "quantity"; that stays common, plus at least 1 fine if fine is flagged.
UPDATE "OwnedItem" SET
  "quantity" =
    CASE WHEN "consumableCommon" THEN GREATEST("quantity" - "quantityFine", 1) ELSE 0 END
    + CASE WHEN "consumableFine" THEN GREATEST("quantityFine", 1) ELSE 0 END,
  "quantityFine" = CASE WHEN "consumableFine" THEN GREATEST("quantityFine", 1) ELSE 0 END
WHERE "consumableCommon" OR "consumableFine";
