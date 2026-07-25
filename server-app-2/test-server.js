require("dotenv/config");
const { Pool } = require("pg");
const http = require("http");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

const port = Number(process.env.PORT) || 5002;
const serverId = process.env.SERVER_ID || "server_2";

async function cleanupAndSetup() {
  const client = await pool.connect();
  try {
    // Delete test votes and voters
    await client.query('DELETE FROM "Votes" WHERE handled_by_server = $1', [serverId]);
    await client.query('DELETE FROM "Voters" WHERE identifier = \'TEST_STUDENT_002\'');

    // Insert a fresh test voter
    const res = await client.query(`
      INSERT INTO "Voters" (voter_type, name, identifier, device_fingerprint)
      VALUES ('student', 'Test User 2', 'TEST_STUDENT_002', 'test_fingerprint_xyz')
      RETURNING id
    `);
    const voterId = res.rows[0].id;

    // Get a test project
    const projectRes = await client.query('SELECT id FROM "Projects" LIMIT 1');
    const projectId = projectRes.rows[0].id;

    return { voterId, projectId };
  } finally {
    client.release();
  }
}

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: JSON.parse(data),
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log(`--- Starting Server Tests for ${serverId} on Port ${port} ---`);
  const { voterId, projectId } = await cleanupAndSetup();
  console.log(`Setup complete. Voter ID: ${voterId}, Project ID: ${projectId}`);

  // Require index.js to start the server
  require("./index.js");

  // Wait 1 second for the server to be fully listening
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 1. Test POST /process-vote
  console.log("\n1. Testing POST /process-vote...");
  const voteRes = await makeRequest(
    {
      hostname: "localhost",
      port: port,
      path: "/process-vote",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    },
    {
      voter_id: voterId,
      project_id: projectId,
    }
  );

  console.log("Response:", voteRes.body);
  if (voteRes.statusCode === 200 && voteRes.body.success === true && voteRes.body.handled_by_server === serverId) {
    console.log("✅ POST /process-vote Passed");
  } else {
    console.error("❌ POST /process-vote Failed");
    process.exit(1);
  }

  // 2. Test duplicate vote prevention
  console.log("\n2. Testing duplicate vote check...");
  const duplicateRes = await makeRequest(
    {
      hostname: "localhost",
      port: port,
      path: "/process-vote",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    },
    {
      voter_id: voterId,
      project_id: projectId,
    }
  );

  console.log("Response:", duplicateRes.body);
  if (duplicateRes.statusCode === 500 && duplicateRes.body.error === "Voter has already voted.") {
    console.log("✅ Duplicate vote check Passed");
  } else {
    console.error("❌ Duplicate vote check Failed");
    process.exit(1);
  }

  // 3. Test GET /health
  console.log("\n3. Testing GET /health...");
  const healthRes = await makeRequest({
    hostname: "localhost",
    port: port,
    path: "/health",
    method: "GET",
  });

  console.log("Response:", healthRes.body);
  if (healthRes.statusCode === 200 && healthRes.body.status === "healthy" && typeof healthRes.body.avg_response_time_ms === "number") {
    console.log("✅ GET /health Passed");
  } else {
    console.error("❌ GET /health Failed");
    process.exit(1);
  }

  console.log(`\n🎉 All tests passed successfully for ${serverId}!`);
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
