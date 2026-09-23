# PrimeEstate North Star

## Product north star
**PrimeEstate, real-estate consultant's second brain.**

Remember → Think → Suggest → Act → Remember.

Real-estate loop:
**Talep → Eşleştir → Göster → Geri bildirim al → Hafızaya kaydet → Öğren → sonraki eşleşmeyi iyileştir**

Every new module must strengthen this loop or make office operation measurably simpler.

## Office model
**Platform → Organization → Office → Users/Consultants → CRM records**

- SUPER_ADMIN manages the SaaS layer.
- OFFICE_ADMIN is the broker / office owner and has office-wide control.
- Consultants work inside their office.

## Non-negotiable visibility rules

### Customers
- Consultant sees only their own customer records and records explicitly assigned to them.
- Consultant must not see another consultant's private customers.
- Office management can see customers within its authorized office scope.

### Portfolio / Listings
- **Every consultant sees the entire office portfolio, not only their own listings.**
- Portfolio visibility is scoped by organization + office.
- Ownership controls editing, assignment and sensitive actions; ownership does not restrict ordinary portfolio visibility.
- A consultant can discover and match office-wide listings to their own customers/demands.
- Matching, showing and recommendation flows use the same office-wide portfolio boundary.

**Customer privacy is user-scoped. Portfolio visibility is office-scoped.**

## What we will build
1. Stable broker/office onboarding and consultant approval.
2. Consultant profile, company and commission onboarding.
3. Office-wide portfolio visibility with owner-based edit permissions.
4. Live CRM workflow from customer to sale and collection.
5. Prime Brain recommendations and learning.
6. Communication and follow-up automation.
7. Office dashboard, performance and finance intelligence.
8. Useful integrations: WhatsApp, calendar, portals, email/phone.
9. Mobile-first consultant experience.
10. SaaS administration, plans and billing after the core product is stable.

## What we will not build
- A generic contact-management CRM with no real-estate workflow.
- Decorative dashboards disconnected from live data.
- Consultant-only portfolio visibility.
- Broad customer visibility between consultants.
- Features added only because competitors list them.
- Premature billing complexity before the core workflow is reliable.
- Large refactors that do not improve correctness, security or product capability.
- Destructive production-data resets as a shortcut.

## Competitive lessons
Turkish and global products consistently center on customer/lead management, portfolio, matching, follow-up, appointments/showings, transaction/commission tracking, reporting, role-based access and mobile use. Mature global systems add event-driven automation, lead routing, behavioral signals, action plans, integrated communication and AI suggestions.

Open-source multi-tenant implementations reinforce tenant scoping and role-based permissions as architectural boundaries, not merely UI choices.

PrimeEstate should compete on **workflow depth + relationship memory + office-wide portfolio intelligence**, not on feature-count.

## Decision rule
Before implementation:
1. Which part of the Prime loop does it improve?
2. Which user uses it: Broker, Consultant, or both?
3. What data does it read and change?
4. What is the exact tenant/office/ownership boundary?
5. How will we prove it works with live data and authorization tests?

If these answers are unclear, the feature does not enter implementation yet.

## Permanent direction
We do not restart from zero. We continue from the current foundation, phase by phase, using this document as the product and architecture reference.

**North Star:** PrimeEstate should make a consultant more informed, responsive and organized while preserving human control, and give the broker a trustworthy, measurable view of the whole office.
