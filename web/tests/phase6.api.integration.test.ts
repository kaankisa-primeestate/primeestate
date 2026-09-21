import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { test, before, after } from "node:test";

process.env.BETTER_AUTH_SECRET ??= "phase6-api-integration-test-secret";
process.env.BETTER_AUTH_URL ??= "http://127.0.0.1:4317";

const { prisma } = await import("../src/lib/prisma");
const { auth } = await import("../src/lib/auth");

const BASE_URL = process.env.PHASE6_API_TEST_URL ?? "http://127.0.0.1:4317";
let server: ChildProcess | null = null;
const createdOrganizations: string[] = [];

type TestUser = {
  id: string;
  email: string;
  password: string;
  organizationId: string;
  officeId: string;
  teamId: string | null;
};

type Fixture = {
  agent1: TestUser;
  agent2: TestUser;
  teamLeader: TestUser;
  viewer: TestUser;
  customer1Id: string;
  customer2Id: string;
};

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(BASE_URL + "/login");
      if (response.status >= 200 && response.status < 500) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error("Next.js integration test server did not become ready.");
}

async function createUser(
  organizationId: string,
  officeId: string,
  teamId: string | null,
  role: "ORG_ADMIN" | "OFFICE_ADMIN" | "AGENT" | "TEAM_LEADER" | "VIEWER",
  suffix: string,
): Promise<TestUser> {
  const context = await auth.$context;
  const email = `${role.toLowerCase()}-${suffix}@example.test`;
  const password = "Phase6-Test-Password-123!";

  const user = await context.internalAdapter.createUser(
    {
      email,
      name: `Phase 6 ${role} ${suffix}`,
      emailVerified: true,
      organizationId,
      officeId,
      teamId,
      role,
      active: true,
    },
    { method: "phase6-api-integration" },
  );

  await context.internalAdapter.linkAccount({
    accountId: user.id,
    providerId: "credential",
    userId: user.id,
    password: await context.password.hash(password),
  });

  return {
    id: user.id,
    email,
    password,
    organizationId,
    officeId,
    teamId,
  };
}

async function createFixture(): Promise<Fixture> {
  const suffix = randomUUID().slice(0, 8);
  const organization = await prisma.organization.create({
    data: { name: `Phase6 API Org ${suffix}`, slug: `phase6-api-${suffix}` },
  });
  createdOrganizations.push(organization.id);

  const office = await prisma.office.create({
    data: {
      organizationId: organization.id,
      name: "API Integration Office",
      slug: `api-office-${suffix}`,
    },
  });

  const team = await prisma.team.create({
    data: { officeId: office.id, name: `API Team ${suffix}` },
  });

  const orgAdmin = await createUser(organization.id, office.id, null, "ORG_ADMIN", `org-admin-${suffix}`);
  const officeAdmin = await createUser(organization.id, office.id, null, "OFFICE_ADMIN", `office-admin-${suffix}`);
  const agent1 = await createUser(organization.id, office.id, team.id, "AGENT", `one-${suffix}`);
  const agent2 = await createUser(organization.id, office.id, team.id, "AGENT", `two-${suffix}`);
  const teamLeader = await createUser(
    organization.id,
    office.id,
    team.id,
    "TEAM_LEADER",
    `leader-${suffix}`,
  );
  const viewer = await createUser(organization.id, office.id, null, "VIEWER", `viewer-${suffix}`);

  const customer1 = await prisma.customer.create({
    data: {
      organizationId: organization.id,
      officeId: office.id,
      ownerUserId: agent1.id,
      name: "API Customer One",
    },
  });
  const customer2 = await prisma.customer.create({
    data: {
      organizationId: organization.id,
      officeId: office.id,
      ownerUserId: agent2.id,
      name: "API Customer Two",
    },
  });

  return {
    orgAdmin,
    officeAdmin,
    agent1,
    agent2,
    teamLeader,
    viewer,
    customer1Id: customer1.id,
    customer2Id: customer2.id,
  };
}

