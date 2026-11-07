---
name: import-substack
description: Import essays from Becca's Substack (Performance Anxiety, beccabailey.substack.com) into src/content/writing. Use when she says "import my latest Substack post", names a post or URL to pull in, or asks to sync Substack. Wraps scripts/import-substack.mjs, then does the editorial pass (frontmatter, reading paths, themes) with her before publishing.
---

# Import a Substack essay

`scripts/import-substack.mjs` converts a Substack post into MDX under `src/content/writing/<slug>/index.mdx`, downloads its images next to it, and marks it `draft: true`. Nothing goes live until the prose has been read and the flag flipped. The scheduled workflow in `.github/workflows/sync-substack.yml` does the same thing weekly as a pull request; this skill is the on-demand, conversational version.

## Steps

1. **Find the post.**

   ```bash
   node scripts/import-substack.mjs --list
   ```

   This prints archive slugs not yet in `src/content/writing`. "Latest" means the first slug listed. If Becca named a post or pasted a URL, use that slug or URL directly and skip the list.

2. **Import it.**

   ```bash
   node scripts/import-substack.mjs <slug-or-url>
   ```

   Report which source the body came from (JSON API, RSS, or the public page) and any images it could not fetch. If the post is paid and the body cannot be read, say that `SUBSTACK_SID` (the `substack.sid` cookie) unlocks it and stop there rather than guessing.

3. **Editorial pass.** Open the new `index.mdx` and read the whole thing. Look for conversion artifacts: stray HTML, broken `<EssayFigure>` imports, missing captions, lists that lost their numbering, pull quotes rendered as paragraphs. Fix what is clearly mechanical. Then propose frontmatter by comparing the essay with existing ones:

   - `readingPaths`: slugs from `src/content/reading-paths`
   - `themes`: the vocabulary already in use (work, labor, gender, burnout, community, resilience, language, power)
   - `related`: two or three essay slugs that genuinely connect
   - `influences`: books, papers or articles the essay leans on, in the shared `{ title, author, year, type, url }` shape
   - `featured`: leave `false` unless she asks

   Show the proposed frontmatter block and wait for a yes or edits before writing it.

4. **Check the build:** `npm run build`. MDX that will not compile shows up here.

5. **Publish or hold.** Ask one question: publish now, or keep it as a draft for review?
   - Publish: set `draft: false`, commit `Import "Title" from Substack`, push to `main`. Netlify deploys on push.
   - Hold: leave `draft: true`, commit on a branch named `substack-<slug>`, push it, and say the essay will not appear until the flag is flipped.

## Notes

- Substack's archive API refuses datacenter IPs; the script falls back to the RSS feed, which only carries recent free posts. For a full backfill use `--export <dir>` with an official Substack export.
- `--dry-run` shows what would be written without touching the repo. `--force` overwrites an existing essay directory; do not use it without being asked.
