# becca.is

Astro 6 static site, Tailwind v4, deployed by Netlify on every push to `main`. Pushing is publishing.

## Where things live

- `src/content.config.ts` defines the collections. Entries are `src/content/<collection>/<slug>/index.md(x)`.
  - `writing`: essays, mostly imported from Substack (Performance Anxiety).
  - `reading`: one file per book. Frontmatter is the log (`status`, `startedOn`, `finishedOn`); the body is an optional conversational write-up. No ratings.
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
- Open Library lookups (`openlibrary.org`, `covers.openlibrary.org`) and Substack fetches need those hosts allowed in the Claude Code cloud environment. Without them the scripts still write entries, just without catalog ids or images.
