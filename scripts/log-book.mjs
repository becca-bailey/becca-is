#!/usr/bin/env node
/**
 * Log a book in src/content/reading.
 *
 *   node scripts/log-book.mjs reading   --title "Searches" --author "Vauhini Vara"
 *   node scripts/log-book.mjs finished  --title "Searches" [--date 2026-12-01]
 *   node scripts/log-book.mjs abandoned --title "Searches"
 *   node scripts/log-book.mjs reading   --isbn 9780593701171
 *
 * The first run for a title creates src/content/reading/<slug>/index.md with
 * the book's Open Library ids and an empty body. Later runs for the same slug
 * update status and dates and leave the body (the write-up) alone, so you can
 * start a book, finish it months later, and add notes whenever you like.
 *
 * Book metadata comes from Open Library's search API, with Google Books as a
 * keyless fallback for new releases Open Library has not catalogued yet. When
 * the network is unavailable the entry is still written with title, author and
 * status, and a warning says what to fill in later. Logging never blocks on a
 * lookup.
 *
 * Flags:
 *   --title <text>      book title (required unless --isbn or the slug exists)
 *   --author <text>     author, improves the match
 *   --isbn <digits>     look up by ISBN instead of title/author
 *   --date <YYYY-MM-DD> startedOn (reading) or finishedOn (finished/abandoned); default today
 *   --format <print|ebook|audiobook>
 *   --theme <name>      add a themes entry (repeatable)
 *   --related <slug>    add a related essay slug (repeatable)
 *   --pick <n>          choose the nth search candidate (1-based) instead of the first
 *   --slug <slug>       override the directory name
 *   --private           keep the entry in the log but off the site (sets private: true)
 *   --public            clear a previous --private
 *   --list              print search candidates and stop
 *   --dry-run           print the frontmatter that would be written, write nothing
 *
 * Environment:
 *   OPENLIBRARY_BASE    alternate Open Library base URL (tests point this at a local server)
 *   GOOGLE_BOOKS_BASE   alternate Google Books base URL
 *   GOOGLE_BOOKS_API_KEY optional key; keyless requests from shared IPs are often rate-limited
 *   NODE_USE_ENV_PROXY  set to 1 so fetch honours HTTPS_PROXY (the npm alias does this)
 */

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const CONTENT_DIR = path.resolve('src/content/reading');
const STATUSES = new Set(['reading', 'finished', 'abandoned']);
const FORMATS = new Set(['print', 'ebook', 'audiobook']);
const USER_AGENT = 'becca.is log-book (https://becca.is)';
const SEARCH_FIELDS = 'key,title,author_name,isbn,cover_i,cover_edition_key,first_publish_year';
/** Override for tests; the real API lives at https://openlibrary.org. */
const OPENLIBRARY_BASE = process.env.OPENLIBRARY_BASE ?? 'https://openlibrary.org';
const GOOGLE_BOOKS_BASE = process.env.GOOGLE_BOOKS_BASE ?? 'https://www.googleapis.com/books/v1';

function usage(message) {
	if (message) console.error(`Error: ${message}\n`);
	console.error(
		'Usage: node scripts/log-book.mjs <reading|finished|abandoned> --title "…" [--author "…"] [--isbn …] [--date YYYY-MM-DD]',
	);
	process.exit(message ? 1 : 0);
}

