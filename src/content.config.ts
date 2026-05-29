import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

function contentId(entry: string) {
	const withoutExt = entry.replace(/\.mdx?$/, '');
	return withoutExt.endsWith('/index') ? withoutExt.slice(0, -'/index'.length) : withoutExt;
}

const writing = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		tags: z.array(z.string()).optional(),
		category: z.string().optional(),
		featured: z.boolean().optional().default(false),
		draft: z.boolean().optional().default(false),
	}),
});

const projects = defineCollection({
	loader: glob({
		pattern: '**/*.{md,mdx}',
		base: './src/content/projects',
		generateId: ({ entry }) => contentId(entry),
	}),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			category: z.enum(['technical', 'making']),
			featuredImage: image(),
			pubDate: z.coerce.date().optional(),
			draft: z.boolean().optional().default(false),
		}),
});

export const collections = { writing, projects };
