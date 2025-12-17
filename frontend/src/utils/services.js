export const serviceTiers = ["basic", "advanced", "expert"];

export const filterServices = (services, requirement) => {
  const { keywords, serviceKeyword, tier } = requirement;
  const kws = keywords && keywords.length ? keywords.map((kw) => kw) : [];
  if (serviceKeyword) kws.push(serviceKeyword);

  return services.filter((service) => {
    const checkTier =
      serviceTiers.indexOf(service.tier) >= serviceTiers.indexOf(tier);
    const checkKeywords = kws.every((kw) => service.keywords.includes(kw));
    return checkTier && checkKeywords;
  });
};

export const sortServicesByTier = (a, b) =>
  serviceTiers.indexOf(a.tier) - serviceTiers.indexOf(b.tier) ||
  a.name.localeCompare(b.name);
