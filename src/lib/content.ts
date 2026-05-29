import { getCollection, type CollectionEntry } from 'astro:content';

export function projectUrl(category: 'technical' | 'making', slug: string) {
	return category === 'technical' ? `/working/${slug}` : `/making-things/${slug}`;
}

export function projectIndexUrl(category: 'technical' | 'making') {
	return category === 'technical' ? '/working' : '/making-things';
}

export function formatDate(date: Date) {
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

export async function getPublishedWriting() {
	const entries = await getCollection('writing');
	return entries
		.filter((entry) => !entry.data.draft)
		.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getFeaturedWriting(limit = 3) {
	const entries = await getPublishedWriting();
	return entries.filter((entry) => entry.data.featured).slice(0, limit);
}

export async function getPublishedProjects(category?: 'technical' | 'making') {
	const entries = await getCollection('projects');
	return entries
		.filter((entry) => !entry.data.draft)
		.filter((entry) => !category || entry.data.category === category)
		.sort((a, b) => {
			const aDate = a.data.pubDate?.valueOf() ?? 0;
			const bDate = b.data.pubDate?.valueOf() ?? 0;
			return bDate - aDate;
		});
}

export type WritingEntry = CollectionEntry<'writing'>;
export type ProjectEntry = CollectionEntry<'projects'>;
