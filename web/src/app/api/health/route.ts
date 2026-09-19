import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        status: "degraded",
        database: "not_configured",
        message: "DATABASE_URL is not configured.",
      },
      { status: 503 },
    );
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      database: "connected",
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        database: "unreachable",
      },
      { status: 503 },
    );
  }
}
