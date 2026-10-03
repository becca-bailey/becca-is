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
 *   3. Discovery — walk the archive and import everything not already here.
 *      This is what the scheduled sync workflow runs, so new posts arrive as a
 *      pull request instead of a copy-paste:
 *        node scripts/import-substack.mjs --all
 *
 *      To see what discovery would pick up without fetching or writing
 *      anything, list the available slugs instead (npm run import:list):
 *        node scripts/import-substack.mjs --list
 *
 *      Discovery tries the archive API first and falls back to the public RSS
 *      feed when that is refused — Cloudflare answers 403 to /api/v1/* from
 *      datacenter IPs such as CI runners. The feed only carries recent free
 *      posts, so --export remains the way to backfill a whole archive.
 *
 *      Each post's body is resolved independently, in this order: the per-post
 *      JSON API, the RSS feed, then the post's own public page. Substack has
 *      been seen serving an HTML page from the JSON endpoint, which is why the
 *      fallbacks exist; the run reports which source each body came from, and
 *      a post whose body cannot be read is skipped without failing the rest.
 *
 * Environment:
 *   SUBSTACK_SID         substack.sid cookie, for paid posts
 *   SUBSTACK_USER_AGENT  override the default User-Agent, if Cloudflare still
 *                        refuses the request
 *
 * Common flags:
 *   --all              import every archive post missing from src/content/writing
 *   --list             print the slugs --all (or --export) would import, then stop
 *   --since <date>     with --all, ignore posts published before this date
 *   --limit <n>        with --all, stop after scanning n archive entries
 *   --path <slug>      add a readingPaths entry (repeatable)
 *   --theme <name>     add a themes entry (repeatable)
 *   --only <slug,...>  with --export or --all, import just these slugs
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
		all: false,
		list: false,
		since: null,
		limit: 200,
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
			case '--all':
				opts.all = true;
				break;
			case '--list':
				opts.list = true;
				break;
			case '--since': {
				const value = argv[++i];
				if (!isoDate(value)) throw new Error(`--since needs a parseable date, got "${value}"`);
				opts.since = isoDate(value);
				break;
			}
			case '--limit': {
				const value = Number(argv[++i]);
				if (!Number.isInteger(value) || value < 1) {
					throw new Error('--limit needs a positive integer');
				}
				opts.limit = value;
				break;
			}
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

/**
 * Escape the characters that would otherwise be read as markdown syntax — plus
 * the braces MDX would compile as a JSX expression, which turns prose like
 * "the set {x}" into a build-time ReferenceError.
 */
