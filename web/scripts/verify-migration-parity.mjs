import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "prisma",
    "migrate",
    "diff",
    "--exit-code",
    "--from-migrations",
    "./prisma/migrations",
    "--to-schema=./prisma/schema.prisma",
  ],
  { stdio: "inherit", cwd: process.cwd() },
);

if (result.error) {
  console.error("Migration parity check could not start:", result.error.message);
  process.exit(1);
}

if (result.status === 0) {
  console.log("Migration history and schema are in sync.");
  process.exit(0);
}

if (result.status === 2) {
  console.error("Migration/schema drift detected. Create or correct a migration before merging.");
  process.exit(2);
}

process.exit(result.status ?? 1);
