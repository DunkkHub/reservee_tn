import "server-only";

export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 100;

export type PaginationOptions = {
  limit: number;
  offset: number;
  page: number;
};

export type PaginationMetadata = PaginationOptions & {
  total: number;
  pageCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

function parseNonNegativeInteger(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function clampLimit(
  value: string | number | null | undefined,
  defaultLimit = DEFAULT_PAGE_LIMIT,
  maxLimit = MAX_PAGE_LIMIT,
) {
  const parsed =
    typeof value === "number"
      ? value
      : value
        ? Number.parseInt(value, 10)
        : defaultLimit;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultLimit;
  }

  return Math.min(Math.max(1, Math.floor(parsed)), maxLimit);
}

export function parsePagination(
  searchParams: URLSearchParams,
  options: {
    defaultLimit?: number;
    maxLimit?: number;
  } = {},
): PaginationOptions {
  const defaultLimit = options.defaultLimit ?? DEFAULT_PAGE_LIMIT;
  const maxLimit = options.maxLimit ?? MAX_PAGE_LIMIT;
  const limit = clampLimit(searchParams.get("limit"), defaultLimit, maxLimit);
  const explicitOffset = parseNonNegativeInteger(searchParams.get("offset"));
  const explicitPage = parseNonNegativeInteger(searchParams.get("page"));
  const page = Math.max(1, explicitPage ?? 1);
  const offset = explicitOffset ?? (page - 1) * limit;

  return {
    limit,
    offset,
    page: Math.floor(offset / limit) + 1,
  };
}

export function createPaginationMetadata(
  total: number,
  pagination: PaginationOptions,
): PaginationMetadata {
  const safeTotal = Math.max(0, total);
  const pageCount = safeTotal === 0 ? 0 : Math.ceil(safeTotal / pagination.limit);

  return {
    ...pagination,
    total: safeTotal,
    pageCount,
    hasNextPage: pagination.offset + pagination.limit < safeTotal,
    hasPreviousPage: pagination.offset > 0,
  };
}
