import { getCollection, type CollectionEntry } from 'astro:content';

export function projectUrl(slug: string) {
	return `/making-things/${slug}`;
}

export function projectIndexUrl() {
	return '/making-things';
}

export function formatDate(date: Date) {
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
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

export async function getFeaturedWriting(limit = 3) {
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

export async function getFeaturedProjects(limit = 3) {
	const entries = await getPublishedProjects();
	return entries.filter((entry) => entry.data.featured).slice(0, limit);
}

export function technicalUrl(slug: string) {
	return `/speaking-and-writing/${slug}`;
}

export function technicalIndexUrl() {
	return '/speaking-and-writing';
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

export type WritingEntry = CollectionEntry<'writing'>;
export type ReadingPathEntry = CollectionEntry<'readingPaths'>;
export type ProjectEntry = CollectionEntry<'projects'>;
export type TechnicalEntry = CollectionEntry<'technical'>;
export type EssayStatus = WritingEntry['data']['status'];
export type Influence = WritingEntry['data']['influences'][number];
