#!/usr/bin/env node
/**
 * Import Substack posts into src/content/writing as MDX.
 *
 * Two sources, same output:
 *
 *   1. Official export (best — includes paid + draft posts, no scraping):
 *        Substack → Settings → Exports → "Create new export", unzip it, then
 *        node scripts/import-substack.mjs --export ~/Downloads/substack-export
 *
 *   2. Public JSON API (good for a handful of free posts):
 *        node scripts/import-substack.mjs dark-places a-team-not-a-family
 *        node scripts/import-substack.mjs https://beccabailey.substack.com/p/dark-places
 *
 * Common flags:
 *   --path <slug>      add a readingPaths entry (repeatable)
 *   --theme <name>     add a themes entry (repeatable)
 *   --only <slug,...>  with --export, import just these slugs
 *   --publication <s>  publication subdomain (default: beccabailey)
 *   --no-images        skip downloading images
 *   --force            overwrite an essay directory that already exists
 *   --dry-run          print what would be written, write nothing
 *
 * Imported essays are written with `draft: true` so nothing goes live before
 * you have read the converted markdown. Flip it once the prose looks right.
 */

import { mkdir, readdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const WRITING_DIR = path.join(process.cwd(), 'src/content/writing');

// ---------------------------------------------------------------- arg parsing

function parseArgs(argv) {
	const opts = {
		slugs: [],
		readingPaths: [],
		themes: [],
		only: null,
		exportDir: null,
		publication: 'beccabailey',
		images: true,
		force: false,
		dryRun: false,
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case '--export':
				opts.exportDir = argv[++i];
				break;
			case '--path':
				opts.readingPaths.push(argv[++i]);
				break;
			case '--theme':
				opts.themes.push(argv[++i]);
				break;
			case '--only':
				opts.only = new Set(argv[++i].split(',').map((s) => s.trim()));
				break;
			case '--publication':
				opts.publication = argv[++i];
				break;
			case '--no-images':
				opts.images = false;
				break;
			case '--force':
				opts.force = true;
				break;
			case '--dry-run':
				opts.dryRun = true;
				break;
			default:
				if (arg.startsWith('--')) throw new Error(`Unknown flag: ${arg}`);
				opts.slugs.push(arg);
		}
	}

	return opts;
}

/** Accepts a bare slug or a full post URL. */
function toSlug(input) {
	if (!input.includes('://')) return input.replace(/^\/+|\/+$/g, '');
	const { pathname } = new URL(input);
	const match = pathname.match(/\/p\/([^/]+)/);
	if (!match) throw new Error(`Could not find a post slug in ${input}`);
	return match[1];
}

// ------------------------------------------------------------- html -> markdown

const VOID_TAGS = new Set([
	'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
	'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

const ENTITIES = {
	amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
	mdash: '—', ndash: '–', hellip: '…',
	lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
};

function decodeEntities(text) {
	return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body) => {
		if (body[0] === '#') {
			const code =
				body[1] === 'x' || body[1] === 'X'
					? Number.parseInt(body.slice(2), 16)
					: Number.parseInt(body.slice(1), 10);
			return Number.isFinite(code) ? String.fromCodePoint(code) : match;
		}
		return ENTITIES[body] ?? match;
	});
}

/**
 * Minimal HTML parser. Substack's body HTML is machine-generated and regular,
 * so a tokenizer plus an open-element stack is enough — no dependency needed.
 */
