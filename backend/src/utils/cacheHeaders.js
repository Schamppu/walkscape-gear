const ONE_DAY = 24 * 60 * 60;

/**
 * Marks a successful response for static game data as cacheable by browsers
 * and shared caches. Game data only changes between game updates, so a short
 * max-age with a long stale-while-revalidate keeps repeat views off the network.
 */
export function setPublicCache(res, maxAgeSeconds = 600) {
  res.set(
    "Cache-Control",
    `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${ONE_DAY}`,
  );
}

export const ICON_MAX_AGE = 7 * ONE_DAY;
