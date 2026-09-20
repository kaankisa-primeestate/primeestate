import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/lib/auth-context";

export async function GET(request: Request) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ message: "Authentication required." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const purpose = searchParams.get("purpose")?.trim();
  const propertyType = searchParams.get("propertyType")?.trim();

  const listings = await prisma.listing.findMany({
    where: {
      organizationId: context.organizationId,
      officeId: context.officeId,
      ...(q ? {
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { title: { contains: q, mode: "insensitive" } },
          { property: { city: { contains: q, mode: "insensitive" } } },
          { property: { district: { contains: q, mode: "insensitive" } } },
          { property: { neighborhood: { contains: q, mode: "insensitive" } } },
        ],
      } : {}),
      ...(purpose ? { purpose: purpose as never } : {}),
      ...(propertyType ? { property: { propertyType: propertyType as never } } : {}),
    },
    include: {
      property: {
        select: {
          id: true, propertyType: true, city: true, district: true, neighborhood: true,
          address: true, sizeM2: true, rooms: true, floor: true, ownerName: true,
        },
      },
      consultant: { select: { id: true, name: true, email: true } },
      _count: { select: { matches: true, showings: true, offers: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ listings });
}
