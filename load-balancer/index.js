require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const crypto = require('crypto');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is missing in load-balancer.");
  process.exit(1);
}

const isRender = connectionString.includes('render.com') || process.env.NODE_ENV === 'production';
const pool = new Pool({
  connectionString,
  ssl: isRender ? { rejectUnauthorized: false } : false
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();

// --------------- CORS ---------------
// ALLOWED_ORIGIN: comma-separated list of allowed origins, e.g.
//   http://localhost:3000,https://my-app.lovable.app
// Leave unset (or set to *) to allow all origins during local dev.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const allowedOrigins = ALLOWED_ORIGIN === '*' ? '*' : ALLOWED_ORIGIN.split(',').map(o => o.trim());

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'X-Device-Fingerprint'],
  exposedHeaders: ['X-Device-Fingerprint'],
  credentials: ALLOWED_ORIGIN !== '*',
}));

// Respond to preflight OPTIONS for all routes (Express 5 uses /{*path} not *)
app.options('/{*path}', cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'X-Device-Fingerprint'],
  credentials: ALLOWED_ORIGIN !== '*',
}));

app.use(express.json());

const PORT = process.env.PORT || 4000;
const SERVER_1_URL = process.env.SERVER_1_URL;
const SERVER_2_URL = process.env.SERVER_2_URL;
const THIRD_SERVER_URL = process.env.THIRD_SERVER_URL;
const FRONTEND_URL = (process.env.FRONTEND_URL || "https://trustpoll.pages.dev").replace(/\/$/, "");

if (!SERVER_1_URL || !SERVER_2_URL) {
    console.error("SERVER_1_URL and SERVER_2_URL must be set in .env");
    process.exit(1);
}

let servers = [SERVER_1_URL, SERVER_2_URL];
let currentServerIndex = 0;

const serverHealth = {
    [SERVER_1_URL]: { avg_response_time_ms: null, history: [], consecutive_failures: 0, status: 'up' },
    [SERVER_2_URL]: { avg_response_time_ms: null, history: [], consecutive_failures: 0, status: 'up' }
};

if (THIRD_SERVER_URL) {
    serverHealth[THIRD_SERVER_URL] = { avg_response_time_ms: null, history: [], consecutive_failures: 0, status: 'up' };
}

let voteTimestamps = [];
let spikeLogged = false;

setInterval(async () => {
    for (const server of servers) {
        let isSuccess = false;
        let currentResponseTime = null;

        try {
            const response = await fetch(`${server}/health`);
            if (response.ok) {
                const data = await response.json();
                currentResponseTime = data.avg_response_time_ms;
                isSuccess = true;
            }
        } catch (err) {
            isSuccess = false;
        }

        const stats = serverHealth[server];

        if (isSuccess && typeof currentResponseTime === 'number') {
            stats.consecutive_failures = 0;
            
            // Only trigger anomaly detection if response time is actually high (> 500ms)
            if (stats.history.length > 0) {
                const sum = stats.history.reduce((a, b) => a + b, 0);
                const rollingAverage = sum / stats.history.length;
                
                if (rollingAverage > 20 && currentResponseTime > 500 && currentResponseTime > rollingAverage * 1.5) {
                    console.log(`[Anomaly Detection] ${server} response time (${currentResponseTime}ms) exceeded rolling average (${rollingAverage.toFixed(2)}ms) by > 50%. Marking as 'down'.`);
                    stats.status = 'down';
                } else {
                    stats.status = 'up';
                }
            } else {
                stats.status = 'up';
            }

            stats.history.push(currentResponseTime);
            if (stats.history.length > 10) {
                stats.history.shift(); // keep max 10 entries
            }
            stats.avg_response_time_ms = currentResponseTime;
        } else {
            stats.consecutive_failures += 1;
            stats.avg_response_time_ms = null;
            
            if (stats.consecutive_failures >= 3) {
                if (stats.status !== 'down') {
                    console.log(`[Health Check] ${server} failed 3 consecutive health checks. Marking as 'down'.`);
                    stats.status = 'down';
                }
            }
        }
    }
}, 5000);

