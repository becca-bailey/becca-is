# Syndication research: POSSE, Bluesky, Threads, and reading trackers

Written November 2026 for becca.is. The question was how to post about reading without Goodreads, and how far posts on this site could be syndicated to Bluesky and Threads. The reading log shipped first (see `src/content/reading` and the `log-book` skill); this document records the rest of the research and the recommended next step.

Facts marked *reported* come from search snippets of pages that could not be fetched directly during the research session; verify before relying on them.

## 1. POSSE in one page

POSSE stands for Publish on your Own Site, Syndicate Elsewhere ([indieweb.org/POSSE](https://indieweb.org/POSSE)). The site is the canonical copy. Each copy on a social network links back to the original, and the original links out to its copies so readers and tools can find the conversation.

Markup conventions (microformats2):

- Each post is an `h-entry` with `p-name`, `e-content`, `dt-published`, `u-url`, and an author `h-card`.
- Each syndicated copy is linked from inside the `h-entry` with `class="u-syndication"` (optionally also `rel="syndication"`). Tools such as Brid.gy use these links to match replies on the network back to the post ([indieweb.org/syndication](https://indieweb.org/syndication), [rel-syndication](https://indieweb.org/rel-syndication)).
- `rel="me"` links between the site and the profiles confirm they belong to the same person ([indieweb.org/rel-me](https://indieweb.org/rel-me)). The footer now carries these for Bluesky, Threads, and GitHub.

Backfeed is the reverse direction: replies, likes, and reposts on the copy flow back to the original ([indieweb.org/backfeed](https://indieweb.org/backfeed)). For a static site that means [Brid.gy](https://brid.gy) polling the network and sending webmentions to [webmention.io](https://webmention.io), which the build then reads.

### What becca.is is missing today

- No RSS, Atom, or JSON feed. Every syndication tool starts from a feed.
- No `h-entry` or `h-card` markup. `EssayMeta.astro` has an "Also published on Substack" line but not as `u-syndication`.
- No `syndication` field in any frontmatter.

These are small additions: `@astrojs/rss` for the feed, a handful of classes in `EssayLayout.astro` and the book page, and an optional `syndication: [{ network, url }]` array on essays, books, and future notes.

## 2. Bluesky

Bluesky is the easier of the two networks. Options, roughly from least to most custom:

| Option | How it works | Cost | Notes |
| --- | --- | --- | --- |
| micro.blog as a hub | Point micro.blog at any RSS feed; it cross-posts new items to Bluesky, Threads, and Mastodon | $5/mo | Titled posts become title + link; long posts are truncated with a link back ([help.micro.blog](https://help.micro.blog/t/bluesky-cross-posting/1702)) |
| EchoFeed | Hosted RSS → Bluesky/Mastodon/webmention relay | free for 1 feed, ~$25/yr | Also sends webmentions, which Brid.gy Publish can consume ([echofeed.app](https://echofeed.app)) |
| GitHub Action | A scheduled workflow reads the feed and posts new items with an app password stored as a repo secret | free | [`joschi/blueskyfeedbot`](https://github.com/joschi/blueskyfeedbot), [`lwojcik/github-action-feed-to-social-media`](https://github.com/lwojcik/github-action-feed-to-social-media) |
| Brid.gy Publish | Send a webmention from the post to `https://brid.gy/publish/bluesky`; Brid.gy reads the `h-entry` and posts it, then backfeeds replies | free | Needs microformats and a webmention sender ([brid.gy/about](https://brid.gy/about)) |
| Direct AT Protocol | `com.atproto.server.createSession` with an app password, then `com.atproto.repo.createRecord` with an `app.bsky.feed.post` record | free | 300 graphemes; links need `facets` with **byte** offsets; link cards are an explicit `app.bsky.embed.external` embed with an uploaded thumbnail, nothing is scraped server-side ([docs.bsky.app](https://docs.bsky.app/docs/tutorials/creating-a-post)) |

Bluesky also publishes a text-only RSS feed per profile (`https://bsky.app/profile/<handle>/rss`). `@becca.is` is already a domain handle, which is Bluesky's version of "verify your website"; nothing more is needed on the site for that.

## 3. Threads

Threads has an official API but no ecosystem around it.

- **Threads API** (Meta Graph API): create a Meta developer app with the Threads use case, add yourself as a Threads Tester and accept in the app, grant `threads_basic` and `threads_content_publish`. Exchange the short-lived token for a 60-day long-lived one on `graph.threads.net`; refresh it with `refresh_access_token` before it expires, or it dies after 60 days unused. Publishing is two calls: `POST /{user-id}/threads` to create a container (`media_type=TEXT`, `text`, optional `link_attachment`), wait ~30 seconds, then `POST /{user-id}/threads_publish` with the `creation_id`. Limits: 500 characters, 250 API posts per rolling 24 hours, at most 5 links per post ([developers.facebook.com/docs/threads](https://developers.facebook.com/docs/threads)).
- **Third-party relays**: micro.blog cross-posts any RSS feed to Threads ([manton.org, Oct 2024](https://www.manton.org/2024/10/11/threads-crossposting-from.html)); Buffer and Zapier support Threads; EchoFeed listed Threads as "soon" (*reported*).
- **Fediverse**: Threads can federate top-level posts over ActivityPub when the account opts in, so a Mastodon or Bridgy Fed account can follow it. Replies from the fediverse appear in a beta section but Threads users cannot reply back, and Meta's own head of Threads has described the integration as in "maintenance mode" (*reported*, late 2025). Do not build on it.
- **Backfeed**: none off the shelf. Brid.gy does not support Threads. The API exposes `/replies` and `/conversation`, so a custom poller could fetch replies, but nothing exists to turn them into webmentions.

## 4. Recommended path: a "new post" Claude skill

Becca's preference is to publish by talking to Claude Code rather than through a third-party hub, the same way the `log-book` skill works. The shape of that next round:

1. **A `notes` collection** for short posts: optional `title`, `publishedAt`, body, and `syndication: [{ network: 'bluesky' | 'threads', url }]`. Rendered at `/notes/<slug>` with `h-entry` markup and `u-syndication` links. Essays and books get the same optional `syndication` field.
2. **Feeds** with `@astrojs/rss`: a site-wide feed (essays, notes, finished books with notes) and a notes-only feed. Add `<link rel="alternate">` to `Layout.astro`.
3. **`scripts/syndicate.mjs`**: given a note's URL and text, post to Bluesky (createSession + createRecord, link facet to the canonical URL, optional external embed) and to Threads (container + publish with `link_attachment`), then write the returned post URLs into the note's `syndication` frontmatter. Credentials come from environment variables injected by the Claude Code cloud environment's network secrets for `bsky.social` and `graph.threads.net`; they never live in the repo.
4. **The skill**: "new post: …" → write the note (trim to 300 graphemes for Bluesky if needed, or post a teaser plus link), build, commit, push, wait for Netlify so the canonical URL resolves, run `syndicate`, commit the syndication URLs. One sentence back: where it went.
5. **Later**: webmention.io + Brid.gy for Bluesky replies on the site. Nothing equivalent for Threads.

The Threads developer-app setup is the only fiddly part. If it proves too annoying, micro.blog at $5/month cross-posts the same feed to Bluesky and Threads with no code, and the site-side work above is identical either way.

## 5. Reading-tracker alternatives

The reading log is markdown in this repo, logged by telling Claude. If that ever feels like too much friction, these are the sources a build step could pull from instead. Entries key on ISBN and Open Library ids, so swapping the source later does not change the collection.

| Source | Phone app | Cost | Data without auth? | API stability | Fediverse / POSSE |
| --- | --- | --- | --- | --- | --- |
| micro.blog Bookshelves + Epilogue | iOS + Android | $5/mo | Yes: a shelf attached to a hosted page emits `index.json` (*reported*); full API needs a token | High (JSON Feed, stable since 2021) | Native ActivityPub plus Bluesky/Threads cross-posting |
| Hardcover | iOS + Android | free / $4.99 | No (token, expires yearly) | Medium: GraphQL marked "in flux", 60 req/min | None |
| Literal | iOS + Android | free | Yes: `booksByReadingStateAndProfile` with `DROPPED` status | Medium (small team) | None |
| BookWyrm | web; Android clients; no iOS | free | Yes: per-user RSS and ActivityPub JSON | High (open source) | Fully fediverse-native |
| StoryGraph | iOS + Android | free / Plus | No (CSV export only; API still "long-term" on the roadmap) | None | None |
| Oku | iOS + Android | free / unpriced premium | Yes: collection RSS, no dates | Low to medium | None |
| Goodreads | iOS + Android | free | Shelf RSS only, 100-item cap | API closed since 2020 | None |

micro.blog is what [flotisserie.cool](https://flotisserie.cool) uses: Epilogue logs the book, micro.blog posts "Finished reading: … 📚" and cross-posts it, and the hosted theme renders the shelves from micro.blog's bookshelf data (*reported*; the theme markup could not be fetched).

DIY alternatives that stay in the repo: a GitHub issue form parsed by an Action ([`issue-ops/parser`](https://github.com/issue-ops/parser)), an iOS Shortcut that POSTs a `repository_dispatch` event with a fine-grained token, or Working Copy / Obsidian Git editing markdown directly. All work; all are more setup than a sentence to Claude.

### Open Library notes for the build step

- Search: `https://openlibrary.org/search.json?title=…&author=…&fields=key,title,author_name,isbn,cover_i,first_publish_year` ([docs](https://openlibrary.org/dev/docs/api/search)). `cover_i` is the most reliable cover key.
- Covers: `https://covers.openlibrary.org/b/id/<cover_i>-L.jpg?default=false`. Without `default=false` a missing cover is a 200 with a 1x1 GIF. ISBN-keyed lookups are rate-limited to about 100 per IP per 5 minutes; send a `User-Agent` that identifies the site ([covers API](https://openlibrary.org/dev/docs/api/covers)).
- Google Books (`https://www.googleapis.com/books/v1/volumes?q=isbn:…`) works keyless at low volume as a fallback.

## 6. Saving article recommendations from a phone

Becca currently keeps recommendations in browser bookmarks and Substack's "save" feature, neither of which exports. The site already has a place for them: the `influences` array on essays and `externalReading` on reading paths share one `{ title, author, year, type, url }` shape. The missing piece is a capture tool with an export path, and then the same kind of script or skill the reading log uses. Notes below are from memory of these services, not verified during the research session; check pricing and API details before choosing.

| Tool | Capture | Getting data out | Cost | Fit |
| --- | --- | --- | --- | --- |
| Raindrop.io | iOS/Android share sheet, tags, collections, highlights | REST API with a personal token; public collections also have RSS; CSV/HTML export | free tier is generous; Pro ~$28/yr | Best default: cheap, maintained, both API and RSS |
| Pinboard | share-sheet bookmarklet or third-party apps | simple token API (`posts/all`), public per-user and per-tag RSS, export | ~$22/yr | Minimal and durable; the classic IndieWeb choice |
| Instapaper | share sheet, folders, highlights | per-folder RSS, CSV/HTML export, OAuth 1 API | free, premium ~$6/mo | Good reading experience; the API is annoying to script |
| Readwise Reader | share sheet, highlights, newsletters by email | token API (`/api/v3/list`), exports to Obsidian/Notion/Markdown | ~$10 to 13/mo | Strongest if she wants highlights, not just links |
| Zotero | iOS app with share sheet, groups | public group library API and feeds, BibTeX/CSL export | free | Fits the citation style of `influences` (author, year) better than any bookmark tool |
| Self-hosted (linkding, Karakeep, Wallabag) | PWA share target or apps | full APIs | server cost and upkeep | Only if she wants to own the capture layer too |
| Pocket, Omnivore | shut down (2025 and 2024) | n/a | n/a | Avoid |

Suggested shape for the next round:

1. Pick a capture tool (Raindrop unless highlights matter, then Readwise Reader). Use a tag or collection per purpose, for example `to-link` for things to cite and `liked` for things to share.
2. Add `scripts/import-links.mjs` that reads the tagged items (API token stored as a network secret on the Claude Code cloud environment, or the public RSS when that is enough) and writes them to a `links` collection or a `src/data/links.json` file, in the shared `influence` shape, with the saved date and tags.
3. Two uses on the site: a "Recommended reading" or `/links` page (optionally with a feed, which the "new post" skill could also syndicate), and a `suggest-influences` step in the Substack import skill that proposes `influences` for a new essay from recently saved links.
4. A `save-link` skill for the days the app is not to hand: "save this: <url>, it's about X" writes the entry directly, the way `log-book` does for books.

Substack's own "save" has no export; anything already saved there has to be moved by hand once.
