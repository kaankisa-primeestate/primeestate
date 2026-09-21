import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test, afterEach } from "node:test";

import { prisma } from "../src/lib/prisma";
import {
  customerOwnershipScope,
  officeListingScope,
} from "../src/lib/authz";

const createdOrganizations: string[] = [];

function context(userId: string, organizationId: string, officeId: string, teamId: string | null = null) {
  return {
    userId,
    organizationId,
    officeId,
    teamId,
    role: "AGENT" as const,
  };
}

async function createFixture() {
  const suffix = randomUUID().slice(0, 8);
  const organization = await prisma.organization.create({
    data: { name: `Phase6 Org ${suffix}`, slug: `phase6-${suffix}` },
  });
  createdOrganizations.push(organization.id);

  const officeA = await prisma.office.create({
    data: { organizationId: organization.id, name: "Office A", slug: `office-a-${suffix}` },
  });
  const officeB = await prisma.office.create({
    data: { organizationId: organization.id, name: "Office B", slug: `office-b-${suffix}` },
  });
  const otherOrganization = await prisma.organization.create({
    data: { name: `Phase6 Other ${suffix}`, slug: `phase6-other-${suffix}` },
  });
  createdOrganizations.push(otherOrganization.id);
  const otherOffice = await prisma.office.create({
    data: { organizationId: otherOrganization.id, name: "Other Office", slug: `other-office-${suffix}` },
  });

  const team = await prisma.team.create({
    data: { officeId: officeA.id, name: "Team A" },
  });

  const agent1 = await prisma.user.create({
    data: {
      organizationId: organization.id,
      officeId: officeA.id,
      teamId: team.id,
      email: `agent1-${suffix}@example.test`,
      name: "Agent One",
      role: "AGENT",
    },
  });
  const agent2 = await prisma.user.create({
    data: {
      organizationId: organization.id,
      officeId: officeA.id,
      teamId: team.id,
      email: `agent2-${suffix}@example.test`,
      name: "Agent Two",
      role: "AGENT",
    },
  });
  const otherOfficeAgent = await prisma.user.create({
    data: {
      organizationId: organization.id,
      officeId: officeB.id,
      email: `agent-office-b-${suffix}@example.test`,
      name: "Office B Agent",
      role: "AGENT",
    },
  });

  const customer1 = await prisma.customer.create({
    data: {
      organizationId: organization.id,
      officeId: officeA.id,
      ownerUserId: agent1.id,
      name: "Customer One",
    },
  });
  const customer2 = await prisma.customer.create({
    data: {
      organizationId: organization.id,
      officeId: officeA.id,
      ownerUserId: agent2.id,
      name: "Customer Two",
    },
  });
  const officeBCustomer = await prisma.customer.create({
    data: {
      organizationId: organization.id,
      officeId: officeB.id,
      ownerUserId: otherOfficeAgent.id,
      name: "Office B Customer",
    },
  });

  return {
    organization,
    officeA,
    officeB,
    otherOrganization,
    otherOffice,
    agent1,
    agent2,
    otherOfficeAgent,
    customer1,
    customer2,
    officeBCustomer,
  };
}

afterEach(async () => {
  for (const organizationId of createdOrganizations.splice(0)) {
    await prisma.organization.delete({ where: { id: organizationId } }).catch(() => {});
  }
});

test("Phase 6: agent customer scope is isolated by owner and office", async () => {
  const fixture = await createFixture();
  const agentContext = context(
    fixture.agent1.id,
    fixture.organization.id,
    fixture.officeA.id,
    fixture.agent1.teamId,
  );

  const visibleCustomers = await prisma.customer.findMany({
    where: {
      organizationId: agentContext.organizationId,
      officeId: agentContext.officeId,
      ...customerOwnershipScope(agentContext),
    },
    select: { id: true, name: true, ownerUserId: true, officeId: true },
  });

  assert.deepEqual(
    visibleCustomers.map((customer) => customer.id),
    [fixture.customer1.id],
  );
  assert.equal(
    visibleCustomers.some((customer) => customer.id === fixture.customer2.id),
    false,
  );
  assert.equal(
    visibleCustomers.some((customer) => customer.id === fixture.officeBCustomer.id),
    false,
  );

  const foreignCustomer = await prisma.customer.findFirst({
    where: {
      id: fixture.customer2.id,
      organizationId: agentContext.organizationId,
      officeId: agentContext.officeId,
      ...customerOwnershipScope(agentContext),
    },
  });
  assert.equal(foreignCustomer, null);
});

