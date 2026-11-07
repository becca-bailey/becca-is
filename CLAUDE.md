# becca.is

Astro 6 static site, Tailwind v4, deployed by Netlify on every push to `main`. Pushing is publishing.

## Where things live

- `src/content.config.ts` defines the collections. Entries are `src/content/<collection>/<slug>/index.md(x)`.
  - `writing`: essays, mostly imported from Substack (Performance Anxiety).
  - `reading`: one file per book. Frontmatter is the log (`status`, `startedOn`, `finishedOn`); the body is an optional conversational write-up. No ratings. `private: true` keeps an entry in the log but off the site entirely.
  - `reading-paths`, `projects`, `technical`: see the schema file.
- Query helpers in `src/lib/content.ts`; site strings and links in `src/lib/site.ts`; header and footer navigation in `src/lib/navigation.ts`.
- Design tokens and shared classes in `src/styles/global.css`; conventions in `docs/design-system.md`.
- Research on syndication (POSSE, Bluesky, Threads) and reading-tracker alternatives in `docs/posse.md`.

## Skills

- `log-book` (`.claude/skills/log-book`): "I started reading X by Y" → `scripts/log-book.mjs` writes or updates the book entry, build, commit, push.
- `import-substack` (`.claude/skills/import-substack`): "import my latest Substack post" → `scripts/import-substack.mjs`, editorial pass, publish or hold.

## Working here

- `npm run build` before committing; it runs `astro sync` first so schema errors surface. `npx astro check` for types.
- Imports from Substack land as `draft: true`. Nothing is published until the prose has been read.
- Commit messages are short imperative sentences describing the content change ("Reading: finished \"Searches\"", "Import \"Right on Time\" from Substack").
- Use `npm run log-book -- …` and `npm run import -- …` rather than calling the scripts directly: the npm aliases set `NODE_USE_ENV_PROXY=1`, which Node's fetch needs to reach the network through the Claude Code cloud proxy. `npm run build` sets it as well; the flag is a no-op where there is no proxy. The `becca-is` cloud environment allows `openlibrary.org`, `covers.openlibrary.org`, `www.googleapis.com` and the Substack hosts. Cover images redirect through `archive.org` to per-server `ia…us.archive.org` hosts, which the environment cannot allow without a wildcard, so builds in cloud sessions show the fallback tile for every book; the Netlify build fetches the real covers. Google Books rate-limits keyless requests from shared IPs; a free `GOOGLE_BOOKS_API_KEY` lifts that. Without network access the scripts still write entries, just without catalog ids or images.
