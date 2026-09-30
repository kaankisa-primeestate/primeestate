import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";
import { can, customerOwnershipScope, officeListingScope } from "@/lib/authz";
import { authenticationRequired, forbidden, validationError } from "@/lib/api-response";

export async function GET(request: Request) {
  const context = await getUserContext();
  if (!context) return authenticationRequired();
  if (!can(context.role, "customers", "read") || !can(context.role, "listings", "read")) {
    return forbidden("Arama yetkiniz yok.");
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return validationError("Arama için en az 2 karakter girin.");
  }

  const customerScope = customerOwnershipScope(context);
  const listingScope = officeListingScope(context);

  const [customers, listings] = await Promise.all([
    prisma.customer.findMany({
      where: {
        ...customerScope,
        organizationId: context.organizationId,
        officeId: context.officeId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { location: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        location: true,
        relationshipScore: true,
        owner: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.listing.findMany({
      where: {
        ...listingScope,
        OR: [
          { code: { contains: query, mode: "insensitive" } },
          { title: { contains: query, mode: "insensitive" } },
          { property: { city: { contains: query, mode: "insensitive" } } },
          { property: { district: { contains: query, mode: "insensitive" } } },
          { property: { neighborhood: { contains: query, mode: "insensitive" } } },
          { property: { address: { contains: query, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        code: true,
        title: true,
        purpose: true,
        status: true,
        price: true,
        currency: true,
        property: {
          select: {
            city: true,
            district: true,
            neighborhood: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
  ]);

  return NextResponse.json({
    query,
    customers,
    listings: listings.map((listing) => ({
      ...listing,
      price: listing.price.toString(),
    })),
  });
}