test("Phase 6: shared listing visibility is office-scoped, not agent-owned", async () => {
  const fixture = await createFixture();

  const officeAProperty = await prisma.property.create({
    data: {
      organizationId: fixture.organization.id,
      officeId: fixture.officeA.id,
      consultantUserId: fixture.agent2.id,
      propertyType: "DAIRE",
      title: "Shared Office Property",
      city: "Istanbul",
      district: "Kadikoy",
      neighborhood: "Bostanci",
    },
  });
  const officeBProperty = await prisma.property.create({
    data: {
      organizationId: fixture.organization.id,
      officeId: fixture.officeB.id,
      consultantUserId: fixture.otherOfficeAgent.id,
      propertyType: "DAIRE",
      title: "Other Office Property",
      city: "Istanbul",
      district: "Kadikoy",
      neighborhood: "Kozyatagi",
    },
  });
  const otherOrgProperty = await prisma.property.create({
    data: {
      organizationId: fixture.otherOrganization.id,
      officeId: fixture.otherOffice.id,
      propertyType: "DAIRE",
      title: "Other Organization Property",
      city: "Istanbul",
      district: "Besiktas",
      neighborhood: "Levent",
    },
  });

  const officeAListing = await prisma.listing.create({
    data: {
      organizationId: fixture.organization.id,
      officeId: fixture.officeA.id,
      propertyId: officeAProperty.id,
      consultantUserId: fixture.agent2.id,
      code: "P6-A-001",
      title: "Shared Office Listing",
      purpose: "SATILIK",
      price: 10000000,
    },
  });
  const officeBListing = await prisma.listing.create({
    data: {
      organizationId: fixture.organization.id,
      officeId: fixture.officeB.id,
      propertyId: officeBProperty.id,
      consultantUserId: fixture.otherOfficeAgent.id,
      code: "P6-B-001",
      title: "Office B Listing",
      purpose: "SATILIK",
      price: 9000000,
    },
  });
  const otherOrgListing = await prisma.listing.create({
    data: {
      organizationId: fixture.otherOrganization.id,
      officeId: fixture.otherOffice.id,
      propertyId: otherOrgProperty.id,
      code: "P6-O-001",
      title: "Other Organization Listing",
      purpose: "SATILIK",
      price: 8000000,
    },
  });

  const agentContext = context(
    fixture.agent1.id,
    fixture.organization.id,
    fixture.officeA.id,
    fixture.agent1.teamId,
  );

  const visibleListings = await prisma.listing.findMany({
    where: officeListingScope(agentContext),
    select: { id: true, consultantUserId: true, officeId: true, organizationId: true },
  });

  assert.equal(visibleListings.some((listing) => listing.id === officeAListing.id), true);
  assert.equal(visibleListings.some((listing) => listing.id === officeBListing.id), false);
  assert.equal(visibleListings.some((listing) => listing.id === otherOrgListing.id), false);
});

test("Phase 6: sale/listing uniqueness and accepted-offer linkage are enforced by the database", async () => {
  const fixture = await createFixture();

  const property = await prisma.property.create({
    data: {
      organizationId: fixture.organization.id,
      officeId: fixture.officeA.id,
      consultantUserId: fixture.agent1.id,
      propertyType: "DAIRE",
      title: "Invariant Property",
      city: "Istanbul",
      district: "Kadikoy",
      neighborhood: "Bostanci",
    },
  });

  const listing = await prisma.listing.create({
    data: {
      organizationId: fixture.organization.id,
      officeId: fixture.officeA.id,
      propertyId: property.id,
      consultantUserId: fixture.agent1.id,
      code: "P6-SALE-001",
      title: "Invariant Listing",
      purpose: "SATILIK",
      price: 5000000,
      currency: "TRY",
      status: "AKTIF",
    },
  });

  const offer = await prisma.offer.create({
    data: {
      customerId: fixture.customer1.id,
      listingId: listing.id,
      amount: 4800000,
      currency: "TRY",
      status: "KABUL",
    },
  });

  const sale = await prisma.sale.create({
    data: {
      customerId: fixture.customer1.id,
      listingId: listing.id,
      offerId: offer.id,
      amount: 4800000,
      currency: "TRY",
    },
  });

  assert.equal(sale.offerId, offer.id);
  assert.equal(sale.listingId, listing.id);

  await assert.rejects(
    prisma.sale.create({
      data: {
        customerId: fixture.customer1.id,
        listingId: listing.id,
        offerId: offer.id,
        amount: 4800000,
        currency: "TRY",
      },
    }),
  );

  const linkedSale = await prisma.offer.findUnique({
    where: { id: offer.id },
    select: { sale: { select: { id: true } } },
  });
  assert.deepEqual(linkedSale?.sale, { id: sale.id });
});


