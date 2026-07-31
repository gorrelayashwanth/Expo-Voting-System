require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const p = await prisma.projects.findMany();
  if (p.length === 0) {
    console.log("No projects found, inserting a test project...");
    await prisma.projects.create({
      data: {
        project_number: 1,
        title: "Test Voting Project",
        team_name: "Alpha Team"
      }
    });
    console.log("Inserted test project.");
  } else {
    console.log("Projects exist:", p);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
