import { shopService } from "../services/index.js";

export const fetchSoldShopItems = () =>
  shopService.list().then((shops) => shops.flatMap((shop) => shop.soldItems));