async function login(user: TestUser): Promise<string> {
  const response = await fetch(BASE_URL + "/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", Origin: BASE_URL },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      rememberMe: true,
    }),
  });

  assert.equal(response.ok, true, await response.text());

  const cookies = response.headers.getSetCookie?.() ?? [];
  const cookieHeader = cookies
    .map((cookie) => cookie.split(";", 1)[0])
    .filter(Boolean)
    .join("; ");

  assert.ok(cookieHeader, "Better Auth did not return a session cookie.");
  return cookieHeader;
}

async function api(
  path: string,
  options: { cookie?: string; method?: string; body?: unknown } = {},
) {
  return fetch(BASE_URL + path, {
    method: options.method ?? "GET",
    headers: {
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

before(async () => {
  server = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["next", "dev", "-p", "4317"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
        BETTER_AUTH_URL: BASE_URL,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: "ignore",
    },
  );
  await waitForServer();
});

after(async () => {
  if (server) {
    server.kill("SIGTERM");
    server = null;
  }
  for (const organizationId of createdOrganizations.splice(0)) {
    await prisma.organization.delete({ where: { id: organizationId } }).catch(() => {});
  }
  await prisma.$disconnect();
});

test("Phase 6 API: protected customer route returns 401 without a session", async () => {
  const response = await api("/api/customers");
  assert.equal(response.status, 401);
});

test("Phase 6 API: AGENT customer route is owner-isolated", async () => {
  const fixture = await createFixture();
  const cookie = await login(fixture.agent1);

  const response = await api("/api/customers", { cookie });
  assert.equal(response.status, 200);

  const payload = (await response.json()) as { customers: Array<{ id: string }> };
  assert.deepEqual(
    payload.customers.map((customer) => customer.id),
    [fixture.customer1Id],
  );
  assert.equal(payload.customers.some((customer) => customer.id === fixture.customer2Id), false);
});

test("Phase 6 API: TEAM_LEADER customer route sees only team scope", async () => {
  const fixture = await createFixture();
  const cookie = await login(fixture.teamLeader);

  const response = await api("/api/customers", { cookie });
  assert.equal(response.status, 200);

  const payload = (await response.json()) as { customers: Array<{ id: string }> };
  assert.deepEqual(
    new Set(payload.customers.map((customer) => customer.id)),
    new Set([fixture.customer1Id, fixture.customer2Id]),
  );
});

test("Phase 6 API: AGENT cannot assign another agent's customer owner", async () => {
  const fixture = await createFixture();
  const cookie = await login(fixture.agent1);

  const response = await api("/api/customers", {
    cookie,
    method: "POST",
    body: {
      name: "Unauthorized Owner Assignment",
      ownerUserId: fixture.agent2.id,
    },
  });

  assert.equal(response.status, 403);
});

test("Phase 6 API: VIEWER is denied write access by actual route handlers", async () => {
  const fixture = await createFixture();
  const cookie = await login(fixture.viewer);

  const cases = [
    ["/api/customers", {}],
    ["/api/sales", {}],
    ["/api/payments", {}],
    ["/api/payment-plans", {}],
  ] as const;

  for (const [path, body] of cases) {
    const response = await api(path, { cookie, method: "POST", body });
    assert.equal(response.status, 403, `${path} should deny VIEWER writes`);
  }
});


test("Phase 6 API: OFFICE_ADMIN sees all customer owners within its office", async () => {
  const fixture = await createFixture();
  const cookie = await login(fixture.officeAdmin);

  const response = await api("/api/customers", { cookie });
  assert.equal(response.status, 200);

  const payload = (await response.json()) as { customers: Array<{ id: string }> };
  assert.deepEqual(
    new Set(payload.customers.map((customer) => customer.id)),
    new Set([fixture.customer1Id, fixture.customer2Id]),
  );
});

test("Phase 6 API: ORG_ADMIN follows the current office-scoped customer route contract", async () => {
  const fixture = await createFixture();
  const cookie = await login(fixture.orgAdmin);

  const response = await api("/api/customers", { cookie });
  assert.equal(response.status, 200);

  const payload = (await response.json()) as { customers: Array<{ id: string }> };
  assert.deepEqual(
    new Set(payload.customers.map((customer) => customer.id)),
    new Set([fixture.customer1Id, fixture.customer2Id]),
  );
});
