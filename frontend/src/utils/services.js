export const serviceTiers = ["basic", "advanced", "expert"];

export const filterServices = (services, requirement) => {
  const keywords = requirement.keywords.map((kw) =>
    kw.startsWith("service_") ? kw.slice(8) : kw
  );

  return services.filter((service) => {
    const checkTier =
      serviceTiers.indexOf(service.tier) >=
      serviceTiers.indexOf(requirement.tier);
    const checkKeywords = keywords.every((kw) => service.keywords.includes(kw));
    return checkTier && checkKeywords;
  });
};

export const sortServicesByTier = (a, b) =>
  serviceTiers.indexOf(a.tier) - serviceTiers.indexOf(b.tier) ||
  a.name.localeCompare(b.name);
