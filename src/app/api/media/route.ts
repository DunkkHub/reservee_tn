import {
  errorResponse,
  forbiddenResponse,
  paginatedResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { handleRouteError } from "@/lib/api-route-helpers";
import { recordActivity } from "@/lib/activity-log-repository";
import { canManageBusinessProfile } from "@/lib/access-control";
import { getApiSession } from "@/lib/auth-session";
import { findBusinessById } from "@/lib/business-repository";
import {
  countMediaByBusiness,
  createMediaItem,
  deleteMediaItem,
  findMediaByBusiness,
  reorderMediaItem,
  setCoverMediaItem,
} from "@/lib/media-repository";
import { createPaginationMetadata, parsePagination } from "@/lib/pagination";
import { assertAllowedOrigin } from "@/lib/security";
import {
  mediaCreateSchema,
  mediaUpdateSchema,
  safeParseWithSchema,
} from "@/lib/validation";

export const runtime = "nodejs";

async function canManageBusiness(
  session: NonNullable<Awaited<ReturnType<typeof getApiSession>>>,
  businessId: string,
) {
  if (session.user.role === "admin") {
    return true;
  }

  if (session.user.role !== "shop") {
    return false;
  }

  const business = await findBusinessById(businessId);
  return Boolean(business && canManageBusinessProfile(session.user, business.ownerId));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return errorResponse("Business ID is required.", 400, "invalid_input");
    }

    const pagination = parsePagination(searchParams);
    const [media, total] = await Promise.all([
      findMediaByBusiness(businessId, pagination),
      countMediaByBusiness(businessId),
    ]);

    return paginatedResponse(
      media,
      createPaginationMetadata(total, pagination),
    );
  } catch (error) {
    return handleRouteError(error, "Unable to load media.");
  }
}

export async function POST(request: Request) {
  try {
    assertAllowedOrigin(request);

    const session = await getApiSession();

    if (!session) {
      return unauthorizedResponse("Authentication required.");
    }

    const body = await request.json();
    const parsed = safeParseWithSchema(mediaCreateSchema, body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    if (!(await canManageBusiness(session, parsed.data.businessId))) {
      return forbiddenResponse("You do not have permission to manage media for this business.");
    }

    const media = await createMediaItem({
      businessId: parsed.data.businessId,
      url: parsed.data.url,
      alt: parsed.data.alt,
      type: parsed.data.type ?? "gallery",
      storageProvider: parsed.data.storageProvider,
      storageKey: parsed.data.storageKey,
      mimeType: parsed.data.mimeType,
      fileSizeBytes: parsed.data.fileSizeBytes,
    });

    await recordActivity({
      type: "business_settings_edited",
      businessId: parsed.data.businessId,
      summary: "Business gallery was updated.",
    });

    return successResponse(media, "Media item created", 201);
  } catch (error) {
    return handleRouteError(error, "Unable to create this media item.");
  }
}

export async function PATCH(request: Request) {
  try {
    assertAllowedOrigin(request);

    const session = await getApiSession();

    if (!session) {
      return unauthorizedResponse("Authentication required.");
    }

    const body = await request.json();
    const parsed = safeParseWithSchema(mediaUpdateSchema, body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    if (!(await canManageBusiness(session, parsed.data.businessId))) {
      return forbiddenResponse("You do not have permission to manage media for this business.");
    }

    const media =
      parsed.data.actionType === "setCover"
        ? await setCoverMediaItem(parsed.data.businessId, parsed.data.mediaId)
        : await reorderMediaItem(
            parsed.data.businessId,
            parsed.data.mediaId,
            parsed.data.direction ?? "up",
          );

    await recordActivity({
      type: "business_settings_edited",
      businessId: parsed.data.businessId,
      summary:
        parsed.data.actionType === "setCover"
          ? "Business cover image was updated."
          : "Business gallery order changed.",
    });

    return successResponse(media, "Media updated");
  } catch (error) {
    return handleRouteError(error, "Unable to update this media item.");
  }
}

export async function DELETE(request: Request) {
  try {
    assertAllowedOrigin(request);

    const session = await getApiSession();

    if (!session) {
      return unauthorizedResponse("Authentication required.");
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const mediaId = searchParams.get("mediaId");

    if (!businessId || !mediaId) {
      return errorResponse("Business ID and media ID are required.", 400, "invalid_input");
    }

    if (!(await canManageBusiness(session, businessId))) {
      return forbiddenResponse("You do not have permission to manage media for this business.");
    }

    await deleteMediaItem(businessId, mediaId);

    await recordActivity({
      type: "business_settings_edited",
      businessId,
      summary: "A gallery image was removed.",
    });

    return successResponse({ deleted: true }, "Media deleted");
  } catch (error) {
    return handleRouteError(error, "Unable to delete this media item.");
  }
}
