import { getCollection, type CollectionEntry } from 'astro:content';
import defaultProjectImage from '@/assets/project-default.png';

export function projectUrl(slug: string) {
	return `/making-things/${slug}`;
}

export function projectIndexUrl() {
	return '/making-things';
}

export function formatDate(date: Date) {
	return date.toLocaleDateString('en-US', {
		timeZone: 'UTC',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

export function formatMonthYear(date: Date) {
	return date.toLocaleDateString('en-US', {
		timeZone: 'UTC',
		year: 'numeric',
		month: 'short',
	});
}

/** Card excerpts — full description still used on essay pages. */
export const CARD_EXCERPT_MAX_LENGTH = 360;

export function truncateExcerpt(text: string, maxLength = CARD_EXCERPT_MAX_LENGTH) {
	if (text.length <= maxLength) return text;
	const slice = text.slice(0, maxLength);
	const lastSpace = slice.lastIndexOf(' ');
	if (lastSpace > maxLength * 0.6) {
		return `${slice.slice(0, lastSpace).trimEnd()}…`;
	}
	return `${slice.trimEnd()}…`;
}

export function getDisplayDate(entry: WritingEntry) {
	return entry.data.revisedDate ?? entry.data.originalDate;
}

export async function getPublishedWriting() {
	const entries = await getCollection('writing');
	return entries
		.filter((entry) => !entry.data.draft)
		.sort((a, b) => getDisplayDate(b).valueOf() - getDisplayDate(a).valueOf());
}

export async function getWritingBySlug(slug: string) {
	const entries = await getPublishedWriting();
	return entries.find((entry) => entry.id === slug);
}

export async function resolveRelatedWriting(slugs: string[]) {
	const published = await getPublishedWriting();
	const byId = new Map(published.map((entry) => [entry.id, entry]));
	return slugs.map((slug) => byId.get(slug)).filter((entry): entry is WritingEntry => entry != null);
}

export async function getFeaturedWriting(limit = 4) {
	const entries = await getPublishedWriting();
	return entries.filter((entry) => entry.data.featured).slice(0, limit);
}

export async function getPublishedReadingPaths() {
	return getCollection('readingPaths');
}

export async function getReadingPathBySlug(slug: string) {
	const paths = await getPublishedReadingPaths();
	return paths.find((path) => path.id === slug || path.data.slug === slug);
}

export async function getWritingForPath(path: ReadingPathEntry) {
	const published = await getPublishedWriting();
	const byId = new Map(published.map((entry) => [entry.id, entry]));
	return path.data.essays.map((slug) => byId.get(slug)).filter((entry): entry is WritingEntry => entry != null);
}

export function getAllThemes(writing: WritingEntry[], paths: ReadingPathEntry[]) {
	const themes = new Set<string>();
	for (const entry of writing) {
		for (const theme of entry.data.themes) {
			themes.add(theme);
		}
	}
	for (const path of paths) {
		for (const theme of path.data.themes) {
			themes.add(theme);
		}
	}
	return [...themes].sort();
}

export function getWritingByTheme(writing: WritingEntry[], theme: string) {
	return writing.filter((entry) => entry.data.themes.includes(theme));
}

function sortProjectsByDate(entries: ProjectEntry[]) {
	return [...entries].sort((a, b) => {
		const aDate = a.data.pubDate?.valueOf() ?? 0;
		const bDate = b.data.pubDate?.valueOf() ?? 0;
		return bDate - aDate;
	});
}

export async function getPublishedProjects(
	category?: 'technical' | 'making' | 'digital-illustration',
) {
	const entries = await getCollection('projects');
	return sortProjectsByDate(
		entries
			.filter((entry) => !entry.data.draft)
			.filter((entry) => !category || entry.data.category === category),
	);
}

export async function getFeaturedProjects(
	limit = 3,
	category?: 'technical' | 'making' | 'digital-illustration',
) {
	const entries = await getPublishedProjects(category);
	return entries.filter((entry) => entry.data.featured).slice(0, limit);
}

export function technicalUrl(slug: string) {
	return `/speaking-and-writing/${slug}`;
}

export function technicalIndexUrl() {
	return '/speaking-and-writing';
}

export function getTechnicalCardMeta(entry: TechnicalEntry) {
	const { venue, host, pubDate } = entry.data;
	const place = venue ?? host;
	return place ? `${place} · ${formatMonthYear(pubDate)}` : formatMonthYear(pubDate);
}

export type TechnicalType = TechnicalEntry['data']['type'];

export function technicalTypeLabel(type: TechnicalType) {
	switch (type) {
		case 'blog':
			return 'Blog';
		case 'talk':
			return 'Talk';
		case 'podcast':
			return 'Podcast';
	}
}

export function getTechnicalPreviewAlt(entry: TechnicalEntry) {
	const { title, type } = entry.data;
	switch (type) {
		case 'talk':
			return `Slide preview for the talk “${title}”`;
		case 'podcast':
			return `Cover image for the podcast episode “${title}”`;
		default:
			return `Cover image for “${title}”`;
	}
}

export function getTechnicalPreviewCaption(entry: TechnicalEntry) {
	switch (entry.data.type) {
		case 'talk':
			return 'Slide preview';
		case 'podcast':
			return 'Episode artwork';
		default:
			return 'Cover image';
	}
}

export function getTechnicalActionsLabel(type: TechnicalType) {
	switch (type) {
		case 'talk':
			return 'Watch and resource links';
		case 'podcast':
			return 'Listen and resource links';
		default:
			return 'Article links';
	}
}

export function externalLinkLabel(entry: TechnicalEntry) {
	const { type, externalUrl, republished } = entry.data;
	if (!externalUrl) return 'Learn more';
	if (republished || externalUrl.includes('web.archive.org')) {
		return 'View archived original';
	}
	if (type === 'podcast') return 'Listen to episode';
	if (type === 'talk') {
		if (externalUrl.includes('noti.st')) return 'View slides';
		if (externalUrl.includes('github.com')) return 'View on GitHub';
		if (externalUrl.includes('slides.com')) return 'View slides';
		if (externalUrl.includes('youtube.com') || externalUrl.includes('youtu.be')) {
			return 'Watch talk';
		}
		return 'View talk';
	}
	return 'Read article';
}

export type TechnicalLink = { href: string; label: string };

export function getTechnicalLinks(entry: TechnicalEntry): TechnicalLink[] {
	const links: TechnicalLink[] = [];
	const { recordingUrl, resources } = entry.data;

	if (recordingUrl) {
		links.push({ href: recordingUrl, label: 'Watch recording' });
	}

	for (const resource of resources) {
		links.push({ href: resource.url, label: resource.label });
	}

	return links;
}

export async function getPublishedTechnical() {
	const entries = await getCollection('technical');
	return entries
		.filter((entry) => !entry.data.draft)
		.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/** Original posts written for this site, as opposed to republished/external work. */
export function isOriginalPost(entry: TechnicalEntry) {
	return entry.data.type === 'blog' && !entry.data.republished && !entry.data.externalUrl;
}

export async function getRecentOriginalPosts(limit = 4) {
	const entries = await getPublishedTechnical();
	return entries.filter(isOriginalPost).slice(0, limit);
}

export async function getTechnicalBySlug(slug: string) {
	const entries = await getPublishedTechnical();
	return entries.find((entry) => entry.id === slug);
}

export async function resolveRelatedTechnical(slugs: string[]) {
	const published = await getPublishedTechnical();
	const byId = new Map(published.map((entry) => [entry.id, entry]));
	return slugs.map((slug) => byId.get(slug)).filter((entry): entry is TechnicalEntry => entry != null);
}

export async function getFeaturedTechnical(limit = 3) {
	const entries = await getPublishedTechnical();
	return entries.filter((entry) => entry.data.featured).slice(0, limit);
}

export function getTechnicalMeta(entry: TechnicalEntry) {
	const { venue, host, pubDate } = entry.data;
	const date = formatDate(pubDate);
	const place = venue ?? host;
	return place ? `${place} · ${date}` : date;
}

/* ---------------------------------------------------------------- Reading */

export type ReadingEntry = CollectionEntry<'reading'>;
export type ReadingStatus = ReadingEntry['data']['status'];

export function readingUrl(slug: string) {
	return `/reading/${slug}`;
}

export const readingIndexUrl = '/reading';

/** The date a finished or abandoned book left the stack, else when it was started. */
function readingSortDate(entry: ReadingEntry) {
	return (entry.data.finishedOn ?? entry.data.startedOn)?.valueOf() ?? 0;
}

export async function getPublishedReading() {
	const entries = await getCollection('reading');
	return entries
		.filter((entry) => !entry.data.draft)
		.sort((a, b) => readingSortDate(b) - readingSortDate(a));
}

export function getReadingByStatus(entries: ReadingEntry[], status: ReadingStatus) {
	const matching = entries.filter((entry) => entry.data.status === status);
	if (status !== 'reading') return matching;
	// Books in progress sort by when they were picked up, most recent first.
	return [...matching].sort(
		(a, b) => (b.data.startedOn?.valueOf() ?? 0) - (a.data.startedOn?.valueOf() ?? 0),
	);
}

export async function getCurrentlyReading(limit?: number) {
	const entries = getReadingByStatus(await getPublishedReading(), 'reading');
	return limit ? entries.slice(0, limit) : entries;
}

export async function getReadingBySlug(slug: string) {
	const entries = await getPublishedReading();
	return entries.find((entry) => entry.id === slug);
}

/** True when the entry has a write-up below the frontmatter. */
export function hasWriteUp(entry: ReadingEntry) {
	return (entry.body ?? '').trim().length > 0;
}

/** First paragraph of the write-up with Markdown markers stripped, for list views. */
export function readingExcerpt(entry: ReadingEntry, maxLength = 200) {
	const body = (entry.body ?? '').trim();
	if (!body) return undefined;
	const firstParagraph = body
		.split(/\n\s*\n/)
		.map((block) => block.trim())
		.find((block) => block && !block.startsWith('import ') && !block.startsWith('<'));
	if (!firstParagraph) return undefined;
	const plain = firstParagraph
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/[*_`>#]+/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	return truncateExcerpt(plain, maxLength);
}

export function openLibraryUrl(entry: ReadingEntry) {
	const { openLibraryId, isbn } = entry.data;
	if (openLibraryId?.endsWith('W')) return `https://openlibrary.org/works/${openLibraryId}`;
	if (openLibraryId?.endsWith('M')) return `https://openlibrary.org/books/${openLibraryId}`;
	if (isbn) return `https://openlibrary.org/isbn/${isbn}`;
	return undefined;
}

/** "Finished March 2026", "Reading since Nov 2026", "Set aside Jan 2026". */
export function readingStatusLabel(entry: ReadingEntry) {
	const { status, startedOn, finishedOn } = entry.data;
	switch (status) {
		case 'reading':
			return startedOn ? `Reading since ${formatMonthYear(startedOn)}` : 'Currently reading';
		case 'finished':
			return finishedOn ? `Finished ${formatMonthYear(finishedOn)}` : 'Finished';
		case 'abandoned':
			return finishedOn ? `Set aside ${formatMonthYear(finishedOn)}` : 'Set aside';
	}
}

/** The date shown on list rows: when the book left the stack, else when it was started. */
export function readingDisplayDate(entry: ReadingEntry) {
	return entry.data.finishedOn ?? entry.data.startedOn;
}

export function readingFormatLabel(format: NonNullable<ReadingEntry['data']['format']>) {
	switch (format) {
		case 'print':
			return 'Print';
		case 'ebook':
			return 'Ebook';
		case 'audiobook':
			return 'Audiobook';
	}
}

export const resumeUrl = '/resume';

export type WritingEntry = CollectionEntry<'writing'>;
export type ReadingPathEntry = CollectionEntry<'readingPaths'>;
export type ProjectEntry = CollectionEntry<'projects'>;

/** Projects without a featuredImage fall back to the site's default illustration. */
export function projectImage(entry: ProjectEntry) {
	return entry.data.featuredImage ?? defaultProjectImage;
}
export type TechnicalEntry = CollectionEntry<'technical'>;
export type Influence = WritingEntry['data']['influences'][number];