function parseArgs(argv) {
	const opts = {
		status: undefined,
		title: undefined,
		author: undefined,
		isbn: undefined,
		date: undefined,
		format: undefined,
		themes: [],
		related: [],
		pick: 1,
		slug: undefined,
		private: undefined,
		list: false,
		dryRun: false,
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		const next = () => {
			const value = argv[++i];
			if (value === undefined) usage(`${arg} needs a value`);
			return value;
		};
		switch (arg) {
			case '--title':
				opts.title = next();
				break;
			case '--author':
				opts.author = next();
				break;
			case '--isbn':
				opts.isbn = next().replace(/[-\s]/g, '');
				break;
			case '--date': {
				const value = next();
				if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) usage(`--date must be YYYY-MM-DD, got "${value}"`);
				opts.date = value;
				break;
			}
			case '--format': {
				const value = next();
				if (!FORMATS.has(value)) usage(`--format must be print, ebook or audiobook`);
				opts.format = value;
				break;
			}
			case '--theme':
				opts.themes.push(next());
				break;
			case '--related':
				opts.related.push(next());
				break;
			case '--pick': {
				const value = Number(next());
				if (!Number.isInteger(value) || value < 1) usage('--pick needs a positive integer');
				opts.pick = value;
				break;
			}
			case '--slug':
				opts.slug = next();
				break;
			case '--private':
				opts.private = true;
				break;
			case '--public':
				opts.private = false;
				break;
			case '--list':
				opts.list = true;
				break;
			case '--dry-run':
				opts.dryRun = true;
				break;
			case '--help':
			case '-h':
				usage();
				break;
			default:
				if (arg.startsWith('--')) usage(`unknown flag ${arg}`);
				if (opts.status) usage(`unexpected argument "${arg}"`);
				if (!STATUSES.has(arg)) usage(`status must be reading, finished or abandoned, got "${arg}"`);
				opts.status = arg;
		}
	}
	if (!opts.status) usage('missing status');
	if (!opts.title && !opts.isbn && !opts.slug) usage('pass --title, --isbn or --slug');
	return opts;
}

