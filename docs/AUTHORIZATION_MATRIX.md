# PrimeEstate Authorization Matrix

This document is the Phase 3 baseline for server-side authorization.

| Role | Customer scope | Listing scope | Financial/operations write |
|---|---|---|---|
| SUPER_ADMIN | Organization | Organization | Allowed |
| ORG_ADMIN | Organization | Organization | Allowed |
| OFFICE_ADMIN | Office | Office | Allowed |
| TEAM_LEADER | Own team | Own team for writes; office for reads | Allowed within team scope |
| AGENT | Own customers | Office shared pool for reads; own listings for writes | Own customer/sale scope |
| VIEWER | Office read-only | Office read-only | Denied |
| AUDITOR | Office read-only | Office read-only | Denied |

Rules:
- Authentication is required before any protected API operation.
- Capabilities are centralized in web/src/lib/authorization.ts.
- Resource scopes are centralized for customers, listings, sales and users.
- Backend/API scope is authoritative; UI visibility is not a security boundary.
- Agents cannot read another agent's customer records.
- Office listings are readable as a shared office pool.
- Team leaders are constrained to their team for customer/listing write scopes.
- VIEWER and AUDITOR have no write capabilities.
- Cross-organization access is excluded by organization scope.