function parseHtml(html) {
	const root = { tag: '#root', attrs: {}, children: [] };
	const stack = [root];
	const tagPattern = /<(\/)?([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;

	let cursor = 0;
	let match;

	const pushText = (raw) => {
		if (!raw) return;
		stack[stack.length - 1].children.push({ type: 'text', value: decodeEntities(raw) });
	};

	while ((match = tagPattern.exec(html)) != null) {
		const [full, closing, rawTag, rawAttrs, selfClosing] = match;
		pushText(html.slice(cursor, match.index));
		cursor = match.index + full.length;

		const tag = rawTag.toLowerCase();

		// Skip script/style bodies wholesale.
		if (!closing && (tag === 'script' || tag === 'style')) {
			const end = html.toLowerCase().indexOf(`</${tag}>`, cursor);
			cursor = end === -1 ? html.length : end + tag.length + 3;
			tagPattern.lastIndex = cursor;
			continue;
		}

		if (closing) {
			// Unwind to the matching open tag, tolerating unclosed elements.
			const index = stack.findLastIndex((node) => node.tag === tag);
			if (index > 0) stack.length = index;
			continue;
		}

		const node = { type: 'element', tag, attrs: parseAttrs(rawAttrs), children: [] };
		stack[stack.length - 1].children.push(node);
		if (!selfClosing && !VOID_TAGS.has(tag)) stack.push(node);
	}

	pushText(html.slice(cursor));
	return root;
}

function parseAttrs(raw) {
	const attrs = {};
	const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
	let match;
	while ((match = pattern.exec(raw)) != null) {
		attrs[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
	}
	return attrs;
}

/** Escape the characters that would otherwise be read as markdown syntax. */
function escapeInline(text) {
	return text.replace(/([\\`*_[\]<>])/g, '\\$1');
}

function collapse(text) {
	return text.replace(/\s+/g, ' ');
}

const BLOCK_TAGS = new Set([
	'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
	'blockquote', 'pre', 'hr', 'figure', 'figcaption', 'table',
]);

/** Render a node's children as inline markdown. */
function renderInline(node, images) {
	let out = '';
	for (const child of node.children) {
		if (child.type === 'text') {
			out += escapeInline(collapse(child.value));
			continue;
		}
		switch (child.tag) {
			case 'br':
				out += '\n';
				break;
			case 'strong':
			case 'b':
				out += wrap(renderInline(child, images), '**');
				break;
			case 'em':
			case 'i':
				out += wrap(renderInline(child, images), '_');
				break;
			case 'code':
				out += `\`${textContent(child)}\``;
				break;
			case 'a': {
				const label = renderInline(child, images);
				const href = child.attrs.href;
				out += href && label.trim() ? `[${label}](${href})` : label;
				break;
			}
			case 'img': {
				const src = child.attrs.src;
				if (src) {
					const alt = escapeInline(child.attrs.alt ?? '');
					out += `![${alt}](${images.register(src)})`;
				}
				break;
			}
			default:
				out += BLOCK_TAGS.has(child.tag)
					? renderBlocks(child, images)
					: renderInline(child, images);
		}
	}
	return out;
}

/** Apply emphasis without swallowing the surrounding whitespace. */
function wrap(text, marker) {
	const match = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
	if (!match || !match[2]) return text;
	return `${match[1]}${marker}${match[2]}${marker}${match[3]}`;
}

function textContent(node) {
	if (node.type === 'text') return node.value;
	return node.children.map(textContent).join('');
}

function renderBlocks(node, images, depth = 0) {
	const blocks = [];
	let inlineRun = '';

	const flush = () => {
		const text = inlineRun.replace(/[ \t]+\n/g, '\n').trim();
		if (text) blocks.push(text);
		inlineRun = '';
	};

	for (const child of node.children) {
		if (child.type === 'text') {
			inlineRun += escapeInline(collapse(child.value));
			continue;
		}

		if (!BLOCK_TAGS.has(child.tag)) {
			inlineRun += renderInline({ children: [child] }, images);
			continue;
		}

		flush();

		switch (child.tag) {
			case 'h1':
			case 'h2':
			case 'h3':
			case 'h4':
			case 'h5':
			case 'h6': {
				// Demote by one: the essay title is already the page's h1.
				const level = Math.min(Number(child.tag[1]) + 1, 6);
				const text = renderInline(child, images).trim();
				if (text) blocks.push(`${'#'.repeat(level)} ${text}`);
				break;
			}
			case 'hr':
				blocks.push('---');
				break;
			case 'blockquote': {
				const inner = renderBlocks(child, images, depth);
				if (inner.trim()) {
					blocks.push(
						inner
							.split('\n')
							.map((line) => (line ? `> ${line}` : '>'))
							.join('\n'),
					);
				}
				break;
			}
			case 'pre':
				blocks.push(`\`\`\`\n${textContent(child).replace(/\n+$/, '')}\n\`\`\``);
				break;
			case 'ul':
			case 'ol': {
				const ordered = child.tag === 'ol';
				const items = child.children.filter((c) => c.type === 'element' && c.tag === 'li');
				const lines = items.map((item, index) => {
					const marker = ordered ? `${index + 1}. ` : '- ';
					const body = renderBlocks(item, images, depth + 1).trim();
					const indent = ' '.repeat(marker.length);
					return marker + body.split('\n').join(`\n${indent}`);
				});
				if (lines.length) blocks.push(lines.join('\n'));
				break;
			}
			case 'figure': {
				const img = findFirst(child, 'img');
				const caption = findFirst(child, 'figcaption');
				const src = img?.attrs.src;
				if (src) {
					const alt = escapeInline(img.attrs.alt || (caption ? textContent(caption).trim() : ''));
					const captionText = caption ? collapse(textContent(caption)).trim() : '';
					const title = captionText ? ` "${captionText.replace(/"/g, "'")}"` : '';
					blocks.push(`![${alt}](${images.register(src)}${title})`);
				}
				break;
			}
			case 'figcaption':
				break;
			default: {
				const inner = renderBlocks(child, images, depth);
				if (inner.trim()) blocks.push(inner);
			}
		}
	}

	flush();
	return blocks.join('\n\n');
}

function findFirst(node, tag) {
	for (const child of node.children ?? []) {
		if (child.type !== 'element') continue;
		if (child.tag === tag) return child;
		const nested = findFirst(child, tag);
		if (nested) return nested;
	}
	return null;
}

// ------------------------------------------------------------------- images

/**
 * Collects image URLs as the converter walks the tree and hands back the local
 * filename each one will be written to, so the markdown can reference `./name.png`.
 */
function createImageCollector(enabled) {
	const byUrl = new Map();
	const usedNames = new Set();

	return {
		register(rawSrc) {
			if (!enabled) return rawSrc;
			if (byUrl.has(rawSrc)) return `./${byUrl.get(rawSrc)}`;

			// Substack wraps originals in a resize proxy: .../fetch/w_1456,.../<encoded original>
			let src = rawSrc;
			const proxied = src.match(/https%3A%2F%2F\S+$/);
			if (proxied) src = decodeURIComponent(proxied[0]);

			let base;
			try {
				base = path.basename(new URL(src).pathname) || 'image';
			} catch {
				return rawSrc;
			}
			base = base.replace(/[^a-zA-Z0-9._-]/g, '-');
			if (!/\.(png|jpe?g|gif|webp|avif|svg)$/i.test(base)) base += '.png';

			let name = base;
			let n = 2;
			while (usedNames.has(name)) {
				const ext = path.extname(base);
				name = `${path.basename(base, ext)}-${n++}${ext}`;
			}
			usedNames.add(name);
			byUrl.set(rawSrc, name);
			return `./${name}`;
		},
		entries() {
			return [...byUrl.entries()].map(([url, name]) => ({ url, name }));
		},
	};
}

async function downloadImages(collector, dir, dryRun) {
	for (const { url, name } of collector.entries()) {
		const target = path.join(dir, name);
		if (dryRun) {
			console.log(`      would download ${name}`);
			continue;
		}
		try {
			const response = await fetch(url);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			await writeFile(target, Buffer.from(await response.arrayBuffer()));
			console.log(`      saved ${name}`);
		} catch (error) {
			console.warn(`      could not download ${url}: ${error.message}`);
		}
	}
}

// -------------------------------------------------------------- frontmatter

function yamlString(value) {
	return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function isoDate(value) {
	const date = new Date(value);
	if (Number.isNaN(date.valueOf())) return null;
	return date.toISOString().slice(0, 10);
}

function buildFrontmatter(post, opts) {
	const lines = [`title: ${yamlString(post.title)}`];
	if (post.subtitle) lines.push(`subtitle: ${yamlString(post.subtitle)}`);
	lines.push(`description: ${yamlString(post.description || post.subtitle || post.title)}`);
	lines.push(`originalDate: ${post.date}`);
	lines.push('status: original');
	if (post.url) lines.push(`substackUrl: ${yamlString(post.url)}`);

	const list = (key, values) => {
		if (!values.length) return;
		lines.push(`${key}:`);
		for (const value of values) lines.push(`  - ${value}`);
	};

	list('readingPaths', opts.readingPaths);
	list('themes', opts.themes);

	lines.push('influences: []');
	lines.push('related: []');
	lines.push('featured: false');
	// Imports land as drafts on purpose — read the converted prose before publishing.
	lines.push('draft: true');

	return `---\n${lines.join('\n')}\n---\n`;
}

// ------------------------------------------------------------------ sources

async function fetchPost(slug, publication) {
	const endpoint = `https://${publication}.substack.com/api/v1/posts/by-slug/${slug}`;
	const headers = { accept: 'application/json' };
	// Paid posts need a logged-in session cookie; export SUBSTACK_SID to supply one.
	if (process.env.SUBSTACK_SID) headers.cookie = `substack.sid=${process.env.SUBSTACK_SID}`;

	const response = await fetch(endpoint, { headers });
	if (!response.ok) throw new Error(`${endpoint} responded ${response.status}`);

	const { post } = await response.json();
	if (!post) throw new Error(`No post payload for "${slug}"`);
	if (!post.body_html) {
		throw new Error(
			`"${slug}" came back without body_html (paywalled?). Use --export, or set SUBSTACK_SID.`,
		);
	}

	return {
		slug: post.slug ?? slug,
		title: post.title ?? slug,
		subtitle: post.subtitle ?? '',
		description: post.description ?? '',
		date: isoDate(post.post_date) ?? isoDate(Date.now()),
		url: post.canonical_url ?? `https://${publication}.substack.com/p/${post.slug ?? slug}`,
		html: post.body_html,
	};
}

/** Split a CSV row, honouring quoted fields and doubled quotes. */
function splitCsvRow(row) {
	const cells = [];
	let cell = '';
	let quoted = false;
	for (let i = 0; i < row.length; i++) {
		const char = row[i];
		if (quoted) {
			if (char === '"') {
				if (row[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
			} else cell += char;
		} else if (char === '"') quoted = true;
		else if (char === ',') { cells.push(cell); cell = ''; }
		else cell += char;
	}
	cells.push(cell);
	return cells;
}

function parseCsv(text) {
	const rows = [];
	let row = '';
	let quoted = false;
	for (const char of text) {
		if (char === '"') quoted = !quoted;
		if (char === '\n' && !quoted) { rows.push(row); row = ''; continue; }
		if (char !== '\r' || quoted) row += char;
	}
	if (row.trim()) rows.push(row);

	const header = splitCsvRow(rows.shift() ?? '').map((h) => h.trim());
	return rows
		.filter((r) => r.trim())
		.map((r) => Object.fromEntries(splitCsvRow(r).map((cell, i) => [header[i], cell])));
}

async function readExport(dir, publication) {
	const csv = parseCsv(await readFile(path.join(dir, 'posts.csv'), 'utf8'));
	const files = await readdir(path.join(dir, 'posts'));
	const posts = [];

	for (const row of csv) {
		if (row.is_published && row.is_published.toLowerCase() === 'false') continue;

		// Export filenames are "<post_id>.<slug>.html".
		const file = files.find((f) => f.startsWith(`${row.post_id}.`) && f.endsWith('.html'));
		if (!file) {
			console.warn(`  skipping "${row.title}" — no HTML file for post_id ${row.post_id}`);
			continue;
		}

		const slug = file.slice(String(row.post_id).length + 1, -'.html'.length);
		posts.push({
			slug,
			title: row.title ?? slug,
			subtitle: row.subtitle ?? '',
			description: row.subtitle ?? '',
			date: isoDate(row.post_date) ?? isoDate(Date.now()),
			url: `https://${publication}.substack.com/p/${slug}`,
			html: await readFile(path.join(dir, 'posts', file), 'utf8'),
		});
	}

	return posts;
}

// --------------------------------------------------------------------- main

async function exists(target) {
	try {
		await access(target);
		return true;
	} catch {
		return false;
	}
}

async function writePost(post, opts) {
	const dir = path.join(WRITING_DIR, post.slug);

	if ((await exists(dir)) && !opts.force) {
		console.log(`  ${post.slug}: already exists, skipping (use --force to overwrite)`);
		return false;
	}

	const images = createImageCollector(opts.images);
	const body = renderBlocks(parseHtml(post.html), images);
	const mdx = `${buildFrontmatter(post, opts)}\n${body}\n`;

	console.log(`  ${post.slug}: ${body.length} chars, ${images.entries().length} image(s)`);

	if (opts.dryRun) {
		console.log(`      would write src/content/writing/${post.slug}/index.mdx`);
	} else {
		await mkdir(dir, { recursive: true });
		await writeFile(path.join(dir, 'index.mdx'), mdx, 'utf8');
	}

	if (opts.images) await downloadImages(images, dir, opts.dryRun);
	return true;
}

async function main() {
	const opts = parseArgs(process.argv.slice(2));

	let posts;
	if (opts.exportDir) {
		posts = await readExport(opts.exportDir, opts.publication);
		if (opts.only) posts = posts.filter((post) => opts.only.has(post.slug));
	} else if (opts.slugs.length) {
		posts = [];
		for (const input of opts.slugs) {
			const slug = toSlug(input);
			try {
				posts.push(await fetchPost(slug, opts.publication));
			} catch (error) {
				console.warn(`  ${slug}: ${error.message}`);
			}
		}
	} else {
		console.error('Nothing to import. Pass post slugs/URLs, or --export <dir>.');
		console.error('See the comment at the top of this file for examples.');
		process.exitCode = 1;
		return;
	}

	if (!posts.length) {
		console.error('No posts resolved.');
		process.exitCode = 1;
		return;
	}

	console.log(`Importing ${posts.length} post(s):`);
	let written = 0;
	for (const post of posts) {
		if (await writePost(post, opts)) written++;
	}

	console.log(
		`\nDone — ${written} essay(s) ${opts.dryRun ? 'previewed' : 'written'}. ` +
			'They are marked draft: true; read the markdown, then flip the flag to publish.',
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
