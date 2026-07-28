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
const isRender = connectionString.includes('render.com') || process.env.NODE_ENV === 'production';
const pool = new Pool({
  connectionString,
  ssl: isRender ? { rejectUnauthorized: false } : false
});
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

app.get("/api/recent-node-votes", async (req, res) => {
  try {
    const votes = await prisma.votes.findMany({
      where: { handled_by_server: serverId },
      orderBy: { timestamp: "desc" },
      take: 15,
      include: {
        voter: { select: { name: true, voter_type: true, identifier: true } },
        project: { select: { project_number: true, title: true, team_name: true } }
      }
    });
    return res.json(votes);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  if (req.headers.accept && req.headers.accept.includes("application/json")) {
    return res.json({
      service: `TrustPoll Node (${serverId})`,
      status: "healthy",
      port,
      message: "Vote processing node is active.",
      endpoints: ["GET /", "GET /health", "GET /api/recent-node-votes", "POST /process-vote"],
    });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TrustPoll Node Live Stream — ${serverId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; }
    body { background: #09090b; color: #f4f4f5; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 2rem 1rem; }
    .container { max-width: 650px; width: 100%; }
    .card { background: #18181b; border: 1px solid #27272a; border-radius: 1rem; padding: 1.75rem; box-shadow: 0 10px 30px rgba(0,0,0,0.5); margin-bottom: 1.5rem; }
    .badge { display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); color: #10b981; padding: 0.35rem 0.75rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem; }
    .dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 10px #10b981; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.3); } }
    h1 { font-size: 1.6rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.25rem; }
    p.subtitle { color: #a1a1aa; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.25rem; }
    .stat { background: #09090b; border: 1px solid #27272a; border-radius: 0.75rem; padding: 0.875rem; text-align: center; }
    .stat-label { font-size: 0.7rem; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-bottom: 0.25rem; }
    .stat-value { font-size: 1.25rem; font-weight: 700; color: #10b981; }
    
    .feed-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .feed-title { font-size: 1rem; font-weight: 700; color: #f4f4f5; display: flex; align-items: center; gap: 0.5rem; }
    .feed-list { display: flex; flex-direction: column; gap: 0.6rem; max-height: 400px; overflow-y: auto; }
    .vote-item { background: #09090b; border: 1px solid #27272a; border-left: 4px solid #10b981; border-radius: 0.5rem; padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
    .voter-info { font-weight: 600; font-size: 0.9rem; color: #f4f4f5; }
    .project-info { font-size: 0.8rem; color: #a1a1aa; margin-top: 0.15rem; }
    .vote-meta { text-align: right; }
    .latency-tag { font-size: 0.75rem; font-weight: 700; color: #10b981; background: rgba(16,185,129,0.1); padding: 0.15rem 0.5rem; border-radius: 0.375rem; }
    .time-tag { font-size: 0.7rem; color: #71717a; margin-top: 0.2rem; }
    .empty { text-align: center; color: #71717a; font-size: 0.85rem; padding: 2rem 0; }
    .footer { border-top: 1px solid #27272a; padding-top: 1rem; font-size: 0.75rem; color: #71717a; display: flex; justify-content: space-between; margin-top: 1.5rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="badge">
        <span class="dot"></span> NODE INGESTION STREAM ACTIVE
      </div>
      <h1>TrustPoll Node — ${serverId}</h1>
      <p class="subtitle">Live Dedicated Processor Node | Network Expo 2026</p>

      <div class="grid">
        <div class="stat">
          <div class="stat-label">Server ID</div>
          <div class="stat-value" style="color:#f4f4f5">${serverId}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Total Ingested</div>
          <div class="stat-value" id="total-count">0</div>
        </div>
        <div class="stat">
          <div class="stat-label">Avg Latency</div>
          <div class="stat-value" id="latency-val">0 ms</div>
        </div>
      </div>

      <div class="feed-header">
        <div class="feed-title">⚡ Live Ingestion Log</div>
        <span style="font-size:0.75rem; color:#71717a;" id="live-indicator">Polling every 2s</span>
      </div>

      <div class="feed-list" id="vote-feed">
        <div class="empty">Waiting for incoming votes from Load Balancer...</div>
      </div>

      <div class="footer">
        <span>TrustPoll High-Throughput Node</span>
        <span id="ping-time">Syncing...</span>
      </div>
    </div>
  </div>

  <script>
    let knownVoteIds = new Set();

    async function updateDashboard() {
      try {
        const [healthRes, votesRes] = await Promise.all([
          fetch('/health'),
          fetch('/api/recent-node-votes')
        ]);
        
        const health = await healthRes.json();
        document.getElementById('latency-val').textContent = health.avg_response_time_ms + ' ms';
        document.getElementById('ping-time').textContent = 'Last sync: ' + new Date().toLocaleTimeString();

        const votes = await votesRes.json();
        document.getElementById('total-count').textContent = votes.length;

        const feedEl = document.getElementById('vote-feed');
        if (!votes || votes.length === 0) {
          feedEl.innerHTML = '<div class="empty">No votes processed on this node yet.</div>';
          return;
        }

        feedEl.innerHTML = votes.map(v => {
          const voterName = v.voter ? v.voter.name : 'Voter';
          const voterType = v.voter ? v.voter.voter_type : 'voter';
          const projNum = v.project ? pNum(v.project.project_number) : '';
          const projTitle = v.project ? v.project.title : 'Project';
          const timeStr = new Date(v.timestamp).toLocaleTimeString();
          
          return \`
            <div class="vote-item">
              <div>
                <div class="voter-info">⚡ \${voterName} <span style="font-size:0.75rem; font-weight:400; color:#a1a1aa;">(\${voterType})</span></div>
                <div class="project-info">Project #\${projNum}: \${projTitle}</div>
              </div>
              <div class="vote-meta">
                <span class="latency-tag">\${v.response_time_ms}ms</span>
                <div class="time-tag">\${timeStr}</div>
              </div>
            </div>
          \`;
        }).join('');

      } catch(e){}
    }

    function pNum(num) { return num ? num : ''; }

    setInterval(updateDashboard, 2000);
    updateDashboard();
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  return res.send(html);
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
