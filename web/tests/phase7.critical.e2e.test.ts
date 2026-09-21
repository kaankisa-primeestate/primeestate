import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { writeFile } from "node:fs/promises";
import net from "node:net";
import { test, before, after } from "node:test";

async function stopServer(child: ChildProcess | null) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    child.kill();
  } else {
    try { process.kill(-child.pid, "SIGTERM"); } catch {}
  }
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      if (process.platform !== "win32" && child.pid) {
        try { process.kill(-child.pid, "SIGKILL"); } catch {}
      } else {
        child.kill("SIGKILL");
      }
      resolve();
    }, 5000);
    child.once("exit", () => { clearTimeout(timer); resolve(); });
  });
}

process.env.BETTER_AUTH_SECRET ??= "phase7-e2e-test-secret-0123456789-abcdef";
process.env.BETTER_AUTH_URL ??= "http://127.0.0.1:4318";

const { prisma } = await import("../src/lib/prisma");
const { auth } = await import("../src/lib/auth");

const BASE_URL = process.env.PHASE7_E2E_TEST_URL ?? "http://127.0.0.1:4318";
let server: ChildProcess | null = null;
const createdOrganizations: string[] = [];

let serverOutput = "";

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null && server?.exitCode !== undefined) {
      throw new Error(
        `Phase 7 E2E Next.js test server exited with code ${server.exitCode}.\\n${serverOutput.slice(-12000)}`,
      );
    }

    const connected = await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host: "127.0.0.1", port: 4318 });
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => {
        socket.destroy();
        resolve(false);
      });
      socket.setTimeout(1000, () => {
        socket.destroy();
        resolve(false);
      });
    });

    if (connected) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(
    `Phase 7 E2E Next.js test server did not open port 4318 within 120 seconds.\\n${serverOutput.slice(-12000)}`,
  );
}

async function createAgent(suffix: string) {
  const organization = await prisma.organization.create({
    data: { name: `Phase7 E2E Org ${suffix}`, slug: `phase7-e2e-${suffix}` },
  });
  createdOrganizations.push(organization.id);

  const office = await prisma.office.create({
    data: { organizationId: organization.id, name: "E2E Office", slug: `e2e-office-${suffix}` },
  });
  const team = await prisma.team.create({
    data: { officeId: office.id, name: `E2E Team ${suffix}` },
  });

  const email = `phase7-agent-${suffix}@example.test`;
  const password = "Phase7-Test-Password-123!";
  const context = await auth.$context;
  const user = await context.internalAdapter.createUser(
    {
      email,
      name: "Phase 7 E2E Agent",
      emailVerified: true,
      organizationId: organization.id,
      officeId: office.id,
      teamId: team.id,
      role: "AGENT",
      active: true,
    },
    { method: "phase7-e2e-test" },
  );

  await context.internalAdapter.linkAccount({
    accountId: user.id,
    providerId: "credential",
    userId: user.id,
    password: await context.password.hash(password),
  });

  return { organization, office, team, user, email, password };
}

async function login(email: string, password: string) {
  let response: Response;
  try {
    response = await fetch(BASE_URL + "/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", Origin: BASE_URL },
      body: JSON.stringify({ email, password, rememberMe: true }),
    });
  } catch (error) {
    throw new Error(
      `Phase 7 login request failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}\\nNext.js output:\\n${serverOutput.slice(-16000)}`,
    );
  }
  if (!response.ok) {
    throw new Error(`Phase 7 login failed: HTTP ${response.status}. Response body: ${await response.text() || "<empty>"}`);
  }
  await response.arrayBuffer();

  const cookies = response.headers.getSetCookie?.() ?? [];
  const cookieHeader = cookies
    .map((cookie) => cookie.split(";", 1)[0])
    .filter(Boolean)
    .join("; ");
  assert.ok(cookieHeader, "Better Auth did not return a session cookie.");
  return cookieHeader;
}

