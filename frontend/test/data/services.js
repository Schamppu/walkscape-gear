export const mockServices = [
  {
    id: "alight_kitchen_basic",
    nameLocalizationKey: "services.singulars.cooking.azurazeraKitchen.name",
    name: "Alight Kitchen (Basic)",
    tier: "basic",
    serviceType: "crafting",
    keywords: ["kitchen"],
    relatedSkills: ["cooking"],
    requirements: [],
    attributes: [
      {
        id: "2673bca1-3b54-48f2-9362-8725f712628e",
        customIcon: "",
        customTextLocalizationKey: "",
        customText: "",
        textLocalizationKey: "",
        text: "",
        statText: "Bonus experience",
        skillText: "Cooking",
        tables: null,
        requirements: [
          {
            type: "mainSkill",
            name: "",
            opposite: false,
            requirement: { runtimeType: "mainSkill", skill: "cooking" },
          },
        ],
        stats: [
          {
            stat: "bonus_experience",
            name: "Bonus experience",
            type: "bonusExperience",
            isPercent: true,
            value: 0.1,
            isNegative: false,
            isMultiplicative: true,
          },
        ],
      },
    ],
    icon: "assets/icons/services/kitchen.png",
  },
  {
    id: "basic_kitchen",
    nameLocalizationKey: "services.singulars.cooking.basicKitchen.name",
    name: "Basic Kitchen",
    tier: "basic",
    serviceType: "crafting",
    keywords: ["kitchen"],
    relatedSkills: ["cooking"],
    requirements: [],
    attributes: [],
    icon: "assets/icons/services/kitchen.png",
  },
  {
    id: "eberhart_mansion_kitchen_advanced",
    nameLocalizationKey:
      "services.singulars.cooking.eberhartMansionKitchen.name",
    name: "Eberhart Mansion Kitchen (Advanced)",
    tier: "advanced",
    serviceType: "crafting",
    keywords: ["kitchen"],
    relatedSkills: ["cooking"],
    requirements: [
      {
        type: "itemAnywhere",
        name: null,
        opposite: false,
        requirement: {
          runtimeType: "itemAnywhere",
          item: "soup_kitchen_badge",
        },
      },
    ],
    attributes: [
      {
        id: "attribute-copy-service_attr-dfc40a54-7719-4654-9cb4-02cd2954ad9b",
        customIcon: "",
        customTextLocalizationKey: "",
        customText: "",
        textLocalizationKey:
          "attributes.singulars.skilling.workEfficiency.whileMainSkill.text",
        text: '<stat s="workEfficiency"/> while <supp k="skill"/>',
        statText: "Work efficiency",
        skillText: "Cooking",
        tables: null,
        requirements: [
          {
            type: "mainSkill",
            name: null,
            opposite: false,
            requirement: { runtimeType: "mainSkill", skill: "cooking" },
          },
        ],
        stats: [
          {
            stat: "work_efficiency",
            name: "Work efficiency",
            type: "workEfficiency",
            isPercent: true,
            value: 0.05,
            isNegative: false,
            isMultiplicative: true,
          },
        ],
      },
    ],
    icon: "assets/icons/services/kitchen_mansion.png",
  },
  {
    id: "underwater_kitchen_basic",
    nameLocalizationKey: "services.singulars.cooking.underwaterKitchen.name",
    name: "Underwater Kitchen (Basic)",
    tier: "basic",
    serviceType: "crafting",
    keywords: ["kitchen"],
    relatedSkills: ["cooking"],
    requirements: [
      {
        type: "distinctKeywordItemsEquipped",
        name: null,
        opposite: false,
        requirement: {
          runtimeType: "distinctKeywordItemsEquipped",
          quantity: 3,
          keywords: ["diving_gear"],
        },
      },
    ],
    attributes: [
      {
        id: "attribute-copy-service_attr-9e15f4e8-9b36-4fe8-9da2-9c947e3358f7",
        customIcon: "",
        customTextLocalizationKey: "",
        customText: "",
        textLocalizationKey:
          "attributes.singulars.skilling.workEfficiency.whileMainSkill.text",
        text: '<stat s="workEfficiency"/> while <supp k="skill"/>',
        statText: "Work efficiency",
        skillText: "Cooking",
        tables: null,
        requirements: [
          {
            type: "mainSkill",
            name: null,
            opposite: false,
            requirement: { runtimeType: "mainSkill", skill: "cooking" },
          },
        ],
        stats: [
          {
            stat: "work_efficiency",
            name: "Work efficiency",
            type: "workEfficiency",
            isPercent: true,
            value: -0.1,
            isNegative: true,
            isMultiplicative: true,
          },
        ],
      },
      {
        id: "attribute-copy-service_attr-045b6335-a9f3-4a72-b590-ce55eba8574c",
        customIcon: "",
        customTextLocalizationKey: "",
        customText: "",
        textLocalizationKey:
          "attributes.singulars.skilling.noMaterialsConsumed.whileMainSkill.text",
        text: '<stat s="noMaterialsConsumed"/> while <supp k="skill"/>',
        statText: "No materials consumed",
        skillText: "Cooking",
        tables: null,
        requirements: [
          {
            type: "mainSkill",
            name: null,
            opposite: false,
            requirement: { runtimeType: "mainSkill", skill: "cooking" },
          },
        ],
        stats: [
          {
            stat: "no_materials_consumed",
            name: "No materials consumed",
            type: "noMaterialsConsumed",
            isPercent: true,
            value: 0.05,
            isNegative: false,
            isMultiplicative: true,
          },
        ],
      },
    ],
    icon: "assets/icons/services/kitchen_underwater.png",
  },
];
