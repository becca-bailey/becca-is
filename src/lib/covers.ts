/**
 * Build-time lookup of book covers on Open Library.
 *
 * Open Library answers a missing cover with a 200 and a 1x1 GIF unless the
 * request carries `?default=false`, in which case it 404s. We always send the
 * flag and check with a HEAD request first, so a book without a cover falls
 * back to the typographic tile instead of rendering a one-pixel image.
 *
 * Results are memoised per URL for the lifetime of the build, so a cover shown
 * on the index, the book page and the home strip costs one request.
 */
import { site } from './site';

const COVERS_BASE = 'https://covers.openlibrary.org/b';

/** Open Library asks API clients to identify themselves. */
const USER_AGENT = `${site.url.replace(/^https?:\/\//, '')} (${site.email})`;

export interface CoverSource {
	openLibraryCoverId?: number;
	isbn?: string;
	openLibraryId?: string;
}

/** The Open Library cover URL for a book, or null when nothing identifies it. */
export function coverUrl(source: CoverSource, size: 'M' | 'L' = 'L') {
	const key = source.openLibraryCoverId
		? `id/${source.openLibraryCoverId}`
		: source.isbn
			? `isbn/${source.isbn}`
			: source.openLibraryId
				? `olid/${source.openLibraryId}`
				: null;
	return key ? `${COVERS_BASE}/${key}-${size}.jpg?default=false` : null;
}

const checks = new Map<string, Promise<string | null>>();

/** Resolves to the URL when Open Library has a real cover there, otherwise null. */
export function resolveRemoteCover(url: string | null): Promise<string | null> {
	if (!url) return Promise.resolve(null);
	let pending = checks.get(url);
	if (!pending) {
		pending = fetch(url, { method: 'HEAD', redirect: 'follow', headers: { 'User-Agent': USER_AGENT } })
			.then((response) => (response.ok ? url : null))
			.catch((error: unknown) => {
				const reason = error instanceof Error ? error.message : String(error);
				console.warn(`[reading] cover check failed for ${url}: ${reason}`);
				return null;
			});
		checks.set(url, pending);
	}
	return pending;
}