type ApiResponse = {
  status: number;
  body: string;
};

async function api(path: string, cookie: string, body?: unknown, method = "GET"): Promise<ApiResponse> {
  const response = await fetch(BASE_URL + path, {
    method,
    headers: {
      Cookie: cookie,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // Consume every response body inside the request helper. Node's built-in fetch
  // is backed by Undici, and leaving bodies unread can leave its HTTP parser
  // paused when the Next.js dev server closes/reuses a socket.
  return { status: response.status, body: await response.text() };
}

async function expectStatus(response: ApiResponse, expected: number, label: string) {
  assert.equal(
    response.status,
    expected,
    label + ": expected HTTP " + expected + ", received HTTP " + response.status + ". Response body: " + (response.body || "<empty>"),
  );
}

async function json<T>(response: ApiResponse): Promise<T> {
  assert.ok(response.body, "Expected JSON response body, received empty body (HTTP " + response.status + ").");
  return JSON.parse(response.body) as T;
}

before(async () => {
  server = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["next", "dev", "--webpack", "-H", "127.0.0.1", "-p", "4318"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
        BETTER_AUTH_URL: BASE_URL,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
    },
  );

  server.stdout?.on("data", (chunk) => {
    serverOutput = (serverOutput + chunk.toString()).slice(-12000);
  });
  server.stderr?.on("data", (chunk) => {
    serverOutput = (serverOutput + chunk.toString()).slice(-12000);
  });

  await waitForServer();
});

after(async () => {
  await stopServer(server);
  server = null;
  for (const organizationId of createdOrganizations.splice(0)) {
    await prisma.organization.delete({ where: { id: organizationId } }).catch(() => {});
  }
  await prisma.$disconnect();
});

test("Phase 7: critical customer-to-finance business chain works through real HTTP routes", async () => {
  const fixture = await createAgent(randomUUID().slice(0, 8));
  const cookie = await login(fixture.email, fixture.password);

  // 1. Customer
  const customerResponse = await api(
    "/api/customers",
    cookie,
    {
      name: "Phase 7 Customer",
      phone: "+905555555555",
      roles: ["ALICI"],
    },
    "POST",
  );
  await expectStatus(customerResponse, 201, "customerResponse");
  const customerPayload = await json<{ customer: { id: string } }>(customerResponse);
  const customerId = customerPayload.customer.id;

  // 2. Demand
  const demandResponse = await api(
    `/api/customers/${customerId}/demands`,
    cookie,
    {
      title: "Bostancı 3+1 Satın Alma Talebi",
      type: "SATIN_ALMA",
      propertyType: "DAIRE",
      locations: ["Bostanci"],
      budgetMin: 4000000,
      budgetMax: 6000000,
      currency: "TRY",
      minSize: 90,
      maxSize: 140,
      rooms: "3+1",
      urgency: "YUKSEK",
    },
    "POST",
  );
  await expectStatus(demandResponse, 201, "demandResponse");
  const demandPayload = await json<{ demand: { id: string } }>(demandResponse);
  const demandId = demandPayload.demand.id;

  // 3. Listing / property
  const listingResponse = await api(
    "/api/listings",
    cookie,
    {
      propertyType: "DAIRE",
      purpose: "SATILIK",
      title: "Bostancı E2E 3+1",
      city: "Istanbul",
      district: "Kadikoy",
      neighborhood: "Bostanci",
      price: 5000000,
      sizeM2: 110,
      rooms: "3+1",
      floor: "5",
      currency: "TRY",
    },
    "POST",
  );
  await expectStatus(listingResponse, 201, "listingResponse");
  const listingPayload = await json<{ listing: { id: string; propertyId: string; status: string } }>(listingResponse);
  assert.equal(listingPayload.listing.status, "AKTIF");

  // 4. Match demand to listing
  const matchingResponse = await api(
    "/api/matching",
    cookie,
    { demandId, limit: 10 },
    "POST",
  );
  await expectStatus(matchingResponse, 200, "matchingResponse");
  const matchingPayload = await json<{ matches: Array<{ listingId: string; score: number }> }>(matchingResponse);
  assert.ok(matchingPayload.matches.some((match) => match.listingId === listingPayload.listing.id));
  assert.ok((matchingPayload.matches.find((match) => match.listingId === listingPayload.listing.id)?.score ?? 0) > 0);

  // 5. Showing
  const showingResponse = await api(
    "/api/showings",
    cookie,
    {
      customerId,
      listingId: listingPayload.listing.id,
      dateTime: "2026-10-15T15:00:00.000Z",
      attendees: 2,
      note: "Phase 7 critical chain gösterimi",
    },
    "POST",
  );
  await expectStatus(showingResponse, 201, "showingResponse");

  // 6. Offer
  const offerResponse = await api(
    "/api/offers",
    cookie,
    {
      customerId,
      listingId: listingPayload.listing.id,
      amount: 4800000,
      currency: "TRY",
      offeredAt: "2026-10-15T16:00:00.000Z",
      nextAction: "Mal sahibi onayı",
    },
    "POST",
  );
  await expectStatus(offerResponse, 201, "offerResponse");
  const offerPayload = await json<{ offer: { id: string; status: string; listing: { id: string } } }>(offerResponse);
  assert.equal(offerPayload.offer.status, "TASLAK");
  assert.equal(offerPayload.offer.listing.id, listingPayload.listing.id, "Offer must retain the listing selected by the test.");

  // 7. Accept offer
  for (const status of ["SUNULDU", "KARSILIKLI_TEKLIF", "KABUL"] as const) {
    const response = await api(
      `/api/offers/${offerPayload.offer.id}`,
      cookie,
      { status },
      "PATCH",
    );
    await expectStatus(response, 200, `offer status update ${status}`);
  }

  // 8. Accepted offer -> sale
  const saleResponse = await api(
    "/api/sales",
    cookie,
    { offerId: offerPayload.offer.id, note: "Phase 7 E2E satış" },
    "POST",
  );
  await expectStatus(saleResponse, 201, "saleResponse");
  const salePayload = await json<{
    sale: { id: string; offerId: string; listingId: string; amount: string | number; currency: string };
  }>(saleResponse);
  const dbSale = await prisma.sale.findUnique({ where: { id: salePayload.sale.id }, select: { id: true, offerId: true, listingId: true, amount: true, currency: true } });
  const dbOffer = await prisma.offer.findUnique({ where: { id: offerPayload.offer.id }, select: { id: true, listingId: true, sale: { select: { id: true, listingId: true } } } });
  await writeFile("/tmp/phase7-sale-diagnostic.json", JSON.stringify({ listingPayload, offerPayload, salePayload, dbSale, dbOffer }, null, 2));
  assert.equal(salePayload.sale.offerId, offerPayload.offer.id);
  const saleListingId = salePayload.sale.listingId;
  const offerListingId = offerPayload.offer.listing.id;
  if (saleListingId !== offerListingId) {
    throw new Error(
      "Sale/offer listing linkage mismatch: sale.listingId=" + saleListingId +
      " offer.listing.id=" + offerListingId +
      " expected listing.id=" + listingPayload.listing.id,
    );
  }
  assert.equal(Number(salePayload.sale.amount), 4800000);
  assert.equal(salePayload.sale.currency, "TRY");

  // 9. Commission calculation
  const commissionResponse = await api(
    `/api/sales/${salePayload.sale.id}`,
    cookie,
    { commissionRate: 3, officeShareRate: 50 },
    "PATCH",
  );
  await expectStatus(commissionResponse, 200, "commissionResponse");
  const commissionPayload = await json<{
    sale: { grossCommission: string | number; officeShare: string | number; consultantShare: string | number };
  }>(commissionResponse);
  assert.equal(Number(commissionPayload.sale.grossCommission), 144000);
  assert.equal(Number(commissionPayload.sale.officeShare), 72000);
  assert.equal(Number(commissionPayload.sale.consultantShare), 72000);

  // 10. Payment + ledger
  const paymentResponse = await api(
    "/api/payments",
    cookie,
    {
      saleId: salePayload.sale.id,
      amount: 1000000,
      currency: "TRY",
      status: "ODENDI",
      paidAt: "2026-10-20T10:00:00.000Z",
    },
    "POST",
  );
  await expectStatus(paymentResponse, 201, "paymentResponse");
  const paymentPayload = await json<{ payment: { id: string; amount: string | number; status: string } }>(paymentResponse);
  assert.equal(Number(paymentPayload.payment.amount), 1000000);
  assert.equal(paymentPayload.payment.status, "ODENDI");

  // 11. Payment plan / installments
  const planResponse = await api(
    "/api/payment-plans",
    cookie,
    {
      saleId: salePayload.sale.id,
      title: "4 Taksit E2E Plan",
      installments: [
        { amount: 1200000, dueAt: "2026-11-01T00:00:00.000Z" },
        { amount: 1200000, dueAt: "2026-12-01T00:00:00.000Z" },
        { amount: 1200000, dueAt: "2027-01-01T00:00:00.000Z" },
        { amount: 1200000, dueAt: "2027-02-01T00:00:00.000Z" },
      ],
    },
    "POST",
  );
  await expectStatus(planResponse, 201, "planResponse");
  const planPayload = await json<{ plan: { id: string; currency: string; installments: Array<{ sequence: number; amount: string | number }> } }>(planResponse);
  assert.equal(planPayload.plan.currency, "TRY");
  assert.deepEqual(planPayload.plan.installments.map((item) => item.sequence), [1, 2, 3, 4]);
  assert.equal(
    planPayload.plan.installments.reduce((sum, item) => sum + Number(item.amount), 0),
    4800000,
  );

  // 12. Read-back: the chain is visible to the same scoped user and finance endpoints.
  const salesRead = await api("/api/sales", cookie);
  assert.equal(salesRead.status, 200);
  const salesPayload = await json<{ sales: Array<{ id: string }> }>(salesRead);
  assert.ok(salesPayload.sales.some((sale) => sale.id === salePayload.sale.id));

  const paymentsRead = await api("/api/payments", cookie);
  assert.equal(paymentsRead.status, 200);
  const paymentsPayload = await json<{ payments: Array<{ id: string; sale: { id: string } }> }>(paymentsRead);
  assert.ok(paymentsPayload.payments.some((payment) => payment.id === paymentPayload.payment.id && payment.sale.id === salePayload.sale.id));

  const plansRead = await api("/api/payment-plans", cookie);
  assert.equal(plansRead.status, 200);
  const plansPayload = await json<{ plans: Array<{ id: string; sale: { id: string } }> }>(plansRead);
  assert.ok(plansPayload.plans.some((plan) => plan.id === planPayload.plan.id && plan.sale.id === salePayload.sale.id));

  const listingRead = await api(`/api/listings?q=Bostancı E2E 3+1`, cookie);
  assert.equal(listingRead.status, 200);
  const listingReadPayload = await json<{ listings: Array<{ id: string; status: string }> }>(listingRead);
  assert.ok(listingReadPayload.listings.some((listing) => listing.id === listingPayload.listing.id && listing.status === "REZERVE"));

  const showingRead = await api(`/api/showings?customerId=${customerId}`, cookie);
  assert.equal(showingRead.status, 200);
  const showingPayload = await json<{ showings: Array<{ customer: { id: string }; listing: { id: string } }> }>(showingRead);
  assert.ok(showingPayload.showings.some((showing) => showing.customer.id === customerId && showing.listing.id === listingPayload.listing.id));
});
