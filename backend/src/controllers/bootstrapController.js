import { getStaticBundle } from "../services/bootstrapService.js";

export async function getStaticBootstrap(req, res) {
  try {
    const { json, etag } = await getStaticBundle();
    // Express answers 304 itself when If-None-Match matches this ETag.
    res.set({ ETag: etag, "Cache-Control": "public, max-age=300" });
    res.type("json").send(json);
  } catch (error) {
    console.error("Error building static bootstrap bundle:", error);
    res.status(500).json({ error: "Failed to load bootstrap data" });
  }
}