// Root path handler
app.get('/', (req, res) => {
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.json({
            service: 'trustpoll-load-balancer',
            status: 'online',
            frontendUrl: FRONTEND_URL,
            servers: [SERVER_1_URL, SERVER_2_URL]
        });
    }
    return res.redirect(FRONTEND_URL);
});

// GET /start-vote - Generate token & redirect to frontend
app.get('/start-vote', async (req, res) => {
    try {
        const token = crypto.randomUUID();
        const expires_at = new Date(Date.now() + 3 * 60 * 1000); // 3 mins time-limited token
        
        await prisma.voteTokens.create({
            data: {
                token,
                expires_at,
                used: false
            }
        });

        res.redirect(`${FRONTEND_URL}/?token=${token}`);
    } catch (error) {
        console.error("Error creating vote token:", error);
        res.status(500).send("Internal Server Error");
    }
});

// GET /vote - Redirect to frontend with token
app.get('/vote', async (req, res) => {
    const token = req.query.token;
    if (token) {
        return res.redirect(`${FRONTEND_URL}/?token=${token}`);
    }
    return res.redirect(`${FRONTEND_URL}/start-vote`);
});

const tokenValidationMiddleware = async (req, res, next) => {
    try {
        let token = req.query.token || req.body.token;
        
        // Auto-generate a fresh 3-minute token if missing (direct web navigation)
        if (!token) {
            token = crypto.randomUUID();
            const expires_at = new Date(Date.now() + 3 * 60 * 1000);
            await prisma.voteTokens.create({
                data: {
                    token,
                    expires_at,
                    used: false
                }
            });
            req.body.token = token;
        }

        let tokenRecord = await prisma.voteTokens.findUnique({
            where: { token }
        });

        if (!tokenRecord) {
            return res.status(404).json({ error: 'Invalid voting token. Please scan the QR code again.' });
        }

        if (new Date() > tokenRecord.expires_at) {
            return res.status(403).json({ error: 'This link has expired, please scan the QR code again.' });
        }

        if (tokenRecord.used) {
            return res.status(403).json({ error: 'Token has already been used.' });
        }

        const incomingFingerprint = req.headers['x-device-fingerprint'] || 'demo-device-fingerprint';
        req.headers['x-device-fingerprint'] = incomingFingerprint;

        if (!tokenRecord.claimed_device_fingerprint) {
            await prisma.voteTokens.update({
                where: { token },
                data: { claimed_device_fingerprint: incomingFingerprint }
            });
        } else if (tokenRecord.claimed_device_fingerprint !== incomingFingerprint) {
            return res.status(403).json({ error: 'This link was opened on a different device.' });
        }

        next();
    } catch (error) {
        console.error("Error in token validation middleware:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

app.use(['/vote-process', '/api/register-voter', '/api/vote'], tokenValidationMiddleware);


app.post('/api/register-voter', async (req, res) => {
    try {
        const { voter_type, name, identifier, department, year, organisation, position } = req.body;
        const device_fingerprint = req.headers['x-device-fingerprint'] || 'demo-device-fingerprint';
        const activeToken = req.body.token || req.query.token;

        if (!voter_type || !name || !identifier) {
            return res.status(400).json({ error: 'voter_type, name, and identifier are required.' });
        }

        // Check if cookie indicates already voted
        if (req.cookies && req.cookies.trustpoll_voted === 'true') {
            return res.status(400).json({ error: 'You have already voted.' });
        }

        // Check if device fingerprint has already voted
        const existingFingerprintVoter = await prisma.voters.findFirst({
            where: {
                device_fingerprint,
                has_voted: true
            }
        });
        if (existingFingerprintVoter) {
            return res.status(400).json({ error: 'This device has already been used to cast a vote.' });
        }

        let voter = await prisma.voters.findUnique({
            where: {
                voter_type_identifier: {
                    voter_type,
                    identifier
                }
            }
        });

        if (voter) {
            if (voter.has_voted) {
                return res.status(400).json({ error: 'You have already voted.' });
            }
            return res.status(200).json({ voter_id: voter.id, token: activeToken, message: 'Existing registration found.' });
        }

        voter = await prisma.voters.create({
            data: {
                voter_type,
                name,
                identifier,
                department,
                year,
                organisation,
                position,
                device_fingerprint,
                has_voted: false
            }
        });

        return res.status(200).json({ voter_id: voter.id, token: activeToken, message: 'Registration successful.' });
    } catch (error) {
        console.error("Error registering voter:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/vote', async (req, res) => {
    const now = Date.now();
    voteTimestamps.push(now);
    voteTimestamps = voteTimestamps.filter(t => now - t <= 20000);
    
    const recentCount = voteTimestamps.filter(t => now - t <= 10000).length;
    const previousCount = voteTimestamps.filter(t => now - t > 10000).length;
    
    if (recentCount > 3 * (previousCount === 0 ? 1 : previousCount)) {
        if (!spikeLogged) {
            console.log('Spike predicted');
            spikeLogged = true;
        }
        if (THIRD_SERVER_URL && !servers.includes(THIRD_SERVER_URL)) {
            servers.push(THIRD_SERVER_URL);
            console.log(`[Auto-Scaling] Added ${THIRD_SERVER_URL} to the active routing pool.`);
        }
    } else {
        spikeLogged = false; // Reset log flag if no longer spiking
    }

    let healthyServers = servers.filter(s => serverHealth[s].status === 'up');

    if (healthyServers.length === 0) {
        return res.status(503).json({ error: 'Service Unavailable', message: 'All backend servers are down.' });
    }

    let targetServer;

    if (healthyServers.length === 1) {
        targetServer = healthyServers[0];
    } else {
        const validServers = healthyServers.filter(s => typeof serverHealth[s].avg_response_time_ms === 'number');
        if (validServers.length === healthyServers.length && validServers.length > 0) {
            const firstHealth = serverHealth[validServers[0]].avg_response_time_ms;
            const allSame = validServers.every(s => serverHealth[s].avg_response_time_ms === firstHealth);
            
            if (!allSame) {
                targetServer = validServers.reduce((minSrv, srv) => 
                    serverHealth[srv].avg_response_time_ms < serverHealth[minSrv].avg_response_time_ms ? srv : minSrv
                );
            } else {
                targetServer = healthyServers[currentServerIndex % healthyServers.length];
                currentServerIndex = (currentServerIndex + 1) % healthyServers.length;
            }
        } else {
            targetServer = healthyServers[currentServerIndex % healthyServers.length];
            currentServerIndex = (currentServerIndex + 1) % healthyServers.length;
        }
    }

    const attemptRequest = async (serverUrl) => {
        const response = await fetch(`${serverUrl}/process-vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const contentType = response.headers.get("content-type");
        let data;
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }
        return { status: response.status, data };
    };

    try {
        const { status, data } = await attemptRequest(targetServer);
        if (status >= 200 && status < 300) {
            res.cookie('trustpoll_voted', 'true', { maxAge: 24 * 60 * 60 * 1000, httpOnly: false });
        }
        return res.status(status).send(data);
    } catch (error) {
        console.error(`Error forwarding request to ${targetServer}:`, error.message);
        
        serverHealth[targetServer].status = 'down';
        console.log(`[Failover] Marking ${targetServer} as 'down' proactively. Retrying on another server.`);
        
        healthyServers = servers.filter(s => serverHealth[s].status === 'up');
        if (healthyServers.length > 0) {
            const fallbackServer = healthyServers[0];
            try {
                const { status, data } = await attemptRequest(fallbackServer);
                if (status >= 200 && status < 300) {
                    res.cookie('trustpoll_voted', 'true', { maxAge: 24 * 60 * 60 * 1000, httpOnly: false });
                }
                return res.status(status).send(data);
            } catch (fallbackError) {
                serverHealth[fallbackServer].status = 'down';
                return res.status(502).json({ error: 'Bad Gateway', message: 'All backend servers failed.' });
            }
        }

        return res.status(502).json({ error: 'Bad Gateway', message: `Failed to reach the target server: ${error.message}` });
    }
});

app.get('/api/projects', async (req, res) => {
    try {
        const projects = await prisma.projects.findMany({
            select: {
                id: true,
                project_number: true,
                title: true,
                team_name: true,
                created_at: true
            },
            orderBy: {
                project_number: 'asc'
            }
        });
        return res.json(projects);
    } catch (error) {
        console.error("Error fetching projects:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.get('/api/dashboard-summary', async (req, res) => {
    try {
        const totalVotes = await prisma.votes.count();
        
        const projects = await prisma.projects.findMany({
            include: {
                _count: {
                    select: { votes: true }
                }
            },
            orderBy: {
                project_number: 'asc'
            }
        });

        const projectVotes = projects.map(p => ({
            id: p.id,
            project_number: p.project_number,
            title: p.title,
            votes: p._count.votes
        }));

        const recentVotesData = await prisma.votes.findMany({
            take: 10,
            orderBy: {
                timestamp: 'desc'
            },
            include: {
                project: {
                    select: { title: true }
                }
            }
        });

        const recentVotes = recentVotesData.map(v => ({
            id: v.id,
            title: v.project.title,
            handled_by_server: v.handled_by_server,
            response_time_ms: v.response_time_ms
        }));

        res.json({
            totalVotes,
            projectVotes,
            recentVotes,
            servers: {
                server_1: serverHealth[SERVER_1_URL] || { status: 'down' },
                server_2: serverHealth[SERVER_2_URL] || { status: 'down' }
            }
        });
    } catch (error) {
        console.error("Error fetching dashboard summary:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/chatbot-query', async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ error: "Question is required." });
        }
        
        const q = question.toLowerCase();
        let responseText = "I'm sorry, I don't understand that question. You can ask me about 'health', 'status', 'votes', or 'how many'.";
        
        if (q.includes('health') || q.includes('status')) {
            const s1 = serverHealth[SERVER_1_URL]?.status || 'unknown';
            const s2 = serverHealth[SERVER_2_URL]?.status || 'unknown';
            responseText = `Currently, Server 1 is ${s1} and Server 2 is ${s2}.`;
        } else if (q.includes('votes') || q.includes('how many')) {
            const totalVotes = await prisma.votes.count();
            const projects = await prisma.projects.findMany({
                include: {
                    _count: { select: { votes: true } }
                }
            });
            
            let leadingProject = "No projects yet";
            let maxVotes = -1;
            
            for (const p of projects) {
                if (p._count.votes > maxVotes) {
                    maxVotes = p._count.votes;
                    leadingProject = p.title;
                }
            }
            
            if (totalVotes === 0) {
                responseText = "No votes have been cast yet.";
            } else {
                responseText = `There are a total of ${totalVotes} votes cast. The leading project is '${leadingProject}' with ${maxVotes} votes.`;
            }
        }
        
        return res.json({ response: responseText });
    } catch (error) {
        console.error("Error in chatbot query:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

const autoMigrateLB = async () => {
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
            console.log(`[load-balancer] Auto-seeded default projects.`);
        }
    } catch (err) {
        console.error(`[load-balancer] Auto-migration notice:`, err.message);
    }
};

app.listen(PORT, async () => {
    console.log(`Load balancer is running on http://localhost:${PORT}`);
    console.log(`Forwarding requests to:`);
    console.log(`- ${SERVER_1_URL}`);
    console.log(`- ${SERVER_2_URL}`);
    await autoMigrateLB();
});
