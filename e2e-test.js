const { spawn } = require('child_process');
const { Pool } = require('pg');

async function runTest() {
  console.log("Starting e2e test...");
  
  const pgPool = new Pool({
    connectionString: 'postgresql://postgres:232006%40Pg@localhost:5432/postgres?schema=public'
  });

  // Fetch a project and create some voters if needed
  let projectId;
  let voterIds = [];
  try {
    const res = await pgPool.query('SELECT id FROM "Projects" LIMIT 1');
    projectId = res.rows[0].id;
    
    // Check if we have voters, if not, create some
    const votersCheck = await pgPool.query('SELECT id FROM "Voters" LIMIT 2');
    if (votersCheck.rows.length < 2) {
      const insertRes = await pgPool.query(`
        INSERT INTO "Voters" (voter_type, name, identifier, device_fingerprint) 
        VALUES 
          ('guest', 'Test Voter 1', 'test_1', 'fingerprint1'),
          ('guest', 'Test Voter 2', 'test_2', 'fingerprint2')
        RETURNING id
      `);
      voterIds = insertRes.rows.map(r => r.id);
    } else {
      voterIds = votersCheck.rows.map(r => r.id);
    }
  } catch (e) {
    console.error("Database connection failed. Ensure PostgreSQL is running.");
    process.exit(1);
  }

  // Start the 3 servers
  console.log("Starting server-app (Port 5001)...");
  const server1 = spawn('node', ['index.js'], { cwd: './server-app' });
  
  console.log("Starting server-app-2 (Port 5002)...");
  const server2 = spawn('node', ['index.js'], { cwd: './server-app-2' });
  
  console.log("Starting load-balancer (Port 4000)...");
  const lb = spawn('node', ['index.js'], { cwd: './load-balancer' });

  // Wait 3 seconds for servers to start
  await new Promise(r => setTimeout(r, 3000));

  console.log("\\nSending requests to Load Balancer...");
  
  for (let i = 0; i < 2; i++) {
    try {
      const payload = { voter_id: voterIds[i], project_id: projectId };
      console.log(`Sending vote ${i+1}:`, payload);
      const res = await fetch('http://localhost:4000/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null) || await res.text();
      console.log(`Response ${i+1}:`, data);
    } catch (e) {
      console.error(`Request ${i+1} failed:`, e.message);
    }
  }

  // Cleanup
  console.log("\\nCleaning up processes...");
  server1.kill();
  server2.kill();
  lb.kill();
  await pgPool.end();
  
  console.log("E2E Test completed.");
}

runTest();
