import "dotenv/config";
import express from "express";
import morgan from "morgan";
import cors from "cors";

import { registerRoutes } from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(errorHandler);

registerRoutes(app);

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
