---
title: The Closing Window
description: >-
  A twenty-year study of Ravelry knitting designers, measuring how much the odds
  of building an audience depended on the year you happened to start.
category: technical
medium: Research & Data Storytelling
featuredImage: ./featured.png
pubDate: 2026-09-02
featured: true
---

Twenty years of Ravelry data on what it took for a knitting designer to find an audience, era by era.

Ravelry has kept a public registry of patterns, designers, and the projects people cast on from them since 2007, which makes it an unusually complete record of a small creative economy. I sampled 3,130 designers with five or more patterns, grouped them by the year they first published, and asked one question of each cohort: what share of them found an audience?

The answer turns out to depend less on the designers than on when they arrived. The opportunity held steady for roughly a decade, broke in 2015, reopened briefly in 2016, and has been narrowing ever since. Among designers who entered between 2007 and 2014, about 60% reached 100 fans and a quarter landed in the 500–5,000 band that can sustain a small pattern business. That share has dropped every year since 2019. Among designers who entered in 2024, 10% reached 100 fans and effectively none reached 500.

The obvious objection is that early designers simply had longer to accumulate. It's testable, and it doesn't survive: reconstructing six designers' catalogs from Wayback Machine captures shows every age group of patterns earning less in each later period. Seniority isn't what's doing the work. Newer patterns also convert attention into activity more slowly, with a falling share of the people who favorite a pattern going on to cast it on.

What the data can't tell me is why. Ravelry's own mechanics look stable across the period, so the likeliest story is that discovery moved off the platform—to blogs, then Instagram, then TikTok—and the registry is recording the shadow of that shift rather than causing it. That reading is an inference, and the study marks it as one.

## How it's built

Designer, pattern, and project records come from the Ravelry API, with historical engagement reconstructed from Wayback Machine captures of designer pages and Instagram profiles. Designers are sampled at random from the pattern registry and bucketed by year of first publication, so the cohorts aren't hand-picked. Where a claim depends on the past, it's checked against archived snapshots instead of inferred from current state.

**Stack:** Python (pandas, seaborn, parquet) with `uv` and jupytext notebooks, over a shared library feeding modular collection scripts.

## Read it

- [The Closing Window — the interactive study](https://ravelry-study.netlify.app/)
- [Right on Time — the essay](https://beccabailey.substack.com/p/right-on-time)
- [Source on GitHub](https://github.com/becca-bailey/ravelry-study)

## Related work

A companion to [The Language of Work](/making-things/language-of-work), which points a similar archival method at corporate careers pages.
</content>
