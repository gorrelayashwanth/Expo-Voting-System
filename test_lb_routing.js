const { spawn } = require('child_process');

async function runTest() {
  console.log("Starting servers...");
  
  const server1 = spawn('node', ['index.js'], { cwd: './server-app' });
  const server2 = spawn('node', ['index.js'], { cwd: './server-app-2' });
  const lb = spawn('node', ['index.js'], { cwd: './load-balancer' });

  // Wait for servers to be up
  await new Promise(r => setTimeout(r, 2000));

  console.log("Sending initial 2 requests to seed response times...");
  // These will likely round-robin since health data is 0 or null
  for (let i = 0; i < 2; i++) {
    try {
      const start = Date.now();
      const res = await fetch('http://localhost:4000/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_id: 'fake_1', project_id: 'fake_1' })
      });
      const data = await res.json().catch(() => null);
      console.log(`Initial Request ${i+1} handled by:`, data ? data.handled_by_server || data : res.status, `in ${Date.now() - start}ms`);
    } catch (e) {
      console.error(e.message);
    }
  }

  console.log("Waiting 6 seconds for Load Balancer to poll /health...");
  await new Promise(r => setTimeout(r, 6000));

  console.log("Sending 4 more requests. These should favor the faster server (server_1)...");
  for (let i = 0; i < 4; i++) {
    try {
      const start = Date.now();
      const res = await fetch('http://localhost:4000/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_id: 'fake_2', project_id: 'fake_2' })
      });
      const data = await res.json().catch(() => null);
      console.log(`Follow-up Request ${i+1} handled by:`, data ? data.handled_by_server || data : res.status, `in ${Date.now() - start}ms`);
    } catch (e) {
      console.error(e.message);
    }
    await new Promise(r => setTimeout(r, 500)); // space them out
  }

  console.log("Cleaning up...");
  server1.kill();
  server2.kill();
  lb.kill();
  process.exit(0);
}

runTest();
