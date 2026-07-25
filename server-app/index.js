require("dotenv/config");
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const port = process.env.PORT || 5001;
const serverId = process.env.SERVER_ID || "server_1";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is missing.");
  process.exit(1);
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const recentResponseTimes = [];

app.post("/process-vote", async (req, res) => {
  const start = Date.now();
  const { voter_id, project_id } = req.body;

  if (!voter_id || !project_id) {
    return res.status(400).json({
      success: false,
      error: "voter_id and project_id are required in the request body.",
    });
  }

  try {
    // Write a new row to the Votes table and mark Voter as having voted in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Double check if voter has already voted (safety net)
      const voter = await tx.voters.findUnique({
        where: { id: voter_id },
      });

      if (!voter) {
        throw new Error("Voter not found.");
      }

      if (voter.has_voted) {
        throw new Error("Voter has already voted.");
      }

      // 2. Create the Vote record
      const duration = Date.now() - start;
      await tx.votes.create({
        data: {
          voter_id,
          project_id,
          handled_by_server: serverId,
          response_time_ms: duration,
        },
      });

      // 3. Mark Voter as voted
      await tx.voters.update({
        where: { id: voter_id },
        data: { has_voted: true },
      });
    });

    const duration = Date.now() - start;
    recentResponseTimes.push(duration);
    if (recentResponseTimes.length > 10) {
      recentResponseTimes.shift();
    }

    return res.json({
      success: true,
      message: "Vote processed successfully.",
      handled_by_server: serverId,
      response_time_ms: duration,
    });
  } catch (err) {
    console.error("Error processing vote:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to process vote.",
    });
  }
});

app.get("/health", (req, res) => {
  let avg_response_time_ms = 0;
  if (recentResponseTimes.length > 0) {
    const sum = recentResponseTimes.reduce((a, b) => a + b, 0);
    avg_response_time_ms = sum / recentResponseTimes.length;
  }

  return res.json({
    status: "healthy",
    avg_response_time_ms: Number(avg_response_time_ms.toFixed(2)),
  });
});

app.listen(port, () => {
  console.log(`[${serverId}] App server is running on port ${port}`);
});
