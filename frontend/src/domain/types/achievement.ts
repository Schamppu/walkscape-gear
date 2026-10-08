// Served by this repo's own backend (backend/src/routes/achievementRoutes.js),
// not the tools API, so it is written by hand.
export type ApInfo = {
  total: number;
  collectibles: number;
  normal: number;
  easy: number;
  hard: number;
  extreme: number;
};
