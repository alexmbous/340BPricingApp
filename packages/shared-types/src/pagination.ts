export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  limit: number;
}

export interface PageQuery {
  cursor?: string;
  limit?: number;
}

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;
