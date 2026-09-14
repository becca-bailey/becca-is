---
title: The Language of Work
description: >-
  A computational study of how tech companies describe themselves as
  employers—and what a quarter century of careers-page language reveals about
  power in the workplace.
category: technical
medium: Research & Data Storytelling
featuredImage: ./featured.png
pubDate: 2026-07-01
featured: true
---

A computational study of how tech companies describe themselves as employers—and what a quarter century of careers-page language reveals about power.

Careers pages are corporate self-presentation at its most deliberate—every word chosen to attract workers. This is a computational study of a quarter century of them: two dozen tech companies, 1999–2026, reconstructed from the Wayback Machine and read as a longitudinal record of what the language does over time, when it shifts, and why. Movement is tracked as position along embedding-based semantic axes.

The thread running through the studies is selection under leverage: a careers page is an audience-selection device, and its language records who the company needed to persuade—or was willing to lose—at each moment.

When workers had somewhere else to go, the pages filled with belonging, care, and diversity commitments. As that leverage receded, the concessions deflated, the surviving care individualized, and an openly exclusionary register ("we're not for everyone") spread. Underneath both swings, the language that serves the employer—performance, merit, the unmeasured "high bar"—holds steady in every market.

The 2010s bet that a new generation would permanently fix work was optimistic, but not founded: the gains tracked the labor market, and receded the moment it inverted.

## The studies

- **DEI Language** — industry-wide adoption, retraction, and counter-programming on careers pages.
- **A Team, Not a Family** — Netflix's 2009 culture deck, how narrowly it spread, and the scoreboard that isn't there.
- **Bring Your Own Resilience** — care talk rose and fell with worker leverage; the care that survived is the kind you bring yourself.
- **Masculine Energy** — gender-coded language across every careers page in the corpus.
- **The Non-Political Workplace** — a founder's blog, scored with the same instruments as the careers corpus.

## How it's built

A shared pipeline chunks archived pages, uses an LLM to classify them into registers, and scores them on embedding-based contrast axes—each paired with a neutral control and a circularity check, so the measure is stance rather than mere topical proximity. Structured extraction pulls benefits into taxonomies validated against blind hand-coded samples.

Because these instruments can fail quietly, each is checked against one that fails differently. An LLM judge re-ranks the same years from the quotes alone, never seeing the axis's own pole phrases, and an axis publishes only where the two rankings agree—the craft axis fails that bar and stays unpublished. Agreement scores, sample sizes, and the spots where they fall short are reported alongside each story. Where the data can't carry a claim, the story says so rather than reaching.

Story prose is an AI-assisted synthesis of my drafts and the data, reviewed and edited by me before publishing.

**Stack:** Python (embeddings, LLM APIs, pandas/scipy) over a content-hash pipeline DAG; interactive data stories in Astro, React, and visx.

## Read it

- [The Language of Work — interactive data stories](https://languageofwork.dev)
- [Source on GitHub](https://github.com/becca-bailey/language-of-work)

## Related writing

- [Masculine Energy](https://beccabailey.substack.com/p/masculine-energy)
- [Deeply Resentful](https://beccabailey.substack.com/p/deeply-resentful)
- [The Death of Changing the World](https://open.substack.com/pub/beccabailey/p/the-death-of-changing-the-world)
- [A Team, Not a Family](https://open.substack.com/pub/beccabailey/p/a-team-not-a-family)
- [Millennials Were Supposed to Fix Work](https://beccabailey.substack.com/p/bb503447-8aa3-4e59-af99-bb62c57f8a02)
- [Dark Places](https://beccabailey.substack.com/p/dark-places)

## Related work

A companion to [The Closing Window](/making-things/closing-window), which points a similar archival method at twenty years of Ravelry designer data.
