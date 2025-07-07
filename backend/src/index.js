import "dotenv/config";
import express from "express";
import morgan from "morgan";
import cors from "cors";

import { registerRoutes } from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(
  cors({
    origin: ["http://localhost:5173", "https://gear.dev.walkscape.app/"],
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(errorHandler);

registerRoutes(app);

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
