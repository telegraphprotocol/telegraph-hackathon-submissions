import cors from "cors";
import express from "express";
import { env } from "./env.js";
import { connectMongo } from "./db/mongo.js";
import { ensureSubmissionIndexes } from "./models/submission.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";
import { challengeRouter } from "./routes/challenge.js";
import { submitMinerRouter } from "./routes/submitMiner.js";
import { submitWasmRouter } from "./routes/submitWasm.js";
import { minerStatusRouter } from "./routes/minerStatus.js";
import { adminRouter } from "./routes/admin.js";
import { deadlinesRouter } from "./routes/deadlines.js";
import { mySubmissionsRouter } from "./routes/mySubmissions.js";

async function main() {
  await connectMongo();
  await ensureSubmissionIndexes();

  const app = express();
  app.use(cors({ origin: env.frontendOrigin }));
  app.use(express.json());

  app.use("/api", healthRouter);
  app.use("/api", challengeRouter);
  app.use("/api", submitMinerRouter);
  app.use("/api", submitWasmRouter);
  app.use("/api", minerStatusRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api", deadlinesRouter);
  app.use("/api", mySubmissionsRouter);

  app.use(errorHandler);

  app.listen(env.port, () => {
    console.log(`Backend listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
