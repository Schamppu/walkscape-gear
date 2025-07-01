export const serviceTiers = ["basic", "advanced", "expert"];

export const filterServicesByTier = (services, tier) => {
  return services.filter(
    (service) =>
      serviceTiers.indexOf(service.tier) >= serviceTiers.indexOf(tier)
  );
};

export const sortServicesByTier = (a, b) =>
  serviceTiers.indexOf(a.tier) - serviceTiers.indexOf(b.tier) ||
  a.name.localeCompare(b.name);
