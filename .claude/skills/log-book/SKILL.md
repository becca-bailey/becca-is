---
name: log-book
description: Log reading on becca.is. Use whenever Becca says she started, finished, gave up on, or set aside a book ("I started reading Searches by Vauhini Vara", "finished The Human Condition", "I'm giving up on …", "log a book"), or asks to add notes about a book she has read. Runs scripts/log-book.mjs, checks the build, commits and pushes so Netlify republishes.
---

# Log a book

Books live one per directory in `src/content/reading/<slug>/index.md`. The frontmatter is the log (status and dates); the body is Becca's conversational write-up and is optional. There are no star ratings and there never will be.

## Steps

1. **Parse the sentence.** Work out `status` (`reading` for started/picking up, `finished`, `abandoned` for gave up/set aside/DNF), the title, and the author if given. Optional: a date ("last week" → an ISO date), a format (audiobook, ebook, print). Only ask a question if the title is genuinely ambiguous.

2. **Run the script** from the repo root:

   ```bash
   node scripts/log-book.mjs reading --title "Searches" --author "Vauhini Vara"
   node scripts/log-book.mjs finished --title "Searches"
   node scripts/log-book.mjs abandoned --title "Searches" --date 2026-11-03
   ```

   - If the title already exists under `src/content/reading`, the script updates status and dates and leaves the body untouched. That is the normal path for "finished".
   - For a new book it searches Open Library and prints candidates when there is more than one. If the chosen candidate's author or year looks wrong, rerun with `--pick N`, or `--isbn` when Becca gave one.
   - If the lookup fails because the network is blocked, the entry is still written without catalog ids. Say so in one line; the cover can be filled in later.

3. **Add notes if she offered any.** If the message includes thoughts about the book, write them below the frontmatter as short paragraphs in her voice (first person, conversational, no ratings, no "In conclusion"). Show the paragraph and wait for a yes before committing. Do not invent opinions she did not express.

4. **Check the build:** `npm run build` (this also runs `astro sync`, so schema mistakes surface here). Fix anything the schema rejects, such as a finished book without `finishedOn`.

5. **Commit and push to `main`.** Message format:

   - `Reading: started "Searches" by Vauhini Vara`
   - `Reading: finished "Searches"`
   - `Reading: set aside "Searches"`
   - `Reading: notes on "Searches"` when only the body changed

   Netlify deploys on every push to `main`, so pushing is publishing. Confirm with one line: what was logged and that the site will update in a couple of minutes.

## Notes

- `related` takes essay slugs from `src/content/writing`; `themes` uses the same words essays use (work, labor, gender, burnout, community, resilience, language, power). Add them when they obviously fit; otherwise leave them out.
- Themes and related essays can also be added with `--theme` and `--related` flags.
- A local cover image can replace the Open Library one: drop `cover.jpg` in the book's directory and set `cover: ./cover.jpg`.
