import { NextResponse } from "next/server";

import { getUserContext } from "@/lib/auth-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getUserContext();

  if (!context) {
    return NextResponse.json(
      {
        authenticated: false,
        message: "Authentication required.",
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    authenticated: true,
    user: context,
  });
}
