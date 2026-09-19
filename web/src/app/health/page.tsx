import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  let databaseStatus = "unreachable";
  let status = "error";

  if (!process.env.DATABASE_URL) {
    databaseStatus = "not configured";
    status = "degraded";
  } else {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseStatus = "connected";
      status = "ok";
    } catch {
      databaseStatus = "unreachable";
      status = "error";
    }
  }

  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
      <h1>PrimeEstate Health</h1>
      <p>Database: {databaseStatus}</p>
      <p>Status: {status}</p>
    </main>
  );
}
