const { spawn } = require('child_process');
const { Pool } = require('./server-app-2/node_modules/pg');

async function runDemo() {
  console.log("=== STARTING LIVE FAILOVER DEMO ===");
  
  const pgPool = new Pool({
    connectionString: 'postgresql://postgres:232006%40Pg@localhost:5432/postgres?schema=public'
  });

  let projectId;
  try {
    const res = await pgPool.query('SELECT id FROM "Projects" LIMIT 1');
    projectId = res.rows[0].id;
  } catch (e) {
    console.error("Database connection failed.");
    process.exit(1);
  }

  let server1 = spawn('node', ['index.js'], { cwd: './server-app' });
  let server2 = spawn('node', ['index.js'], { cwd: './server-app-2' });
  let lb = spawn('node', ['index.js'], { cwd: './load-balancer' });

  lb.stdout.on('data', data => {
    const text = data.toString();
    if (text.includes('[Health Check]') || text.includes('[Anomaly Detection]')) {
      process.stdout.write(`[LB LOG] ${text}`);
    }
  });

  const sendVote = async (i) => {
    try {
      // Create a fresh voter to avoid 'already voted' error
      const insertRes = await pgPool.query(`
        INSERT INTO "Voters" (voter_type, name, identifier, device_fingerprint) 
        VALUES ('guest', 'Failover Voter ${Date.now()}_${Math.random()}', 'fail_${Date.now()}_${Math.random()}', 'fingerprint_${Date.now()}_${Math.random()}')
        RETURNING id
      `);
      const voterId = insertRes.rows[0].id;

      const res = await fetch('http://localhost:4000/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_id: voterId, project_id: projectId })
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
          return data ? data.handled_by_server || 'success' : 'success';
      } else {
          return `Error: ${res.status} - ${data ? data.error : ''}`;
      }
    } catch (e) {
      return `Failed: ${e.message}`;
    }
  };

  await new Promise(r => setTimeout(r, 2000));
  
  for (let cycle = 1; cycle <= 5; cycle++) {
      console.log(`\n--- CYCLE ${cycle} OF 5 ---`);
      
      console.log("Waiting 6 seconds for Load Balancer to recognize both servers...");
      await new Promise(r => setTimeout(r, 6000));
      
      console.log("Sending a test request...");
      let result = await sendVote();
      console.log(`Test request handled by: ${result}`);

      console.log("\n>>> STOPPING SERVER 2 (Simulating failure) <<<");
      server2.kill();
      
      console.log("Sending requests every 2 seconds for 20 seconds. Watch the LB logs for failure detection!");
      for(let i=0; i<10; i++) {
         const res = await sendVote();
         console.log(`  Req ${i+1} handled by: ${res}`);
         await new Promise(r => setTimeout(r, 2000));
      }

      console.log("\n>>> RESTARTING SERVER 2 <<<");
      server2 = spawn('node', ['index.js'], { cwd: './server-app-2' });
      
      console.log("Waiting 10 seconds for Server 2 to be marked healthy again...");
      for(let i=0; i<5; i++) {
         const res = await sendVote();
         console.log(`  Req ${i+1} handled by: ${res}`);
         await new Promise(r => setTimeout(r, 2000));
      }
  }

  console.log("\n=== DEMO COMPLETE ===");
  server1.kill();
  server2.kill();
  lb.kill();
  await pgPool.end();
  process.exit(0);
}

runDemo();
