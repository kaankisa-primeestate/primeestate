# PrimeEstate — Deletion Policy

## Purpose

PrimeEstate must preserve the financial, commercial, relationship, and audit history of an office. Core business records are therefore not hard-deleted through the application API.

## Policy

### Records that are not hard-deleted

The following records remain in the database and are changed through their existing business states or update flows:

- Customer records
- Listing records
- Offer records
- Sale records
- Payment records
- Payment plans
- Payment installments
- Showing records
- Activity records
- Task records
- Audit logs

A hard-delete API must not be introduced for these entities without an explicit product decision and a reviewed data-retention design.

### Existing state-based alternatives

- Listings use their existing lifecycle statuses such as `PASIF`, `SATILDI`, and `KIRALANDI`.
- Offers use their existing status lifecycle and, once converted to a sale, their commercial state is locked where required.
- Sales use `ACIK`, `TAMAMLANDI`, and `IPTAL`.
- Payments and installments use their existing financial statuses.
- Tasks and showings use their existing workflow statuses.

These are workflow transitions, not record deletion.

### Explicit exception

Listing photos are operational media and may be deleted through the existing listing-image endpoint. Removing a photo does not remove the listing or its commercial history.

## Authorization

Any future destructive operation must remain server-side authorized and tenant-scoped. An office consultant must never gain deletion rights over another consultant's private customer records by UI changes alone.

## Database implications

The current Prisma model uses restrictive/cascade relationships that protect historical integrity in important areas, including:

- Sale → Offer: `onDelete: Restrict`
- Customer → Owner: `onDelete: Restrict`
- Activity → Owner: `onDelete: Restrict`
- Task → Owner: `onDelete: Restrict`
- PaymentPlan / Payment / Ledger relationships retain their business chain through explicit relations.

No schema migration is required for this policy.

## Change control

Introducing hard delete for a core business entity requires a separate decision covering:

1. retention requirements,
2. audit/history preservation,
3. dependent records,
4. tenant authorization,
5. restore/recovery behavior,
6. real HTTP test coverage.

