/**
 * Purpose:
 * Pure functions for filtering and sorting location services.
 *
 * Does NOT:
 * - Import any Vue / reactive APIs
 * - Perform network requests
 * - Mutate external state
 */

import { serviceTiers } from "@/domain/constants/services";
import type { ServiceDetail } from "@/domain/types/service";

/**
 * A narrowing of Requirement for requirements of type "service",
 * where the inner `requirement` field has a known shape.
 */
export type ServiceRequirement = {
  keywords?: string[];
  serviceKeyword?: string;
  tier: string;
};

export const filterServices = (
  services: ServiceDetail[],
  requirement: ServiceRequirement,
): ServiceDetail[] => {
  const { keywords, serviceKeyword, tier } = requirement;
  const kws: string[] = keywords && keywords.length ? [...keywords] : [];
  if (serviceKeyword) kws.push(serviceKeyword);

  return services.filter((service) => {
    const checkTier =
      serviceTiers.indexOf(service.tier as (typeof serviceTiers)[number]) >=
      serviceTiers.indexOf(tier as (typeof serviceTiers)[number]);
    const checkKeywords = kws.every((kw) => service.keywords.includes(kw));
    return checkTier && checkKeywords;
  });
};

export const sortServicesByTier = (
  a: ServiceDetail,
  b: ServiceDetail,
): number =>
  serviceTiers.indexOf(a.tier as (typeof serviceTiers)[number]) -
    serviceTiers.indexOf(b.tier as (typeof serviceTiers)[number]) ||
  a.name.localeCompare(b.name);
