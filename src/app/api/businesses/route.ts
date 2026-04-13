import { NextResponse } from "next/server";
import { findBusinessById, findBusinessBySlug, findBusinessByOwner } from "@/lib/business-repository";
import { getDatabaseErrorMessage } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const slug = searchParams.get("slug");
  const ownerId = searchParams.get("ownerId");

  try {
    let business;

    if (id) {
      business = await findBusinessById(id);
    } else if (slug) {
      business = await findBusinessBySlug(slug);
    } else if (ownerId) {
      business = await findBusinessByOwner(ownerId);
    } else {
      return NextResponse.json(
        { ok: false, message: "Please provide id, slug, or ownerId" },
        { status: 400 },
      );
    }

    if (!business) {
      return NextResponse.json(
        { ok: false, message: "Business not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: business,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: getDatabaseErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
