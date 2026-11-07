---
name: log-book
description: Log reading on becca.is. Use whenever Becca says she started, finished, gave up on, or set aside a book ("I started reading Searches by Vauhini Vara", "finished The Human Condition", "I'm giving up on …", "log a book"), or asks to add notes about a book she has read. Runs scripts/log-book.mjs, checks the build, commits and pushes so Netlify republishes.
---

# Log a book

Books live one per directory in `src/content/reading/<slug>/index.md`. The frontmatter is the log (status and dates); the body is Becca's conversational write-up and is optional. There are no star ratings and there never will be.

## Steps

1. **Parse the sentence.** Work out `status` (`reading` for started/picking up, `finished`, `abandoned` for gave up/set aside/DNF), the title, and the author if given. Optional: a date ("last week" → an ISO date), a format (audiobook, ebook, print), and whether it is **private** ("privately", "just for me", "don't post this", "off the record", "keep this one quiet"). Only ask a question if the title is genuinely ambiguous.

2. **Run the script** from the repo root:

   ```bash
   npm run log-book -- reading --title "Searches" --author "Vauhini Vara"
   npm run log-book -- finished --title "Searches"
   npm run log-book -- abandoned --title "Searches" --date 2026-11-03
   npm run log-book -- finished --title "Fifty Shades of Grey" --private
   ```

   - If the title already exists under `src/content/reading`, the script updates status and dates and leaves the body untouched. That is the normal path for "finished".
   - For a new book it searches Open Library and prints candidates when there is more than one. If the chosen candidate's author or year looks wrong, rerun with `--pick N`, or `--isbn` when Becca gave one.
   - If the lookup fails because the network is blocked, the entry is still written without catalog ids. Say so in one line; the cover can be filled in later.
   - Open Library does not have every new release. The script falls back to Google Books for the ISBN, but keyless Google requests are often rate-limited from cloud IPs. When nothing is found, write the entry anyway; the page shows a typographic tile until an `isbn`, `openLibraryCoverId` or local `cover` is added.
   - In a cloud session the build check always shows the fallback tile (cover images redirect to archive.org, which the sandbox cannot reach). That is expected; the Netlify build fetches real covers.

3. **Add notes if she offered any.** If the message includes thoughts about the book, write them below the frontmatter as short paragraphs in her voice (first person, conversational, no ratings, no "In conclusion"). Show the paragraph and wait for a yes before committing. Do not invent opinions she did not express.

4. **Check the build:** `npm run build` (this also runs `astro sync`, so schema mistakes surface here). Fix anything the schema rejects, such as a finished book without `finishedOn`.

5. **Commit and push to `main`.** Message format:

   - `Reading: started "Searches" by Vauhini Vara`
   - `Reading: finished "Searches"`
   - `Reading: set aside "Searches"`
   - `Reading: notes on "Searches"` when only the body changed

   Netlify deploys on every push to `main`, so pushing is publishing. Confirm with one line: what was logged and that the site will update in a couple of minutes.

## Private entries

`--private` writes `private: true`. The entry stays in `src/content/reading` with everything else (status, dates, notes) but is never rendered, listed, linked or counted on the site. `--public` on a later run clears it. Do not mention private books in commit messages beyond the slug, and do not reveal them in conversation summaries unless Becca brings them up.

One caveat to say once, the first time a private entry is made: the repository is the source of truth, so a private entry is as private as the repository. If the GitHub repository is public, anyone who browses it can read the file; the flag only keeps it off becca.is.

## Notes

- `related` takes essay slugs from `src/content/writing`; `themes` uses the same words essays use (work, labor, gender, burnout, community, resilience, language, power). Add them when they obviously fit; otherwise leave them out.
- Themes and related essays can also be added with `--theme` and `--related` flags.
- A local cover image can replace the Open Library one: drop `cover.jpg` in the book's directory and set `cover: ./cover.jpg`.
