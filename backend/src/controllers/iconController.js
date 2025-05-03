import { iconService } from "../services/index.js";

export async function getIcon(req, res) {
  try {
    const iconPath = req.params.iconPath;

    const response = await iconService.getIcon(iconPath);

    res.set("Content-Type", response.headers["content-type"]);
    res.send(response.data);
  } catch (error) {
    console.error(error);
    res.status(404).json({ message: "Icon not found" });
  }
}
