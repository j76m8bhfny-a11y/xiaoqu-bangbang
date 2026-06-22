export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export async function paginate<T>(
  query: Promise<T[]>,
  countQuery: Promise<number>,
  page: number = 1,
  pageSize: number = 20,
): Promise<PaginatedResult<T>> {
  const [items, total] = await Promise.all([query, countQuery]);
  return {
    items,
    page,
    pageSize,
    total,
  };
}

export function getPaginationParams(page?: number, pageSize?: number) {
  const p = Math.max(1, Number(page) || 1);
  const ps = Math.min(100, Math.max(1, Number(pageSize) || 20));
  const skip = (p - 1) * ps;
  return { page: p, pageSize: ps, skip, take: ps };
}
