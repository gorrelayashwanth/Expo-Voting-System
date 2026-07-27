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

const autoMigrate = async () => {
  try {
    const ddl = `
      DO $$ BEGIN CREATE TYPE "VoterType" AS ENUM ('guest', 'faculty', 'student'); EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN CREATE TYPE "ServerStatus" AS ENUM ('healthy', 'warning', 'down'); EXCEPTION WHEN duplicate_object THEN null; END $$;
      CREATE TABLE IF NOT EXISTS "Projects" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "project_number" INTEGER NOT NULL, "title" TEXT NOT NULL, "team_name" TEXT, "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS "Voters" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "voter_type" "VoterType" NOT NULL, "name" TEXT NOT NULL, "identifier" TEXT NOT NULL, "department" TEXT, "year" TEXT, "organisation" TEXT, "position" TEXT, "device_fingerprint" TEXT NOT NULL, "has_voted" BOOLEAN DEFAULT FALSE, "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Voters_voter_type_identifier_key" UNIQUE ("voter_type", "identifier"));
      CREATE TABLE IF NOT EXISTS "Votes" ("id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "voter_id" UUID NOT NULL UNIQUE REFERENCES "Voters"("id") ON DELETE RESTRICT ON UPDATE CASCADE, "project_id" UUID NOT NULL REFERENCES "Projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE, "handled_by_server" TEXT NOT NULL, "response_time_ms" INTEGER NOT NULL, "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS "VoteTokens" ("token" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text, "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used" BOOLEAN DEFAULT FALSE, "claimed_device_fingerprint" TEXT);
      CREATE TABLE IF NOT EXISTS "ServerHealth" ("server_id" TEXT PRIMARY KEY, "status" "ServerStatus" NOT NULL, "last_heartbeat" TIMESTAMP WITH TIME ZONE NOT NULL, "avg_response_time_ms" DOUBLE PRECISION NOT NULL, "active_connections" INTEGER);
    `;
    await pool.query(ddl);
    const projCheck = await pool.query('SELECT COUNT(*) FROM "Projects"');
    if (parseInt(projCheck.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO "Projects" (project_number, title, team_name) VALUES
        (101, 'AI-Powered Ballot Counter', 'ByteBenders'),
        (102, 'Secure Blockchain Voting', 'Decentralizers'),
        (103, 'Biometric Voter Authentication', 'BioLock')
      `);
      console.log(`[${serverId}] Auto-seeded default projects.`);
    }
  } catch (err) {
    console.error(`[${serverId}] Auto-migration notice:`, err.message);
  }
};

app.get("/", (req, res) => {
  return res.json({
    service: `TrustPoll Node (${serverId})`,
    status: "healthy",
    port,
    message: "Vote processing node is active.",
    endpoints: ["GET /", "GET /health", "POST /process-vote"],
  });
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

app.listen(port, async () => {
  console.log(`[${serverId}] App server is running on port ${port}`);
  await autoMigrate();
});
