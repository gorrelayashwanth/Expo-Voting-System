require("dotenv/config");
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set in the .env file.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: connectionString,
});

const ddl = `
-- Create VoterType enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "VoterType" AS ENUM ('guest', 'faculty', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ServerStatus enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "ServerStatus" AS ENUM ('healthy', 'warning', 'down');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Projects table
CREATE TABLE IF NOT EXISTS "Projects" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "team_name" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Voters table
CREATE TABLE IF NOT EXISTS "Voters" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "voter_type" "VoterType" NOT NULL,
    "name" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "department" TEXT,
    "year" TEXT,
    "organisation" TEXT,
    "position" TEXT,
    "device_fingerprint" TEXT NOT NULL,
    "has_voted" BOOLEAN DEFAULT FALSE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Voters_voter_type_identifier_key" UNIQUE ("voter_type", "identifier")
);

-- Create Votes table
CREATE TABLE IF NOT EXISTS "Votes" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "voter_id" UUID NOT NULL UNIQUE REFERENCES "Voters"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "project_id" UUID NOT NULL REFERENCES "Projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "handled_by_server" TEXT NOT NULL,
    "response_time_ms" INTEGER NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create VoteTokens table
CREATE TABLE IF NOT EXISTS "VoteTokens" (
    "token" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
    "used" BOOLEAN DEFAULT FALSE,
    "claimed_device_fingerprint" TEXT
);

-- Create ServerHealth table
CREATE TABLE IF NOT EXISTS "ServerHealth" (
    "server_id" TEXT PRIMARY KEY,
    "status" "ServerStatus" NOT NULL,
    "last_heartbeat" TIMESTAMP WITH TIME ZONE NOT NULL,
    "avg_response_time_ms" DOUBLE PRECISION NOT NULL,
    "active_connections" INTEGER
);
`;

async function run() {
  console.log("Connecting to the database...");
  const client = await pool.connect();
  try {
    console.log("Connected successfully. Running migration DDL...");
    await client.query(ddl);
    console.log("Migration tables created or verified successfully.");

    // Seeding Projects
    const projectsCheck = await client.query('SELECT COUNT(*) FROM "Projects"');
    const projectCount = parseInt(projectsCheck.rows[0].count, 10);
    if (projectCount === 0) {
      console.log("Seeding sample Projects...");
      await client.query(`
        INSERT INTO "Projects" (project_number, title, team_name) VALUES
        (1, 'Expo Project Alpha', 'Team 1'),
        (2, 'Expo Project Beta', 'Team 2'),
        (3, 'Expo Project Gamma', 'Team 3')
      `);
      console.log("Seeding Projects completed.");
    } else {
      console.log(`Projects table already has ${projectCount} rows. Skipping Projects seed.`);
    }

    // Seeding ServerHealth
    const healthCheck = await client.query('SELECT COUNT(*) FROM "ServerHealth"');
    const healthCount = parseInt(healthCheck.rows[0].count, 10);
    if (healthCount === 0) {
      console.log("Seeding ServerHealth status...");
      await client.query(`
        INSERT INTO "ServerHealth" (server_id, status, last_heartbeat, avg_response_time_ms) VALUES
        ('server_1', 'healthy', NOW(), 0.0),
        ('server_2', 'healthy', NOW(), 0.0)
      `);
      console.log("Seeding ServerHealth completed.");
    } else {
      console.log(`ServerHealth table already has ${healthCount} rows. Skipping ServerHealth seed.`);
    }

    console.log("Database migration and seeding finished successfully!");
  } catch (err) {
    console.error("An error occurred during database migration/seeding:", err.message);
    console.error("Please make sure that PostgreSQL is running, the database exists, and the credentials in .env are correct.");
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
