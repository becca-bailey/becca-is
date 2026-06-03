import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

function contentId(entry: string) {
	const withoutExt = entry.replace(/\.mdx?$/, '');
	return withoutExt.endsWith('/index') ? withoutExt.slice(0, -'/index'.length) : withoutExt;
}

const essayStatus = z.enum(['original', 'revised', 'expanded', 'archive']);

const influence = z.object({
	title: z.string(),
	author: z.string().optional(),
	year: z.coerce.number().optional(),
	type: z.enum(['book', 'paper', 'article', 'essay', 'talk']).optional(),
	url: z.string().url().optional(),
});

const writing = defineCollection({
	loader: glob({
		pattern: '**/*.{md,mdx}',
		base: 'src/content/writing',
		generateId: ({ entry }) => contentId(entry),
	}),
	schema: z.object({
		title: z.string(),
		subtitle: z.string().optional(),
		description: z.string(),
		originalDate: z.coerce.date(),
		revisedDate: z.coerce.date().optional(),
		status: essayStatus.default('original'),
		substackUrl: z.string().url().optional(),
		readingPaths: z.array(z.string()).optional().default([]),
		themes: z.array(z.string()).optional().default([]),
		influences: z.array(influence).optional().default([]),
		related: z.array(z.string()).optional().default([]),
		featured: z.boolean().optional().default(false),
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
			description: z.string(),
			category: z.enum(['technical', 'making', 'digital-illustration']),
			medium: z.string(),
			featuredImage: image(),
			pubDate: z.coerce.date().optional(),
			featured: z.boolean().optional().default(false),
			draft: z.boolean().optional().default(false),
		}),
});

const technicalResource = z.object({
	url: z.string().url(),
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
				externalUrl: z.string().url().optional(),
				recordingUrl: z.string().url().optional(),
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
				if (data.type === 'talk' || data.type === 'podcast') {
					if (!data.externalUrl) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message: `${data.type} entries require externalUrl`,
							path: ['externalUrl'],
						});
					}
				}
			}),
});

export const collections = { writing, readingPaths, projects, technical };