function escapeInline(text) {
	return text.replace(/([\\`*_[\]<>{}])/g, '\\$1');
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

/** How far to shift headings so the post's highest one renders as h2. Set per post. */
let headingOffset = -1;

function topHeadingLevel(node) {
	let top = 7;
	for (const child of node.children ?? []) {
		if (child.type !== 'element') continue;
		const match = child.tag.match(/^h([1-6])$/);
		if (match) top = Math.min(top, Number(match[1]));
		top = Math.min(top, topHeadingLevel(child));
	}
	return top;
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
				// The essay title is the page's h1, so the post's top heading level
				// becomes h2 and the rest keep their relative depth.
				const level = Math.min(Number(child.tag[1]) - headingOffset, 6);
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
				if (src) blocks.push(renderFigure(img, caption, images));
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

/**
 * A downloaded image becomes an <EssayFigure>. Its alt text is for screen
 * readers only; the Substack caption (often a photo credit) goes in the slot
 * and is the visible caption. Remote images can't be imported, so they stay
 * plain markdown.
 */
function renderFigure(img, caption, images) {
	const captionText = caption ? collapse(textContent(caption)).trim() : '';
	const alt = collapse(img.attrs.alt || captionText).trim();
	const ref = images.register(img.attrs.src);
	const name = images.importName(ref);

	if (!name) {
		const title = captionText ? ` "${captionText.replace(/"/g, "'")}"` : '';
		return `![${escapeInline(alt)}](${ref}${title})`;
	}

	const credit = caption ? renderInline(caption, images).trim() : '';
	const open = `<EssayFigure src={${name}} alt={${JSON.stringify(alt)}}`;
	return credit ? `${open}>\n\n${credit}\n\n</EssayFigure>` : `${open} />`;
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
	const importNames = new Map();

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
		/** The MDX import identifier for a local `./name`, or null for a remote URL. */
		importName(ref) {
			if (!ref.startsWith('./')) return null;
			if (!importNames.has(ref)) importNames.set(ref, `image${importNames.size + 1}`);
			return importNames.get(ref);
		},
		/** Import lines for every figure rendered, to sit between frontmatter and body. */
		imports() {
			if (!importNames.size) return [];
			return [
				'import EssayFigure from "@/components/writing/EssayFigure.astro";',
				...[...importNames].map(([ref, name]) => `import ${name} from "${ref}";`),
			];
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
			const response = await request(url, 'image/*');
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

// Node's fetch sends no User-Agent at all, and Substack sits behind Cloudflare,
// which refuses anonymous-looking clients with a 403. Identify the importer
// honestly instead of impersonating a browser; override with
// SUBSTACK_USER_AGENT if Cloudflare still turns the request away.
const USER_AGENT =
	process.env.SUBSTACK_USER_AGENT ??
	'becca-is-importer/1.0 (+https://github.com/becca-bailey/becca-is)';

async function request(url, accept) {
	const headers = { accept, 'user-agent': USER_AGENT, 'accept-language': 'en-US,en;q=0.9' };
	// Paid posts need a logged-in session cookie; export SUBSTACK_SID to supply one.
	if (process.env.SUBSTACK_SID) headers.cookie = `substack.sid=${process.env.SUBSTACK_SID}`;

	const response = await fetch(url, { headers });
	if (!response.ok) throw new Error(`${url} responded ${response.status}`);
	return response;
}

/**
 * A JSON endpoint that answers with a page is a moved or filtered endpoint,
 * not a parse problem. Say that, rather than surfacing "Unexpected token '<'".
 */
async function readJson(response, url) {
	const text = await response.text();
	const type = response.headers?.get?.('content-type') ?? '';
	if (/^\s*</.test(text) || (type && !/json/i.test(type))) {
		throw new Error(`${url} answered with HTML, not JSON (endpoint moved or filtered)`);
	}
	return JSON.parse(text);
}

async function fetchPostFromApi(slug, publication) {
	const endpoint = `https://${publication}.substack.com/api/v1/posts/by-slug/${slug}`;
	const response = await request(endpoint, 'application/json');

	const { post } = await readJson(response, endpoint);
	if (!post) throw new Error(`no post payload for "${slug}"`);
	if (!post.body_html) throw new Error('response carried no body_html (paywalled?)');

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

/** First element carrying `className`, by depth-first walk. */
function findByClass(node, className) {
	for (const child of node.children ?? []) {
		if (child.type !== 'element') continue;
		if ((child.attrs.class ?? '').split(/\s+/).includes(className)) return child;
		const nested = findByClass(child, className);
		if (nested) return nested;
	}
	return null;
}

function metaContent(root, names) {
	const walk = (node) => {
		for (const child of node.children ?? []) {
			if (child.type !== 'element') continue;
			if (child.tag === 'meta') {
				const key = child.attrs.property ?? child.attrs.name;
				if (key && names.includes(key) && child.attrs.content) return child.attrs.content;
			}
			const nested = walk(child);
			if (nested) return nested;
		}
		return null;
	};
	return walk(root);
}

/**
 * Last resort: read the post's own public page. The article lives in
 * .available-content (free posts) or .markup, and the og: tags carry enough
 * metadata to stand alone when the archive listing is not available either.
 */
async function fetchBodyFromPage(slug, publication) {
	const url = `https://${publication}.substack.com/p/${slug}`;
	const response = await request(url, 'text/html');
	const root = parseHtml(await response.text());

	const node = findByClass(root, 'available-content') ?? findByClass(root, 'markup');
	if (!node) throw new Error('no .available-content or .markup block on the page');

	return {
		node,
		meta: {
			title: metaContent(root, ['og:title', 'twitter:title']),
			description: metaContent(root, ['og:description', 'description']),
			date: isoDate(metaContent(root, ['article:published_time']) ?? ''),
		},
	};
}

let feedCache = null;

/** The feed is fetched at most once per run and reused as a body source. */
async function feedEntries(publication) {
	if (!feedCache) {
		feedCache = listFeed(publication, {}).catch((error) => {
			console.warn(`  RSS feed unavailable: ${error.message}`);
			return [];
		});
	}
	return feedCache;
}

/**
 * Resolve one post to something writable. The JSON API comes first because it
 * is the cleanest source, but it is also the one most likely to be filtered or
 * moved, so two public fallbacks follow: the RSS feed, then the post page.
 * Metadata already gathered from the archive listing always wins, since that
 * request is the one most likely to have succeeded.
 */
async function fetchPost(slug, publication, known = {}) {
	const attempts = [];

	try {
		const post = await fetchPostFromApi(slug, publication);
		return { ...post, ...stripEmpty(known), source: 'API' };
	} catch (error) {
		attempts.push(`API — ${error.message}`);
	}

	const fromFeed = (await feedEntries(publication)).find((item) => item.slug === slug);
	if (fromFeed?.html) {
		return { ...fromFeed, ...stripEmpty(known), source: 'RSS feed' };
	}
	attempts.push('RSS feed — post not in the feed');

	try {
		const { node, meta } = await fetchBodyFromPage(slug, publication);
		return {
			slug,
			title: known.title || meta.title || slug,
			subtitle: known.subtitle || '',
			description: known.description || meta.description || '',
			date: known.date || meta.date || isoDate(Date.now()),
			url: known.url || `https://${publication}.substack.com/p/${slug}`,
			node,
			source: 'post page',
		};
	} catch (error) {
		attempts.push(`post page — ${error.message}`);
	}

	throw new Error(`could not read the body.\n      ${attempts.join('\n      ')}`);
}

function stripEmpty(object) {
	return Object.fromEntries(Object.entries(object).filter(([, value]) => value));
}


/**
 * Walk the public archive newest-first and return one entry per post. The
 * archive listing carries metadata but no body, so each slug still goes
 * through fetchPost — this only answers "what is published?".
 */
async function listArchive(publication, { limit, since }) {
	const pageSize = 50;
	const entries = [];

	for (let offset = 0; offset < limit; offset += pageSize) {
		const endpoint =
			`https://${publication}.substack.com/api/v1/archive` +
			`?sort=new&limit=${Math.min(pageSize, limit - offset)}&offset=${offset}`;

		const response = await request(endpoint, 'application/json');

		const page = await readJson(response, endpoint);
		if (!Array.isArray(page) || !page.length) break;

		for (const post of page) {
			if (!post.slug) continue;
			const date = isoDate(post.post_date);
			// The archive is newest-first, so the first post older than --since
			// means every remaining post is older too.
			if (since && date && date < since) return entries;
			entries.push({
				slug: post.slug,
				title: post.title ?? post.slug,
				subtitle: post.subtitle ?? '',
				description: post.description ?? '',
				date,
				url: post.canonical_url ?? '',
			});
		}

		if (page.length < pageSize) break;
	}

	return entries;
}

// -------------------------------------------------------------------- rss

function stripCdata(value) {
	const match = value.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
	return match ? match[1] : decodeEntities(value);
}

/** Read one child element's text. RSS is machine-generated, so this is enough. */
function tagValue(xml, tag) {
	const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
	return match ? stripCdata(match[1]).trim() : '';
}

/**
 * Read the publication's RSS feed. Unlike the archive API this is a documented,
 * feed-reader-facing endpoint, so it survives bot filtering that rejects
 * /api/v1/* — and it carries each post's body in content:encoded, so entries
 * come back complete and need no follow-up request.
 *
 * The trade-off: a feed only holds the most recent posts (and free ones), so
 * it backfills recent history, not an entire archive. Use --export for that.
 */
async function listFeed(publication, { since }) {
	const response = await request(`https://${publication}.substack.com/feed`, 'application/rss+xml');
	const xml = await response.text();

	const entries = [];
	for (const [item] of xml.matchAll(/<item\b[\s\S]*?<\/item>/g)) {
		const link = tagValue(item, 'link');
		if (!link) continue;

		let slug;
		try {
			slug = toSlug(link);
		} catch {
			continue;
		}

		const date = isoDate(tagValue(item, 'pubDate'));
		if (since && date && date < since) continue;

		const html = tagValue(item, 'content:encoded');
		const title = tagValue(item, 'title') || slug;
		const description = tagValue(item, 'description');

		entries.push({
			slug,
			title,
			subtitle: '',
			description,
			date: date ?? isoDate(Date.now()),
			url: link,
			// A feed item occasionally omits the body (paywalled). Leaving html
			// unset sends the slug through fetchPost instead.
			html: html || undefined,
		});
	}

	return entries;
}

/**
 * Discovery, preferring the archive API for completeness and falling back to
 * the feed when it is refused — which is what a 403 from Cloudflare looks like
 * on a CI runner.
 */
async function discoverPosts(publication, opts) {
	try {
		return await listArchive(publication, opts);
	} catch (error) {
		console.warn(`  archive API unavailable: ${error.message}`);
		console.warn('  falling back to the public RSS feed');
		return await listFeed(publication, opts);
	}
}

/** Slugs already imported, so a sync run only fetches what is genuinely new. */
async function existingSlugs() {
	try {
		const dirents = await readdir(WRITING_DIR, { withFileTypes: true });
		return new Set(dirents.filter((d) => d.isDirectory()).map((d) => d.name));
	} catch {
		return new Set();
	}
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
	// A post read from the post page arrives already parsed.
	const root = post.node ?? parseHtml(post.html);
	const top = topHeadingLevel(root);
	headingOffset = top <= 6 ? top - 2 : 0;
	const body = renderBlocks(root, images);
	const imports = images.imports();
	const head = imports.length ? `${imports.join('\n')}\n\n` : '';
	const mdx = `${buildFrontmatter(post, opts)}\n${head}${body}\n`;

	console.log(
		`  ${post.slug}: ${body.length} chars, ${images.entries().length} image(s)` +
			(post.source ? ` — via ${post.source}` : ''),
	);

	if (opts.dryRun) {
		console.log(`      would write src/content/writing/${post.slug}/index.mdx`);
	} else {
		await mkdir(dir, { recursive: true });
		await writeFile(path.join(dir, 'index.mdx'), mdx, 'utf8');
	}

	if (opts.images) await downloadImages(images, dir, opts.dryRun);
	return true;
}

/** Print the posts not yet in src/content/writing, without fetching bodies or writing. */
async function listAvailable(opts) {
	const source = opts.exportDir
		? await readExport(opts.exportDir, opts.publication)
		: await discoverPosts(opts.publication, opts);
	const have = await existingSlugs();
	const available = source.filter(
		(entry) => !have.has(entry.slug) && (!opts.only || opts.only.has(entry.slug)),
	);

	console.log(
		`${source.length} post(s) found, ${source.length - available.length} already imported, ` +
			`${available.length} available:`,
	);
	for (const entry of available) {
		console.log(`  ${entry.slug}  ${entry.date ?? '          '}  ${entry.title}`);
	}
	if (available.length) {
		console.log('\nImport with: node scripts/import-substack.mjs <slug> [<slug> ...]');
	}
}

async function main() {
	const opts = parseArgs(process.argv.slice(2));

	if (opts.list) {
		await listAvailable(opts);
		return;
	}

	let posts;
	if (opts.exportDir) {
		posts = await readExport(opts.exportDir, opts.publication);
		if (opts.only) posts = posts.filter((post) => opts.only.has(post.slug));
	} else if (opts.all) {
		const archive = await discoverPosts(opts.publication, opts);
		const have = opts.force ? new Set() : await existingSlugs();
		const missing = archive.filter(
			(entry) => !have.has(entry.slug) && (!opts.only || opts.only.has(entry.slug)),
		);

		console.log(
			`Archive: ${archive.length} post(s), ${archive.length - missing.length} already imported.`,
		);
		if (!missing.length) {
			console.log('Nothing new to import.');
			return;
		}

		posts = [];
		for (const entry of missing) {
			// Feed entries already carry their body; archive entries do not.
			if (entry.html) {
				posts.push(entry);
				continue;
			}
			try {
				posts.push(await fetchPost(entry.slug, opts.publication, entry));
			} catch (error) {
				// A paywalled post has no public body — report it, keep going, and
				// let the rest of the sync succeed.
				console.warn(`  ${entry.slug}: ${error.message}`);
			}
		}
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
		console.error('Nothing to import. Pass post slugs/URLs, --all, or --export <dir>.');
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
