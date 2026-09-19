import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  if (!process.env.DATABASE_URL) {
    return (
      <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
        <h1>PrimeEstate Health</h1>
        <p>DATABASE_URL is not configured.</p>
      </main>
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    return (
      <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
        <h1>PrimeEstate Health</h1>
        <p>Database: connected</p>
        <p>Status: ok</p>
      </main>
    );
  } catch {
    return (
      <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
        <h1>PrimeEstate Health</h1>
        <p>Database: unreachable</p>
        <p>Status: error</p>
      </main>
    );
  }
}
