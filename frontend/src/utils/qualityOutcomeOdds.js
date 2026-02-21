import { craftingQualityOptions } from "@/domain/constants/quality.ts";

const getOutcomeOdds = (levelReq, qualityOutcome, useFineMaterials) => {
  const weights = [
    [1000, 4],
    [200, 4],
    [50, 4],
    [10, 4],
    [2.5, 2],
    [0.05, 0.05],
  ];

  let base = craftingQualityOptions
    .map((quality, index) => ({
      ...quality,
      qualityValue: quality.value,
      bandStart: index * 100,
      bandEnd: (index + 1) * (100 + levelReq),
      weightStart: weights[index][0],
      weightEnd: weights[index][1],
    }))
    .map((item) => {
      const { bandStart, bandEnd, weightStart, weightEnd } = item;
      return {
        ...item,
        slope: (weightStart - weightEnd) / (bandStart - bandEnd),
      };
    })
    .map((item) => {
      const { weightEnd, weightStart, slope, bandStart } = item;
      return {
        ...item,
        weight:
          qualityOutcome < bandStart
            ? weightStart
            : Math.max(
                weightEnd,
                weightStart + slope * (qualityOutcome - bandStart)
              ),
      };
    });

  if (!useFineMaterials) {
    for (let i = base.length - 2; i >= 0; i--) {
      base[i].weight = Math.max(base[i].weight, base[i + 1].weight);
    }
  } else {
    for (let i = 0; i < base.length - 1; i++) {
      base[i].name = base[i + 1].name;
      base[i].qualityValue = base[i + 1].qualityValue;
    }
    base[4].weight = base[4].weight + base[5].weight;
    base = base.slice(0, -1);

    for (let i = base.length - 2; i >= 0; i--) {
      base[i].weight = Math.max(base[i].weight, base[i + 1].weight);
    }
  }

  const totalWeight = base.reduce((acc, item) => acc + item.weight, 0);
  return base.map((item) => {
    const { qualityValue, name, weight } = item;
    return {
      qualityValue,
      name,
      value: weight / totalWeight,
      crafts: totalWeight / weight,
    };
  });
};

export default getOutcomeOdds;
