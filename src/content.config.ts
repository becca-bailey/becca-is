import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

function contentId(entry: string) {
	const withoutExt = entry.replace(/\.mdx?$/, '');
	return withoutExt.endsWith('/index') ? withoutExt.slice(0, -'/index'.length) : withoutExt;
}

const influence = z.object({
	title: z.string(),
	author: z.string().optional(),
	year: z.coerce.number().optional(),
	type: z.enum(['book', 'paper', 'article', 'essay', 'talk']).optional(),
	url: z.url().optional(),
});

const writing = defineCollection({
	loader: glob({
		pattern: '**/*.{md,mdx}',
		base: 'src/content/writing',
		generateId: ({ entry }) => contentId(entry),
	}),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			subtitle: z.string().optional(),
			description: z.string(),
			originalDate: z.coerce.date(),
			revisedDate: z.coerce.date().optional(),
			substackUrl: z.url().optional(),
			readingPaths: z.array(z.string()).optional().default([]),
			themes: z.array(z.string()).optional().default([]),
			influences: z.array(influence).optional().default([]),
			related: z.array(z.string()).optional().default([]),
			featured: z.boolean().optional().default(false),
			/** Shown on the essay's card on /writing. Decorative there, so no alt text is needed. */
			featuredImage: image().optional(),
			draft: z.boolean().optional().default(false),
		}),
});

const readingPaths = defineCollection({
	loader: glob({
		pattern: '**/*.md',
		base: 'src/content/reading-paths',
		generateId: ({ entry }) => contentId(entry),
	}),
	schema: z.object({
		title: z.string(),
		slug: z.string(),
		description: z.string(),
		essays: z.array(z.string()).default([]),
		themes: z.array(z.string()).optional().default([]),
		externalReading: z.array(influence).optional().default([]),
	}),
});

const projects = defineCollection({
	loader: glob({
		pattern: '**/*.{md,mdx}',
		base: 'src/content/projects',
		generateId: ({ entry }) => contentId(entry),
	}),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			subtitle: z.string().optional(),
			description: z.string(),
			category: z.enum(['technical', 'making', 'digital-illustration']),
			medium: z.string(),
			featuredImage: image().optional(),
			pubDate: z.coerce.date().optional(),
			featured: z.boolean().optional().default(false),
			draft: z.boolean().optional().default(false),
		}),
});

const technicalResource = z.object({
	url: z.url(),
	label: z.string(),
});

const technicalType = z.enum(['blog', 'talk', 'podcast']);

const technical = defineCollection({
	loader: glob({
		pattern: '**/*.{md,mdx}',
		base: 'src/content/technical',
		generateId: ({ entry }) => contentId(entry),
	}),
	schema: ({ image }) =>
		z
			.object({
				type: technicalType,
				title: z.string(),
				pubDate: z.coerce.date(),
				summary: z.string(),
				description: z.string().optional(),
				externalUrl: z.url().optional(),
				recordingUrl: z.url().optional(),
				resources: z.array(technicalResource).optional().default([]),
				thumbnail: image().optional(),
				venue: z.string().optional(),
				host: z.string().optional(),
				republished: z.boolean().optional().default(false),
				featured: z.boolean().optional().default(false),
				draft: z.boolean().optional().default(false),
				related: z.array(z.string()).optional().default([]),
			})
			.superRefine((data, ctx) => {
				if (data.type === 'podcast' && !data.externalUrl) {
					ctx.addIssue({
						code: 'custom',
						message: 'podcast entries require externalUrl',
						path: ['externalUrl'],
					});
				}
			}),
});

const isbn = z
	.string()
	.transform((value) => value.replace(/[-\s]/g, ''))
	.pipe(z.string().regex(/^(?:\d{9}[\dX]|\d{13})$/, 'ISBN-10 or ISBN-13'));

/**
 * One entry per book. The body is the conversational write-up and may be
 * empty for a book still in progress. There is deliberately no rating field.
 */
const reading = defineCollection({
	loader: glob({
		pattern: '**/*.{md,mdx}',
		base: 'src/content/reading',
		generateId: ({ entry }) => contentId(entry),
	}),
	schema: ({ image }) =>
		z
			.object({
				title: z.string(),
				author: z.string(),
				isbn: isbn.optional(),
				/** Open Library work (OL…W) or edition (OL…M) id. */
				openLibraryId: z
					.string()
					.regex(/^OL\d+[WM]$/, 'Open Library work or edition id, e.g. OL12345W')
					.optional(),
				/** Open Library cover id (`cover_i` in search results). The most reliable cover key. */
				openLibraryCoverId: z.coerce.number().int().positive().optional(),
				status: z.enum(['reading', 'finished', 'abandoned']),
				startedOn: z.coerce.date().optional(),
				/** For `abandoned`, the date the book was set aside. */
				finishedOn: z.coerce.date().optional(),
				format: z.enum(['print', 'ebook', 'audiobook']).optional(),
				/** Local cover image; overrides the Open Library lookup. */
				cover: image().optional(),
				/** Essay slugs this book connects to. */
				related: z.array(z.string()).optional().default([]),
				/** Same vocabulary as essay themes. */
				themes: z.array(z.string()).optional().default([]),
				draft: z.boolean().optional().default(false),
				/** Kept in the log but never rendered, listed or linked on the site. */
				private: z.boolean().optional().default(false),
			})
			.superRefine((data, ctx) => {
				if (data.status === 'finished' && !data.finishedOn) {
					ctx.addIssue({
						code: 'custom',
						message: 'finished books need finishedOn',
						path: ['finishedOn'],
					});
				}
				if (data.status === 'reading' && data.finishedOn) {
					ctx.addIssue({
						code: 'custom',
						message: 'a book still being read cannot have finishedOn',
						path: ['finishedOn'],
					});
				}
			}),
});

export const collections = { writing, readingPaths, projects, technical, reading };