function slugify(text) {
	return text
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/['’]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

function today() {
	return new Date().toISOString().slice(0, 10);
}

async function fetchJson(url) {
	const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
	if (!response.ok) throw new Error(`${response.status} ${response.statusText} from ${url}`);
	return response.json();
}

function pickIsbn13(isbns = []) {
	return isbns.find((value) => /^\d{13}$/.test(value)) ?? isbns.find((value) => /^\d{9}[\dX]$/.test(value));
}

/** Normalise an Open Library search doc into the fields the frontmatter needs. */
function fromSearchDoc(doc) {
	return {
		title: doc.title,
		author: Array.isArray(doc.author_name) ? doc.author_name.join(', ') : undefined,
		openLibraryId: typeof doc.key === 'string' ? doc.key.replace('/works/', '') : undefined,
		openLibraryCoverId: doc.cover_i,
		isbn: pickIsbn13(doc.isbn),
		year: doc.first_publish_year,
	};
}

async function searchByTitle(title, author) {
	// Field search first (precise), then the general query, which tolerates
	// articles and subtitles that the title field matches literally.
	const exact = new URLSearchParams({ title, fields: SEARCH_FIELDS, limit: '5' });
	if (author) exact.set('author', author);
	let data = await fetchJson(`${OPENLIBRARY_BASE}/search.json?${exact}`);
	if (!data.docs?.length) {
		const fuzzy = new URLSearchParams({ q: [title, author].filter(Boolean).join(' '), fields: SEARCH_FIELDS, limit: '5' });
		data = await fetchJson(`${OPENLIBRARY_BASE}/search.json?${fuzzy}`);
	}
	return (data.docs ?? []).map(fromSearchDoc);
}

async function searchByIsbn(isbn) {
	const params = new URLSearchParams({ isbn, fields: SEARCH_FIELDS, limit: '5' });
	const data = await fetchJson(`${OPENLIBRARY_BASE}/search.json?${params}`);
	const docs = (data.docs ?? []).map(fromSearchDoc);
	// Keep the ISBN that was asked for, whatever edition the search surfaced.
	return docs.map((doc) => ({ ...doc, isbn }));
}

/** Google Books volume → the same shape as a search doc. No Open Library ids, so no cover. */
function fromVolume(volume) {
	const info = volume.volumeInfo ?? {};
	const ids = info.industryIdentifiers ?? [];
	const isbn13 = ids.find((id) => id.type === 'ISBN_13')?.identifier;
	const isbn10 = ids.find((id) => id.type === 'ISBN_10')?.identifier;
	return {
		title: info.title,
		author: Array.isArray(info.authors) ? info.authors.join(', ') : undefined,
		isbn: isbn13 ?? isbn10,
		year: info.publishedDate ? Number(String(info.publishedDate).slice(0, 4)) : undefined,
		source: 'Google Books',
	};
}

async function searchGoogleBooks({ title, author, isbn }) {
	const q = isbn ? `isbn:${isbn}` : [title && `intitle:${title}`, author && `inauthor:${author}`].filter(Boolean).join(' ');
	const params = new URLSearchParams({ q, maxResults: '5', printType: 'books' });
	// A free API key lifts the strict keyless quota that shared IPs (CI, cloud sessions) hit.
	if (process.env.GOOGLE_BOOKS_API_KEY) params.set('key', process.env.GOOGLE_BOOKS_API_KEY);
	const data = await fetchJson(`${GOOGLE_BOOKS_BASE}/volumes?${params}`);
	return (data.items ?? []).map(fromVolume).filter((candidate) => candidate.title);
}

function printCandidates(candidates) {
	candidates.forEach((candidate, index) => {
		const bits = [candidate.author, candidate.year, candidate.isbn && `ISBN ${candidate.isbn}`, candidate.source].filter(Boolean);
		console.log(`  ${index + 1}. ${candidate.title}${bits.length ? ` — ${bits.join(', ')}` : ''}`);
	});
}

async function lookup(opts) {
	try {
		let candidates = opts.isbn ? await searchByIsbn(opts.isbn) : await searchByTitle(opts.title, opts.author);
		if (candidates.length === 0) {
			console.warn('Open Library has no record of this book; trying Google Books for the ISBN.');
			candidates = await searchGoogleBooks(opts).catch((error) => {
				console.warn(`Google Books lookup failed (${error.message}).`);
				return [];
			});
		}
		if (candidates.length === 0) {
			console.warn('Nothing found; writing the entry without catalog ids.');
			return null;
		}
		if (opts.list || candidates.length > 1) {
			console.log('Open Library candidates:');
			printCandidates(candidates);
		}
		if (opts.list) return null;
		const chosen = candidates[opts.pick - 1];
		if (!chosen) usage(`--pick ${opts.pick} is out of range (${candidates.length} candidates)`);
		console.log(`Using: ${chosen.title}${chosen.author ? ` by ${chosen.author}` : ''}`);
		return chosen;
	} catch (error) {
		console.warn(`Open Library lookup failed (${error.message}); writing the entry without catalog ids.`);
		return null;
	}
}

/* ------------------------------------------------------------- frontmatter */

function yamlString(value) {
	return JSON.stringify(String(value));
}

function serialize(front) {
	const lines = ['---'];
	const push = (key, value) => {
		if (value === undefined || value === null || value === '') return;
		lines.push(`${key}: ${value}`);
	};
	push('title', yamlString(front.title));
	push('author', yamlString(front.author));
	push('isbn', front.isbn && yamlString(front.isbn));
	push('openLibraryId', front.openLibraryId);
	push('openLibraryCoverId', front.openLibraryCoverId);
	push('status', front.status);
	push('startedOn', front.startedOn);
	push('finishedOn', front.finishedOn);
	push('format', front.format);
	if (front.private === true || front.private === 'true') lines.push('private: true');
	if (front.themes?.length) {
		lines.push('themes:');
		for (const theme of front.themes) lines.push(`  - ${theme}`);
	}
	if (front.related?.length) {
		lines.push('related:');
		for (const slug of front.related) lines.push(`  - ${slug}`);
	}
	lines.push('---');
	return lines.join('\n');
}

/** Minimal YAML reader for the flat frontmatter this script writes. */
function parse(source) {
	const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
	if (!match) throw new Error('could not find frontmatter');
	const front = { themes: [], related: [] };
	let listKey = null;
	for (const raw of match[1].split(/\r?\n/)) {
		const item = raw.match(/^\s+-\s+(.*)$/);
		if (item && listKey) {
			front[listKey].push(item[1].trim());
			continue;
		}
		const pair = raw.match(/^([A-Za-z]+):\s*(.*)$/);
		if (!pair) continue;
		const [, key, rawValue] = pair;
		if (rawValue === '') {
			listKey = key;
			front[key] = front[key] ?? [];
			continue;
		}
		listKey = null;
		let value = rawValue.trim();
		if (/^".*"$/.test(value)) value = JSON.parse(value);
		else if (/^'.*'$/.test(value)) value = value.slice(1, -1);
		front[key] = value;
	}
	if (front.openLibraryCoverId) front.openLibraryCoverId = Number(front.openLibraryCoverId);
	return { front, body: match[2] };
}

async function findExisting(slug, title) {
	const dirs = await readdir(CONTENT_DIR, { withFileTypes: true }).catch(() => []);
	const wanted = slug ?? (title ? slugify(title) : undefined);
	for (const dir of dirs) {
		if (!dir.isDirectory()) continue;
		const file = path.join(CONTENT_DIR, dir.name, 'index.md');
		const source = await readFile(file, 'utf8').catch(() => null);
		if (!source) continue;
		if (dir.name === wanted) return { dir: dir.name, file, ...parse(source) };
		if (title && !slug) {
			const parsed = parse(source);
			if (parsed.front.title?.toLowerCase() === title.toLowerCase()) return { dir: dir.name, file, ...parsed };
		}
	}
	return null;
}

function applyStatus(front, status, date) {
	front.status = status;
	if (status === 'reading') {
		front.startedOn = front.startedOn ?? date;
		delete front.finishedOn;
	} else {
		front.finishedOn = date;
	}
	return front;
}

async function main() {
	const opts = parseArgs(process.argv.slice(2));
	const date = opts.date ?? today();

	// --list only inspects Open Library; it never touches the content directory.
	if (opts.list) {
		await lookup(opts);
		return;
	}

	const existing = await findExisting(opts.slug, opts.title);
	if (existing) {
		const front = applyStatus(existing.front, opts.status, date);
		if (opts.format) front.format = opts.format;
		if (opts.private !== undefined) front.private = opts.private;
		for (const theme of opts.themes) if (!front.themes.includes(theme)) front.themes.push(theme);
		for (const slug of opts.related) if (!front.related.includes(slug)) front.related.push(slug);
		const output = `${serialize(front)}\n${existing.body}`;
		if (opts.dryRun) {
			console.log(`Would update ${path.relative(process.cwd(), existing.file)}:\n${serialize(front)}`);
			return;
		}
		await writeFile(existing.file, output);
		console.log(`Updated ${path.relative(process.cwd(), existing.file)} → ${opts.status}${front.private === true ? ' (private)' : ''}`);
		return;
	}

	const found = await lookup(opts);
	const title = opts.title ?? found?.title;
	if (!title) usage('could not determine a title; pass --title');
	const author = opts.author ?? found?.author ?? 'Unknown';
	if (!opts.author && !found?.author) console.warn('No author found; set `author` in the frontmatter.');

	const front = applyStatus(
		{
			title,
			author,
			isbn: opts.isbn ?? found?.isbn,
			openLibraryId: found?.openLibraryId,
			openLibraryCoverId: found?.openLibraryCoverId,
			format: opts.format,
			private: opts.private,
			themes: opts.themes,
			related: opts.related,
		},
		opts.status,
		date,
	);

	const dirName = opts.slug ?? slugify(title);
	const dir = path.join(CONTENT_DIR, dirName);
	const file = path.join(dir, 'index.md');
	const output = `${serialize(front)}\n`;

	if (opts.dryRun) {
		console.log(`Would write ${path.relative(process.cwd(), file)}:\n${output}`);
		return;
	}
	await mkdir(dir, { recursive: true });
	await writeFile(file, output, { flag: 'wx' });
	console.log(`Wrote ${path.relative(process.cwd(), file)} (${opts.status}${opts.private ? ', private' : ''})`);
	if (!found?.openLibraryCoverId && !found?.isbn) console.log('Add `isbn` or `openLibraryCoverId` later to pull in the cover.');
	else if (!found.openLibraryCoverId) console.log('Open Library may not have a cover for this ISBN yet; drop a `cover.jpg` next to index.md and set `cover: ./cover.jpg` if the tile shows.');
	console.log('Add your notes below the frontmatter whenever you like.');
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
