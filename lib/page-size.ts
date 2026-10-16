// How many streams the dashboard lists request per page — a user preference,
// persisted in localStorage so it survives a reload. See app/page.tsx (the
// selector) and hooks/use-stream-page.ts (where the choice is used as the
// request's `limit`).

export type PageSize = 10 | 25 | 50 | 100;

// The API's own limit ceiling: a selector must never offer more than this.
export const MAX_PAGE_SIZE: PageSize = 100;

export const PAGE_SIZE_OPTIONS: readonly PageSize[] = [10, 25, 50, 100];

export const DEFAULT_PAGE_SIZE: PageSize = 25;

export const PAGE_SIZE_STORAGE_KEY = "tricklepay-page-size";

export function isPageSize(value: number): value is PageSize {
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(value);
}

/** Restores the page-size choice saved in localStorage, or the default if none is stored or it is invalid. */
export function readPageSize(): PageSize {
  if (typeof window === "undefined") {
    return DEFAULT_PAGE_SIZE;
  }

  try {
    const raw = window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PAGE_SIZE;
    }

    const parsed = Number(raw);
    return isPageSize(parsed) ? parsed : DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

export function writePageSize(size: PageSize): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(size));
  } catch {
    // Ignore storage failures from private browsing or quota limits.
  }
}
