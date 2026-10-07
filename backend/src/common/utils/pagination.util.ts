export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats?: {
    total: number;
    active: number;
    inactive: number;
    banned: number;
  };
}

const MAX_LIMIT = 100;

/**
 * Shared page/limit clamp: page >= 1, 1 <= limit <= 100.
 * Accepts raw query values (string | number | undefined).
 */
export function getPagination(
  page?: number | string,
  limit?: number | string,
  defaultLimit = 10,
): PaginationParams {
  const parsedPage = Math.floor(Number(page));
  const parsedLimit = Math.floor(Number(limit));
  const safePage = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
  const fallbackLimit =
    Number.isFinite(parsedLimit) && parsedLimit >= 1 ? parsedLimit : defaultLimit;
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, fallbackLimit));
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  stats?: {
    total: number;
    active: number;
    inactive: number;
    banned: number;
  },
): PaginatedResult<T> {
  const result: PaginatedResult<T> = {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
  if (stats) {
    result.stats = stats;
  }
  return result;
}
