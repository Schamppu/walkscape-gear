import { iconService } from "../services/index.js";
import { ICON_MAX_AGE, setPublicCache } from "../utils/cacheHeaders.js";

export async function getIcon(req, res) {
  try {
    const iconPath = req.params.iconPath;

    const response = await iconService.getIcon(iconPath);

    res.set("Content-Type", response.headers["content-type"]);
    // Icons are loaded with <img> tags; helmet's default same-origin policy
    // blocks them when the frontend runs on another origin (e.g. Vite dev server).
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
    setPublicCache(res, ICON_MAX_AGE);
    res.send(response.data);
  } catch (error) {
    console.error(error);
    res.status(404).json({ message: "Icon not found" });
  }
}

export async function batch(req, res) {
  const { iconPaths } = req.body;

  if (!Array.isArray(iconPaths)) {
    return res.status(400).json({ error: "iconPaths must be an array" });
  }

  try {
    const icons = await iconService.getIconsBatch(iconPaths);
    res.json(icons);
  } catch (error) {
    res.status(500).json({ message: "Error fetching icons" });
  }
}