test("Phase 6: payment ledger split and payment-plan installment invariants stay internally consistent", async () => {
  const fixture = await createFixture();

  const property = await prisma.property.create({
    data: {
      organizationId: fixture.organization.id,
      officeId: fixture.officeA.id,
      consultantUserId: fixture.agent1.id,
      propertyType: "DAIRE",
      title: "Financial Invariant Property",
      city: "Istanbul",
      district: "Kadikoy",
      neighborhood: "Bostanci",
    },
  });

  const listing = await prisma.listing.create({
    data: {
      organizationId: fixture.organization.id,
      officeId: fixture.officeA.id,
      propertyId: property.id,
      consultantUserId: fixture.agent1.id,
      code: "P6-FIN-001",
      title: "Financial Invariant Listing",
      purpose: "SATILIK",
      price: 100000,
      currency: "TRY",
      status: "REZERVE",
    },
  });

  const offer = await prisma.offer.create({
    data: {
      customerId: fixture.customer1.id,
      listingId: listing.id,
      amount: 100000,
      currency: "TRY",
      status: "KABUL",
    },
  });

  const sale = await prisma.sale.create({
    data: {
      customerId: fixture.customer1.id,
      listingId: listing.id,
      offerId: offer.id,
      amount: 100000,
      currency: "TRY",
      commissionRate: 3,
      officeShareRate: 50,
      grossCommission: 3000,
      officeShare: 1500,
      consultantShare: 1500,
    },
  });

  const payment = await prisma.payment.create({
    data: {
      saleId: sale.id,
      amount: 100000,
      currency: "TRY",
      status: "ODENDI",
      paidAt: new Date(),
    },
  });

  const ledgerEntries = await prisma.ledgerEntry.createManyAndReturn({
    data: [
      {
        saleId: sale.id,
        paymentId: payment.id,
        account: "OFFICE",
        amount: 1500,
        currency: "TRY",
        description: "Ofis payı",
      },
      {
        saleId: sale.id,
        paymentId: payment.id,
        account: "CONSULTANT",
        amount: 1500,
        currency: "TRY",
        description: "Danışman payı",
      },
    ],
  });

  assert.equal(ledgerEntries.length, 2);
  assert.deepEqual(
    new Set(ledgerEntries.map((entry) => entry.account)),
    new Set(["OFFICE", "CONSULTANT"]),
  );

  const ledgerTotal = ledgerEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
  assert.equal(ledgerTotal, Number(sale.grossCommission));
  assert.equal(
    Number(ledgerEntries.find((entry) => entry.account === "OFFICE")?.amount),
    Number(sale.officeShare),
  );
  assert.equal(
    Number(ledgerEntries.find((entry) => entry.account === "CONSULTANT")?.amount),
    Number(sale.consultantShare),
  );

  const plan = await prisma.paymentPlan.create({
    data: {
      saleId: sale.id,
      title: "3 Taksit",
      currency: "TRY",
      installments: {
        create: [
          { sequence: 1, amount: 40000, currency: "TRY", dueAt: new Date("2026-10-01T00:00:00Z") },
          { sequence: 2, amount: 30000, currency: "TRY", dueAt: new Date("2026-11-01T00:00:00Z") },
          { sequence: 3, amount: 30000, currency: "TRY", dueAt: new Date("2026-12-01T00:00:00Z") },
        ],
      },
    },
    include: { installments: { orderBy: { sequence: "asc" } } },
  });

  assert.equal(plan.currency, sale.currency);
  assert.deepEqual(
    plan.installments.map((installment) => installment.sequence),
    [1, 2, 3],
  );
  assert.equal(
    plan.installments.reduce((sum, installment) => sum + Number(installment.amount), 0),
    Number(sale.amount),
  );
  assert.equal(
    plan.installments.every((installment) => installment.currency === sale.currency),
    true,
  );

  await assert.rejects(
    prisma.paymentPlan.create({
      data: {
        saleId: sale.id,
        title: "Duplicate Plan",
        currency: "TRY",
      },
    }),
  );

  await assert.rejects(
    prisma.paymentInstallment.create({
      data: {
        planId: plan.id,
        sequence: 1,
        amount: 100000,
        currency: "TRY",
        dueAt: new Date("2027-01-01T00:00:00Z"),
      },
    }),
  );
});
