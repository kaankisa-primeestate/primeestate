import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readBuildId() {
  try {
    const buildId = await readFile(
      join(process.cwd(), ".next", "BUILD_ID"),
      "utf8",
    );

    return buildId.trim() || null;
  } catch {
    return null;
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "primeestate",
    nodeEnv: process.env.NODE_ENV ?? null,
    render: process.env.RENDER === "true",
    renderGitBranch: process.env.RENDER_GIT_BRANCH ?? null,
    renderGitCommit: process.env.RENDER_GIT_COMMIT ?? null,
    renderServiceName: process.env.RENDER_SERVICE_NAME ?? null,
    renderExternalUrl: process.env.RENDER_EXTERNAL_URL ?? null,
    betterAuthUrl: process.env.BETTER_AUTH_URL ?? null,
    buildId: await readBuildId(),
  });
}
