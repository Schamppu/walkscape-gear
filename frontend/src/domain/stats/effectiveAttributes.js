function initTotals(baseAttrs) {
  return Object.fromEntries(
    baseAttrs.map((attribute) => {
      return [
        attribute,
        {
          flat: {
            sum: 0,
            positive: 0,
            negative: 0,
          },
          percent: {
            sum: 0,
            positive: 0,
            negative: 0,
          },
        },
      ];
    }),
  );
}

export function calculateEffectiveAttrs({ baseAttrs, sources, context }) {
  const totals = initTotals(baseAttrs);

  for (const source of sources) {
    if (!applies(source, context)) continue;

    for (const attr of source.attrs) {
      if (attr.type === "flat") {
        totals[attr.key].flat += attr.value;
      } else {
        totals[attr.key].percent += attr.value;
      }
    }
  }

  return finalizeTotals(totals);
}
